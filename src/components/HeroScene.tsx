import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { HumanModel } from './3d/HumanModel'

/**
 * HeroScene — Landing hero section.
 * Camera positioned to show the full body from a front-left 3/4 view.
 */
export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [1.8, 1.0, 5.0], fov: 30, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      shadows
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#90B8F8" />
      <pointLight position={[-1, 3, 3]} intensity={0.2} color="#ffffff" />

      <Suspense fallback={null}>
        <HumanModel mode="hero" />
      </Suspense>
    </Canvas>
  )
}
