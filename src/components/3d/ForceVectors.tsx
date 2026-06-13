import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ─────────────────────────────────────────────────────────
   ForceVectors — Educational force arrows for biomechanics
   
   Three distinct vectors:
   1. Gravity (blue)     — downward from head center of mass
   2. Leverage (orange)  — forward force from lever arm
   3. Torque (red)       — rotational indicator around C7
   
   All scale dynamically with the calculated torque.
   ───────────────────────────────────────────────────────── */

interface ForceVectorsProps {
  angle: number
  /** World-space position of C7 bone (updated each frame by parent) */
  c7Position: THREE.Vector3
  /** World-space position of head bone */
  headPosition: THREE.Vector3
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function ForceVectors({ angle, c7Position, headPosition }: ForceVectorsProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const torqueRingRef = useRef<THREE.Mesh>(null!)

  // Smoothed intensity
  const smoothedRef = useRef(0)

  // Arrow geometries (reused)
  const geo = useMemo(() => ({
    shaft: new THREE.CylinderGeometry(0.008, 0.008, 1, 6),
    tip:   new THREE.ConeGeometry(0.025, 0.06, 6),
    ring:  new THREE.TorusGeometry(0.08, 0.006, 12, 48, Math.PI * 1.5),
  }), [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    // Smooth factor with damping
    const normalised = Math.min(angle / 60, 1)
    const target = easeInOutCubic(normalised)
    smoothedRef.current += (target - smoothedRef.current) * 0.06
    const s = smoothedRef.current

    // Fade in/out
    groupRef.current.visible = angle > 3
    // Position at C7
    groupRef.current.position.copy(c7Position)

    // Torque ring spins, faster under stress
    if (torqueRingRef.current) {
      torqueRingRef.current.rotation.z = t * (1 + s * 4)
      torqueRingRef.current.scale.setScalar(0.8 + s * 0.6)
    }
  })

  // Torque-based sizing
  const normalised = Math.min(angle / 60, 1)
  const s = easeInOutCubic(normalised)
  const gravLen = 0.12 + s * 0.28
  const leverLen = 0.08 + s * 0.22

  return (
    <group ref={groupRef}>
      {/* 1. Gravity — Blue, points straight down */}
      <group position={[0, 0.08, 0]}>
        <mesh position={[0, -gravLen / 2, 0]} scale={[1, gravLen, 1]}>
          <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
          <meshBasicMaterial color="#4A90D9" transparent opacity={0.75} />
        </mesh>
        <mesh position={[0, -gravLen - 0.03, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.025, 0.06, 6]} />
          <meshBasicMaterial color="#4A90D9" transparent opacity={0.75} />
        </mesh>
      </group>

      {/* 2. Leverage — Orange, angled forward & down */}
      <group position={[0, 0.04, 0.02]} rotation={[0.6, 0, 0]} visible={angle > 8}>
        <mesh position={[0, -leverLen / 2, 0]} scale={[1, leverLen, 1]}>
          <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
          <meshBasicMaterial color="#FB923C" transparent opacity={0.65} />
        </mesh>
        <mesh position={[0, -leverLen - 0.03, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.025, 0.06, 6]} />
          <meshBasicMaterial color="#FB923C" transparent opacity={0.65} />
        </mesh>
      </group>

      {/* 3. Torque — Red, rotational ring around C7 */}
      <mesh
        ref={torqueRingRef}
        rotation={[Math.PI / 2, 0, 0]}
        visible={angle > 5}
      >
        <torusGeometry args={[0.08, 0.006, 12, 48, Math.PI * 1.5]} />
        <meshBasicMaterial color="#EF4444" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
