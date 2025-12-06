import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

interface VendingMachineProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const VendingMachine: React.FC<VendingMachineProps> = ({
  position,
  rotation = [0, 0, 0],
}) => {
  const ledRef = useRef<THREE.Mesh>(null);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  useFrame((state) => {
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Machine body */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 2, 0.8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Glass front */}
      <mesh position={[0, 0.3, 0.401]}>
        <planeGeometry args={[1, 1.2]} />
        <meshStandardMaterial
          color="#0ea5e9"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Product rows (simulated) */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <mesh key={`${row}-${col}`} position={[-0.4 + col * 0.16, 0.7 - row * 0.25, 0.35]}>
            <boxGeometry args={[0.12, 0.18, 0.05]} />
            <meshStandardMaterial
              color={['#f97316', '#eab308', '#22c55e', '#3b82f6'][row % 4]}
              roughness={0.6}
            />
          </mesh>
        ))
      )}

      {/* Control panel */}
      <mesh position={[0, -0.6, 0.401]}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Number pad */}
      {Array.from({ length: 12 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <mesh
            key={i}
            position={[-0.15 + col * 0.15, -0.45 - row * 0.12, 0.41]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
            <meshStandardMaterial color="#374151" roughness={0.5} />
          </mesh>
        );
      })}

      {/* Coin slot */}
      <mesh position={[0.3, -0.5, 0.41]}>
        <boxGeometry args={[0.1, 0.02, 0.01]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Display */}
      <mesh ref={ledRef} position={[0, -0.3, 0.405]}>
        <planeGeometry args={[0.3, 0.08]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>

      {/* Out of order sign */}
      <Html
        position={[0, 0.8, 0.42]}
        transform
        distanceFactor={1}
        style={{
          width: '100px',
          fontSize: '10px',
          color: '#1e293b',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            background: '#fef3c7',
            padding: '4px',
            border: '2px solid #a16207',
            transform: 'rotate(-5deg)',
          }}
        >
          OUT OF ORDER
          <br />
          <span style={{ fontSize: '7px' }}>Coins Jammed</span>
        </div>
      </Html>
    </group>
  );
};

interface CoffeeMakerProps {
  position: [number, number, number];
}

export const CoffeeMaker: React.FC<CoffeeMakerProps> = ({ position }) => {
  const steamRef = useRef<THREE.Points>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  const steamGeometry = useMemo(() => {
    const vertices: number[] = [];
    for (let i = 0; i < 30; i++) {
      vertices.push(
        (Math.random() - 0.5) * 0.08,
        Math.random() * 0.15,
        (Math.random() - 0.5) * 0.08
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(2)) return;
    if (steamRef.current) {
      const positions = steamRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i);
        y += 0.002;
        if (y > 0.15) y = 0;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      const material = steamRef.current.material;
      if (material && 'opacity' in material) {
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      }
    }
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <mesh>
        <boxGeometry args={[0.25, 0.35, 0.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Water reservoir */}
      <mesh position={[0, 0.15, -0.05]}>
        <boxGeometry args={[0.2, 0.25, 0.08]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.5} roughness={0.1} />
      </mesh>

      {/* Coffee pot */}
      <mesh position={[0, -0.05, 0.12]}>
        <cylinderGeometry args={[0.06, 0.07, 0.15, 16]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.6} roughness={0.2} />
      </mesh>

      {/* Coffee in pot */}
      <mesh position={[0, -0.1, 0.12]}>
        <cylinderGeometry args={[0.055, 0.065, 0.1, 16]} />
        <meshStandardMaterial color="#3e2723" roughness={0.3} />
      </mesh>

      {/* Pot handle */}
      <mesh position={[0.08, -0.05, 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.04, 0.008, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Heating plate */}
      <mesh position={[0, -0.15, 0.12]}>
        <cylinderGeometry args={[0.08, 0.08, 0.01, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Power LED */}
      <mesh ref={ledRef} position={[-0.08, 0.05, 0.101]}>
        <circleGeometry args={[0.008, 8]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.8} />
      </mesh>

      {/* Steam */}
      <points ref={steamRef} position={[0, 0.05, 0.12]} geometry={steamGeometry}>
        <pointsMaterial color="#e0e7ff" size={0.012} transparent opacity={0.4} />
      </points>
    </group>
  );
};

interface NoticeboardGraffitiProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const NoticeboardGraffiti: React.FC<NoticeboardGraffitiProps> = ({
  position,
  rotation = [0, 0, 0],
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Noticeboard backing */}
      <mesh>
        <planeGeometry args={[1, 0.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Various notices and graffiti */}
      <Html
        position={[0, 0, 0.01]}
        transform
        distanceFactor={0.5}
        style={{
          width: '200px',
          fontSize: '8px',
          color: '#1e293b',
          fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ padding: '10px' }}>
          <div
            style={{
              background: '#fef3c7',
              padding: '4px',
              marginBottom: '6px',
              border: '1px solid #92400e',
              transform: 'rotate(-3deg)',
            }}
          >
            <strong>LOST:</strong> Blue hard hat
            <br />
            Call ext. 247
          </div>

          <div
            style={{
              background: '#dbeafe',
              padding: '4px',
              marginBottom: '6px',
              border: '1px solid #1e40af',
              transform: 'rotate(2deg)',
            }}
          >
            Coffee Fund - Please contribute!
            <br />
            $2/week
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '4px',
              marginBottom: '6px',
              border: '1px solid #374151',
              fontStyle: 'italic',
            }}
          >
            "Marcus was here '15" - written on side
          </div>

          <div
            style={{
              background: '#dcfce7',
              padding: '4px',
              border: '1px solid #15803d',
              transform: 'rotate(-2deg)',
            }}
          >
            <strong>POKER NIGHT</strong>
            <br />
            Friday 6pm - Break room
            <br />
            <span style={{ fontSize: '6px' }}>Bring snacks!</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

interface BreakRoomCouchProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const BreakRoomCouch: React.FC<BreakRoomCouchProps> = ({
  position,
  rotation = [0, 0, 0],
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Couch base */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[2, 0.4, 0.8]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>

      {/* Cushions */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.15, 0.75]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.9} />
        </mesh>
      ))}

      {/* Backrest */}
      <mesh position={[0, 0.65, -0.3]} castShadow>
        <boxGeometry args={[2, 0.6, 0.2]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>

      {/* Armrests */}
      {[-1, 1].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 0.5, 0.8]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} />
        </mesh>
      ))}

      {/* Legs */}
      {[
        [-0.9, -0.35],
        [0.9, -0.35],
        [-0.9, 0.35],
        [0.9, 0.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* Worn patch on cushion (extra detail) */}
      <mesh position={[0, 0.58, 0.1]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial color="#78716c" roughness={1} />
      </mesh>
    </group>
  );
};

// Main break room assembly
interface BreakRoomDetailsProps {
  position?: [number, number, number];
}

export const BreakRoomDetails: React.FC<BreakRoomDetailsProps> = ({ position = [-25, 0, 0] }) => {
  return (
    <group position={position}>
      {/* Vending machine */}
      <VendingMachine position={[0, 1, -2]} rotation={[0, Math.PI / 2, 0]} />

      {/* Coffee maker on counter */}
      <CoffeeMaker position={[2, 1, 0]} />

      {/* Noticeboard with graffiti */}
      <NoticeboardGraffiti position={[0, 2, 2]} rotation={[0, Math.PI, 0]} />

      {/* Old couch */}
      <BreakRoomCouch position={[-1, 0, 0]} rotation={[0, Math.PI / 4, 0]} />
    </group>
  );
};
