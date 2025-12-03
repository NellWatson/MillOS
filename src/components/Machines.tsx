import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MachineData, MachineType } from '../types';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface MachinesProps {
  machines: MachineData[];
  onSelect: (data: MachineData) => void;
}

export const Machines: React.FC<MachinesProps> = ({ machines, onSelect }) => {
  return (
    <group>
      {machines.map((m) => (
        <MachineMesh key={m.id} data={m} onClick={() => onSelect(m)} />
      ))}
    </group>
  );
};

const MachineMesh: React.FC<{ data: MachineData; onClick: () => void }> = ({ data, onClick }) => {
  const { type, position, size, rotation, status } = data;
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (status === 'running' && groupRef.current && (type === MachineType.PLANSIFTER || type === MachineType.ROLLER_MILL)) {
      const intensity = type === MachineType.PLANSIFTER ? 0.05 : 0.01;
      const speed = type === MachineType.PLANSIFTER ? 15 : 40;

      if (type === MachineType.PLANSIFTER) {
        groupRef.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * speed) * intensity;
        groupRef.current.position.z = position[2] + Math.sin(state.clock.elapsedTime * speed) * intensity;
      } else {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * intensity;
      }
    }
  });

  const statusColor = status === 'running' ? '#22c55e' : status === 'warning' ? '#f59e0b' : status === 'critical' ? '#ef4444' : '#9ca3af';
  const matProps = {
    emissive: hovered ? '#3b82f6' : '#000000',
    emissiveIntensity: hovered ? 0.3 : 0
  };

  const renderGeometry = () => {
    switch (type) {
      case MachineType.SILO:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Main cylinder */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 32]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} {...matProps} />
            </mesh>
            {/* Top cone */}
            <mesh position={[0, size[1] / 2 + 1, 0]} castShadow>
              <coneGeometry args={[size[0] / 2, 2, 32]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} {...matProps} />
            </mesh>
            {/* Bottom cone (hopper) */}
            <mesh position={[0, -size[1] / 2 - 1, 0]} castShadow>
              <coneGeometry args={[size[0] / 2, 2, 32]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} {...matProps} />
            </mesh>
            {/* Legs */}
            {[1, -1].map(x => [1, -1].map(z => (
              <mesh key={`${x}-${z}`} position={[x * size[0] / 3, -size[1] / 2 - 3, z * size[0] / 3]}>
                <cylinderGeometry args={[0.15, 0.2, 4]} />
                <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
              </mesh>
            )))}
            {/* Access ladder */}
            <mesh position={[size[0] / 2 + 0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.1, size[1], 0.4]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        );

      case MachineType.ROLLER_MILL:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Main body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              <meshStandardMaterial color="#3b82f6" metalness={0.5} roughness={0.3} {...matProps} />
            </mesh>
            {/* Hopper on top */}
            <mesh position={[0, size[1] / 2 + 0.5, 0]}>
              <coneGeometry args={[1.2, 1.2, 4]} rotation={[Math.PI, 0, 0]} />
              <meshStandardMaterial color="#bfdbfe" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Control panel */}
            <mesh position={[size[0] / 2 + 0.1, 0.5, 0]} castShadow>
              <boxGeometry args={[0.2, 1, 0.8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Display screen glow */}
            <mesh position={[size[0] / 2 + 0.15, 0.5, 0]}>
              <planeGeometry args={[0.1, 0.5]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
        );

      case MachineType.PLANSIFTER:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Hanging cables */}
            {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], i) => (
              <mesh key={i} position={[x * (size[0] / 2 - 0.3), 5, z * (size[2] / 2 - 0.3)]}>
                <cylinderGeometry args={[0.03, 0.03, 10]} />
                <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
              </mesh>
            ))}
            {/* Main box - white with some detailing */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.2} {...matProps} />
            </mesh>
            {/* Side vents */}
            {[-1, 1].map(x => (
              <mesh key={x} position={[x * (size[0] / 2 + 0.05), 0, 0]} castShadow>
                <boxGeometry args={[0.1, size[1] * 0.8, size[2] * 0.6]} />
                <meshStandardMaterial color="#e2e8f0" />
              </mesh>
            ))}
          </group>
        );

      case MachineType.PACKER:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Main body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.4} roughness={0.4} {...matProps} />
            </mesh>
            {/* Output chute */}
            <mesh position={[0, -size[1] / 3, size[2] / 2 + 0.5]} rotation={[0.3, 0, 0]} castShadow>
              <boxGeometry args={[1.8, 0.3, 1.2]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Control panel */}
            <mesh position={[-size[0] / 2 - 0.1, 0.5, 0]} castShadow>
              <boxGeometry args={[0.2, 1.5, 1]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Display */}
            <mesh position={[-size[0] / 2 - 0.15, 0.5, 0]}>
              <planeGeometry args={[0.1, 0.8]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          </group>
        );

      default: return null;
    }
  };

  return (
    <group
      ref={groupRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {renderGeometry()}

      {/* Status light */}
      <mesh position={[0, size[1] + 1.5, 0]}>
        <sphereGeometry args={[0.3]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, size[1] + 0.75, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, size[1] + 2.5, 0]} center distanceFactor={12}>
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 px-4 py-2 rounded-lg shadow-2xl pointer-events-none min-w-[180px]">
            <div className="font-bold text-white text-sm">{data.name}</div>
            <div className="text-xs text-cyan-400">{data.type.replace('_', ' ')}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor }}></span>
              <span className="text-xs text-slate-400 capitalize">{status}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Click to inspect</div>
          </div>
        </Html>
      )}
    </group>
  );
};
