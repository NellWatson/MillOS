import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Environment as DreiEnvironment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

export const FactoryEnvironment: React.FC = () => {
  const spotlightRefs = useRef<THREE.SpotLight[]>([]);

  return (
    <group>
      {/* Main ambient */}
      <ambientLight intensity={0.15} color="#b4c6e7" />

      {/* Dramatic key light */}
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
        color="#fff5e6"
      />

      {/* Fill light */}
      <directionalLight
        position={[-20, 30, -10]}
        intensity={0.4}
        color="#7dd3fc"
      />

      {/* Industrial overhead lights */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <group key={i}>
          <pointLight
            position={[x, 18, 0]}
            intensity={50}
            distance={30}
            decay={2}
            color="#fef3c7"
          />
          {/* Light fixture */}
          <mesh position={[x, 19, 0]}>
            <cylinderGeometry args={[0.5, 0.8, 0.3, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[x, 18.7, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.1, 8]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fef3c7"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Colored accent lights for drama */}
      <pointLight position={[-30, 5, -15]} intensity={30} distance={25} color="#3b82f6" />
      <pointLight position={[30, 5, 15]} intensity={30} distance={25} color="#f97316" />
      <pointLight position={[0, 3, 25]} intensity={20} distance={20} color="#22c55e" />

      {/* Spot lights on key machines */}
      <spotLight
        position={[0, 20, -20]}
        angle={0.3}
        penumbra={0.5}
        intensity={100}
        distance={40}
        castShadow
        color="#ffffff"
        target-position={[0, 0, -20]}
      />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={100}
        blur={2}
        far={50}
        color="#000000"
      />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[200, 32, 32]} />
        <meshBasicMaterial color="#0f172a" side={THREE.BackSide} />
      </mesh>

      {/* Factory walls (distant) */}
      <mesh position={[0, 15, -40]} receiveShadow>
        <boxGeometry args={[120, 35, 2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 15, 40]} receiveShadow>
        <boxGeometry args={[120, 35, 2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh position={[-55, 15, 0]} receiveShadow>
        <boxGeometry args={[2, 35, 82]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh position={[55, 15, 0]} receiveShadow>
        <boxGeometry args={[2, 35, 82]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Skylights */}
      {[-20, 0, 20].map((x, i) => (
        <group key={i} position={[x, 32, 0]}>
          <mesh>
            <boxGeometry args={[10, 0.5, 15]} />
            <meshStandardMaterial
              color="#87ceeb"
              transparent
              opacity={0.3}
              emissive="#87ceeb"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Ceiling structure */}
      <mesh position={[0, 32, 0]} receiveShadow>
        <boxGeometry args={[110, 0.5, 80]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Support beams */}
      {[-40, -20, 0, 20, 40].map((x, i) => (
        <mesh key={i} position={[x, 20, 0]} castShadow>
          <boxGeometry args={[0.5, 25, 0.5]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Roof trusses */}
      {[-30, -15, 0, 15, 30].map((z, i) => (
        <mesh key={i} position={[0, 28, z]}>
          <boxGeometry args={[110, 0.3, 0.3]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};
