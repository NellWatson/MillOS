import React from 'react';
import { Text } from '@react-three/drei';
import { useMillStore } from '../../store';

interface FactoryWallsProps {
  floorWidth: number;
  floorDepth: number;
}

// Personnel door with frame, signage, and push bar
const PersonnelDoor: React.FC<{
  position: [number, number, number];
  rotation?: number;
  label?: string;
  isEmergencyExit?: boolean;
}> = ({ position, rotation = 0, label = 'ENTRANCE', isEmergencyExit = false }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Door frame - structural surround */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[1.8, 3, 0.3]} />
        <meshStandardMaterial color="#374151" roughness={0.7} />
      </mesh>

      {/* Door recess */}
      <mesh position={[0, 1.4, 0.1]}>
        <boxGeometry args={[1.2, 2.6, 0.2]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>

      {/* Door panel */}
      <mesh position={[0, 1.4, 0.2]} castShadow>
        <boxGeometry args={[1, 2.4, 0.08]} />
        <meshStandardMaterial
          color={isEmergencyExit ? '#dc2626' : '#475569'}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      {/* Door window (upper portion) */}
      <mesh position={[0, 2.1, 0.25]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
        <meshStandardMaterial
          color="#1e3a5f"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Push bar (crash bar for emergency exits) */}
      <mesh position={[0, 1.1, 0.28]}>
        <boxGeometry args={[0.7, 0.08, 0.06]} />
        <meshStandardMaterial
          color={isEmergencyExit ? '#fbbf24' : '#94a3b8'}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Door handle */}
      <mesh position={[0.35, 1.3, 0.28]}>
        <boxGeometry args={[0.08, 0.15, 0.06]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Sign above door */}
      <mesh position={[0, 3.2, 0.16]}>
        <boxGeometry args={[1.4, 0.35, 0.05]} />
        <meshStandardMaterial
          color={isEmergencyExit ? '#dc2626' : '#1e40af'}
          roughness={0.5}
        />
      </mesh>
      <Text
        position={[0, 3.2, 0.2]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>

      {/* Emergency exit light (if emergency exit) */}
      {isEmergencyExit && (
        <mesh position={[0, 3.5, 0.1]}>
          <boxGeometry args={[0.6, 0.2, 0.1]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* Floor mat */}
      <mesh position={[0, 0.02, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>

      {/* Threshold */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.3]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
};

// Break Room component - a small covered rest area for workers
const BreakRoom: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Floor/platform */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 5]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.15} />
      </mesh>

      {/* Shelter roof */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.15, 5]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Support pillars */}
      {[
        [-2.7, 0, -2.2],
        [-2.7, 0, 2.2],
        [2.7, 0, -2.2],
        [2.7, 0, 2.2],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], 1.5, pos[2]]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Bench */}
      <group position={[0, 0, 1.5]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[4, 0.08, 0.5]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {[
          [-1.5, 0, 0],
          [1.5, 0, 0],
        ].map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.2, pos[2]]} castShadow>
            <boxGeometry args={[0.1, 0.4, 0.4]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Table */}
      <group position={[0, 0, -0.5]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[2.5, 0.06, 1.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        {[
          [-1, 0, -0.4],
          [-1, 0, 0.4],
          [1, 0, -0.4],
          [1, 0, 0.4],
        ].map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.35, pos[2]]} castShadow>
            <boxGeometry args={[0.08, 0.7, 0.08]} />
            <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Vending machine (simplified) */}
      <group position={[2.2, 0, -1.5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[0.8, 2, 0.6]} />
          <meshStandardMaterial color="#1e40af" roughness={0.4} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 1.2, 0.31]}>
          <planeGeometry args={[0.5, 0.4]} />
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.5} />
        </mesh>
        {/* Buttons */}
        {[0.6, 0.7, 0.8].map((y, i) => (
          <mesh key={i} position={[0, y, 0.31]}>
            <circleGeometry args={[0.03, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>

      {/* Break room sign */}
      <group position={[0, 2.8, -2.3]}>
        <mesh>
          <boxGeometry args={[1.5, 0.4, 0.05]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      </group>

      {/* Wall clock */}
      <WallClock position={[-2.5, 2.2, -2.35]} />

      {/* Safety bulletin board with "Days Since Incident" */}
      <BulletinBoard position={[2.5, 1.8, -2.35]} />

      {/* Ambient light for break room */}
      <pointLight position={[0, 2.5, 0]} color="#fef3c7" intensity={0.5} distance={8} />
    </group>
  );
};

// Wall clock that syncs with game time
const WallClock: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const gameTime = useMillStore((state: any) => state.gameTime);
  const hourAngle = (gameTime / 12) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (((gameTime % 1) * 60) / 60) * Math.PI * 2 - Math.PI / 2;

  return (
    <group position={position}>
      {/* Clock face */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 0.05, 32]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      {/* Clock rim */}
      <mesh position={[0, 0, 0.03]}>
        <torusGeometry args={[0.35, 0.03, 8, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(angle) * 0.28, Math.cos(angle) * 0.28, 0.03]}>
            <boxGeometry args={[0.02, i % 3 === 0 ? 0.06 : 0.03, 0.01]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        );
      })}
      {/* Hour hand */}
      <mesh
        position={[Math.cos(hourAngle) * 0.1, Math.sin(hourAngle) * 0.1, 0.04]}
        rotation={[0, 0, -hourAngle]}
      >
        <boxGeometry args={[0.2, 0.025, 0.01]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Minute hand */}
      <mesh
        position={[Math.cos(minuteAngle) * 0.12, Math.sin(minuteAngle) * 0.12, 0.05]}
        rotation={[0, 0, -minuteAngle]}
      >
        <boxGeometry args={[0.25, 0.015, 0.01]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Center cap */}
      <mesh position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>
    </group>
  );
};

