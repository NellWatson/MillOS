import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConveyorSystemProps {
  productionSpeed: number;
}

interface FlourBag {
  id: string;
  position: [number, number, number];
  speed: number;
}

export const ConveyorSystem: React.FC<ConveyorSystemProps> = ({ productionSpeed }) => {
  const bags = useMemo(() => {
    const _bags: FlourBag[] = [];
    for (let i = 0; i < 60; i++) {
      _bags.push({
        id: `bag-${i}`,
        position: [(Math.random() - 0.5) * 50, 1.1, 19],
        speed: 4 + Math.random() * 2
      });
    }
    return _bags;
  }, []);

  return (
    <group>
      {/* Main conveyor belt structure */}
      <ConveyorBelt position={[0, 0.5, 19]} length={55} productionSpeed={productionSpeed} />

      {/* Side rails */}
      <mesh position={[0, 1.3, 18]} castShadow>
        <boxGeometry args={[55, 0.1, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.3, 20]} castShadow>
        <boxGeometry args={[55, 0.1, 0.1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Support legs */}
      {[-25, -15, -5, 5, 15, 25].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.25, 18.5]} castShadow>
            <boxGeometry args={[0.3, 0.5, 0.3]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[x, 0.25, 19.5]} castShadow>
            <boxGeometry args={[0.3, 0.5, 0.3]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ))}

      {/* Flour bags */}
      {bags.map(bag => (
        <FlourBagMesh key={bag.id} data={bag} speedMulti={productionSpeed} />
      ))}

      {/* Roller conveyor to packing */}
      <RollerConveyor position={[0, 0.5, 16]} productionSpeed={productionSpeed} />
    </group>
  );
};

const ConveyorBelt: React.FC<{ position: [number, number, number]; length: number; productionSpeed: number }> = ({ position, length, productionSpeed }) => {
  const beltRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (beltRef.current) {
      const material = beltRef.current.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.offset.x += delta * productionSpeed * 0.5;
      }
    }
  });

  return (
    <group position={position}>
      {/* Belt surface */}
      <mesh ref={beltRef} receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[length, 0.1, 2]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      {/* Belt frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[length, 0.5, 2.2]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

const RollerConveyor: React.FC<{ position: [number, number, number]; productionSpeed: number }> = ({ position, productionSpeed }) => {
  const rollersRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (rollersRef.current) {
      rollersRef.current.children.forEach(roller => {
        roller.rotation.z += delta * productionSpeed * 5;
      });
    }
  });

  return (
    <group position={position}>
      {/* Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[30, 0.3, 2.5]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Rollers */}
      <group ref={rollersRef}>
        {Array.from({ length: 25 }).map((_, i) => (
          <mesh key={i} position={[-12 + i * 1, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 2, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const FlourBagMesh: React.FC<{ data: FlourBag; speedMulti: number }> = ({ data, speedMulti }) => {
  const ref = useRef<THREE.Group>(null);
  const boundary = 28;

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.x += data.speed * speedMulti * delta;
    if (ref.current.position.x > boundary) {
      ref.current.position.x = -boundary;
    }
  });

  return (
    <group ref={ref} position={new THREE.Vector3(...data.position)}>
      {/* Bag body */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.9]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.9} />
      </mesh>
      {/* Label stripe */}
      <mesh position={[0, 0.25, 0.46]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
};
