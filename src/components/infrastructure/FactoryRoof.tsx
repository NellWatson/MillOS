import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useGraphicsStore } from '../../stores/graphicsStore';

interface FactoryRoofProps {
  floorWidth: number;
  floorDepth: number;
}

// Volumetric fog layer for atmospheric depth
const VolumetricFog: React.FC<{ density?: number }> = React.memo(({ density = 0.015 }) => {
  const gameTime = useGameSimulationStore((state) => state.gameTime);

  // Fog is denser in early morning and evening
  const timeBasedDensity = useMemo(() => {
    if (gameTime >= 5 && gameTime < 8) return density * 1.5; // Morning mist
    if (gameTime >= 18 && gameTime < 21) return density * 1.3; // Evening haze
    if (gameTime >= 21 || gameTime < 5) return density * 0.8; // Night
    return density;
  }, [gameTime, density]);

  return (
    <group>
      {/* Lower fog layer - denser near floor */}
      <mesh position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 90]} />
        <meshBasicMaterial
          color="#94a3b8"
          transparent
          opacity={timeBasedDensity * 2}
          depthWrite={false}
          depthTest={false} // Added for explicit depth testing control
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mid-level fog patches */}
      {[
        [-20, 8, -10],
        [15, 10, 5],
        [-10, 12, 15],
        [25, 7, -15],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[8 + i * 2, 16, 16]} />
          <meshBasicMaterial
            color="#cbd5e1"
            transparent
            opacity={timeBasedDensity * 0.8}
            depthWrite={false}
            depthTest={false} // Added for explicit depth testing control
            side={THREE.BackSide}
          />
        </mesh>
      ))}

      {/* Light shaft interaction fog volumes */}
      {[-20, 0, 20].map((x, i) => (
        <mesh key={i} position={[x, 15, 0]}>
          <cylinderGeometry args={[4, 6, 20, 16, 1, true]} />
          <meshBasicMaterial
            color="#fef3c7"
            transparent
            opacity={timeBasedDensity * 0.5}
            depthWrite={false}
            depthTest={false} // Added for explicit depth testing control
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
});

// Ventilation duct system
const VentilationDuct: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  size?: [number, number];
}> = ({ start, end, size = [1.2, 0.8] }) => {
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2) + Math.pow(end[2] - start[2], 2)
  );

  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ).normalize();

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    return q;
  }, [direction]);

  return (
    <group position={midpoint} quaternion={quaternion}>
      {/* Main duct body */}
      <mesh castShadow>
        <boxGeometry args={[size[0], size[1], length]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Seam lines */}
      {Array.from({ length: Math.floor(length / 3) }).map((_, i) => (
        <mesh key={i} position={[0, size[1] / 2 + 0.01, -length / 2 + (i + 1) * 3]}>
          <boxGeometry args={[size[0] + 0.02, 0.02, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// Vent grille
const VentGrille: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
}> = ({ position, rotation = [0, 0, 0], size = [0.6, 0.4] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[size[0] + 0.1, size[1] + 0.1, 0.05]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Slats */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, -size[1] / 2 + 0.05 + i * (size[1] / 6), 0.03]}
          rotation={[0.3, 0, 0]}
        >
          <boxGeometry args={[size[0] - 0.05, 0.02, 0.04]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

export const FactoryRoof: React.FC<FactoryRoofProps> = () => {
  const graphics = useGraphicsStore((state) => state.graphics);
  const showVolumetricFog = graphics.enableVolumetricFog;
  const showVentilationDucts = graphics.enableVentilationDucts;

  return (
    <group>
      {/* Volumetric fog - high/ultra graphics only */}
      {showVolumetricFog && <VolumetricFog density={0.012} />}

      {/* Ventilation ducts - high/ultra graphics only */}
      {showVentilationDucts && (
        <>
          {/* Main HVAC duct running along ceiling (wider span) */}
          <VentilationDuct start={[-55, 26, 15]} end={[55, 26, 15]} size={[1.5, 1]} />
          <VentilationDuct start={[-55, 26, -15]} end={[55, 26, -15]} size={[1.5, 1]} />

          {/* Cross ducts */}
          <VentilationDuct start={[-35, 26, -25]} end={[-35, 26, 25]} size={[1, 0.8]} />
          <VentilationDuct start={[35, 26, -25]} end={[35, 26, 25]} size={[1, 0.8]} />
          <VentilationDuct start={[0, 26, -25]} end={[0, 26, 25]} size={[1, 0.8]} />

          {/* Vent grilles on walls (walls at x=±60) */}
          <VentGrille position={[-58, 8, -25]} rotation={[0, Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[-58, 8, 0]} rotation={[0, Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[-58, 8, 25]} rotation={[0, Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[58, 8, -25]} rotation={[0, -Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[58, 8, 0]} rotation={[0, -Math.PI / 2, 0]} size={[0.8, 0.5]} />
          <VentGrille position={[58, 8, 25]} rotation={[0, -Math.PI / 2, 0]} size={[0.8, 0.5]} />
        </>
      )}
    </group>
  );
};
