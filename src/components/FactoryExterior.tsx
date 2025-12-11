import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { DoubleSide } from 'three';

interface FactoryExteriorProps {
  floorWidth?: number;
  floorDepth?: number;
}

// Realistic grass colors
const GRASS_COLORS = {
  lawn: '#4a7c59', // Muted lawn green
  field: '#5c7a4a', // Field grass
  park: '#557a4a', // Park grass
  verge: '#6b8e5a', // Roadside verge
};

// Simple low-poly tree component
const SimpleTree: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => (
  <group position={position} scale={scale}>
    {/* Trunk */}
    <mesh position={[0, 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.4, 3, 6]} />
      <meshStandardMaterial color="#5d4037" roughness={0.9} />
    </mesh>
    {/* Foliage - simple cone */}
    <mesh position={[0, 4.5, 0]} castShadow>
      <coneGeometry args={[2, 5, 6]} />
      <meshStandardMaterial color="#2e7d32" roughness={0.8} />
    </mesh>
    <mesh position={[0, 6.5, 0]} castShadow>
      <coneGeometry args={[1.5, 3.5, 6]} />
      <meshStandardMaterial color="#388e3c" roughness={0.8} />
    </mesh>
  </group>
);

// Simple park bench
const ParkBench: React.FC<{ position: [number, number, number]; rotation?: number }> = ({
  position,
  rotation = 0,
}) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Seat */}
    <mesh position={[0, 0.45, 0]} castShadow>
      <boxGeometry args={[1.8, 0.1, 0.5]} />
      <meshStandardMaterial color="#8d6e63" roughness={0.7} />
    </mesh>
    {/* Backrest */}
    <mesh position={[0, 0.75, -0.2]} rotation={[0.2, 0, 0]} castShadow>
      <boxGeometry args={[1.8, 0.5, 0.08]} />
      <meshStandardMaterial color="#8d6e63" roughness={0.7} />
    </mesh>
    {/* Legs */}
    {[-0.7, 0.7].map((x, i) => (
      <mesh key={i} position={[x, 0.22, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.4]} />
        <meshStandardMaterial color="#424242" roughness={0.6} metalness={0.3} />
      </mesh>
    ))}
  </group>
);

// Small office building
const SmallOffice: React.FC<{
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: number;
}> = ({ position, size = [12, 8, 10], rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Main building */}
    <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#78909c" roughness={0.7} />
    </mesh>
    {/* Roof */}
    <mesh position={[0, size[1] + 0.3, 0]} castShadow>
      <boxGeometry args={[size[0] + 0.5, 0.6, size[2] + 0.5]} />
      <meshStandardMaterial color="#546e7a" roughness={0.6} />
    </mesh>
    {/* Windows - front */}
    {[-3, 0, 3].map((x, i) => (
      <mesh key={`front-${i}`} position={[x, size[1] / 2, size[2] / 2 + 0.05]}>
        <planeGeometry args={[2, 3]} />
        <meshStandardMaterial color="#90caf9" metalness={0.3} roughness={0.2} />
      </mesh>
    ))}
    {/* Door */}
    <mesh position={[0, 1.2, size[2] / 2 + 0.05]}>
      <planeGeometry args={[1.5, 2.4]} />
      <meshStandardMaterial color="#5d4037" roughness={0.8} />
    </mesh>
  </group>
);

// Gas station with canopy and pumps
const GasStation: React.FC<{ position: [number, number, number]; rotation?: number }> = ({
  position,
  rotation = 0,
}) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Station building */}
    <mesh position={[-12, 2.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[8, 5, 10]} />
      <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
    </mesh>
    {/* Building roof */}
    <mesh position={[-12, 5.3, 0]} castShadow>
      <boxGeometry args={[9, 0.5, 11]} />
      <meshStandardMaterial color="#b71c1c" roughness={0.5} />
    </mesh>
    {/* Shop window */}
    <mesh position={[-8.05, 2.5, 0]}>
      <planeGeometry args={[6, 3.5]} />
      <meshStandardMaterial color="#81d4fa" metalness={0.4} roughness={0.1} />
    </mesh>
    {/* Door */}
    <mesh position={[-8.05, 1.2, 3.5]}>
      <planeGeometry args={[1.2, 2.4]} />
      <meshStandardMaterial color="#424242" roughness={0.7} />
    </mesh>

    {/* Canopy structure */}
    {/* Canopy roof */}
    <mesh position={[0, 5, 0]} castShadow>
      <boxGeometry args={[16, 0.4, 12]} />
      <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
    </mesh>
    {/* Canopy fascia with Dead Dino orange brand color */}
    <mesh position={[0, 4.6, 0]}>
      <boxGeometry args={[16.5, 0.4, 12.5]} />
      <meshStandardMaterial color="#e65100" roughness={0.5} />
    </mesh>
    {/* Canopy support columns */}
    {[
      [-6, -4],
      [-6, 4],
      [6, -4],
      [6, 4],
    ].map(([x, z], i) => (
      <mesh key={`canopy-col-${i}`} position={[x, 2.5, z]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 5, 8]} />
        <meshStandardMaterial color="#9e9e9e" roughness={0.4} metalness={0.3} />
      </mesh>
    ))}

    {/* Fuel pumps - 2 islands with 2 pumps each */}
    {[-3, 3].map((x, pumpIsland) => (
      <group key={`island-${pumpIsland}`} position={[x, 0, 0]}>
        {/* Island base */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[2, 0.2, 6]} />
          <meshStandardMaterial color="#616161" roughness={0.8} />
        </mesh>
        {/* Pump units */}
        {[-1.5, 1.5].map((z, pumpIdx) => (
          <group key={`pump-${pumpIdx}`} position={[0, 0, z]}>
            {/* Pump body */}
            <mesh position={[0, 0.9, 0]} castShadow>
              <boxGeometry args={[0.6, 1.6, 0.5]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
            {/* Pump top - Dead Dino orange */}
            <mesh position={[0, 1.8, 0]} castShadow>
              <boxGeometry args={[0.7, 0.2, 0.6]} />
              <meshStandardMaterial color="#e65100" roughness={0.5} />
            </mesh>
            {/* Screen */}
            <mesh position={[0.31, 1.1, 0]}>
              <planeGeometry args={[0.01, 0.4, 0.3]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            {/* Nozzle holders */}
            <mesh position={[0.35, 0.6, 0]} castShadow>
              <boxGeometry args={[0.1, 0.5, 0.4]} />
              <meshStandardMaterial color="#212121" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
    ))}

    {/* Dead Dino Sign with cute dinosaur logo */}
    <group position={[10, 0, 0]}>
      {/* Sign pole */}
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 8, 8]} />
        <meshStandardMaterial color="#757575" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Sign background - orange for fun retro gas station vibe */}
      <mesh position={[0, 7.2, 0]} castShadow>
        <boxGeometry args={[4, 5, 0.3]} />
        <meshStandardMaterial color="#e65100" roughness={0.5} />
      </mesh>
      {/* Sign border */}
      <mesh position={[0, 7.2, 0.16]}>
        <boxGeometry args={[3.7, 4.7, 0.02]} />
        <meshStandardMaterial color="#fff3e0" roughness={0.5} />
      </mesh>

      {/* Cute Dead Dino Logo */}
      <group position={[0, 7.8, 0.25]}>
        {/* Dino body - chubby oval */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.7, 16, 12]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        {/* Dino belly */}
        <mesh position={[0, -0.1, 0.3]}>
          <sphereGeometry args={[0.45, 12, 10]} />
          <meshStandardMaterial color="#a5d6a7" roughness={0.6} />
        </mesh>
        {/* Dino head */}
        <mesh position={[0.5, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.45, 14, 12]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        {/* Dino snout */}
        <mesh position={[0.85, 0.4, 0]} castShadow>
          <sphereGeometry args={[0.25, 12, 10]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        {/* X eyes (dead!) - left eye */}
        <group position={[0.65, 0.6, 0.3]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.18, 0.04, 0.02]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.18, 0.04, 0.02]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
        </group>
        {/* X eyes - right eye */}
        <group position={[0.55, 0.6, -0.25]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.18, 0.04, 0.02]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.18, 0.04, 0.02]} />
            <meshBasicMaterial color="#212121" />
          </mesh>
        </group>
        {/* Tongue sticking out (cute!) */}
        <mesh position={[0.95, 0.25, 0.1]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.15, 0.08, 0.06]} />
          <meshStandardMaterial color="#f48fb1" roughness={0.4} />
        </mesh>
        {/* Tiny arms (T-Rex style) */}
        <mesh position={[0.25, 0.1, 0.5]} rotation={[0.3, 0.5, 0.2]} castShadow>
          <capsuleGeometry args={[0.08, 0.2, 4, 8]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        <mesh position={[0.25, 0.1, -0.5]} rotation={[-0.3, -0.5, 0.2]} castShadow>
          <capsuleGeometry args={[0.08, 0.2, 4, 8]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        {/* Stubby legs */}
        <mesh position={[-0.2, -0.6, 0.35]} castShadow>
          <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        <mesh position={[-0.2, -0.6, -0.35]} castShadow>
          <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        {/* Tail */}
        <mesh position={[-0.7, -0.1, 0]} rotation={[0, 0, 0.4]} castShadow>
          <coneGeometry args={[0.2, 0.8, 8]} />
          <meshStandardMaterial color="#4caf50" roughness={0.6} />
        </mesh>
        {/* Back spikes (cute bumps) */}
        {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
          <mesh key={`spike-${i}`} position={[x, 0.65 - Math.abs(x) * 0.3, 0]} castShadow>
            <coneGeometry args={[0.08, 0.18, 6]} />
            <meshStandardMaterial color="#81c784" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* "DEAD" text */}
      <Text
        position={[0, 6.5, 0.2]}
        fontSize={0.55}
        color="#212121"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        DEAD
      </Text>
      {/* "DINO" text */}
      <Text
        position={[0, 5.9, 0.2]}
        fontSize={0.55}
        color="#212121"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        DINO
      </Text>
      {/* Tagline */}
      <Text
        position={[0, 5.35, 0.2]}
        fontSize={0.22}
        color="#5d4037"
        anchorX="center"
        anchorY="middle"
      >
        Premium Fossil Fuel
      </Text>
    </group>

    {/* Forecourt ground */}
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.85} />
    </mesh>
  </group>
);

