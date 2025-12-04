import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';

// Get current season based on month
const getCurrentSeason = (): 'winter' | 'spring' | 'summer' | 'fall' => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};

interface StringLightsProps {
  position: [number, number, number];
  length?: number;
}

export const StringLights: React.FC<StringLightsProps> = ({ position, length = 5 }) => {
  const lightsRef = useRef<THREE.Group>(null);
  const bulbCount = Math.floor(length / 0.3);

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (lightsRef.current) {
      lightsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const offset = i * 0.5;
          mat.emissiveIntensity =
            0.6 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.4;
        }
      });
    }
  });

  // Memoize bulb positions with catenary sag
  const bulbPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < bulbCount; i++) {
      const t = i / (bulbCount - 1);
      const x = t * length - length / 2;
      const sag = Math.sin(t * Math.PI) * 0.3;
      positions.push([x, -sag, 0]);
    }
    return positions;
  }, [bulbCount, length]);

  // Cable geometry with sag
  const cableGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-length / 2, 0, 0),
      new THREE.Vector3(-length / 4, -0.15, 0),
      new THREE.Vector3(0, -0.2, 0),
      new THREE.Vector3(length / 4, -0.15, 0),
      new THREE.Vector3(length / 2, 0, 0),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.005, 4, false);
  }, [length]);

  return (
    <group position={position}>
      {/* Cable */}
      <mesh geometry={cableGeometry}>
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* Light bulbs */}
      <group ref={lightsRef}>
        {bulbPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial
              color={['#fbbf24', '#3b82f6', '#dc2626', '#22c55e'][i % 4]}
              emissive={['#fbbf24', '#3b82f6', '#dc2626', '#22c55e'][i % 4]}
              emissiveIntensity={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

interface PottedPlantProps {
  position: [number, number, number];
  type?: 'small' | 'medium' | 'large';
}

export const PottedPlant: React.FC<PottedPlantProps> = ({ position, type = 'medium' }) => {
  const sizes = {
    small: { pot: 0.12, height: 0.3 },
    medium: { pot: 0.18, height: 0.5 },
    large: { pot: 0.25, height: 0.8 },
  };
  const { pot, height } = sizes[type];

  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, pot / 2, 0]} castShadow>
        <cylinderGeometry args={[pot * 0.9, pot, pot, 16]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>

      {/* Soil */}
      <mesh position={[0, pot - 0.02, 0]}>
        <cylinderGeometry args={[pot * 0.85, pot * 0.85, 0.04, 16]} />
        <meshStandardMaterial color="#422006" roughness={0.95} />
      </mesh>

      {/* Plant stem */}
      <mesh position={[0, pot + height / 2, 0]}>
        <cylinderGeometry args={[0.01, 0.015, height, 8]} />
        <meshStandardMaterial color="#365314" roughness={0.8} />
      </mesh>

      {/* Leaves */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const heightPos = pot + height * 0.3 + (i / 6) * height * 0.6;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.08,
              heightPos,
              Math.sin(angle) * 0.08,
            ]}
            rotation={[0, angle, Math.PI / 3]}
          >
            <circleGeometry args={[0.08, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

interface DeskFanProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const DeskFan: React.FC<DeskFanProps> = ({ position, rotation = [0, 0, 0] }) => {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (bladesRef.current) {
      bladesRef.current.rotation.z += 0.3;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.04, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Stand */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Motor housing */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Cage front */}
      <mesh position={[0, 0.22, 0.08]}>
        <torusGeometry args={[0.1, 0.008, 8, 16]} />
        <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Blades */}
      <group ref={bladesRef} position={[0, 0.22, 0.05]}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            rotation={[0, 0, (i * Math.PI * 2) / 3]}
            position={[0.05, 0, 0]}
          >
            <boxGeometry args={[0.08, 0.04, 0.002]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Cage back */}
      <mesh position={[0, 0.22, -0.05]}>
        <torusGeometry args={[0.1, 0.008, 8, 16]} />
        <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

interface HarvestCornDisplayProps {
  position: [number, number, number];
}

export const HarvestCornDisplay: React.FC<HarvestCornDisplayProps> = ({ position }) => {
  return (
    <group position={position}>
      {/* Wooden crate */}
      <mesh>
        <boxGeometry args={[0.5, 0.3, 0.5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>

      {/* Corn stalks */}
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={i} position={[(i - 2) * 0.08, 0.15, (i % 2) * 0.05]}>
          {/* Stalk */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.8} />
          </mesh>

          {/* Corn ear */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.15, 8]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Decorative sign */}
      <mesh position={[0, 0.35, -0.26]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[0.3, 0.1]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.6} />
      </mesh>
    </group>
  );
};

// Main seasonal decorator component
interface SeasonalDecorationsProps {
  position?: [number, number, number];
  enabled?: boolean;
  forceSeason?: 'winter' | 'spring' | 'summer' | 'fall';
}

export const SeasonalDecorations: React.FC<SeasonalDecorationsProps> = ({
  position = [0, 0, 0],
  enabled = true,
  forceSeason,
}) => {
  const season = forceSeason ?? getCurrentSeason();

  if (!enabled) return null;

  return (
    <group position={position}>
      {/* Winter - String lights */}
      {season === 'winter' && (
        <group>
          <StringLights position={[-20, 3.5, -5]} length={8} />
          <StringLights position={[20, 3.5, 5]} length={8} />
          <StringLights position={[0, 3.5, 15]} length={10} />
        </group>
      )}

      {/* Spring - Potted plants */}
      {season === 'spring' && (
        <group>
          <PottedPlant position={[-25, 0, -5]} type="medium" />
          <PottedPlant position={[-25, 0, 5]} type="small" />
          <PottedPlant position={[25, 0, -5]} type="large" />
          <PottedPlant position={[0, 0, -30]} type="medium" />
          <PottedPlant position={[-15, 1.2, -8]} type="small" />
          <PottedPlant position={[15, 1.2, -8]} type="small" />
        </group>
      )}

      {/* Summer - Desk fans */}
      {season === 'summer' && (
        <group>
          <DeskFan position={[-20, 1.2, -8]} rotation={[0, 0.3, 0]} />
          <DeskFan position={[20, 1.2, -8]} rotation={[0, -0.3, 0]} />
          <DeskFan position={[0, 1.5, 10]} rotation={[0, Math.PI, 0]} />
        </group>
      )}

      {/* Fall - Harvest corn display */}
      {season === 'fall' && (
        <group>
          <HarvestCornDisplay position={[-25, 0, -2]} />
          <HarvestCornDisplay position={[25, 0, 2]} />
          <HarvestCornDisplay position={[0, 0, -30]} />
        </group>
      )}
    </group>
  );
};
