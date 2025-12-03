import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface TruckBayProps {
  productionSpeed: number;
}

export const TruckBay: React.FC<TruckBayProps> = ({ productionSpeed }) => {
  const truck1Ref = useRef<THREE.Group>(null);
  const truck2Ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime * (productionSpeed * 0.5 + 0.2);

    // Truck 1 - Delivery cycle
    if (truck1Ref.current) {
      const cycle = time % 25;
      let z: number;
      if (cycle < 10) {
        z = THREE.MathUtils.lerp(-80, -30, cycle / 10);
      } else if (cycle < 18) {
        z = -30;
      } else {
        z = THREE.MathUtils.lerp(-30, 80, (cycle - 18) / 7);
      }
      truck1Ref.current.position.z = z;
    }

    // Truck 2 - Offset cycle
    if (truck2Ref.current) {
      const cycle = (time + 12) % 25;
      let z: number;
      if (cycle < 10) {
        z = THREE.MathUtils.lerp(-80, -30, cycle / 10);
      } else if (cycle < 18) {
        z = -30;
      } else {
        z = THREE.MathUtils.lerp(-30, 80, (cycle - 18) / 7);
      }
      truck2Ref.current.position.z = z;
    }
  });

  return (
    <group position={[35, 0, 0]}>
      {/* Loading dock platform */}
      <mesh position={[0, 1, -28]} receiveShadow castShadow>
        <boxGeometry args={[18, 2, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Dock bumpers */}
      {[-6, 0, 6].map((x, i) => (
        <mesh key={i} position={[x, 1, -24]} castShadow>
          <boxGeometry args={[1, 1.5, 0.5]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}

      {/* Dock floor */}
      <mesh position={[0, 0.05, -35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[25, 25]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Lane markings */}
      <mesh position={[-4, 0.06, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 20]} />
        <meshBasicMaterial color="#fef3c7" />
      </mesh>
      <mesh position={[4, 0.06, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 20]} />
        <meshBasicMaterial color="#fef3c7" />
      </mesh>

      {/* Truck 1 */}
      <group ref={truck1Ref} position={[-4, 0, -50]}>
        <Truck color="#dc2626" company="GRAIN CO" />
      </group>

      {/* Truck 2 */}
      <group ref={truck2Ref} position={[4, 0, -50]}>
        <Truck color="#2563eb" company="FLOUR EXPRESS" />
      </group>

      {/* Dock signage */}
      <Text
        position={[0, 4, -24]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
      >
        LOADING BAY A
      </Text>
    </group>
  );
};

const Truck: React.FC<{ color: string; company: string }> = ({ color, company }) => {
  return (
    <group>
      {/* Cab */}
      <mesh position={[0, 1.8, 2.5]} castShadow>
        <boxGeometry args={[3, 2.8, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 2.2, 3.8]}>
        <boxGeometry args={[2.5, 1.5, 0.1]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Trailer */}
      <mesh position={[0, 2.5, -4]} castShadow>
        <boxGeometry args={[3.5, 3.5, 10]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Company name on trailer */}
      <Text
        position={[1.76, 2.5, -4]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.4}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {company}
      </Text>

      {/* Wheels - Front */}
      {[-1.3, 1.3].map((x, i) => (
        <mesh key={`front-${i}`} position={[x, 0.6, 2.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.8} />
        </mesh>
      ))}

      {/* Wheels - Rear (double) */}
      {[-1.3, 1.3].map((x, i) => (
        <group key={`rear-${i}`}>
          <mesh position={[x, 0.6, -7]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
          <mesh position={[x, 0.6, -8]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Headlights */}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 3.8]}>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fef3c7"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};