// Nissen hut - semi-cylindrical corrugated building
const NissenHut: React.FC<{
  position: [number, number, number];
  length?: number;
  rotation?: number;
}> = ({ position, length = 12, rotation = 0 }) => {
  const radius = 2.5;

  // Create semi-circular arc shape for extrusion
  const arcShape = useMemo(() => {
    const shape = new THREE.Shape();
    // Start at bottom-left of the semicircle
    shape.moveTo(-radius, 0);
    // Draw arc from left to right (bottom half of circle, which curves UP when viewed)
    shape.absarc(0, 0, radius, Math.PI, 0, true); // counterclockwise from PI to 0
    shape.lineTo(-radius, 0); // close the shape
    return shape;
  }, [radius]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: length,
    bevelEnabled: false,
  }), [length]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Semi-cylindrical roof/walls - corrugated iron using ExtrudeGeometry */}
      <mesh position={[0, 0, -length / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[arcShape, extrudeSettings]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* End walls - semi-circular caps matching the cylinder cross-section */}
      {[-length / 2, length / 2].map((z, i) => (
        <group key={`end-${i}`} position={[0, 0, z]}>
          {/* Semi-circular end wall - rotated to face outward */}
          <mesh
            rotation={[0, i === 0 ? Math.PI : 0, 0]}
            castShadow
            receiveShadow
          >
            <circleGeometry args={[radius, 16, 0, Math.PI]} />
            <meshStandardMaterial color="#5a6268" roughness={0.8} side={DoubleSide} />
          </mesh>
          {/* Door on front end only */}
          {i === 0 && (
            <mesh position={[0, 1, -0.05]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.5, 2]} />
              <meshStandardMaterial color="#3e2723" roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}

      {/* Foundation/base */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[radius * 2 + 0.2, 0.2, length + 0.4]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Office apartment building - multi-story
const OfficeApartment: React.FC<{
  position: [number, number, number];
  floors?: number;
  rotation?: number;
}> = ({ position, floors = 4, rotation = 0 }) => {
  const floorHeight = 3.5;
  const buildingHeight = floors * floorHeight;
  const width = 16;
  const depth = 12;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main building structure */}
      <mesh position={[0, buildingHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, buildingHeight, depth]} />
        <meshStandardMaterial color="#8d9db6" roughness={0.7} />
      </mesh>

      {/* Floor bands */}
      {Array.from({ length: floors }).map((_, floor) => (
        <mesh
          key={`band-${floor}`}
          position={[0, floor * floorHeight + floorHeight - 0.1, 0]}
        >
          <boxGeometry args={[width + 0.2, 0.2, depth + 0.2]} />
          <meshStandardMaterial color="#667292" roughness={0.6} />
        </mesh>
      ))}

      {/* Windows - front and back */}
      {Array.from({ length: floors }).map((_, floor) =>
        [-5, -1.5, 1.5, 5].map((x, winIdx) => (
          <React.Fragment key={`win-${floor}-${winIdx}`}>
            {/* Front window */}
            <mesh position={[x, floor * floorHeight + floorHeight / 2 + 0.5, depth / 2 + 0.05]}>
              <planeGeometry args={[2.2, 2]} />
              <meshStandardMaterial color="#87ceeb" metalness={0.3} roughness={0.2} />
            </mesh>
            {/* Back window */}
            <mesh
              position={[x, floor * floorHeight + floorHeight / 2 + 0.5, -depth / 2 - 0.05]}
              rotation={[0, Math.PI, 0]}
            >
              <planeGeometry args={[2.2, 2]} />
              <meshStandardMaterial color="#87ceeb" metalness={0.3} roughness={0.2} />
            </mesh>
          </React.Fragment>
        ))
      )}

      {/* Side windows */}
      {Array.from({ length: floors }).map((_, floor) =>
        [-3, 0, 3].map((z, winIdx) => (
          <React.Fragment key={`side-win-${floor}-${winIdx}`}>
            {/* Left side */}
            <mesh
              position={[-width / 2 - 0.05, floor * floorHeight + floorHeight / 2 + 0.5, z]}
              rotation={[0, -Math.PI / 2, 0]}
            >
              <planeGeometry args={[2, 2]} />
              <meshStandardMaterial color="#87ceeb" metalness={0.3} roughness={0.2} />
            </mesh>
            {/* Right side */}
            <mesh
              position={[width / 2 + 0.05, floor * floorHeight + floorHeight / 2 + 0.5, z]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <planeGeometry args={[2, 2]} />
              <meshStandardMaterial color="#87ceeb" metalness={0.3} roughness={0.2} />
            </mesh>
          </React.Fragment>
        ))
      )}

      {/* Main entrance */}
      <group position={[0, 0, depth / 2]}>
        {/* Entrance canopy */}
        <mesh position={[0, 3, 1.5]} castShadow>
          <boxGeometry args={[5, 0.3, 3]} />
          <meshStandardMaterial color="#546e7a" roughness={0.5} />
        </mesh>
        {/* Entrance columns */}
        {[-2, 2].map((x, i) => (
          <mesh key={`col-${i}`} position={[x, 1.5, 2.5]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 3, 8]} />
            <meshStandardMaterial color="#78909c" roughness={0.5} />
          </mesh>
        ))}
        {/* Glass doors */}
        <mesh position={[0, 1.3, 0.1]}>
          <planeGeometry args={[3, 2.6]} />
          <meshStandardMaterial color="#64b5f6" metalness={0.4} roughness={0.1} />
        </mesh>
      </group>

      {/* Roof structure */}
      <mesh position={[0, buildingHeight + 0.3, 0]} castShadow>
        <boxGeometry args={[width + 0.5, 0.6, depth + 0.5]} />
        <meshStandardMaterial color="#546e7a" roughness={0.6} />
      </mesh>

      {/* Roof equipment */}
      <mesh position={[-4, buildingHeight + 1.2, 0]} castShadow>
        <boxGeometry args={[3, 1.8, 4]} />
        <meshStandardMaterial color="#757575" roughness={0.7} />
      </mesh>
      <mesh position={[4, buildingHeight + 0.8, 2]} castShadow>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#616161" roughness={0.7} />
      </mesh>
    </group>
  );
};

// Perimeter fence section
const FenceSection: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  postSpacing?: number;
}> = ({ start, end, postSpacing = 8 }) => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const postCount = Math.floor(length / postSpacing) + 1;

  const posts = useMemo(() => {
    const arr = [];
    for (let i = 0; i < postCount; i++) {
      const t = postCount > 1 ? i / (postCount - 1) : 0;
      arr.push({
        x: start[0] + dx * t,
        z: start[2] + dz * t,
      });
    }
    return arr;
  }, [start[0], start[2], dx, dz, postCount]);

  return (
    <group>
      {/* Fence posts */}
      {posts.map((post, i) => (
        <mesh key={i} position={[post.x, 1.2, post.z]} castShadow>
          <boxGeometry args={[0.15, 2.4, 0.15]} />
          <meshStandardMaterial color="#37474f" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}
      {/* Horizontal rails */}
      <group
        position={[(start[0] + end[0]) / 2, 0, (start[2] + end[2]) / 2]}
        rotation={[0, -angle, 0]}
      >
        {/* Top rail */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, length]} />
          <meshStandardMaterial color="#455a64" roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Middle rail */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, length]} />
          <meshStandardMaterial color="#455a64" roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Bottom rail */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, length]} />
          <meshStandardMaterial color="#455a64" roughness={0.6} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

// Water colors
const WATER_COLORS = {
  deep: '#1a4a5e', // Deep water
  shallow: '#2d6a7a', // Shallow water
  surface: '#3d8a9a', // Surface reflection
  edge: '#1e3a4a', // Water edge/shore
};

// Industrial Canal component - straight waterway with stone walls
const Canal: React.FC<{
  position: [number, number, number];
  length: number;
  width: number;
  rotation?: number;
}> = ({ position, length, width, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Water surface */}
    <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width - 1, length]} />
      <meshStandardMaterial
        color={WATER_COLORS.deep}
        metalness={0.6}
        roughness={0.2}
        transparent
        opacity={0.9}
      />
    </mesh>
    {/* Water depth effect */}
    <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width - 1.5, length - 1]} />
      <meshBasicMaterial color="#0a2a3a" transparent opacity={0.7} />
    </mesh>
    {/* Left canal wall */}
    <mesh position={[-width / 2, 0.3, 0]} castShadow receiveShadow>
      <boxGeometry args={[1, 1.5, length]} />
      <meshStandardMaterial color="#5d6d7e" roughness={0.9} />
    </mesh>
    {/* Right canal wall */}
    <mesh position={[width / 2, 0.3, 0]} castShadow receiveShadow>
      <boxGeometry args={[1, 1.5, length]} />
      <meshStandardMaterial color="#5d6d7e" roughness={0.9} />
    </mesh>
    {/* Canal bed */}
    <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color="#2c3e50" roughness={0.95} />
    </mesh>
    {/* Towpath along left side - lowered to prevent z-fighting with paths at y=0.1 */}
    <mesh position={[-width / 2 - 2, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[3, length]} />
      <meshStandardMaterial color="#7d6d5e" roughness={0.9} />
    </mesh>
    {/* Mooring posts */}
    {[-length / 3, 0, length / 3].map((z, i) => (
      <mesh key={`mooring-${i}`} position={[-width / 2 - 0.3, 0.8, z]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.5, 8]} />
        <meshStandardMaterial color="#3d2d1d" roughness={0.8} />
      </mesh>
    ))}
  </group>
);

