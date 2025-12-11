import React from 'react';
import { Text } from '@react-three/drei';
import { DoubleSide } from 'three';

interface FactoryExteriorProps {
  floorWidth?: number;
  floorDepth?: number;
}

// Factory exterior walls with large signs - positioned OUTSIDE the existing factory elements
export const FactoryExterior: React.FC<FactoryExteriorProps> = () => {
  // Wall dimensions - positioned outside the factory floor
  const wallHeight = 20; // Same height for ALL walls
  const wallThickness = 0.4;

  // Exterior wall positions - these are OUTSIDE the existing factory elements
  // Factory floor extends to about x=±60, z=±80 (for truck yards)
  // Main building is roughly x=±55, z=±45 where personnel doors are
  const buildingHalfWidth = 58; // X extent (slightly outside the x=±55 doors)
  const buildingFrontZ = 48; // Front wall Z (behind the z=42 front doors)
  const buildingBackZ = -48; // Back wall Z (behind the z=-45 back doors)

  // Dock opening dimensions - THREE doors spaced apart for two truck lanes
  const dockOpeningWidth = 10; // Width of each door
  const dockOpeningHeight = 10;
  const doorSpacing = 16; // Space between door centers (doors at -16, 0, +16)

  // Colors
  const wallColor = '#475569';
  const trimColor = '#374151';
  const signBackgroundColor = '#1e3a5f';
  const signTextColor = '#fbbf24';

  return (
    <group>
      {/* ========== FRONT WALL (Z+) with THREE dock openings spaced apart ========== */}
      {/* Far left section - FULL HEIGHT */}
      <mesh
        position={[-buildingHalfWidth / 2 - doorSpacing / 2, wallHeight / 2, buildingFrontZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[buildingHalfWidth - doorSpacing - dockOpeningWidth, wallHeight, wallThickness]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Wall section between left door and center door */}
      <mesh position={[-doorSpacing / 2, wallHeight / 2, buildingFrontZ]} castShadow receiveShadow>
        <boxGeometry args={[doorSpacing - dockOpeningWidth, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Wall section between center door and right door */}
      <mesh position={[doorSpacing / 2, wallHeight / 2, buildingFrontZ]} castShadow receiveShadow>
        <boxGeometry args={[doorSpacing - dockOpeningWidth, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Far right section - FULL HEIGHT */}
      <mesh
        position={[buildingHalfWidth / 2 + doorSpacing / 2, wallHeight / 2, buildingFrontZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[buildingHalfWidth - doorSpacing - dockOpeningWidth, wallHeight, wallThickness]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Sections above each of the THREE dock openings */}
      {[-doorSpacing, 0, doorSpacing].map((x, i) => (
        <mesh
          key={`door-top-${i}`}
          position={[x, wallHeight - (wallHeight - dockOpeningHeight) / 2, buildingFrontZ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[dockOpeningWidth, wallHeight - dockOpeningHeight, wallThickness]} />
          <meshStandardMaterial
            color={wallColor}
            roughness={0.8}
            metalness={0.2}
            side={DoubleSide}
          />
        </mesh>
      ))}

      {/* Front wall trim */}
      <mesh position={[0, wallHeight + 0.3, buildingFrontZ]}>
        <boxGeometry args={[buildingHalfWidth * 2 + 1, 0.6, 0.8]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* ========== FRONT SIGN - Large Red Sign (similar to truck signage) ========== */}
      <group position={[0, wallHeight / 2 + 2, buildingFrontZ + 1.5]}>
        {/* Main sign background - Red like the truck signs */}
        <mesh frustumCulled={false}>
          <boxGeometry args={[80, 10, 0.5]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
        {/* Gold trim border */}
        <mesh position={[0, 0, 0.3]} frustumCulled={false}>
          <boxGeometry args={[82, 10.6, 0.15]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        {/* Inner red panel */}
        <mesh position={[0, 0, 0.4]} frustumCulled={false}>
          <boxGeometry args={[79, 9.5, 0.1]} />
          <meshBasicMaterial color="#b91c1c" />
        </mesh>
        {/* Company name */}
        <Text
          position={[0, 1.5, 0.6]}
          fontSize={5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.1}
          outlineColor="#7f1d1d"
        >
          MILLOS GRAIN MILL
        </Text>
        {/* Tagline */}
        <Text
          position={[0, -2.5, 0.6]}
          fontSize={1.8}
          color="#fef3c7"
          anchorX="center"
          anchorY="middle"
        >
          EST. 1952 • QUALITY FLOUR PRODUCTS
        </Text>
      </group>

      {/* ========== BACK WALL (Z-) with dock opening ========== */}
      {/* Left section - FULL HEIGHT */}
      <mesh
        position={[-(buildingHalfWidth / 2 + dockOpeningWidth / 4), wallHeight / 2, buildingBackZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[buildingHalfWidth - dockOpeningWidth / 2, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>
      {/* Right section - FULL HEIGHT */}
      <mesh
        position={[buildingHalfWidth / 2 + dockOpeningWidth / 4, wallHeight / 2, buildingBackZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[buildingHalfWidth - dockOpeningWidth / 2, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>
      {/* Section above dock opening - matches wall height */}
      <mesh
        position={[0, wallHeight - (wallHeight - dockOpeningHeight) / 2, buildingBackZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dockOpeningWidth, wallHeight - dockOpeningHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Back wall trim */}
      <mesh position={[0, wallHeight + 0.3, buildingBackZ]}>
        <boxGeometry args={[buildingHalfWidth * 2 + 1, 0.6, 0.8]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* ========== BACK SIGN - Large Red Sign (matching front sign) ========== */}
      <group position={[0, wallHeight / 2 + 2, buildingBackZ - 1.5]} rotation={[0, Math.PI, 0]}>
        {/* Main sign background - Red like the truck signs */}
        <mesh frustumCulled={false}>
          <boxGeometry args={[80, 10, 0.5]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
        {/* Gold trim border */}
        <mesh position={[0, 0, 0.3]} frustumCulled={false}>
          <boxGeometry args={[82, 10.6, 0.15]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        {/* Inner red panel */}
        <mesh position={[0, 0, 0.4]} frustumCulled={false}>
          <boxGeometry args={[79, 9.5, 0.1]} />
          <meshBasicMaterial color="#b91c1c" />
        </mesh>
        {/* Company name */}
        <Text
          position={[0, 1.5, 0.6]}
          fontSize={5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.1}
          outlineColor="#7f1d1d"
        >
          MILLOS GRAIN MILL
        </Text>
        {/* Tagline */}
        <Text
          position={[0, -2.5, 0.6]}
          fontSize={1.8}
          color="#fef3c7"
          anchorX="center"
          anchorY="middle"
        >
          EST. 1952 • QUALITY FLOUR PRODUCTS
        </Text>
      </group>

      {/* ========== LEFT SIDE WALL (X-) ========== */}
      <mesh position={[-buildingHalfWidth, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, Math.abs(buildingFrontZ - buildingBackZ)]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>
      <mesh position={[-buildingHalfWidth, wallHeight + 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, Math.abs(buildingFrontZ - buildingBackZ) + 1]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* ========== RIGHT SIDE WALL (X+) ========== */}
      <mesh position={[buildingHalfWidth, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, Math.abs(buildingFrontZ - buildingBackZ)]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>
      <mesh position={[buildingHalfWidth, wallHeight + 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, Math.abs(buildingFrontZ - buildingBackZ) + 1]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* ========== CORNER COLUMNS ========== */}
      {[
        [-buildingHalfWidth, buildingFrontZ],
        [buildingHalfWidth, buildingFrontZ],
        [-buildingHalfWidth, buildingBackZ],
        [buildingHalfWidth, buildingBackZ],
      ].map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, wallHeight / 2 + 0.5, z]} castShadow>
          <boxGeometry args={[1.2, wallHeight + 1, 1.2]} />
          <meshStandardMaterial
            color={trimColor}
            roughness={0.6}
            metalness={0.4}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};
