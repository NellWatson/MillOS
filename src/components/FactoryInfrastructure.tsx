import React from 'react';

interface Props {
  floorSize: number;
  showZones: boolean;
}

export const FactoryInfrastructure: React.FC<Props> = ({ floorSize, showZones }) => {
  return (
    <group>
      {/* Main floor with industrial markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Floor grid lines */}
      {Array.from({ length: 15 }).map((_, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-35 + i * 5, 0.01, 0]}>
            <planeGeometry args={[0.05, floorSize]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.5} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -35 + i * 5]}>
            <planeGeometry args={[floorSize, 0.05]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* Safety walkways */}
      {showZones && (
        <>
          {/* Main aisles */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.02, 0]}>
            <planeGeometry args={[3, floorSize - 10]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.15} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.02, 0]}>
            <planeGeometry args={[3, floorSize - 10]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.15} />
          </mesh>

          {/* Cross aisles */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 10]}>
            <planeGeometry args={[floorSize - 20, 2]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.15} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -10]}>
            <planeGeometry args={[floorSize - 20, 2]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.15} />
          </mesh>

          {/* Danger zones around machinery */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -20]}>
            <planeGeometry args={[50, 8]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.08} />
          </mesh>
        </>
      )}

      {/* Catwalks at elevated level */}
      <group position={[0, 6, 0]}>
        {/* Main catwalk */}
        <mesh receiveShadow castShadow>
          <boxGeometry args={[50, 0.15, 3]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} transparent opacity={0.95} />
        </mesh>
        {/* Railings */}
        <mesh position={[0, 0.6, 1.4]} castShadow>
          <boxGeometry args={[50, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.6, -1.4]} castShadow>
          <boxGeometry args={[50, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, 1.4]} castShadow>
          <boxGeometry args={[50, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, -1.4]} castShadow>
          <boxGeometry args={[50, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Vertical posts */}
        {Array.from({ length: 20 }).map((_, i) => (
          <group key={i}>
            <mesh position={[-24 + i * 2.5, 0.3, 1.4]} castShadow>
              <boxGeometry args={[0.05, 0.6, 0.05]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[-24 + i * 2.5, 0.3, -1.4]} castShadow>
              <boxGeometry args={[0.05, 0.6, 0.05]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}
        {/* Grating texture (simplified) */}
        <mesh position={[0, 0.08, 0]}>
          <planeGeometry args={[50, 3]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Catwalk supports */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <mesh key={i} position={[x, 3, 0]} castShadow>
          <boxGeometry args={[0.3, 6, 0.3]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Stairs to catwalk */}
      <group position={[-26, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[0, 0.25 + i * 0.5, -i * 0.4]} castShadow>
            <boxGeometry args={[1.5, 0.1, 0.4]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