// Natural Lake component - irregular shape with shoreline
const Lake: React.FC<{
  position: [number, number, number];
  size: [number, number];
  depth?: number;
}> = ({ position, size, depth = 0.5 }) => {
  return (
    <group position={position}>
      {/* Main water surface */}
      <mesh position={[0, -depth / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(size[0], size[1]) / 2 - 1, 32]} />
        <meshStandardMaterial
          color={WATER_COLORS.shallow}
          metalness={0.7}
          roughness={0.15}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Deep center */}
      <mesh position={[0, -depth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(size[0], size[1]) / 3, 24]} />
        <meshBasicMaterial color={WATER_COLORS.deep} transparent opacity={0.9} />
      </mesh>
      {/* Sandy shoreline */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(size[0], size[1]) / 2 + 2, 32]} />
        <meshStandardMaterial color="#c9b896" roughness={0.95} />
      </mesh>
      {/* Grass around lake */}
      <mesh position={[0, -0.10, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(size[0], size[1]) / 2 + 6, 32]} />
        <meshStandardMaterial color={GRASS_COLORS.park} roughness={0.95} />
      </mesh>
      {/* Reeds/vegetation patches */}
      {[
        [-size[0] / 3, size[1] / 4],
        [size[0] / 4, -size[1] / 3],
        [-size[0] / 4, -size[1] / 4],
      ].map(([x, z], i) => (
        <group key={`reeds-${i}`} position={[x, 0, z]}>
          {[0, 0.3, -0.3, 0.15, -0.15].map((offset, j) => (
            <mesh key={j} position={[offset, 0.4, offset * 0.5]} castShadow>
              <cylinderGeometry args={[0.02, 0.04, 1, 4]} />
              <meshStandardMaterial color="#4a6741" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Willow trees by lake */}
      <SimpleTree position={[-size[0] / 2 - 3, 0, 0]} scale={1.3} />
      <SimpleTree position={[size[0] / 3, 0, size[1] / 2 + 2]} scale={1.1} />
      {/* Park bench overlooking lake */}
      <ParkBench position={[size[0] / 2 + 4, 0, 0]} rotation={-Math.PI / 2} />
    </group>
  );
};

// River component - meandering natural waterway
const River: React.FC<{
  position: [number, number, number];
  length: number;
  width: number;
  meander?: number;
}> = ({ position, length, width, meander = 5 }) => {
  // Generate river path points with natural meander
  const riverSegments = useMemo(() => {
    const segments: { x: number; z: number; w: number }[] = [];
    const segmentCount = 12;
    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const x = -length / 2 + t * length;
      const z = Math.sin(t * Math.PI * 2.5) * meander;
      const w = width + Math.sin(t * Math.PI * 3) * (width * 0.2);
      segments.push({ x, z, w });
    }
    return segments;
  }, [length, width, meander]);

  return (
    <group position={position}>
      {/* River bed and banks */}
      {riverSegments.slice(0, -1).map((seg, i) => {
        const nextSeg = riverSegments[i + 1];
        const midX = (seg.x + nextSeg.x) / 2;
        const midZ = (seg.z + nextSeg.z) / 2;
        const segLength = Math.sqrt(
          Math.pow(nextSeg.x - seg.x, 2) + Math.pow(nextSeg.z - seg.z, 2)
        );
        const angle = Math.atan2(nextSeg.z - seg.z, nextSeg.x - seg.x);
        const avgWidth = (seg.w + nextSeg.w) / 2;

        return (
          <group key={`river-seg-${i}`} position={[midX, 0, midZ]} rotation={[0, -angle + Math.PI / 2, 0]}>
            {/* Riverbank grass - significantly lowered to prevent z-fighting with paths at y=0.1 */}
            <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[avgWidth + 8, segLength + 2]} />
              <meshStandardMaterial color={GRASS_COLORS.verge} roughness={0.95} />
            </mesh>
            {/* Muddy bank - significantly lowered to prevent z-fighting */}
            <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[avgWidth + 3, segLength + 1]} />
              <meshStandardMaterial color="#5d4e3a" roughness={0.95} />
            </mesh>
            {/* Water surface */}
            <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[avgWidth, segLength + 0.5]} />
              <meshStandardMaterial
                color={WATER_COLORS.shallow}
                metalness={0.6}
                roughness={0.2}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Deep channel */}
            <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[avgWidth * 0.6, segLength]} />
              <meshBasicMaterial color={WATER_COLORS.deep} transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
      {/* Trees along riverbank */}
      <SimpleTree position={[-length / 4, 0, width / 2 + 6]} scale={1.2} />
      <SimpleTree position={[length / 4, 0, -width / 2 - 5]} scale={1.0} />
      <SimpleTree position={[0, 0, width / 2 + 8]} scale={1.1} />
      <SimpleTree position={[-length / 3, 0, -width / 2 - 7]} scale={0.9} />
      {/* Stone bridge */}
      <group position={[0, 0, 0]}>
        {/* Bridge deck */}
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[8, 0.8, width + 4]} />
          <meshStandardMaterial color="#6b7280" roughness={0.8} />
        </mesh>
        {/* Bridge arch (simplified) */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[6, 1.5, width - 2]} />
          <meshStandardMaterial color="#5b6470" roughness={0.85} />
        </mesh>
        {/* Bridge railings */}
        {[-1, 1].map((side, i) => (
          <mesh key={`railing-${i}`} position={[side * 3.5, 2.2, 0]} castShadow>
            <boxGeometry args={[0.3, 1, width + 4]} />
            <meshStandardMaterial color="#4b5563" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Small decorative pond
const Pond: React.FC<{
  position: [number, number, number];
  radius: number;
}> = ({ position, radius }) => (
  <group position={position}>
    {/* Surrounding grass - lowered to prevent z-fighting */}
    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius + 3, 24]} />
      <meshStandardMaterial color={GRASS_COLORS.lawn} roughness={0.95} />
    </mesh>
    {/* Stone edge - raised above paths at 0.1 */}
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <ringGeometry args={[radius - 0.3, radius + 0.5, 24]} />
      <meshStandardMaterial color="#7d8590" roughness={0.85} />
    </mesh>
    {/* Water surface */}
    <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius - 0.5, 24]} />
      <meshStandardMaterial
        color={WATER_COLORS.surface}
        metalness={0.7}
        roughness={0.15}
        transparent
        opacity={0.9}
      />
    </mesh>
    {/* Lily pads - positioned just above water surface */}
    {[
      [-radius * 0.3, radius * 0.2],
      [radius * 0.4, -radius * 0.1],
      [-radius * 0.1, -radius * 0.4],
    ].map(([x, z], i) => (
      <mesh key={`lily-${i}`} position={[x, -0.12, z]} rotation={[-Math.PI / 2, Math.random() * Math.PI, 0]}>
        <circleGeometry args={[0.4, 12]} />
        <meshStandardMaterial color="#3d6b4f" roughness={0.7} side={DoubleSide} />
      </mesh>
    ))}
    {/* Fountain in center */}
    <mesh position={[0, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.4, 0.5, 8]} />
      <meshStandardMaterial color="#5d6d7e" roughness={0.6} />
    </mesh>
    {/* Bench nearby */}
    <ParkBench position={[radius + 2, 0, 0]} rotation={-Math.PI / 2} />
  </group>
);

// Gravel/paved path component
const GravelPath: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
  type?: 'gravel' | 'paved' | 'cobble';
}> = ({ start, end, width = 2, type = 'gravel' }) => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  const colors = {
    gravel: '#9ca3af',
    paved: '#6b7280',
    cobble: '#78716c',
  };

  return (
    <group position={[midX, 0.15, midZ]} rotation={[0, -angle, 0]}>
      {/* Path surface - raised to y=0.15 to prevent z-fighting with grass and other surfaces */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={colors[type]} roughness={0.95} />
      </mesh>
      {/* Path borders - raised above path surface */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[side * (width / 2 + 0.1), 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, length]} />
          <meshStandardMaterial color="#57534e" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// Curved path section for connecting paths
const CurvedPath: React.FC<{
  position: [number, number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
  width?: number;
  type?: 'gravel' | 'paved';
}> = ({ position, radius, startAngle, endAngle, width = 2, type = 'gravel' }) => {
  const segments = 12;
  const angleStep = (endAngle - startAngle) / segments;

  const colors = {
    gravel: '#9ca3af',
    paved: '#6b7280',
  };

  return (
    <group position={position}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle1 = startAngle + i * angleStep;
        const angle2 = startAngle + (i + 1) * angleStep;
        const x1 = Math.cos(angle1) * radius;
        const z1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const z2 = Math.sin(angle2) * radius;
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const segLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        const segAngle = Math.atan2(x2 - x1, z2 - z1);

        return (
          <mesh
            key={i}
            position={[midX, 0.17, midZ]}
            rotation={[-Math.PI / 2, 0, -segAngle]}
            receiveShadow
          >
            <planeGeometry args={[width, segLength + 0.1]} />
            <meshStandardMaterial color={colors[type]} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
};

// Footbridge over water
const FootBridge: React.FC<{
  position: [number, number, number];
  length: number;
  width?: number;
  rotation?: number;
  style?: 'wooden' | 'stone' | 'iron';
}> = ({ position, length, width = 3, rotation = 0, style = 'wooden' }) => {
  const colors = {
    wooden: { deck: '#8b5a2b', rail: '#6b4423', support: '#5d4037' },
    stone: { deck: '#6b7280', rail: '#4b5563', support: '#374151' },
    iron: { deck: '#374151', rail: '#1f2937', support: '#111827' },
  };
  const c = colors[style];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Bridge deck */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial color={c.deck} roughness={0.8} />
      </mesh>
      {/* Deck planks detail */}
      {style === 'wooden' && Array.from({ length: Math.floor(length / 0.4) }).map((_, i) => (
        <mesh key={i} position={[0, 1.32, -length / 2 + 0.2 + i * 0.4]} castShadow>
          <boxGeometry args={[width - 0.1, 0.03, 0.35]} />
          <meshStandardMaterial color="#7a4a1b" roughness={0.9} />
        </mesh>
      ))}
      {/* Support beams underneath */}
      {[-length / 3, 0, length / 3].map((z, i) => (
        <mesh key={`support-${i}`} position={[0, 0.5, z]} castShadow>
          <boxGeometry args={[width + 0.5, 0.3, 0.4]} />
          <meshStandardMaterial color={c.support} roughness={0.85} />
        </mesh>
      ))}
      {/* Vertical supports */}
      {[-length / 3, length / 3].map((z, i) => (
        <React.Fragment key={`vert-${i}`}>
          <mesh position={[-width / 2 - 0.1, 0.6, z]} castShadow>
            <boxGeometry args={[0.25, 1.2, 0.25]} />
            <meshStandardMaterial color={c.support} roughness={0.8} />
          </mesh>
          <mesh position={[width / 2 + 0.1, 0.6, z]} castShadow>
            <boxGeometry args={[0.25, 1.2, 0.25]} />
            <meshStandardMaterial color={c.support} roughness={0.8} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Railings */}
      {[-1, 1].map((side, i) => (
        <group key={`rail-${i}`} position={[side * (width / 2 + 0.15), 0, 0]}>
          {/* Top rail */}
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[0.1, 0.1, length - 0.5]} />
            <meshStandardMaterial color={c.rail} roughness={0.7} />
          </mesh>
          {/* Railing posts */}
          {Array.from({ length: Math.floor(length / 1.5) + 1 }).map((_, j) => (
            <mesh key={j} position={[0, 1.6, -length / 2 + 0.5 + j * 1.5]} castShadow>
              <boxGeometry args={[0.08, 0.9, 0.08]} />
              <meshStandardMaterial color={c.rail} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// Canal lock gate
const LockGate: React.FC<{
  position: [number, number, number];
  width: number;
  rotation?: number;
}> = ({ position, width, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Gate posts */}
    {[-width / 2 - 0.3, width / 2 + 0.3].map((x, i) => (
      <mesh key={i} position={[x, 1.5, 0]} castShadow>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#374151" roughness={0.7} metalness={0.3} />
      </mesh>
    ))}
    {/* Gate doors (closed) */}
    {[-1, 1].map((side, i) => (
      <mesh key={`door-${i}`} position={[side * width / 4, 0.5, 0]} castShadow>
        <boxGeometry args={[width / 2 - 0.2, 2.5, 0.3]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
    ))}
    {/* Operating beam */}
    <mesh position={[0, 2.8, -2]} rotation={[0.1, 0, 0]} castShadow>
      <boxGeometry args={[0.15, 0.15, 4]} />
      <meshStandardMaterial color="#78350f" roughness={0.85} />
    </mesh>
    {/* Walkway across top */}
    <mesh position={[0, 3, 0]} castShadow>
      <boxGeometry args={[width + 1.5, 0.15, 1]} />
      <meshStandardMaterial color="#6b7280" roughness={0.8} />
    </mesh>
  </group>
);

// Wooden dock/jetty
const Dock: React.FC<{
  position: [number, number, number];
  length: number;
  width?: number;
  rotation?: number;
}> = ({ position, length, width = 3, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Main deck */}
    <mesh position={[0, 0.4, length / 2]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.15, length]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
    </mesh>
    {/* Deck planks */}
    {Array.from({ length: Math.floor(length / 0.3) }).map((_, i) => (
      <mesh key={i} position={[0, 0.49, i * 0.3 + 0.15]} castShadow>
        <boxGeometry args={[width - 0.05, 0.02, 0.25]} />
        <meshStandardMaterial color="#7a4a1b" roughness={0.9} />
      </mesh>
    ))}
    {/* Support posts */}
    {[0, length / 3, (2 * length) / 3, length - 0.3].map((z, i) =>
      [-width / 2 + 0.2, width / 2 - 0.2].map((x, j) => (
        <mesh key={`post-${i}-${j}`} position={[x, -0.3, z + 0.15]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 1.4, 6]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} />
        </mesh>
      ))
    )}
    {/* Mooring cleats */}
    {[length * 0.2, length * 0.8].map((z, i) => (
      <mesh key={`cleat-${i}`} position={[width / 2 - 0.1, 0.55, z]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.4} />
      </mesh>
    ))}
    {/* Rope coil */}
    <mesh position={[-width / 2 + 0.4, 0.55, length * 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.2, 0.05, 8, 16]} />
      <meshStandardMaterial color="#a8a29e" roughness={0.95} />
    </mesh>
  </group>
);

// Lamp post for paths
const PathLamp: React.FC<{
  position: [number, number, number];
  style?: 'modern' | 'victorian';
}> = ({ position, style = 'modern' }) => (
  <group position={position}>
    {/* Pole */}
    <mesh position={[0, 2, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.1, 4, 8]} />
      <meshStandardMaterial
        color={style === 'victorian' ? '#1f2937' : '#6b7280'}
        roughness={0.5}
        metalness={0.4}
      />
    </mesh>
    {/* Lamp head */}
    {style === 'victorian' ? (
      <group position={[0, 4.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.5, 0.4]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.3, 0.25, 0.3]} />
          <meshBasicMaterial color="#fef3c7" />
        </mesh>
      </group>
    ) : (
      <group position={[0, 4.1, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.3, 8]} />
          <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
          <meshBasicMaterial color="#fef3c7" />
        </mesh>
      </group>
    )}
  </group>
);

// Bollard for paths and waterside
const Bollard: React.FC<{
  position: [number, number, number];
  type?: 'wood' | 'metal' | 'stone';
}> = ({ position, type = 'metal' }) => {
  const colors = {
    wood: '#5d4037',
    metal: '#374151',
    stone: '#6b7280',
  };
  return (
    <mesh position={[position[0], position[1] + 0.4, position[2]]} castShadow>
      <cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
      <meshStandardMaterial
        color={colors[type]}
        roughness={type === 'metal' ? 0.5 : 0.85}
        metalness={type === 'metal' ? 0.4 : 0}
      />
    </mesh>
  );
};

// Information sign
const InfoSign: React.FC<{
  position: [number, number, number];
  text: string;
  rotation?: number;
}> = ({ position, text, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Post */}
    <mesh position={[0, 0.6, 0]} castShadow>
      <boxGeometry args={[0.1, 1.2, 0.1]} />
      <meshStandardMaterial color="#5d4037" roughness={0.85} />
    </mesh>
    {/* Sign board */}
    <mesh position={[0, 1.3, 0.08]} castShadow>
      <boxGeometry args={[0.8, 0.5, 0.05]} />
      <meshStandardMaterial color="#1f2937" roughness={0.7} />
    </mesh>
    {/* Text */}
    <Text
      position={[0, 1.3, 0.12]}
      fontSize={0.12}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  </group>
);

// Flower bed / hedge border
const HedgeRow: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  height?: number;
  width?: number;
}> = ({ start, end, height = 0.8, width = 0.6 }) => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  return (
    <mesh position={[midX, height / 2, midZ]} rotation={[0, -angle, 0]} castShadow>
      <boxGeometry args={[width, height, length]} />
      <meshStandardMaterial color="#2d5a27" roughness={0.95} />
    </mesh>
  );
};

// Picnic table
const PicnicTable: React.FC<{
  position: [number, number, number];
  rotation?: number;
}> = ({ position, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Table top */}
    <mesh position={[0, 0.75, 0]} castShadow>
      <boxGeometry args={[1.8, 0.08, 0.8]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
    </mesh>
    {/* Bench seats */}
    {[-0.6, 0.6].map((z, i) => (
      <mesh key={i} position={[0, 0.45, z]} castShadow>
        <boxGeometry args={[1.8, 0.06, 0.3]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
      </mesh>
    ))}
    {/* Legs */}
    {[
      [-0.7, -0.4],
      [-0.7, 0.4],
      [0.7, -0.4],
      [0.7, 0.4],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.35, z]} castShadow>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
    ))}
    {/* Cross braces */}
    {[-0.7, 0.7].map((x, i) => (
      <mesh key={i} position={[x, 0.25, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
    ))}
  </group>
);

// Waste bin
const WasteBin: React.FC<{
  position: [number, number, number];
}> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.4, 0]} castShadow>
      <cylinderGeometry args={[0.25, 0.22, 0.8, 8]} />
      <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.3} />
    </mesh>
    {/* Rim */}
    <mesh position={[0, 0.82, 0]} castShadow>
      <torusGeometry args={[0.25, 0.03, 8, 16]} />
      <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.4} />
    </mesh>
  </group>
);

// Industrial grain silo - typical flour mill storage
const GrainSilo: React.FC<{
  position: [number, number, number];
  radius?: number;
  height?: number;
  color?: string;
}> = ({ position, radius = 5, height = 30, color = '#94a3b8' }) => (
  <group position={position}>
    {/* Main cylindrical body */}
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 24]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
    </mesh>
    {/* Corrugated texture rings */}
    {Array.from({ length: Math.floor(height / 3) }).map((_, i) => (
      <mesh key={`ring-${i}`} position={[0, 1.5 + i * 3, 0]} castShadow>
        <torusGeometry args={[radius + 0.05, 0.08, 8, 24]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.5} />
      </mesh>
    ))}
    {/* Conical roof */}
    <mesh position={[0, height + radius * 0.4, 0]} castShadow>
      <coneGeometry args={[radius + 0.3, radius * 0.8, 24]} />
      <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
    </mesh>
    {/* Roof cap/vent */}
    <mesh position={[0, height + radius * 0.8, 0]} castShadow>
      <cylinderGeometry args={[0.8, 1, 1.5, 12]} />
      <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Access ladder */}
    <group position={[radius - 0.1, 0, 0]}>
      {/* Rails */}
      <mesh position={[-0.15, height / 2, 0]} castShadow>
        <boxGeometry args={[0.08, height, 0.08]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.15, height / 2, 0]} castShadow>
        <boxGeometry args={[0.08, height, 0.08]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Rungs */}
      {Array.from({ length: Math.floor(height / 0.5) }).map((_, i) => (
        <mesh key={`rung-${i}`} position={[0, 0.5 + i * 0.5, 0]} castShadow>
          <boxGeometry args={[0.35, 0.04, 0.04]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      {/* Safety cage */}
      <mesh position={[0.3, height / 2 + 5, 0]}>
        <cylinderGeometry args={[0.5, 0.5, height - 10, 8, 1, true]} />
        <meshStandardMaterial
          color="#fbbf24"
          roughness={0.4}
          metalness={0.5}
          wireframe
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
    {/* Foundation ring */}
    <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius + 0.5, radius + 0.8, 0.6, 24]} />
      <meshStandardMaterial color="#6b7280" roughness={0.9} />
    </mesh>
    {/* Company marking - curved to wrap around silo */}
    <Text
      position={[0, height * 0.6, radius + 0.05]}
      fontSize={2}
      color="#1e293b"
      anchorX="center"
      anchorY="middle"
      curveRadius={-radius}
    >
      MILLOS
    </Text>
  </group>
);

// Grain elevator tower - iconic tall structure for flour mills
const GrainElevator: React.FC<{
  position: [number, number, number];
}> = ({ position }) => {
  const towerWidth = 8;
  const towerDepth = 6;
  const towerHeight = 45;

  return (
    <group position={position}>
      {/* Main tower body */}
      <mesh position={[0, towerHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[towerWidth, towerHeight, towerDepth]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Horizontal bands/levels */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`band-${i}`} position={[0, 5 + i * 5, 0]} castShadow>
          <boxGeometry args={[towerWidth + 0.3, 0.4, towerDepth + 0.3]} />
          <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* Head house (top structure) */}
      <mesh position={[0, towerHeight + 3, 0]} castShadow>
        <boxGeometry args={[towerWidth + 2, 6, towerDepth + 2]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Peaked roof */}
      <mesh position={[0, towerHeight + 7.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[towerDepth + 3, 3, towerWidth + 3]} />
        <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, towerHeight + 9, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[towerDepth + 2, 1.5, towerWidth + 1]} />
        <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Elevator leg housing (diagonal conveyor) */}
      <mesh
        position={[towerWidth / 2 + 1.5, towerHeight / 2, 0]}
        rotation={[0, 0, 0.15]}
        castShadow
      >
        <boxGeometry args={[3, towerHeight + 5, 3]} />
        <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Ground hopper / intake */}
      <mesh position={[towerWidth / 2 + 3, 2, 0]} castShadow>
        <boxGeometry args={[6, 4, 5]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Hopper grate */}
      <mesh position={[towerWidth / 2 + 3, 4.1, 0]}>
        <boxGeometry args={[4, 0.2, 3]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Windows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <React.Fragment key={`win-${i}`}>
          <mesh position={[towerWidth / 2 + 0.1, 8 + i * 6, 0]}>
            <boxGeometry args={[0.2, 2, 1.5]} />
            <meshStandardMaterial color="#1e3a5f" transparent opacity={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[-towerWidth / 2 - 0.1, 8 + i * 6, 0]}>
            <boxGeometry args={[0.2, 2, 1.5]} />
            <meshStandardMaterial color="#1e3a5f" transparent opacity={0.6} metalness={0.5} />
          </mesh>
        </React.Fragment>
      ))}
      {/* External stairs */}
      <group position={[-towerWidth / 2 - 1.5, 0, towerDepth / 2]}>
        {Array.from({ length: 30 }).map((_, i) => (
          <mesh key={`stair-${i}`} position={[0, i * 1.5 + 0.5, 0]} castShadow>
            <boxGeometry args={[2, 0.15, 0.6]} />
            <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        {/* Stair railings */}
        <mesh position={[-0.9, towerHeight / 3, 0]} castShadow>
          <boxGeometry args={[0.1, towerHeight / 1.5, 0.1]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0.9, towerHeight / 3, 0]} castShadow>
          <boxGeometry args={[0.1, towerHeight / 1.5, 0.1]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
        </mesh>
      </group>
      {/* Foundation */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[towerWidth + 3, 1, towerDepth + 3]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>
      {/* Company signage on head house (dark top section) */}
      <Text
        position={[0, towerHeight + 4, (towerDepth + 2) / 2 + 0.05]}
        fontSize={1.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        curveRadius={0}
      >
        MILLOS
      </Text>
      <Text
        position={[0, towerHeight + 2.2, (towerDepth + 2) / 2 + 0.05]}
        fontSize={0.6}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        curveRadius={0}
      >
        GRAIN MILL
      </Text>
    </group>
  );
};

// Connecting conveyor bridge between structures
const ConveyorBridge: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
}> = ({ start, end }) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const angle = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
  const yRot = Math.atan2(dx, dz);

  return (
    <group
      position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]}
      rotation={[angle, yRot, 0]}
    >
      {/* Main bridge housing */}
      <mesh castShadow>
        <boxGeometry args={[2, 1.5, length]} />
        <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Support structure underneath */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[0.3, 0.5, length - 2]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
};

// Loading dock canopy for trucks
const LoadingDockCanopy: React.FC<{
  position: [number, number, number];
  width?: number;
  depth?: number;
  rotation?: number;
}> = ({ position, width = 15, depth = 8, rotation = 0 }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Canopy roof */}
    <mesh position={[0, 6, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.2, depth]} />
      <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.5} />
    </mesh>
    {/* Corrugated roof panels */}
    {Array.from({ length: Math.floor(depth / 2) }).map((_, i) => (
      <mesh key={`panel-${i}`} position={[0, 6.15, -depth / 2 + 1 + i * 2]} castShadow>
        <boxGeometry args={[width - 0.2, 0.1, 0.5]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.5} />
      </mesh>
    ))}
    {/* Support columns */}
    {[
      [-width / 2 + 1, depth / 2 - 1],
      [width / 2 - 1, depth / 2 - 1],
      [-width / 2 + 1, -depth / 2 + 1],
      [width / 2 - 1, -depth / 2 + 1],
    ].map(([x, z], i) => (
      <mesh key={`col-${i}`} position={[x, 3, z]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 6, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
      </mesh>
    ))}
    {/* Lighting fixtures */}
    {[-width / 3, 0, width / 3].map((x, i) => (
      <group key={`light-${i}`} position={[x, 5.7, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.2, 0.4]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.3]} />
          <meshBasicMaterial color="#fef3c7" />
        </mesh>
      </group>
    ))}
    {/* Gutter */}
    <mesh position={[0, 5.8, depth / 2]} castShadow>
      <boxGeometry args={[width + 0.5, 0.3, 0.4]} />
      <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.5} />
    </mesh>
  </group>
);

