import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { ForceVectors } from './ForceVectors'
import { CervicalOverlay } from './CervicalOverlay'

/* ─────────────────────────────────────────────────────────
   HumanModel — Loads untitled.glb and drives the Mixamo
   skeleton to simulate forward head posture.

   On init:
   - Poses arms down to a natural standing position
   - Stores that as the "rest pose" for posture blending

   On every frame:
   - Subtle idle animation (breathing, weight shift)
   - Forward head posture driven by slider angle
   ───────────────────────────────────────────────────────── */

interface HumanModelProps {
  angle?: number
  mode?: 'hero' | 'physics'
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function findBone(skeleton: THREE.Skeleton, name: string): THREE.Bone | undefined {
  // Strip prefixes like "mixamorig:" or "mixamorig" and clean spacing/case
  const cleanTarget = name.replace(/^mixamorig:?_?/, '').toLowerCase()
  return skeleton.bones.find((b) => {
    const cleanBone = b.name.replace(/^mixamorig:?_?/, '').toLowerCase()
    return b.name === name || cleanBone === cleanTarget || b.name.toLowerCase().includes(cleanTarget)
  })
}

interface BoneCache {
  head?: THREE.Bone
  neck?: THREE.Bone
  spine2?: THREE.Bone
  spine1?: THREE.Bone
  spine?: THREE.Bone
  hips?: THREE.Bone
  lShoulder?: THREE.Bone
  rShoulder?: THREE.Bone
  lArm?: THREE.Bone
  rArm?: THREE.Bone
  lForeArm?: THREE.Bone
  rForeArm?: THREE.Bone
}

export function HumanModel({ angle = 0, mode = 'hero' }: HumanModelProps) {
  const { scene } = useGLTF('/untitled.glb')
  const { pointer } = useThree()

  const groupRef = useRef<THREE.Group>(null!)
  const bonesRef = useRef<BoneCache>({})
  const restPose = useRef<Map<string, THREE.Quaternion>>(new Map())
  const smoothedAngle = useRef(0)

  // World-space positions for overlays
  const c7WorldPos = useMemo(() => new THREE.Vector3(), [])
  const headWorldPos = useMemo(() => new THREE.Vector3(), [])
  const neckWorldPos = useMemo(() => new THREE.Vector3(), [])

  // Clone scene properly for skinned meshes
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene)
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        (child as THREE.SkinnedMesh).frustumCulled = false
      }
    })
    return clone
  }, [scene])

  // Debug: Print all bone names in the scene to help resolve naming variations
  useEffect(() => {
    const boneNames: string[] = []
    scene.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        boneNames.push(child.name)
      }
    })
    console.log('Rigged skeleton bones found in untitled.glb:', boneNames)
  }, [scene])

  /* ── Setup: find bones, apply materials, set natural idle pose ── */
  useEffect(() => {
    let skeleton: THREE.Skeleton | null = null

    clonedScene.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const sm = child as THREE.SkinnedMesh
        sm.castShadow = true
        sm.receiveShadow = true
        if (!skeleton) skeleton = sm.skeleton

        // Apply semi-transparent anatomical material
        if (Array.isArray(sm.material)) {
          sm.material = sm.material.map(m => createAnatomyMaterial(m as THREE.MeshStandardMaterial))
        } else {
          sm.material = createAnatomyMaterial(sm.material as THREE.MeshStandardMaterial)
        }
      }
    })

    if (!skeleton) return

    const s = skeleton
    const bones: BoneCache = {
      head:      findBone(s, 'mixamorig:Head'),
      neck:      findBone(s, 'mixamorig:Neck'),
      spine2:    findBone(s, 'mixamorig:Spine2'),
      spine1:    findBone(s, 'mixamorig:Spine1'),
      spine:     findBone(s, 'mixamorig:Spine'),
      hips:      findBone(s, 'mixamorig:Hips'),
      lShoulder: findBone(s, 'mixamorig:LeftShoulder'),
      rShoulder: findBone(s, 'mixamorig:RightShoulder'),
      lArm:      findBone(s, 'mixamorig:LeftArm'),
      rArm:      findBone(s, 'mixamorig:RightArm'),
      lForeArm:  findBone(s, 'mixamorig:LeftForeArm'),
      rForeArm:  findBone(s, 'mixamorig:RightForeArm'),
    }
    bonesRef.current = bones

    /* ── Set natural standing pose (arms down at sides) ── */

    // Left arm: rotate down ~70° from T-pose toward body
    // if (bones.lArm) {
    //   bones.lArm.quaternion.setFromEuler(new THREE.Euler(0, 0, 1.2))  // Z+ = rotate down
    // }
    // // Left forearm: slight bend
    // if (bones.lForeArm) {
    //   bones.lForeArm.quaternion.setFromEuler(new THREE.Euler(0, 0.15, 0.1))
    // }

    // Right arm: rotate down ~70° (opposite direction)
    // if (bones.rArm) {
    //   bones.rArm.quaternion.setFromEuler(new THREE.Euler(0, 0, -1.2))
    // }
    // // Right forearm: slight bend
    // if (bones.rForeArm) {
    //   bones.rForeArm.quaternion.setFromEuler(new THREE.Euler(0, -0.15, -0.1))
    // }

    // Slight natural head tilt (not perfectly robotic straight)
    if (bones.head) {
      bones.head.quaternion.setFromEuler(new THREE.Euler(-0.03, 0, 0))
    }

    // Update matrices so the pose is applied before we capture rest pose
    clonedScene.updateMatrixWorld(true)

    // NOW store these posed quaternions as the "rest pose"
    for (const [key, bone] of Object.entries(bones)) {
      if (bone) {
        restPose.current.set(key, bone.quaternion.clone())
      }
    }
  }, [clonedScene])

  /* ── Scale & centre (dynamic bone-based) ──
     Mixamo exports sometimes have massive arbitrary root translations.
     We use the actual bone world positions to robustly scale and ground the model. */
  useEffect(() => {
    const hips = clonedScene.getObjectByName('mixamorig:Hips') as THREE.Bone | undefined
    const leftFoot = clonedScene.getObjectByName('mixamorig:LeftFoot') as THREE.Bone | undefined
    const head = (clonedScene.getObjectByName('mixamorig:HeadTop_End') || clonedScene.getObjectByName('mixamorig:Head')) as THREE.Bone | undefined

    if (hips && leftFoot && head) {
      clonedScene.scale.setScalar(1)
      clonedScene.position.set(0, 0, 0)
      clonedScene.updateMatrixWorld(true)

      const footPos = new THREE.Vector3()
      const headPos = new THREE.Vector3()
      const hipsPos = new THREE.Vector3()

      leftFoot.getWorldPosition(footPos)
      head.getWorldPosition(headPos)

      // Calculate true height from foot to head
      const actualHeight = headPos.y - footPos.y
      // Failsafe in case of weird bounding
      const targetHeight = 2.2
      const scale = actualHeight > 0.1 ? (targetHeight / actualHeight) : 0.59
      
      clonedScene.scale.setScalar(scale)
      clonedScene.updateMatrixWorld(true)

      // Re-measure after scaling to apply translation
      leftFoot.getWorldPosition(footPos)
      hips.getWorldPosition(hipsPos)

      clonedScene.position.set(
        -hipsPos.x,
        clonedScene.position.y - footPos.y, // plant foot at y=0
        -hipsPos.z                          // center on hips
      )
    } else {
      // Fallback
      const scale = 0.59
      clonedScene.scale.setScalar(scale)
      clonedScene.position.set(0, -0.09 * scale, 0)
    }
  }, [clonedScene])

  /* ── Frame loop ── */
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const g = groupRef.current
    if (!g) return

    const bones = bonesRef.current
    const rest = restPose.current

    // ─ Damped angle ─
    const targetAngle = mode === 'physics' ? angle : Math.sin(t * 0.4) * 8
    smoothedAngle.current += (targetAngle - smoothedAngle.current) * 0.04
    const a = smoothedAngle.current

    const normalised = Math.min(Math.abs(a) / 60, 1)
    const s = easeInOutCubic(normalised)
    const maxRad = (60 * Math.PI) / 180

    // ─ Mouse tracking ─
    if (mode === 'hero') {
      const autoY = Math.sin(t * 0.3) * 0.1
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, pointer.x * 0.18 + autoY, 0.02)
    } else {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, pointer.x * 0.12, 0.025)
    }

    // ─ Idle animation: breathing ─
    const breath = 1 + Math.sin(t * 1.4) * 0.003
    g.scale.set(1, breath, 1)

    // ─ Idle animation: subtle weight shift on hips ─
    if (bones.hips && rest.has('hips')) {
      const idleQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          Math.sin(t * 0.5) * 0.008,   // very subtle forward/back sway
          Math.sin(t * 0.3) * 0.005,   // very subtle side sway
          Math.sin(t * 0.4) * 0.003    // very subtle tilt
        )
      )
      idleQ.premultiply(rest.get('hips')!)
      bones.hips.quaternion.slerp(idleQ, 0.04)
    }

    // ─ Idle animation: subtle spine micro-movement ─
    if (bones.spine && rest.has('spine')) {
      const idleQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.sin(t * 0.7) * 0.005, 0, 0)
      )
      idleQ.premultiply(rest.get('spine')!)
      bones.spine.quaternion.slerp(idleQ, 0.04)
    }

    // ─ Posture deformation ─

    // Head: 45%
    if (bones.head && rest.has('head')) {
      const targetQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(s * maxRad * 0.45, 0, 0)
      )
      targetQ.premultiply(rest.get('head')!)
      bones.head.quaternion.slerp(targetQ, 0.06)
    }

    // Neck: 30%
    if (bones.neck && rest.has('neck')) {
      const targetQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(s * maxRad * 0.30, 0, 0)
      )
      targetQ.premultiply(rest.get('neck')!)
      bones.neck.quaternion.slerp(targetQ, 0.06)
    }

    // Spine2 (upper thoracic): 15%
    if (bones.spine2 && rest.has('spine2')) {
      const targetQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(s * maxRad * 0.15, 0, 0)
      )
      targetQ.premultiply(rest.get('spine2')!)
      bones.spine2.quaternion.slerp(targetQ, 0.06)
    }

    // Spine1 (chest): 5%
    if (bones.spine1 && rest.has('spine1')) {
      const targetQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(s * maxRad * 0.05, 0, 0)
      )
      targetQ.premultiply(rest.get('spine1')!)
      bones.spine1.quaternion.slerp(targetQ, 0.06)
    }

    // Shoulders: 5% — roll forward
    if (bones.lShoulder && rest.has('lShoulder')) {
      const targetQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(s * 0.08, 0, -s * 0.04)
      )
      targetQ.premultiply(rest.get('lShoulder')!)
      bones.lShoulder.quaternion.slerp(targetQ, 0.06)
    }
    if (bones.rShoulder && rest.has('rShoulder')) {
      const targetQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(s * 0.08, 0, s * 0.04)
      )
      targetQ.premultiply(rest.get('rShoulder')!)
      bones.rShoulder.quaternion.slerp(targetQ, 0.06)
    }

    // ─ Update world positions for overlays ─
    if (bones.neck) {
      bones.neck.getWorldPosition(c7WorldPos)
      bones.neck.getWorldPosition(neckWorldPos)
    }
    if (bones.head) {
      bones.head.getWorldPosition(headWorldPos)
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={clonedScene} />

      {/* Ground shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[0.6, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.15} />
      </mesh>

      {/* Biomechanics overlays */}
      <CervicalOverlay angle={angle} neckPosition={neckWorldPos} />
      <ForceVectors angle={angle} c7Position={c7WorldPos} headPosition={headWorldPos} />
    </group>
  )
}

/* ─── Semi-transparent anatomical glass material ─── */
function createAnatomyMaterial(original: THREE.MeshStandardMaterial): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial()
  if (original.map) mat.map = original.map
  if (original.normalMap) mat.normalMap = original.normalMap
  mat.transparent = true
  mat.opacity = 0.88
  mat.roughness = 0.35
  mat.metalness = 0.05
  mat.clearcoat = 0.3
  mat.clearcoatRoughness = 0.2
  mat.side = THREE.DoubleSide
  mat.depthWrite = true
  mat.envMapIntensity = 0.6
  if (original.color) mat.color.copy(original.color)
  return mat
}

useGLTF.preload('/untitled.glb')