// Safety bulletin board with days since incident counter
const BulletinBoard: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const daysSinceIncident = useMillStore((state: any) => state.safetyMetrics.daysSinceIncident);

  return (
    <group position={position}>
      {/* Board frame */}
      <mesh>
        <boxGeometry args={[1.2, 1, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Cork board surface */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.1, 0.9]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>
      {/* "SAFETY FIRST" header */}
      <mesh position={[0, 0.35, 0.05]}>
        <planeGeometry args={[0.9, 0.15]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      {/* Days counter display */}
      <group position={[0, 0, 0.05]}>
        {/* Counter background */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.8, 0.35]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Number display (simplified as glowing segments) */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.6, 0.25]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={daysSinceIncident > 100 ? 1 : 0.5}
          />
        </mesh>
      </group>
      {/* "Days Without Incident" label */}
      <mesh position={[0, -0.28, 0.05]}>
        <planeGeometry args={[0.9, 0.12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* Push pins */}
      {[
        [-0.48, 0.38],
        [0.48, 0.38],
        [-0.48, -0.38],
        [0.48, -0.38],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.06]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color={['#ef4444', '#eab308', '#22c55e', '#3b82f6'][i]}
            metalness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};

// Locker Room component
const LockerRoom: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.5, -3]} receiveShadow castShadow>
        <boxGeometry args={[8, 3, 0.15]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Side walls */}
      <mesh position={[-4, 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 3, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[4, 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 3, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Front wall with entrance gap */}
      <mesh position={[-2.5, 1.5, 3]} receiveShadow castShadow>
        <boxGeometry args={[3, 3, 0.15]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, 1.5, 3]} receiveShadow castShadow>
        <boxGeometry args={[3, 3, 0.15]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.7, 3]} receiveShadow castShadow>
        <boxGeometry args={[2, 0.6, 0.15]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Lockers - row of 6 */}
      {[-3, -1.8, -0.6, 0.6, 1.8, 3].map((x, i) => (
        <group key={i} position={[x, 0, -2.5]}>
          {/* Locker body */}
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[1, 2, 0.5]} />
            <meshStandardMaterial
              color={['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'][i]}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
          {/* Locker door handle */}
          <mesh position={[0.35, 1.2, 0.26]}>
            <boxGeometry args={[0.05, 0.15, 0.05]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Ventilation slots */}
          <mesh position={[0, 0.3, 0.26]}>
            <planeGeometry args={[0.6, 0.15]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 1.7, 0.26]}>
            <planeGeometry args={[0.6, 0.15]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}

      {/* Bench in front of lockers */}
      <group position={[0, 0, -0.5]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[6, 0.08, 0.4]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {[
          [-2.5, 0, 0],
          [2.5, 0, 0],
        ].map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.175, pos[2]]} castShadow>
            <boxGeometry args={[0.08, 0.35, 0.35]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Coat hooks on side wall */}
      <group position={[-3.9, 1.5, 0]}>
        {[0, 0.8, 1.6, 2.4].map((z, i) => (
          <mesh key={i} position={[0, 0, z - 1.2]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* "LOCKER ROOM" sign above entrance */}
      <mesh position={[0, 2.85, 3.1]}>
        <boxGeometry args={[2, 0.35, 0.05]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.5} />
      </mesh>

      {/* Overhead light */}
      <pointLight position={[0, 2.5, 0]} color="#fef3c7" intensity={0.4} distance={6} />
    </group>
  );
};

// Portable toilet (blue porta-potty)
const PortableToilet: React.FC<{ position: [number, number, number]; rotation?: number }> = ({
  position,
  rotation = 0,
}) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.2, 2.2, 1.2]} />
        <meshStandardMaterial color="#1e40af" roughness={0.6} />
      </mesh>

      {/* Roof with slight overhang */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[1.3, 0.1, 1.3]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.5} />
      </mesh>

      {/* Vent pipe on roof */}
      <mesh position={[0.4, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 1, 0.61]} castShadow>
        <boxGeometry args={[0.8, 1.8, 0.02]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.5} />
      </mesh>

      {/* Door handle */}
      <mesh position={[0.3, 1, 0.63]}>
        <boxGeometry args={[0.08, 0.15, 0.04]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Occupied indicator */}
      <mesh position={[0.3, 1.5, 0.62]}>
        <boxGeometry args={[0.15, 0.08, 0.02]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>

      {/* Vents on sides */}
      {[-0.61, 0.61].map((x, i) => (
        <group
          key={i}
          position={[x, 1.8, 0]}
          rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          {[-0.15, 0, 0.15].map((y, j) => (
            <mesh key={j} position={[0, y, 0]}>
              <boxGeometry args={[0.4, 0.04, 0.02]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Base/skid */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.25, 0.04, 1.25]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
    </group>
  );
};

// Indoor toilet block with multiple stalls
const ToiletBlock: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.5, -2.5]} receiveShadow castShadow>
        <boxGeometry args={[8, 3, 0.15]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Side walls */}
      <mesh position={[-4, 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 3, 5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[4, 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 3, 5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Front wall with entrance gap */}
      <mesh position={[-2.5, 1.5, 2.5]} receiveShadow castShadow>
        <boxGeometry args={[3, 3, 0.15]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[2.5, 1.5, 2.5]} receiveShadow castShadow>
        <boxGeometry args={[3, 3, 0.15]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.7, 2.5]} receiveShadow castShadow>
        <boxGeometry args={[2, 0.6, 0.15]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Toilet stalls - 3 stalls */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <group key={i} position={[x, 0, -1.5]}>
          {/* Stall divider */}
          {i < 2 && (
            <mesh position={[1.2, 1, 0]} castShadow>
              <boxGeometry args={[0.05, 2, 1.5]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.5} />
            </mesh>
          )}
          {/* Toilet */}
          <mesh position={[0, 0.3, -0.3]}>
            <boxGeometry args={[0.5, 0.5, 0.6]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.6, -0.55]}>
            <boxGeometry args={[0.45, 0.5, 0.15]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* Stall door */}
          <mesh position={[0, 1, 0.7]}>
            <boxGeometry args={[0.8, 1.8, 0.05]} />
            <meshStandardMaterial color="#64748b" roughness={0.6} />
          </mesh>
          {/* Door handle */}
          <mesh position={[0.3, 1, 0.75]}>
            <boxGeometry args={[0.06, 0.12, 0.04]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Sink area */}
      <group position={[0, 0, 1.5]}>
        {/* Sink counter */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[6, 0.1, 0.8]} />
          <meshStandardMaterial color="#475569" roughness={0.4} />
        </mesh>
        {/* Sinks - 3 basins */}
        {[-2, 0, 2].map((x, i) => (
          <group key={i} position={[x, 0.9, 0]}>
            <mesh>
              <cylinderGeometry args={[0.25, 0.2, 0.15, 16]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.3} />
            </mesh>
            {/* Faucet */}
            <mesh position={[0, 0.15, -0.2]}>
              <boxGeometry args={[0.08, 0.25, 0.08]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.25, -0.1]}>
              <boxGeometry args={[0.06, 0.06, 0.2]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
        {/* Mirror */}
        <mesh position={[0, 1.6, -0.35]}>
          <boxGeometry args={[5.5, 1.2, 0.05]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Hand dryers on wall */}
      {[-3, 3].map((x, i) => (
        <mesh key={i} position={[x, 1.3, 2.35]}>
          <boxGeometry args={[0.4, 0.35, 0.25]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
      ))}

      {/* Restroom sign above entrance */}
      <mesh position={[0, 2.8, 2.6]}>
        <boxGeometry args={[1.5, 0.4, 0.05]} />
        <meshStandardMaterial color="#1e40af" roughness={0.5} />
      </mesh>

      {/* Overhead light */}
      <pointLight position={[0, 2.8, 0]} color="#f8fafc" intensity={0.6} distance={8} />
    </group>
  );
};

// Manager's Office component - glass-fronted office overlooking factory floor
const ManagerOffice: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Floor - carpet */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.5, -3]} receiveShadow castShadow>
        <boxGeometry args={[8, 3, 0.15]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Side walls */}
      <mesh position={[-4, 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 3, 6]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[4, 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 3, 6]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Front wall - glass panels with door gap */}
      <mesh position={[-2.5, 1.5, 3]} receiveShadow castShadow>
        <boxGeometry args={[3, 3, 0.1]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[2.5, 1.5, 3]} receiveShadow castShadow>
        <boxGeometry args={[3, 3, 0.1]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[0, 2.7, 3]} receiveShadow castShadow>
        <boxGeometry args={[2, 0.6, 0.1]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} roughness={0.1} />
      </mesh>
      {/* Glass door frame */}
      <mesh position={[-1, 1.2, 3]}>
        <boxGeometry args={[0.08, 2.4, 0.12]} />
        <meshStandardMaterial color="#374151" metalness={0.6} />
      </mesh>
      <mesh position={[1, 1.2, 3]}>
        <boxGeometry args={[0.08, 2.4, 0.12]} />
        <meshStandardMaterial color="#374151" metalness={0.6} />
      </mesh>

      {/* Desk */}
      <group position={[0, 0, -1]}>
        {/* Desktop */}
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[2.5, 0.08, 1.2]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>
        {/* Front panel */}
        <mesh position={[0, 0.37, 0.55]} castShadow>
          <boxGeometry args={[2.5, 0.7, 0.05]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>
        {/* Desk legs */}
        {[
          [-1.15, -0.55],
          [1.15, -0.55],
          [-1.15, 0.5],
          [1.15, 0.5],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.35, z]} castShadow>
            <boxGeometry args={[0.08, 0.7, 0.08]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        ))}
        {/* Drawer unit */}
        <mesh position={[0.8, 0.35, 0]} castShadow>
          <boxGeometry args={[0.5, 0.65, 0.9]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>
        {/* Drawer handles */}
        {[0.5, 0.25, 0].map((y, i) => (
          <mesh key={i} position={[0.8, y, 0.46]}>
            <boxGeometry args={[0.2, 0.03, 0.03]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Computer monitor */}
      <group position={[0, 0.79, -1.3]}>
        {/* Screen */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.8, 0.5, 0.04]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} />
        </mesh>
        {/* Screen glow */}
        <mesh position={[0, 0.25, 0.025]}>
          <planeGeometry args={[0.7, 0.4]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
        {/* Stand */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.15, 0.08, 0.15]} />
          <meshStandardMaterial color="#374151" metalness={0.7} />
        </mesh>
        {/* Base */}
        <mesh position={[0, -0.02, 0.05]}>
          <boxGeometry args={[0.3, 0.03, 0.25]} />
          <meshStandardMaterial color="#374151" metalness={0.7} />
        </mesh>
      </group>

      {/* Keyboard */}
      <mesh position={[0, 0.8, -0.7]}>
        <boxGeometry args={[0.5, 0.02, 0.18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Mouse */}
      <mesh position={[0.4, 0.8, -0.7]}>
        <boxGeometry args={[0.08, 0.02, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Office chair */}
      <group position={[0, 0, 0.2]}>
        {/* Seat */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.8, 0.2]} castShadow>
          <boxGeometry args={[0.48, 0.6, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        {/* Chair base */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        {/* Chair wheel base */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.03, 5]} />
          <meshStandardMaterial color="#374151" metalness={0.6} />
        </mesh>
      </group>

      {/* Filing cabinet */}
      <group position={[-3, 0, -2]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.5, 1.2, 0.6]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Drawer fronts */}
        {[0.9, 0.5, 0.1].map((y, i) => (
          <group key={i}>
            <mesh position={[0, y, 0.31]}>
              <planeGeometry args={[0.45, 0.35]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0.15, y, 0.32]}>
              <boxGeometry args={[0.1, 0.03, 0.02]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Whiteboard on back wall */}
      <group position={[2, 1.5, -2.9]}>
        {/* Board frame */}
        <mesh>
          <boxGeometry args={[2, 1.2, 0.05]} />
          <meshStandardMaterial color="#374151" roughness={0.6} />
        </mesh>
        {/* White surface */}
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1.9, 1.1]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        {/* Marker tray */}
        <mesh position={[0, -0.65, 0.08]}>
          <boxGeometry args={[1.5, 0.08, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} />
        </mesh>
      </group>

      {/* Wall clock */}
      <group position={[-2, 2.2, -2.9]}>
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.22, 32]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* Potted plant in corner */}
      <group position={[3, 0, -2]}>
        {/* Pot */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {/* Plant */}
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#15803d" roughness={0.9} />
        </mesh>
      </group>

      {/* "MANAGER'S OFFICE" sign - large and prominent above door */}
      <group position={[0, 3.2, 3.2]}>
        {/* Sign backing/frame - dark blue */}
        <mesh>
          <boxGeometry args={[3, 0.7, 0.1]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Sign face - dark blue background */}
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[2.8, 0.55, 0.02]} />
          <meshStandardMaterial color="#1e40af" roughness={0.3} />
        </mesh>
        {/* Text simulation - GOLD lettering */}
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[2.4, 0.22, 0.02]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.8}
            roughness={0.2}
            emissive="#b8860b"
            emissiveIntensity={0.15}
          />
        </mesh>
        {/* Mounting brackets */}
        <mesh position={[-1.4, 0, -0.1]}>
          <boxGeometry args={[0.15, 0.5, 0.25]} />
          <meshStandardMaterial color="#374151" metalness={0.7} />
        </mesh>
        <mesh position={[1.4, 0, -0.1]}>
          <boxGeometry args={[0.15, 0.5, 0.25]} />
          <meshStandardMaterial color="#374151" metalness={0.7} />
        </mesh>
      </group>

      {/* Door nameplate on glass door frame - gold on blue */}
      <group position={[0.7, 1.5, 3.15]}>
        <mesh>
          <boxGeometry args={[0.6, 0.2, 0.02]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <boxGeometry args={[0.5, 0.12, 0.01]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Overhead lights */}
      <pointLight position={[0, 2.8, 0]} color="#f8fafc" intensity={0.5} distance={8} />
      <pointLight position={[-2, 2.8, -1]} color="#fef3c7" intensity={0.3} distance={5} />
    </group>
  );
};

export const FactoryWalls: React.FC<FactoryWallsProps> = () => {
  const graphics = useMillStore((state: any) => state.graphics);
  const isLowGraphics = graphics.quality === 'low';

  return (
    <group>
      {/* Break Room Areas - positioned inside factory along side walls */}
      {!isLowGraphics && (
        <>
          {/* Left break room (inside factory, near packing area) */}
          <group rotation={[0, 0, 0]}>
            <BreakRoom position={[-35, 0, 25]} />
          </group>
          {/* Right break room (inside factory, near packing area) */}
          <group rotation={[0, 0, 0]}>
            <BreakRoom position={[35, 0, 25]} />
          </group>
        </>
      )}

      {/* Locker Room inside factory near front wall */}
      {!isLowGraphics && <LockerRoom position={[-35, 0, 35]} />}

      {/* Toilet Block inside factory (opposite locker room) */}
      {!isLowGraphics && <ToiletBlock position={[35, 0, 35]} />}

      {/* Manager's Office - near locker room and break room area */}
      {!isLowGraphics && <ManagerOffice position={[-20, 0, 30]} />}

      {/* Personnel doors for entry/exit */}
      {!isLowGraphics && (
        <>
          {/* Main entrance - front left (near locker room) */}
          <PersonnelDoor
            position={[-45, 0, 42]}
            rotation={0}
            label="MAIN ENTRANCE"
          />
          {/* Secondary entrance - front right (near toilet block) */}
          <PersonnelDoor
            position={[45, 0, 42]}
            rotation={0}
            label="ENTRANCE"
          />
          {/* Emergency exit - left side wall */}
          <PersonnelDoor
            position={[-55, 0, 0]}
            rotation={Math.PI / 2}
            label="EMERGENCY EXIT"
            isEmergencyExit
          />
          {/* Emergency exit - right side wall */}
          <PersonnelDoor
            position={[55, 0, 0]}
            rotation={-Math.PI / 2}
            label="EMERGENCY EXIT"
            isEmergencyExit
          />
          {/* Emergency exit - back wall left */}
          <PersonnelDoor
            position={[-25, 0, -45]}
            rotation={Math.PI}
            label="EMERGENCY EXIT"
            isEmergencyExit
          />
          {/* Emergency exit - back wall right */}
          <PersonnelDoor
            position={[25, 0, -45]}
            rotation={Math.PI}
            label="EMERGENCY EXIT"
            isEmergencyExit
          />
        </>
      )}

      {/* Portable toilets near yard areas */}
      {!isLowGraphics && (
        <>
          <PortableToilet position={[-50, 0, 45]} rotation={Math.PI / 4} />
          <PortableToilet position={[50, 0, 45]} rotation={-Math.PI / 4} />
          <PortableToilet position={[-50, 0, -45]} rotation={Math.PI / 2} />
        </>
      )}

      {/* Catwalks at elevated level - skip on low graphics */}
      {!isLowGraphics && (
        <group position={[0, 6, 0]}>
          {/* Main catwalk (wider span) */}
          <mesh receiveShadow castShadow>
            <boxGeometry args={[100, 0.15, 3]} />
            <meshStandardMaterial
              color="#475569"
              metalness={0.8}
              roughness={0.3}
              transparent
              opacity={0.95}
            />
          </mesh>
          {/* Railings */}
          <mesh position={[0, 0.6, 1.4]} castShadow>
            <boxGeometry args={[100, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.6, -1.4]} castShadow>
            <boxGeometry args={[100, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.3, 1.4]} castShadow>
            <boxGeometry args={[100, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.3, -1.4]} castShadow>
            <boxGeometry args={[100, 0.05, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Vertical posts */}
          {Array.from({ length: 34 }).map((_, i) => (
            <group key={i}>
              <mesh position={[-48 + i * 3, 0.3, 1.4]} castShadow>
                <boxGeometry args={[0.05, 0.6, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[-48 + i * 3, 0.3, -1.4]} castShadow>
                <boxGeometry args={[0.05, 0.6, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Grating texture (simplified) */}
          <mesh position={[0, 0.08, 0]}>
            <planeGeometry args={[100, 3]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.7}
              roughness={0.4}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      )}

      {/* Catwalk supports - skip on low graphics */}
      {!isLowGraphics &&
        [-40, -25, -10, 10, 25, 40].map((x, i) => (
          <mesh key={i} position={[x, 3, 0]} castShadow>
            <boxGeometry args={[0.3, 6, 0.3]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}

      {/* Stairs to catwalk - left side */}
      {!isLowGraphics && (
        <group position={[-55.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {/* Stair steps */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[0, (i + 1) * 0.5, i * 0.5]} castShadow>
              <boxGeometry args={[1.5, 0.1, 0.5]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Handrail posts - one at each step */}
          {Array.from({ length: 12 }).map((_, i) => (
            <group key={`post-${i}`}>
              <mesh position={[0.7, (i + 1) * 0.5 + 0.5, i * 0.5]} castShadow>
                <boxGeometry args={[0.05, 1, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[-0.7, (i + 1) * 0.5 + 0.5, i * 0.5]} castShadow>
                <boxGeometry args={[0.05, 1, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Handrail tubes - connecting posts */}
          {Array.from({ length: 11 }).map((_, i) => (
            <group key={`rail-${i}`}>
              <mesh
                position={[0.7, (i + 1.5) * 0.5 + 0.75, (i + 0.5) * 0.5]}
                rotation={[-Math.atan2(0.5, 0.5), 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.025, 0.025, 0.71, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh
                position={[-0.7, (i + 1.5) * 0.5 + 0.75, (i + 0.5) * 0.5]}
                rotation={[-Math.atan2(0.5, 0.5), 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.025, 0.025, 0.71, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Stairs to catwalk - right side */}
      {!isLowGraphics && (
        <group position={[55.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          {/* Stair steps */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[0, (i + 1) * 0.5, i * 0.5]} castShadow>
              <boxGeometry args={[1.5, 0.1, 0.5]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Handrail posts - one at each step */}
          {Array.from({ length: 12 }).map((_, i) => (
            <group key={`post-${i}`}>
              <mesh position={[0.7, (i + 1) * 0.5 + 0.5, i * 0.5]} castShadow>
                <boxGeometry args={[0.05, 1, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[-0.7, (i + 1) * 0.5 + 0.5, i * 0.5]} castShadow>
                <boxGeometry args={[0.05, 1, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* Handrail tubes - connecting posts */}
          {Array.from({ length: 11 }).map((_, i) => (
            <group key={`rail-${i}`}>
              <mesh
                position={[0.7, (i + 1.5) * 0.5 + 0.75, (i + 0.5) * 0.5]}
                rotation={[-Math.atan2(0.5, 0.5), 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.025, 0.025, 0.71, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh
                position={[-0.7, (i + 1.5) * 0.5 + 0.75, (i + 0.5) * 0.5]}
                rotation={[-Math.atan2(0.5, 0.5), 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.025, 0.025, 0.71, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ========== FACTORY SIGNS ========== */}
      {!isLowGraphics && (
        <>
          {/* Zone identification signs - mounted on catwalk supports */}
          {/* Zone 1: Silos (Raw Materials) */}
          <group position={[-40, 4.5, 1.8]}>
            <mesh>
              <boxGeometry args={[2.5, 0.6, 0.08]} />
              <meshStandardMaterial color="#1e40af" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[2.3, 0.45]} />
              <meshStandardMaterial color="#dbeafe" />
            </mesh>
          </group>

          {/* Zone 2: Milling Floor */}
          <group position={[-10, 4.5, 1.8]}>
            <mesh>
              <boxGeometry args={[2.5, 0.6, 0.08]} />
              <meshStandardMaterial color="#15803d" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[2.3, 0.45]} />
              <meshStandardMaterial color="#dcfce7" />
            </mesh>
          </group>

          {/* Zone 3: Sifting */}
          <group position={[10, 4.5, 1.8]}>
            <mesh>
              <boxGeometry args={[2, 0.6, 0.08]} />
              <meshStandardMaterial color="#b45309" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[1.8, 0.45]} />
              <meshStandardMaterial color="#fef3c7" />
            </mesh>
          </group>

          {/* Zone 4: Packing */}
          <group position={[40, 4.5, 1.8]}>
            <mesh>
              <boxGeometry args={[2, 0.6, 0.08]} />
              <meshStandardMaterial color="#7c3aed" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[1.8, 0.45]} />
              <meshStandardMaterial color="#ede9fe" />
            </mesh>
          </group>

          {/* Safety signs - yellow with black text background */}
          {/* Hard Hat Area - near entrance */}
          <group position={[-42, 2.5, 40]} rotation={[0, Math.PI, 0]}>
            <mesh>
              <boxGeometry args={[1.8, 0.5, 0.05]} />
              <meshStandardMaterial color="#eab308" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[1.6, 0.35]} />
              <meshStandardMaterial color="#1c1917" />
            </mesh>
          </group>

          {/* Safety First - near milling area */}
          <group position={[0, 2.5, -10]} rotation={[0, 0, 0]}>
            <mesh>
              <boxGeometry args={[2, 0.5, 0.05]} />
              <meshStandardMaterial color="#22c55e" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[1.8, 0.35]} />
              <meshStandardMaterial color="#f0fdf4" />
            </mesh>
          </group>

          {/* Eye Protection Required - near sifters */}
          <group position={[15, 2.5, 8]} rotation={[0, -Math.PI / 4, 0]}>
            <mesh>
              <boxGeometry args={[2.2, 0.5, 0.05]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[2, 0.35]} />
              <meshStandardMaterial color="#eff6ff" />
            </mesh>
          </group>

          {/* Hearing Protection - near roller mills */}
          <group position={[-15, 2.5, -5]} rotation={[0, Math.PI / 6, 0]}>
            <mesh>
              <boxGeometry args={[2.4, 0.5, 0.05]} />
              <meshStandardMaterial color="#f97316" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[2.2, 0.35]} />
              <meshStandardMaterial color="#fff7ed" />
            </mesh>
          </group>

          {/* Forklift Traffic warning signs */}
          {/* Near loading dock */}
          <group position={[0, 2.2, 42]} rotation={[0, Math.PI, 0]}>
            <mesh>
              <boxGeometry args={[2.5, 0.6, 0.05]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[2.3, 0.45]} />
              <meshStandardMaterial color="#fef2f2" />
            </mesh>
          </group>

          {/* Loading Dock directional sign */}
          <group position={[25, 3, 35]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh>
              <boxGeometry args={[2.2, 0.5, 0.05]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[2, 0.35]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            {/* Arrow */}
            <mesh position={[0.85, 0, 0.04]}>
              <boxGeometry args={[0.3, 0.15, 0.02]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>

          {/* Authorized Personnel Only - near silos */}
          <group position={[-35, 2.5, -35]} rotation={[0, Math.PI / 2, 0]}>
            <mesh>
              <boxGeometry args={[2.8, 0.5, 0.05]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[2.6, 0.35]} />
              <meshStandardMaterial color="#fef2f2" />
            </mesh>
          </group>

          {/* No Smoking sign */}
          <group position={[40, 2.2, -20]} rotation={[0, -Math.PI / 3, 0]}>
            <mesh>
              <cylinderGeometry args={[0.35, 0.35, 0.05, 32]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.3, 32]} />
              <meshStandardMaterial color="#fef2f2" />
            </mesh>
            {/* Diagonal line */}
            <mesh position={[0, 0, 0.04]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.5, 0.06, 0.02]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          </group>

          {/* Fire Extinguisher location signs */}
          {[
            [-50, 2, 20],
            [50, 2, 20],
            [-50, 2, -20],
            [50, 2, -20],
          ].map((pos, i) => (
            <group key={`fire-sign-${i}`} position={pos as [number, number, number]}>
              <mesh>
                <boxGeometry args={[0.5, 0.6, 0.05]} />
                <meshStandardMaterial color="#dc2626" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[0.4, 0.5]} />
                <meshStandardMaterial color="#fef2f2" />
              </mesh>
              {/* Extinguisher icon (simplified) */}
              <mesh position={[0, 0.05, 0.04]}>
                <boxGeometry args={[0.15, 0.3, 0.02]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
            </group>
          ))}

          {/* First Aid station signs */}
          {[
            [-35, 2, 30],
            [35, 2, 30],
          ].map((pos, i) => (
            <group key={`firstaid-${i}`} position={pos as [number, number, number]}>
              <mesh>
                <boxGeometry args={[0.6, 0.6, 0.05]} />
                <meshStandardMaterial color="#22c55e" roughness={0.4} />
              </mesh>
              {/* White cross */}
              <mesh position={[0, 0, 0.03]}>
                <boxGeometry args={[0.35, 0.12, 0.02]} />
                <meshStandardMaterial color="#f0fdf4" />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <boxGeometry args={[0.12, 0.35, 0.02]} />
                <meshStandardMaterial color="#f0fdf4" />
              </mesh>
            </group>
          ))}

          {/* Assembly Point sign - outside near entrance */}
          <group position={[-48, 2.5, 48]} rotation={[0, Math.PI / 4, 0]}>
            <mesh>
              <boxGeometry args={[2, 0.6, 0.05]} />
              <meshStandardMaterial color="#22c55e" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[1.8, 0.45]} />
              <meshStandardMaterial color="#f0fdf4" />
            </mesh>
            {/* People icons (simplified) */}
            {[-0.4, 0, 0.4].map((x, i) => (
              <group key={i} position={[x, 0, 0.04]}>
                <mesh position={[0, 0.12, 0]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshStandardMaterial color="#15803d" />
                </mesh>
                <mesh position={[0, -0.02, 0]}>
                  <boxGeometry args={[0.08, 0.15, 0.02]} />
                  <meshStandardMaterial color="#15803d" />
                </mesh>
              </group>
            ))}
          </group>
        </>
      )}
    </group>
  );
};