// Industrial storage tank - horizontal cylindrical tank with legs
const StorageTank: React.FC<{
  position: [number, number, number];
  length?: number;
  radius?: number;
  rotation?: number;
  color?: string;
}> = ({ position, length = 8, radius = 2.5, rotation = 0, color = '#e5e7eb' }) => (
  <group position={position} rotation={[0, rotation, 0]}>
    {/* Main cylindrical tank body */}
    <mesh position={[0, radius + 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
    </mesh>
    {/* End caps - hemispherical */}
    <mesh position={[-length / 2, radius + 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <sphereGeometry args={[radius, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
    </mesh>
    <mesh position={[length / 2, radius + 1.5, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <sphereGeometry args={[radius, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
    </mesh>
    {/* Support legs - 4 saddle supports */}
    {[-length / 3, length / 3].map((x, i) => (
      <group key={`legs-${i}`} position={[x, 0, 0]}>
        {/* Left leg */}
        <mesh position={[0, 0.75, -radius * 0.7]} castShadow>
          <boxGeometry args={[0.4, 1.5, 0.4]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Right leg */}
        <mesh position={[0, 0.75, radius * 0.7]} castShadow>
          <boxGeometry args={[0.4, 1.5, 0.4]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Cross brace */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, radius * 1.4]} />
          <meshStandardMaterial color="#4b5563" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Saddle */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius + 0.1, radius + 0.1, 0.6, 12, 1, false, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
    ))}
    {/* Pipe fittings on top */}
    <mesh position={[0, radius * 2 + 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
      <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[length / 4, radius * 2 + 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.2, 0.6, 8]} />
      <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Ladder access */}
    <group position={[0, 0, -radius - 0.2]}>
      <mesh position={[0, radius + 1.5, 0]} castShadow>
        <boxGeometry args={[0.08, radius * 2 + 1, 0.08]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.3, radius + 1.5, 0]} castShadow>
        <boxGeometry args={[0.08, radius * 2 + 1, 0.08]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Rungs */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`rung-${i}`} position={[0.15, 0.5 + i * 0.5, 0]} castShadow>
          <boxGeometry args={[0.25, 0.04, 0.04]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  </group>
);

// Propane tank - smaller vertical cylindrical tank
const PropaneTank: React.FC<{
  position: [number, number, number];
  height?: number;
  radius?: number;
}> = ({ position, height = 4, radius = 1.2 }) => (
  <group position={position}>
    {/* Main cylindrical body */}
    <mesh position={[0, height / 2 + 0.5, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.4} />
    </mesh>
    {/* Domed top */}
    <mesh position={[0, height + 0.5, 0]} castShadow>
      <sphereGeometry args={[radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.4} />
    </mesh>
    {/* Domed bottom */}
    <mesh position={[0, 0.5, 0]} rotation={[Math.PI, 0, 0]} castShadow>
      <sphereGeometry args={[radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.4} />
    </mesh>
    {/* Support legs - 3 legs */}
    {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle, i) => (
      <mesh
        key={`leg-${i}`}
        position={[Math.sin(angle) * (radius + 0.2), 0.25, Math.cos(angle) * (radius + 0.2)]}
        castShadow
      >
        <boxGeometry args={[0.25, 0.5, 0.25]} />
        <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.4} />
      </mesh>
    ))}
    {/* Valve assembly on top */}
    <mesh position={[0, height + radius + 0.3, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
      <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[0, height + radius + 0.6, 0]} castShadow>
      <boxGeometry args={[0.4, 0.2, 0.4]} />
      <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Pressure gauge */}
    <mesh position={[radius + 0.1, height * 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
      <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.4} />
    </mesh>
    {/* Warning stripe band */}
    <mesh position={[0, height * 0.3 + 0.5, 0]} castShadow>
      <cylinderGeometry args={[radius + 0.02, radius + 0.02, 0.3, 12]} />
      <meshStandardMaterial color="#dc2626" roughness={0.5} />
    </mesh>
  </group>
);

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

  // Dock opening dimensions - single centered opening for one truck lane
  const dockOpeningWidth = 10; // Width of the door
  const dockOpeningHeight = 10;

  // Colors
  const wallColor = '#475569';
  const trimColor = '#374151';

  return (
    <group>
      {/* ========== FRONT WALL (Z+) with single centered dock opening ========== */}
      {/* Left section - FULL HEIGHT - extends PAST side wall for clean corner */}
      <mesh
        position={[
          -((buildingHalfWidth + wallThickness) / 2 + dockOpeningWidth / 4),
          wallHeight / 2,
          buildingFrontZ,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[buildingHalfWidth + wallThickness - dockOpeningWidth / 2, wallHeight, wallThickness]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Right section - FULL HEIGHT - extends PAST side wall for clean corner */}
      <mesh
        position={[
          (buildingHalfWidth + wallThickness) / 2 + dockOpeningWidth / 4,
          wallHeight / 2,
          buildingFrontZ,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[buildingHalfWidth + wallThickness - dockOpeningWidth / 2, wallHeight, wallThickness]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>

      {/* Section above the centered dock opening */}
      <mesh
        position={[0, wallHeight - (wallHeight - dockOpeningHeight) / 2, buildingFrontZ]}
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

      {/* Front wall trim */}
      <mesh position={[0, wallHeight + 0.3, buildingFrontZ]}>
        <boxGeometry args={[buildingHalfWidth * 2 + 1, 0.6, 0.8]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* ========== FRONT PERSONNEL ENTRANCES - Realistic Industrial Style ========== */}
      {/* Left main entrance at x=-45 - doors positioned 1.5 units in front of wall */}
      <group position={[-45, 0, buildingFrontZ + 1.5]}>
        {/* Concrete entrance platform/steps */}
        <mesh position={[0, 0.2, 1.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 0.4, 4]} />
          <meshStandardMaterial color="#6b7280" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.08, 3.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 0.16, 1.5]} />
          <meshStandardMaterial color="#6b7280" roughness={0.9} />
        </mesh>
        {/* Door surround - protruding frame structure */}
        <mesh position={[0, 1.8, -0.3]} castShadow>
          <boxGeometry args={[4.5, 3.8, 1]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Door opening recess */}
        <mesh position={[0, 1.6, 0.1]}>
          <boxGeometry args={[3.2, 3.2, 0.5]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} />
        </mesh>
        {/* Double doors - industrial blue */}
        <mesh position={[-0.75, 1.55, 0.4]} castShadow>
          <boxGeometry args={[1.4, 3, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0.75, 1.55, 0.4]} castShadow>
          <boxGeometry args={[1.4, 3, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Glass panels on doors */}
        <mesh position={[-0.75, 1.9, 0.5]}>
          <boxGeometry args={[1, 2, 0.04]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} metalness={0.6} roughness={0.1} />
        </mesh>
        <mesh position={[0.75, 1.9, 0.5]}>
          <boxGeometry args={[1, 2, 0.04]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} metalness={0.6} roughness={0.1} />
        </mesh>
        {/* Door handles - vertical pull bars */}
        <mesh position={[-0.2, 1.5, 0.55]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 1.5, 0.55]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Metal awning/canopy */}
        <mesh position={[0, 3.9, 0.8]} castShadow>
          <boxGeometry args={[5, 0.15, 2.5]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Awning support brackets */}
        <mesh position={[-2, 3.4, 0.3]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} />
        </mesh>
        <mesh position={[2, 3.4, 0.3]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} />
        </mesh>
        {/* Handrails */}
        <mesh position={[-2.3, 0.6, 1.5]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        <mesh position={[2.3, 0.6, 1.5]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        <mesh position={[-2.3, 1.2, 2]} castShadow>
          <boxGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        <mesh position={[2.3, 1.2, 2]} castShadow>
          <boxGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        {/* Yellow safety bollards */}
        <mesh position={[-3.2, 0.5, 2.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        <mesh position={[3.2, 0.5, 2.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        {/* Exterior light fixture */}
        <mesh position={[0, 4.2, 0]} castShadow>
          <boxGeometry args={[0.6, 0.35, 0.5]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 4.05, 0.3]}>
          <boxGeometry args={[0.4, 0.2, 0.25]} />
          <meshBasicMaterial color="#fef3c7" />
        </mesh>
      </group>

      {/* Right staff entrance at x=45 - doors positioned 1.5 units in front of wall */}
      <group position={[45, 0, buildingFrontZ + 1.5]}>
        {/* Concrete entrance platform/steps */}
        <mesh position={[0, 0.2, 1.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 0.4, 4]} />
          <meshStandardMaterial color="#6b7280" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.08, 3.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 0.16, 1.5]} />
          <meshStandardMaterial color="#6b7280" roughness={0.9} />
        </mesh>
        {/* Door surround - protruding frame structure */}
        <mesh position={[0, 1.8, -0.3]} castShadow>
          <boxGeometry args={[4.5, 3.8, 1]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Door opening recess */}
        <mesh position={[0, 1.6, 0.1]}>
          <boxGeometry args={[3.2, 3.2, 0.5]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} />
        </mesh>
        {/* Double doors - industrial blue */}
        <mesh position={[-0.75, 1.55, 0.4]} castShadow>
          <boxGeometry args={[1.4, 3, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0.75, 1.55, 0.4]} castShadow>
          <boxGeometry args={[1.4, 3, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Glass panels on doors */}
        <mesh position={[-0.75, 1.9, 0.5]}>
          <boxGeometry args={[1, 2, 0.04]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} metalness={0.6} roughness={0.1} />
        </mesh>
        <mesh position={[0.75, 1.9, 0.5]}>
          <boxGeometry args={[1, 2, 0.04]} />
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.5} metalness={0.6} roughness={0.1} />
        </mesh>
        {/* Door handles - vertical pull bars */}
        <mesh position={[-0.2, 1.5, 0.55]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 1.5, 0.55]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Metal awning/canopy */}
        <mesh position={[0, 3.9, 0.8]} castShadow>
          <boxGeometry args={[5, 0.15, 2.5]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Awning support brackets */}
        <mesh position={[-2, 3.4, 0.3]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} />
        </mesh>
        <mesh position={[2, 3.4, 0.3]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} />
        </mesh>
        {/* Handrails */}
        <mesh position={[-2.3, 0.6, 1.5]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        <mesh position={[2.3, 0.6, 1.5]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        <mesh position={[-2.3, 1.2, 2]} castShadow>
          <boxGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        <mesh position={[2.3, 1.2, 2]} castShadow>
          <boxGeometry args={[0.1, 0.1, 4]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} />
        </mesh>
        {/* Yellow safety bollards */}
        <mesh position={[-3.2, 0.5, 2.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        <mesh position={[3.2, 0.5, 2.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        {/* Exterior light fixture */}
        <mesh position={[0, 4.2, 0]} castShadow>
          <boxGeometry args={[0.6, 0.35, 0.5]} />
          <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 4.05, 0.3]}>
          <boxGeometry args={[0.4, 0.2, 0.25]} />
          <meshBasicMaterial color="#fef3c7" />
        </mesh>
      </group>

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
      {/* Left section - FULL HEIGHT - extends PAST side wall for clean corner */}
      <mesh
        position={[
          -((buildingHalfWidth + wallThickness) / 2 + dockOpeningWidth / 4),
          wallHeight / 2,
          buildingBackZ,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[buildingHalfWidth + wallThickness - dockOpeningWidth / 2, wallHeight, wallThickness]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
      </mesh>
      {/* Right section - FULL HEIGHT - extends PAST side wall for clean corner */}
      <mesh
        position={[
          (buildingHalfWidth + wallThickness) / 2 + dockOpeningWidth / 4,
          wallHeight / 2,
          buildingBackZ,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[buildingHalfWidth + wallThickness - dockOpeningWidth / 2, wallHeight, wallThickness]}
        />
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

      {/* ========== BACK EMERGENCY EXITS - Realistic Industrial Style ========== */}
      {/* Left emergency exit at x=-45 - positioned 1.5 units out from wall */}
      <group position={[-45, 0, buildingBackZ - 1.5]} rotation={[0, Math.PI, 0]}>
        {/* Concrete landing pad */}
        <mesh position={[0, 0.15, 1.5]} castShadow receiveShadow>
          <boxGeometry args={[4, 0.3, 3.5]} />
          <meshStandardMaterial color="#6b7280" roughness={0.9} />
        </mesh>
        {/* Door surround - protruding frame structure */}
        <mesh position={[0, 1.6, -0.2]} castShadow>
          <boxGeometry args={[3.5, 3.4, 0.8]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Door opening recess */}
        <mesh position={[0, 1.5, 0.15]}>
          <boxGeometry args={[2.5, 3, 0.4]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} />
        </mesh>
        {/* Steel fire door - industrial green */}
        <mesh position={[0, 1.5, 0.4]} castShadow>
          <boxGeometry args={[2, 2.8, 0.12]} />
          <meshStandardMaterial color="#365314" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Small reinforced window */}
        <mesh position={[0, 2.1, 0.5]}>
          <boxGeometry args={[0.5, 0.6, 0.03]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.5} metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Wire mesh on window */}
        <mesh position={[0, 2.1, 0.52]}>
          <boxGeometry args={[0.48, 0.58, 0.01]} />
          <meshStandardMaterial color="#374151" wireframe transparent opacity={0.6} />
        </mesh>
        {/* Crash bar / panic hardware */}
        <mesh position={[0, 1.3, 0.5]}>
          <boxGeometry args={[1.5, 0.12, 0.1]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Door closer at top */}
        <mesh position={[0.6, 2.75, 0.45]}>
          <boxGeometry args={[0.5, 0.15, 0.1]} />
          <meshStandardMaterial color="#374151" metalness={0.5} />
        </mesh>
        {/* EXIT sign above door - standard emergency */}
        <mesh position={[0, 3.4, 0.3]}>
          <boxGeometry args={[1, 0.45, 0.1]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
        {/* Running man pictogram area */}
        <mesh position={[0, 3.4, 0.36]}>
          <boxGeometry args={[0.8, 0.35, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Wall-mounted emergency light */}
        <mesh position={[0, 3.8, 0.2]} castShadow>
          <boxGeometry args={[0.6, 0.22, 0.15]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
        </mesh>
        <mesh position={[0, 3.7, 0.3]}>
          <boxGeometry args={[0.5, 0.1, 0.06]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
        </mesh>
        {/* Kick plate at bottom of door */}
        <mesh position={[0, 0.25, 0.48]}>
          <boxGeometry args={[1.9, 0.4, 0.03]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Yellow hazard stripes on ground */}
        <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.5, 2]} />
          <meshStandardMaterial color="#eab308" roughness={0.8} />
        </mesh>
      </group>

      {/* Right emergency exit at x=45 - positioned 1.5 units out from wall */}
      <group position={[45, 0, buildingBackZ - 1.5]} rotation={[0, Math.PI, 0]}>
        {/* Concrete landing pad */}
        <mesh position={[0, 0.15, 1.5]} castShadow receiveShadow>
          <boxGeometry args={[4, 0.3, 3.5]} />
          <meshStandardMaterial color="#6b7280" roughness={0.9} />
        </mesh>
        {/* Door surround - protruding frame structure */}
        <mesh position={[0, 1.6, -0.2]} castShadow>
          <boxGeometry args={[3.5, 3.4, 0.8]} />
          <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Door opening recess */}
        <mesh position={[0, 1.5, 0.15]}>
          <boxGeometry args={[2.5, 3, 0.4]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} />
        </mesh>
        {/* Steel fire door - industrial green */}
        <mesh position={[0, 1.5, 0.4]} castShadow>
          <boxGeometry args={[2, 2.8, 0.12]} />
          <meshStandardMaterial color="#365314" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Small reinforced window */}
        <mesh position={[0, 2.1, 0.5]}>
          <boxGeometry args={[0.5, 0.6, 0.03]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.5} metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Wire mesh on window */}
        <mesh position={[0, 2.1, 0.52]}>
          <boxGeometry args={[0.48, 0.58, 0.01]} />
          <meshStandardMaterial color="#374151" wireframe transparent opacity={0.6} />
        </mesh>
        {/* Crash bar / panic hardware */}
        <mesh position={[0, 1.3, 0.5]}>
          <boxGeometry args={[1.5, 0.12, 0.1]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Door closer at top */}
        <mesh position={[0.6, 2.75, 0.45]}>
          <boxGeometry args={[0.5, 0.15, 0.1]} />
          <meshStandardMaterial color="#374151" metalness={0.5} />
        </mesh>
        {/* EXIT sign above door - standard emergency */}
        <mesh position={[0, 3.4, 0.3]}>
          <boxGeometry args={[1, 0.45, 0.1]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
        {/* Running man pictogram area */}
        <mesh position={[0, 3.4, 0.36]}>
          <boxGeometry args={[0.8, 0.35, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Wall-mounted emergency light */}
        <mesh position={[0, 3.8, 0.2]} castShadow>
          <boxGeometry args={[0.6, 0.22, 0.15]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
        </mesh>
        <mesh position={[0, 3.7, 0.3]}>
          <boxGeometry args={[0.5, 0.1, 0.06]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
        </mesh>
        {/* Kick plate at bottom of door */}
        <mesh position={[0, 0.25, 0.48]}>
          <boxGeometry args={[1.9, 0.4, 0.03]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Yellow hazard stripes on ground */}
        <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.5, 2]} />
          <meshStandardMaterial color="#eab308" roughness={0.8} />
        </mesh>
      </group>

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

      {/* ========== LEFT SIDE WALL (X-) with personnel door ========== */}
      {/* Side walls end INSIDE front/back walls - front/back walls wrap around corners */}
      {/* Personnel door opening in the wall - West Exit */}
      {(() => {
        const sideWallLength = Math.abs(buildingFrontZ - buildingBackZ) - wallThickness * 2;
        const doorWidth = 3;
        const doorHeight = 3;
        const doorZ = 0;
        const frontSegmentLength = sideWallLength / 2 - doorWidth / 2;
        const backSegmentLength = sideWallLength / 2 - doorWidth / 2;
        const frontSegmentZ = doorZ + doorWidth / 2 + frontSegmentLength / 2;
        const backSegmentZ = doorZ - doorWidth / 2 - backSegmentLength / 2;

        return (
          <>
            {/* Front section of left wall */}
            <mesh position={[-buildingHalfWidth, wallHeight / 2, frontSegmentZ]} castShadow receiveShadow>
              <boxGeometry args={[wallThickness, wallHeight, frontSegmentLength]} />
              <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
            </mesh>
            {/* Back section of left wall */}
            <mesh position={[-buildingHalfWidth, wallHeight / 2, backSegmentZ]} castShadow receiveShadow>
              <boxGeometry args={[wallThickness, wallHeight, backSegmentLength]} />
              <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
            </mesh>
            {/* Section above door opening */}
            <mesh position={[-buildingHalfWidth, doorHeight + (wallHeight - doorHeight) / 2, doorZ]} castShadow receiveShadow>
              <boxGeometry args={[wallThickness, wallHeight - doorHeight, doorWidth]} />
              <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
            </mesh>
            {/* West Personnel Door - exterior side */}
            <group position={[-buildingHalfWidth - 0.3, 0, doorZ]} rotation={[0, Math.PI / 2, 0]}>
              <mesh position={[0, doorHeight / 2, 0]} castShadow>
                <boxGeometry args={[doorWidth + 0.3, doorHeight + 0.15, 0.15]} />
                <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[0, doorHeight / 2, 0.08]}>
                <boxGeometry args={[doorWidth - 0.3, doorHeight - 0.2, 0.1]} />
                <meshStandardMaterial color="#1f2937" roughness={0.8} />
              </mesh>
              <mesh position={[-0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0, doorHeight + 0.4, 0.1]}>
                <boxGeometry args={[1.5, 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, doorHeight + 0.7, 0.1]}>
                <boxGeometry args={[0.6, 0.15, 0.1]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
              </mesh>
            </group>
            {/* West Personnel Door - interior side */}
            <group position={[-buildingHalfWidth + 0.3, 0, doorZ]} rotation={[0, -Math.PI / 2, 0]}>
              <mesh position={[0, doorHeight / 2, 0]} castShadow>
                <boxGeometry args={[doorWidth + 0.3, doorHeight + 0.15, 0.15]} />
                <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[-0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0, doorHeight + 0.4, 0.1]}>
                <boxGeometry args={[1.5, 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
              </mesh>
            </group>
          </>
        );
      })()}
      <mesh position={[-buildingHalfWidth, wallHeight + 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, Math.abs(buildingFrontZ - buildingBackZ) - wallThickness * 2 + 0.5]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* ========== RIGHT SIDE WALL (X+) with personnel door ========== */}
      {/* Personnel door opening in the wall - East Exit */}
      {(() => {
        const sideWallLength = Math.abs(buildingFrontZ - buildingBackZ) - wallThickness * 2;
        const doorWidth = 3;
        const doorHeight = 3;
        const doorZ = 0;
        const frontSegmentLength = sideWallLength / 2 - doorWidth / 2;
        const backSegmentLength = sideWallLength / 2 - doorWidth / 2;
        const frontSegmentZ = doorZ + doorWidth / 2 + frontSegmentLength / 2;
        const backSegmentZ = doorZ - doorWidth / 2 - backSegmentLength / 2;

        return (
          <>
            {/* Front section of right wall */}
            <mesh position={[buildingHalfWidth, wallHeight / 2, frontSegmentZ]} castShadow receiveShadow>
              <boxGeometry args={[wallThickness, wallHeight, frontSegmentLength]} />
              <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
            </mesh>
            {/* Back section of right wall */}
            <mesh position={[buildingHalfWidth, wallHeight / 2, backSegmentZ]} castShadow receiveShadow>
              <boxGeometry args={[wallThickness, wallHeight, backSegmentLength]} />
              <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
            </mesh>
            {/* Section above door opening */}
            <mesh position={[buildingHalfWidth, doorHeight + (wallHeight - doorHeight) / 2, doorZ]} castShadow receiveShadow>
              <boxGeometry args={[wallThickness, wallHeight - doorHeight, doorWidth]} />
              <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.2} side={DoubleSide} />
            </mesh>
            {/* East Personnel Door - exterior side */}
            <group position={[buildingHalfWidth + 0.3, 0, doorZ]} rotation={[0, -Math.PI / 2, 0]}>
              <mesh position={[0, doorHeight / 2, 0]} castShadow>
                <boxGeometry args={[doorWidth + 0.3, doorHeight + 0.15, 0.15]} />
                <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[0, doorHeight / 2, 0.08]}>
                <boxGeometry args={[doorWidth - 0.3, doorHeight - 0.2, 0.1]} />
                <meshStandardMaterial color="#1f2937" roughness={0.8} />
              </mesh>
              <mesh position={[-0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0, doorHeight + 0.4, 0.1]}>
                <boxGeometry args={[1.5, 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, doorHeight + 0.7, 0.1]}>
                <boxGeometry args={[0.6, 0.15, 0.1]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
              </mesh>
            </group>
            {/* East Personnel Door - interior side */}
            <group position={[buildingHalfWidth - 0.3, 0, doorZ]} rotation={[0, Math.PI / 2, 0]}>
              <mesh position={[0, doorHeight / 2, 0]} castShadow>
                <boxGeometry args={[doorWidth + 0.3, doorHeight + 0.15, 0.15]} />
                <meshStandardMaterial color="#374151" roughness={0.6} metalness={0.3} />
              </mesh>
              <mesh position={[-0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[0.7, doorHeight / 2, 0.15]} castShadow>
                <boxGeometry args={[1.2, doorHeight - 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.65, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.02]} />
                <meshBasicMaterial color="#1e3a5f" transparent opacity={0.7} />
              </mesh>
              <mesh position={[-0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0.7, doorHeight * 0.4, 0.2]}>
                <boxGeometry args={[0.8, 0.08, 0.05]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <mesh position={[0, doorHeight + 0.4, 0.1]}>
                <boxGeometry args={[1.5, 0.4, 0.08]} />
                <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
              </mesh>
            </group>
          </>
        );
      })()}
      <mesh position={[buildingHalfWidth, wallHeight + 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, Math.abs(buildingFrontZ - buildingBackZ) - wallThickness * 2 + 0.5]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.4} side={DoubleSide} />
      </mesh>

      {/* CORNER COLUMNS REMOVED - were causing visual protrusion issues */}

      {/* ========== PERIMETER FENCE ========== */}
      {/* Fence around property - with gate openings for truck access */}
      <group>
        {/* Front fence (Z+) - left section */}
        <FenceSection start={[-95, 0, 85]} end={[-15, 0, 85]} />
        {/* Front fence - right section (gap for main entrance) */}
        <FenceSection start={[15, 0, 85]} end={[95, 0, 85]} />

        {/* Back fence (Z-) - left section */}
        <FenceSection start={[-95, 0, -85]} end={[-15, 0, -85]} />
        {/* Back fence - right section (gap for receiving) */}
        <FenceSection start={[15, 0, -85]} end={[95, 0, -85]} />

        {/* Left fence (X-) */}
        <FenceSection start={[-95, 0, -85]} end={[-95, 0, 85]} />

        {/* Right fence (X+) */}
        <FenceSection start={[95, 0, -85]} end={[95, 0, 85]} />

        {/* Gate posts - front entrance */}
        {[-15, 15].map((x, i) => (
          <group key={`gate-front-${i}`} position={[x, 0, 85]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <boxGeometry args={[0.4, 3, 0.4]} />
              <meshStandardMaterial color="#263238" roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[0, 3.2, 0]} castShadow>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshStandardMaterial color="#37474f" roughness={0.4} metalness={0.5} />
            </mesh>
          </group>
        ))}

        {/* Gate posts - back entrance */}
        {[-15, 15].map((x, i) => (
          <group key={`gate-back-${i}`} position={[x, 0, -85]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <boxGeometry args={[0.4, 3, 0.4]} />
              <meshStandardMaterial color="#263238" roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[0, 3.2, 0]} castShadow>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshStandardMaterial color="#37474f" roughness={0.4} metalness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ========== GROUND PLANE EXTENSION ========== */}
      {/* Asphalt area around factory */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 180]} />
        <meshStandardMaterial color="#37474f" roughness={0.9} />
      </mesh>

      {/* Grass areas outside fence - realistic muted greens */}
      {/* Using polygonOffset to prevent z-fighting with overlapping asphalt plane */}
      <mesh position={[0, -0.15, 110]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 50]} />
        <meshStandardMaterial color={GRASS_COLORS.field} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <mesh position={[0, -0.15, -110]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 50]} />
        <meshStandardMaterial color={GRASS_COLORS.field} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      {/* Side grass verges */}
      <mesh position={[115, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 180]} />
        <meshStandardMaterial color={GRASS_COLORS.verge} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <mesh position={[-115, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 180]} />
        <meshStandardMaterial color={GRASS_COLORS.verge} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>

      {/* ========== ACCESS ROADS FOR TRUCKS ========== */}
      {/* Front road (shipping trucks) - extends from z=135 to z=280 */}
      <group position={[20, 0, 195]}>
        {/* Road surface - raised to prevent z-fighting with main asphalt at -0.05 */}
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 170]} />
          <meshStandardMaterial color="#2d3436" roughness={0.85} />
        </mesh>
        {/* Road edge lines - white - raised above road surface */}
        <mesh position={[-7.5, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 170]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[7.5, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 170]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Center dashed line - yellow - raised above road surface */}
        {Array.from({ length: 17 }).map((_, i) => (
          <mesh key={`front-dash-${i}`} position={[0, -0.01, -75 + i * 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.25, 5]} />
            <meshBasicMaterial color="#f1c40f" />
          </mesh>
        ))}
        {/* Grass shoulders - lowered and using polygonOffset to prevent z-fighting */}
        <mesh position={[-14, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 170]} />
          <meshStandardMaterial color={GRASS_COLORS.field} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
        <mesh position={[14, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 170]} />
          <meshStandardMaterial color={GRASS_COLORS.field} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
      </group>

      {/* Back road (receiving trucks) - extends from z=-135 to z=-280 */}
      <group position={[-20, 0, -195]}>
        {/* Road surface - raised to prevent z-fighting with main asphalt at -0.05 */}
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 170]} />
          <meshStandardMaterial color="#2d3436" roughness={0.85} />
        </mesh>
        {/* Road edge lines - white - raised above road surface */}
        <mesh position={[-7.5, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 170]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[7.5, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.3, 170]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Center dashed line - yellow - raised above road surface */}
        {Array.from({ length: 17 }).map((_, i) => (
          <mesh key={`back-dash-${i}`} position={[0, -0.01, -75 + i * 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.25, 5]} />
            <meshBasicMaterial color="#f1c40f" />
          </mesh>
        ))}
        {/* Grass shoulders - lowered and using polygonOffset to prevent z-fighting */}
        <mesh position={[-14, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 170]} />
          <meshStandardMaterial color={GRASS_COLORS.field} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
        <mesh position={[14, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 170]} />
          <meshStandardMaterial color={GRASS_COLORS.field} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
      </group>

      {/* ========== PARKLAND AREA (Front-right) ========== */}
      <group position={[75, 0, 100]}>
        {/* Grass patch - lowered and using polygonOffset to prevent z-fighting */}
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[18, 16]} />
          <meshStandardMaterial color={GRASS_COLORS.park} roughness={0.95} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>

        {/* Trees */}
        <SimpleTree position={[-8, 0, -5]} scale={1.2} />
        <SimpleTree position={[6, 0, -8]} scale={0.9} />
        <SimpleTree position={[10, 0, 4]} scale={1.1} />
        <SimpleTree position={[-5, 0, 8]} scale={1.0} />
        <SimpleTree position={[0, 0, 12]} scale={0.8} />

        {/* Benches */}
        <ParkBench position={[-3, 0, 0]} rotation={Math.PI / 4} />
        <ParkBench position={[5, 0, 6]} rotation={-Math.PI / 3} />

        {/* Small path - raised to y=0.15 to prevent z-fighting with grass and other surfaces */}
        <mesh position={[0, 0.15, -12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3, 8]} />
          <meshStandardMaterial color="#9e9e9e" roughness={0.85} />
        </mesh>
      </group>

      {/* ========== SMALL OFFICE BUILDINGS ========== */}
      {/* Admin office - front left outside fence */}
      <SmallOffice position={[-80, 0, 100]} size={[14, 7, 10]} rotation={0} />

      {/* Security/visitor office - near front gate */}
      <group position={[-25, 0, 75]}>
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 4, 5]} />
          <meshStandardMaterial color="#607d8b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 4.3, 0]} castShadow>
          <boxGeometry args={[6.5, 0.5, 5.5]} />
          <meshStandardMaterial color="#455a64" roughness={0.6} />
        </mesh>
        {/* Window */}
        <mesh position={[0, 2.2, 2.55]}>
          <planeGeometry args={[4, 2]} />
          <meshStandardMaterial color="#90caf9" metalness={0.4} roughness={0.2} />
        </mesh>
        {/* "SECURITY" sign */}
        <Text
          position={[0, 3.5, 2.6]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          SECURITY
        </Text>
      </group>

      {/* Maintenance shed - back area */}
      <group position={[80, 0, -75]}>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 5, 8]} />
          <meshStandardMaterial color="#6d4c41" roughness={0.85} />
        </mesh>
        {/* Pitched roof */}
        <mesh position={[0, 5.5, 0]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[11, 1, 9]} />
          <meshStandardMaterial color="#5d4037" roughness={0.8} />
        </mesh>
        {/* Large door */}
        <mesh position={[0, 1.5, 4.05]}>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial color="#3e2723" roughness={0.9} />
        </mesh>
      </group>

      {/* ========== STREET LAMPS ========== */}
      {[
        [-50, 80],
        [50, 80],
        [-50, -80],
        [50, -80],
        [-90, 0],
        [90, 0],
      ].map(([x, z], i) => (
        <group key={`lamp-${i}`} position={[x, 0, z]}>
          {/* Pole */}
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.15, 6, 8]} />
            <meshStandardMaterial color="#37474f" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* Lamp head */}
          <mesh position={[0, 6.2, 0]}>
            <cylinderGeometry args={[0.4, 0.3, 0.5, 8]} />
            <meshStandardMaterial color="#263238" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Light bulb area */}
          <mesh position={[0, 5.9, 0]}>
            <cylinderGeometry args={[0.25, 0.35, 0.3, 8]} />
            <meshBasicMaterial color="#fff9c4" />
          </mesh>
        </group>
      ))}

      {/* ========== PARKING AREA MARKINGS (Front) ========== */}
      <group position={[60, 0.01, 70]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`parking-${i}`} position={[i * 4 - 8, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>

      {/* ========== GAS STATION ========== */}
      <GasStation position={[-85, 0, 110]} rotation={0} />

      {/* ========== NISSEN HUTS ========== */}
      {/* Storage hut near back fence */}
      <NissenHut position={[-75, 0, -100]} length={14} rotation={0} />
      {/* Equipment hut near side */}
      <NissenHut position={[85, 0, -100]} length={10} rotation={Math.PI / 2} />

      {/* ========== OFFICE APARTMENT BUILDINGS ========== */}
      {/* Main office block - front left */}
      <OfficeApartment position={[-100, 0, 95]} floors={4} rotation={0} />
      {/* Smaller office block - back right */}
      <OfficeApartment position={[100, 0, -100]} floors={3} rotation={Math.PI} />

      {/* ========== ADDITIONAL SMALL BUILDINGS ========== */}
      {/* Weighbridge office */}
      <group position={[30, 0, 80]}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 3, 3]} />
          <meshStandardMaterial color="#90a4ae" roughness={0.7} />
        </mesh>
        <mesh position={[0, 3.2, 0]} castShadow>
          <boxGeometry args={[4.5, 0.4, 3.5]} />
          <meshStandardMaterial color="#607d8b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.5, 1.55]}>
          <planeGeometry args={[3, 2]} />
          <meshStandardMaterial color="#81d4fa" metalness={0.3} roughness={0.2} />
        </mesh>
        <Text
          position={[0, 2.8, 1.6]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          WEIGHBRIDGE
        </Text>
        {/* Weighbridge platform */}
        <mesh position={[0, 0.1, 6]} receiveShadow>
          <boxGeometry args={[4, 0.2, 8]} />
          <meshStandardMaterial color="#616161" roughness={0.8} />
        </mesh>
      </group>

      {/* Substation */}
      <group position={[-70, 0, -60]}>
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[5, 4, 4]} />
          <meshStandardMaterial color="#78909c" roughness={0.7} />
        </mesh>
        <mesh position={[0, 4.3, 0]} castShadow>
          <boxGeometry args={[5.5, 0.4, 4.5]} />
          <meshStandardMaterial color="#546e7a" roughness={0.6} />
        </mesh>
        {/* Warning sign */}
        <mesh position={[2.55, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#ffc107" />
        </mesh>
        <Text
          position={[2.6, 2, 0]}
          fontSize={0.15}
          color="#000000"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI / 2, 0]}
        >
          DANGER
        </Text>
        {/* Electrical equipment on roof */}
        <mesh position={[0, 4.8, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 1, 8]} />
          <meshStandardMaterial color="#424242" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>

      {/* Additional trees along boundaries */}
      <SimpleTree position={[-110, 0, 60]} scale={1.3} />
      <SimpleTree position={[-110, 0, 30]} scale={1.1} />
      <SimpleTree position={[-110, 0, 0]} scale={1.2} />
      <SimpleTree position={[-110, 0, -30]} scale={1.0} />
      <SimpleTree position={[110, 0, 40]} scale={1.2} />
      <SimpleTree position={[110, 0, -20]} scale={1.1} />
      <SimpleTree position={[110, 0, -60]} scale={1.3} />

      {/* Second parkland area - back left */}
      <group position={[-85, 0, -110]}>
        <mesh position={[0, -0.10, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[12, 12]} />
          <meshStandardMaterial color={GRASS_COLORS.lawn} roughness={0.95} />
        </mesh>
        <SimpleTree position={[-5, 0, 3]} scale={1.0} />
        <SimpleTree position={[4, 0, -2]} scale={0.9} />
        <SimpleTree position={[0, 0, 6]} scale={1.1} />
        <ParkBench position={[0, 0, 0]} rotation={0} />
      </group>

      {/* ========== WATER FEATURES & WATERWAY INFRASTRUCTURE ========== */}
      {/* Historically, grain mills were built near waterways for power and transport */}

      {/* Industrial Canal - West side (for barge transport of grain and flour) */}
      {/* Extended to connect with the branch canal at z=-110 */}
      <Canal
        position={[-145, 0, -5]}
        length={220}
        width={12}
        rotation={0}
      />

      {/* Canal Lock Gate - controls water level for barge access */}
      <LockGate position={[-145, 0, 50]} width={10} rotation={0} />

      {/* Wooden docks removed - were floating in canal */}

      {/* Footbridge over canal - connects factory area to west */}
      {/* Rotation=PI/2 to span across canal (east-west) rather than along it */}
      <FootBridge position={[-145, 0, -50]} length={14} width={2.5} rotation={Math.PI / 2} style="wooden" />

      {/* Lake in front-right area - scenic water feature */}
      <Lake
        position={[120, 0, 120]}
        size={[40, 30]}
        depth={0.5}
      />

      {/* River segment - runs along the back boundary */}
      <River
        position={[0, 0, -145]}
        length={280}
        width={20}
        meander={10}
      />

      {/* Small decorative pond near the front office buildings */}
      <Pond
        position={[-125, 0, 105]}
        radius={10}
      />

      {/* Canal branch connecting main canal to the river */}
      <Canal
        position={[-145, 0, -110]}
        length={70}
        width={8}
        rotation={Math.PI / 2}
      />

      {/* Additional smaller pond near back parkland */}
      <Pond
        position={[115, 0, -115]}
        radius={6}
      />

      {/* ========== INDUSTRIAL STRUCTURES ========== */}

      {/* Loading dock canopy - FRONT (shipping) */}
      <LoadingDockCanopy
        position={[0, 0, 58]}
        width={20}
        depth={5}
        rotation={0}
      />

      {/* Loading dock canopy - BACK (receiving) */}
      <LoadingDockCanopy
        position={[0, 0, -58]}
        width={20}
        depth={5}
        rotation={Math.PI}
      />

      {/* Grain elevator tower - positioned at west side of factory */}
      <GrainElevator position={[-75, 0, -20]} />

      {/* Conveyor bridges - connecting elevator to factory and silos */}
      <ConveyorBridge
        start={[-70, 30, -20]}
        end={[-58, 15, -22]}
      />
      <ConveyorBridge
        start={[-70, 35, -20]}
        end={[-75, 25, 10]}
      />
      <ConveyorBridge
        start={[-58, 12, 0]}
        end={[-58, 12, -40]}
      />

      {/* Storage tanks - east side industrial area */}
      <StorageTank
        position={[75, 0, -30]}
        length={10}
        radius={3}
        rotation={0}
        color="#d1d5db"
      />
      <StorageTank
        position={[75, 0, -15]}
        length={8}
        radius={2.5}
        rotation={0}
        color="#e5e7eb"
      />
      <StorageTank
        position={[75, 0, 0]}
        length={10}
        radius={3}
        rotation={0}
        color="#d1d5db"
      />

      {/* Propane tanks - utility area near back */}
      <PropaneTank position={[80, 0, 25]} height={5} radius={1.5} />
      <PropaneTank position={[85, 0, 25]} height={4} radius={1.2} />

      {/* Additional grain silos - outside the main building */}
      <GrainSilo position={[-85, 0, 30]} radius={6} height={35} color="#94a3b8" />
      <GrainSilo position={[-85, 0, 50]} radius={5} height={30} color="#a3b1c6" />

      {/* ========== PATHS & WALKWAYS ========== */}

      {/* Main path from factory front gate to canal towpath */}
      <GravelPath start={[-95, 0, 85]} end={[-130, 0, 85]} width={3} type="paved" />
      <GravelPath start={[-130, 0, 85]} end={[-130, 0, 50]} width={2.5} type="gravel" />

      {/* Canal towpath - runs along the canal */}
      <GravelPath start={[-155, 0, 100]} end={[-155, 0, -100]} width={3} type="gravel" />

      {/* Path to the lake area */}
      <GravelPath start={[95, 0, 85]} end={[120, 0, 100]} width={2.5} type="paved" />
      <CurvedPath position={[120, 0, 100]} radius={8} startAngle={-Math.PI / 2} endAngle={0} width={2.5} type="paved" />

      {/* Lakeside walking path - around the lake */}
      <CurvedPath position={[120, 0, 120]} radius={22} startAngle={0} endAngle={Math.PI * 2} width={2} type="gravel" />

      {/* Path from back gate to river */}
      <GravelPath start={[0, 0, -85]} end={[0, 0, -125]} width={3} type="paved" />

      {/* Riverbank path */}
      <GravelPath start={[-100, 0, -135]} end={[100, 0, -135]} width={2.5} type="gravel" />

      {/* Path connecting canal to back parkland */}
      <GravelPath start={[-130, 0, -100]} end={[-85, 0, -110]} width={2} type="gravel" />

      {/* Path to front pond */}
      <GravelPath start={[-100, 0, 95]} end={[-125, 0, 105]} width={2} type="gravel" />
      <CurvedPath position={[-125, 0, 105]} radius={14} startAngle={0} endAngle={Math.PI * 1.5} width={1.8} type="gravel" />

      {/* Factory perimeter path - west side */}
      <GravelPath start={[-65, 0, 50]} end={[-65, 0, -50]} width={2} type="paved" />

      {/* Factory perimeter path - east side */}
      <GravelPath start={[65, 0, 50]} end={[65, 0, -50]} width={2} type="paved" />

      {/* Cross path at rear - behind factory */}
      <GravelPath start={[-65, 0, -60]} end={[65, 0, -60]} width={2} type="paved" />

      {/* Path to east pond */}
      <GravelPath start={[100, 0, -85]} end={[115, 0, -110]} width={1.8} type="gravel" />

      {/* ========== PATH AMENITIES & FURNITURE ========== */}

      {/* Victorian lamps along canal towpath */}
      <PathLamp position={[-155, 0, 80]} style="victorian" />
      <PathLamp position={[-155, 0, 40]} style="victorian" />
      <PathLamp position={[-155, 0, 0]} style="victorian" />
      <PathLamp position={[-155, 0, -40]} style="victorian" />
      <PathLamp position={[-155, 0, -80]} style="victorian" />

      {/* Modern lamps along factory paths */}
      <PathLamp position={[-65, 0, 30]} style="modern" />
      <PathLamp position={[-65, 0, -30]} style="modern" />
      <PathLamp position={[65, 0, 30]} style="modern" />
      <PathLamp position={[65, 0, -30]} style="modern" />

      {/* Lamps around lake */}
      <PathLamp position={[98, 0, 120]} style="victorian" />
      <PathLamp position={[142, 0, 120]} style="victorian" />
      <PathLamp position={[120, 0, 142]} style="victorian" />

      {/* Lamps along river path */}
      <PathLamp position={[-60, 0, -135]} style="modern" />
      <PathLamp position={[0, 0, -135]} style="modern" />
      <PathLamp position={[60, 0, -135]} style="modern" />

      {/* Bollards along canal edge */}
      <Bollard position={[-137, 0, -25]} type="wood" />
      <Bollard position={[-137, 0, -15]} type="wood" />
      <Bollard position={[-137, 0, 15]} type="wood" />
      <Bollard position={[-137, 0, 25]} type="wood" />

      {/* Bollards at dock areas */}
      <Bollard position={[-138, 0, -32]} type="metal" />
      <Bollard position={[-138, 0, 32]} type="metal" />

      {/* Information signs */}
      <InfoSign position={[-150, 0, 85]} text="CANAL" rotation={Math.PI / 4} />
      <InfoSign position={[95, 0, 115]} text="LAKE" rotation={-Math.PI / 4} />
      <InfoSign position={[10, 0, -130]} text="RIVER" rotation={0} />
      <InfoSign position={[-137, 0, -45]} text="DOCK" rotation={Math.PI / 2} />

      {/* Picnic area by the lake */}
      <PicnicTable position={[145, 0, 105]} rotation={Math.PI / 6} />
      <PicnicTable position={[150, 0, 130]} rotation={-Math.PI / 4} />
      <WasteBin position={[148, 0, 118]} />

      {/* Picnic area by canal */}
      <PicnicTable position={[-160, 0, 60]} rotation={Math.PI / 2} />
      <WasteBin position={[-158, 0, 70]} />

      {/* Benches along paths */}
      <ParkBench position={[-155, 0, 20]} rotation={Math.PI / 2} />
      <ParkBench position={[-155, 0, -60]} rotation={Math.PI / 2} />
      <ParkBench position={[0, 0, -140]} rotation={0} />

      {/* Hedges bordering paths */}
      <HedgeRow start={[-130, 0, 90]} end={[-130, 0, 60]} height={0.6} width={0.5} />
      <HedgeRow start={[95, 0, 90]} end={[110, 0, 100]} height={0.5} width={0.4} />
      <HedgeRow start={[-10, 0, -128]} end={[10, 0, -128]} height={0.5} width={0.4} />

      {/* Additional trees along waterways */}
      <SimpleTree position={[-160, 0, 70]} scale={1.1} />
      <SimpleTree position={[-160, 0, 30]} scale={0.9} />
      <SimpleTree position={[-160, 0, -10]} scale={1.2} />
      <SimpleTree position={[-160, 0, -50]} scale={1.0} />
      <SimpleTree position={[-160, 0, -90]} scale={1.1} />

      {/* Trees by river */}
      <SimpleTree position={[-80, 0, -155]} scale={1.3} />
      <SimpleTree position={[-40, 0, -160]} scale={1.0} />
      <SimpleTree position={[40, 0, -158]} scale={1.2} />
      <SimpleTree position={[80, 0, -155]} scale={0.9} />

      {/* Additional trees by lake */}
      <SimpleTree position={[155, 0, 110]} scale={1.0} />
      <SimpleTree position={[160, 0, 135]} scale={1.2} />
      <SimpleTree position={[100, 0, 145]} scale={0.9} />
    </group>
  );
};
