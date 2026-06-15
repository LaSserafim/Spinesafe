import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { HumanModel } from './3d/HumanModel'

interface PhysicsSceneProps {
  angle: number
}

/**
 * PhysicsScene — Interactive biomechanics section.
 * Model is ~2.2 units tall, feet at y=0, center at ~y=1.1.
 * Camera looks at chest height with full body visible.
 */
export function PhysicsScene({ angle }: PhysicsSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        display: 'block' 
      }}
      camera={{ position: [0, 1.2, 5.0], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.1}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 1, -2]} intensity={0.3} color="#90B8F8" />
      <pointLight position={[0, 2, -2]} intensity={0.3} color="#ffffff" />

      <Suspense fallback={null}>
        <HumanModel angle={angle} mode="physics" />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        maxPolarAngle={Math.PI * 0.8}
        minPolarAngle={Math.PI * 0.15}
        maxDistance={8}
        minDistance={2}
        target={[0, 1.1, 0]}
      />
    </Canvas>
  )
}
