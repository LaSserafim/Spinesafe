import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ─────────────────────────────────────────────────────────
   CervicalOverlay — Glowing risk indicator over C1–C7 region
   
   A semi-transparent capsule that sits inside the neck area.
   - Glow intensity scales with torque severity
   - Color transitions: Green → Yellow → Orange → Red
   ───────────────────────────────────────────────────────── */

interface CervicalOverlayProps {
  angle: number
  /** World-space position of the neck bone (updated by parent) */
  neckPosition: THREE.Vector3
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function getRiskColor(angle: number): THREE.Color {
  if (angle <= 15) return new THREE.Color('#00D4AA')   // Green
  if (angle <= 30) return new THREE.Color('#F59E0B')   // Yellow
  if (angle <= 45) return new THREE.Color('#FB923C')   // Orange
  return new THREE.Color('#EF4444')                     // Red
}

export function CervicalOverlay({ angle, neckPosition }: CervicalOverlayProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const targetColor = useMemo(() => new THREE.Color('#00D4AA'), [])

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return
    const t = clock.getElapsedTime()

    // Follow neck
    meshRef.current.position.copy(neckPosition)
    meshRef.current.position.y += 0.02 // Slightly above neck pivot

    // Color
    targetColor.copy(getRiskColor(angle))
    matRef.current.color.lerp(targetColor, 0.05)
    matRef.current.emissive.lerp(targetColor, 0.05)

    // Intensity scales with risk
    const normalised = Math.min(angle / 60, 1)
    const smoothFactor = easeInOutCubic(normalised)

    const targetOpacity = 0.05 + smoothFactor * 0.35
    matRef.current.opacity += (targetOpacity - matRef.current.opacity) * 0.06

    // Pulsing when high risk
    const pulse = smoothFactor > 0.4
      ? (Math.sin(t * 6) * 0.5 + 0.5) * smoothFactor * 0.8
      : 0
    matRef.current.emissiveIntensity += (smoothFactor * 1.5 + pulse - matRef.current.emissiveIntensity) * 0.08
  })

  return (
    <mesh ref={meshRef}>
      <capsuleGeometry args={[0.04, 0.12, 8, 16]} />
      <meshStandardMaterial
        ref={matRef}
        transparent
        opacity={0.05}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
