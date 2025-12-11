import React, { useMemo } from 'react';
import { useGraphicsStore } from '../../stores/graphicsStore';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

interface FactoryLightingProps {
  floorWidth: number;
  floorDepth: number;
}

type FixturePosition = { x: number; z: number };

export const FactoryLighting: React.FC<FactoryLightingProps> = ({ floorWidth, floorDepth }) => {
  const graphicsQuality = useGraphicsStore((state) => state.graphics.quality);
  const weather = useGameSimulationStore((state) => state.weather);

  const fixtures = useMemo<FixturePosition[]>(() => {
    // Building walls are at z=±48, so interior depth is ~96, not the full floor depth (160)
    // which includes truck yards. Constrain fixtures to actual building interior.
    const buildingInteriorDepth = Math.min(floorDepth, 96);
    const buildingInteriorWidth = Math.min(floorWidth, 116);

    // Leave a margin at the edges so fixtures don't sit on exterior walls
    const paddedWidth = Math.max(10, buildingInteriorWidth * 0.85);
    const paddedDepth = Math.max(10, buildingInteriorDepth * 0.85);

    // Density scales with available space but caps for performance
    const columns = Math.max(2, Math.min(4, Math.round(paddedWidth / 30)));
    const rows = Math.max(3, Math.min(6, Math.round(paddedDepth / 28)));

    const xStep = columns === 1 ? 0 : paddedWidth / (columns - 1);
    const zStep = rows === 1 ? 0 : paddedDepth / (rows - 1);
    const startX = -paddedWidth / 2;
    const startZ = -paddedDepth / 2;

    const positions: FixturePosition[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        positions.push({
          x: startX + col * xStep,
          z: startZ + row * zStep,
        });
      }
    }
    return positions;
  }, [floorDepth, floorWidth]);

  const { intensity, distance, emissive } = useMemo(() => {
    if (graphicsQuality === 'ultra') {
      return { intensity: 28, distance: 42, emissive: 1.2 };
    }
    if (graphicsQuality === 'high') {
      return { intensity: 22, distance: 36, emissive: 1.05 };
    }
    if (graphicsQuality === 'medium') {
      return { intensity: 16, distance: 30, emissive: 0.9 };
    }
    // Low quality: keep fixtures visible but avoid extra lights
    return { intensity: 0, distance: 0, emissive: 0.65 };
  }, [graphicsQuality]);

  const stormDimmer = weather === 'storm' ? 0.85 : 1;
  const fixtureHeight = 17.5;

  return (
    <group>
      {fixtures.map((fixture, index) => (
        <group key={`fixture-${index}`} position={[fixture.x, fixtureHeight, fixture.z]}>
          {intensity > 0 && (
            <pointLight
              castShadow={false}
              position={[0, -0.25, 0]}
              intensity={intensity * stormDimmer}
              distance={distance}
              decay={2}
              color="#fef3c7"
            />
          )}

          {/* Ceiling mount */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 1.2, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.35} />
          </mesh>

          {/* Housing */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.65, 0.95, 0.32, 10]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.5} />
          </mesh>

          {/* Lens */}
          <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.68, 20]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fef3c7"
              emissiveIntensity={emissive * stormDimmer}
              toneMapped={false}
            />
          </mesh>

          {/* Cross braces to visually tie fixtures to roof trusses */}
          {[-0.85, 0.85].map((offsetX) => (
            <mesh
              key={`brace-${index}-${offsetX}`}
              position={[offsetX, 0.4, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.03, 0.03, 1.8, 6]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};
