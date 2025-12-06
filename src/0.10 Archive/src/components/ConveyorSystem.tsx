import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { audioManager } from '../utils/audioManager';
import { useMillStore } from '../store';
import { GrainQuality } from '../types';

// Generate batch number in format: YYYYMMDD-XXX
const generateBatchNumber = (index: number): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const batchNum = String(index + 1).padStart(3, '0');
  return `${dateStr}-${batchNum}`;
};

// Quality colors for batch labeling
const QUALITY_COLORS: Record<GrainQuality, string> = {
  premium: '#22c55e',
  standard: '#3b82f6',
  economy: '#f59e0b',
  mixed: '#8b5cf6',
};

// Procedural conveyor belt texture with ridges
const useConveyorBeltTexture = () => {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base belt color - dark rubber
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);

    // Add horizontal ridges
    for (let y = 0; y < size; y += 16) {
      // Ridge highlight
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, y, size, 3);
      // Ridge shadow
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, y + 12, size, 2);
    }

    // Add subtle texture noise
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    // Add center guide line
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(size / 2 - 2, 0, 4, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 1);

    return texture;
  }, []);
};

// Detailed roller texture
const useRollerTexture = () => {
  return useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base metal color
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, size, size);

    // Add horizontal grooves
    for (let y = 0; y < size; y += 8) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, y, size, 1);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, y + 1, size, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);

    return texture;
  }, []);
};

interface ConveyorSystemProps {
  productionSpeed: number;
}

interface FlourBag {
  id: string;
  position: [number, number, number];
  speed: number;
  rotation: number;
  // Batch tracking
  batchNumber: string;
  quality: GrainQuality;
  weight: number; // kg
}

// Quality distribution (weighted random selection)
const QUALITY_WEIGHTS: { quality: GrainQuality; weight: number }[] = [
  { quality: 'premium', weight: 0.3 },
  { quality: 'standard', weight: 0.5 },
  { quality: 'economy', weight: 0.15 },
  { quality: 'mixed', weight: 0.05 },
];

const getRandomQuality = (): GrainQuality => {
  const rand = Math.random();
  let cumulative = 0;
  for (const { quality, weight } of QUALITY_WEIGHTS) {
    cumulative += weight;
    if (rand < cumulative) return quality;
  }
  return 'standard';
};

export const ConveyorSystem: React.FC<ConveyorSystemProps> = ({ productionSpeed }) => {
  const graphicsQuality = useMillStore((state) => state.graphics.quality);
  const incrementBagsProduced = useMillStore((state) => state.incrementBagsProduced);
  const bagCount = graphicsQuality === 'low' ? 15 : graphicsQuality === 'medium' ? 30 : 60;

  const bags = useMemo(() => {
    const _bags: FlourBag[] = [];
    for (let i = 0; i < bagCount; i++) {
      _bags.push({
        id: `bag-${i}`,
        position: [(Math.random() - 0.5) * 50, 1.1, 19],
        speed: 4 + Math.random() * 2,
        rotation: (Math.random() - 0.5) * 0.1,
        // Batch tracking
        batchNumber: generateBatchNumber(i),
        quality: getRandomQuality(),
        weight: 25 + Math.floor(Math.random() * 6), // 25-30 kg bags
      });
    }
    return _bags;
  }, [bagCount]);

  return (
    <group>
      {/* Main conveyor belt structure */}
      <ConveyorBelt position={[0, 0.5, 19]} length={55} productionSpeed={productionSpeed} />

      {/* Side rails with detail */}
      <SideRails position={[0, 1.3, 19]} length={55} />

      {/* Support legs with cross bracing */}
      {[-25, -15, -5, 5, 15, 25].map((x, i) => (
        <SupportLeg key={i} position={[x, 0, 19]} />
      ))}

      {/* Flour bags */}
      {bags.map(bag => (
        <FlourBagMesh key={bag.id} data={bag} speedMulti={productionSpeed} />
      ))}

      {/* Roller conveyor to packing with enhanced details */}
      <RollerConveyor position={[0, 0.5, 16]} productionSpeed={productionSpeed} />

      {/* Tension adjustment mechanisms */}
      <TensionMechanism position={[-27.5, 0.5, 19]} />
      <TensionMechanism position={[27.5, 0.5, 19]} />
    </group>
  );
};

// Enhanced Side Rails with detail
const SideRails: React.FC<{ position: [number, number, number]; length: number }> = ({ position, length }) => {
  return (
    <group position={position}>
      {/* Front rail */}
      <mesh position={[0, 0, -1]} castShadow>
        <boxGeometry args={[length, 0.1, 0.15]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Back rail */}
      <mesh position={[0, 0, 1]} castShadow>
        <boxGeometry args={[length, 0.1, 0.15]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Rail supports/brackets every 5 units */}
      {Array.from({ length: Math.floor(length / 5) }).map((_, i) => {
        const x = -length / 2 + 2.5 + i * 5;
        return (
          <group key={i} position={[x, -0.15, 0]}>
            {/* L-bracket front */}
            <mesh position={[0, 0, -0.9]} castShadow>
              <boxGeometry args={[0.08, 0.25, 0.08]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
            </mesh>
            {/* L-bracket back */}
            <mesh position={[0, 0, 0.9]} castShadow>
              <boxGeometry args={[0.08, 0.25, 0.08]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Support leg with cross bracing
const SupportLeg: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Front leg */}
      <mesh position={[0, 0.25, -0.5]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.15]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Back leg */}
      <mesh position={[0, 0.25, 0.5]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.15]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Cross brace */}
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.9]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Foot pads */}
      <mesh position={[0, 0.02, -0.5]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.25]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0.5]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.25]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
};

// Belt tension adjustment mechanism
const TensionMechanism: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const screwRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position}>
      {/* Tension frame */}
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.4, 2.4]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* End roller */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 2, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Tension screws */}
      <mesh ref={screwRef} position={[0.35, 0, -1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.35, 0, 1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Bolt heads */}
      <mesh position={[0.52, 0, -1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.52, 0, 1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

const ConveyorBelt: React.FC<{ position: [number, number, number]; length: number; productionSpeed: number }> = ({ position, length, productionSpeed }) => {
  const beltRef = useRef<THREE.Mesh>(null);
  const driveRollerRef = useRef<THREE.Group>(null);
  const conveyorId = `conveyor-main-${position[0]}-${position[2]}`;
  const beltTexture = useConveyorBeltTexture();
  const graphics = useMillStore((state) => state.graphics);

  // Start conveyor sound on mount
  useEffect(() => {
    audioManager.startConveyorSound(conveyorId, position[0], position[1], position[2]);
    return () => {
      audioManager.stopConveyorSound(conveyorId);
    };
  }, [conveyorId, position]);

  useFrame((_, delta) => {
    // Skip animations on low graphics
    if (graphics.quality === 'low') return;

    // Cap delta to prevent huge jumps when tab regains focus (max 100ms)
    const cappedDelta = Math.min(delta, 0.1);

    if (beltRef.current && beltTexture) {
      // Animate the belt texture scrolling - wrap to prevent float precision issues
      beltTexture.offset.x = (beltTexture.offset.x + cappedDelta * productionSpeed * 0.3) % 1;
    }
    // Animate drive rollers - wrap to prevent float precision issues
    if (driveRollerRef.current) {
      driveRollerRef.current.rotation.z = (driveRollerRef.current.rotation.z + cappedDelta * productionSpeed * 3) % (Math.PI * 2);
    }
    // Update spatial audio volume based on camera distance
    audioManager.updateConveyorSpatialVolume(conveyorId);
  });

  const showDetails = graphics.enableProceduralTextures;

  return (
    <group position={position}>
      {/* Belt surface with scrolling texture */}
      <mesh ref={beltRef} receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[length, 0.1, 2]} />
        <meshStandardMaterial map={beltTexture} roughness={0.8} />
      </mesh>

      {/* Belt frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[length, 0.5, 2.2]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Drive rollers at intervals (enhanced detail) */}
      {showDetails && Array.from({ length: Math.floor(length / 4) }).map((_, i) => {
        const x = -length / 2 + 2 + i * 4;
        return (
          <group key={i} ref={i === 0 ? driveRollerRef : undefined} position={[x, 0.15, 0]}>
            {/* Main roller */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 1.9, 12]} />
              <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.15} />
            </mesh>
            {/* Roller end caps */}
            <mesh position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Bearing housings */}
            <mesh position={[0, 0, -1.05]} castShadow>
              <boxGeometry args={[0.15, 0.15, 0.08]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 1.05]} castShadow>
              <boxGeometry args={[0.15, 0.15, 0.08]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* Motor housing at one end */}
      {showDetails && (
        <group position={[-length / 2 + 1, -0.1, 1.3]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.6, 0.5]} />
            <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Motor shaft */}
          <mesh position={[0, 0.1, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Ventilation grille */}
          <mesh position={[0, 0, 0.26]}>
            <planeGeometry args={[0.5, 0.35]} />
            <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Warning label */}
          <mesh position={[0.41, 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.2, 0.15]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        </group>
      )}
    </group>
  );
};

const RollerConveyor: React.FC<{ position: [number, number, number]; productionSpeed: number }> = ({ position, productionSpeed }) => {
  const rollersRef = useRef<THREE.Group>(null);
  const conveyorId = `conveyor-roller-${position[0]}-${position[2]}`;
  const rollerTexture = useRollerTexture();
  const graphics = useMillStore((state) => state.graphics);

  // Start roller conveyor sound on mount
  useEffect(() => {
    audioManager.startConveyorSound(conveyorId, position[0], position[1], position[2]);
    return () => {
      audioManager.stopConveyorSound(conveyorId);
    };
  }, [conveyorId, position]);

  useFrame((_, delta) => {
    // Skip animations on low graphics
    if (graphics.quality === 'low') return;

    // Cap delta to prevent huge jumps when tab regains focus (max 100ms)
    const cappedDelta = Math.min(delta, 0.1);

    if (rollersRef.current) {
      rollersRef.current.children.forEach((roller, index) => {
        // Vary rotation speed slightly for each roller
        const speedVariation = 1 + Math.sin(index * 0.5) * 0.1;
        // Wrap rotation to prevent float precision issues
        roller.rotation.z = (roller.rotation.z + cappedDelta * productionSpeed * 5 * speedVariation) % (Math.PI * 2);
      });
    }
    // Update spatial audio volume based on camera distance
    audioManager.updateConveyorSpatialVolume(conveyorId);
  });

  const showDetails = graphics.enableProceduralTextures;

  return (
    <group position={position}>
      {/* Frame with detail */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[30, 0.2, 2.5]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Side rails */}
      <mesh position={[0, 0.2, -1.2]} castShadow>
        <boxGeometry args={[30, 0.35, 0.1]} />
        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.2, 1.2]} castShadow>
        <boxGeometry args={[30, 0.35, 0.1]} />
        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Rollers */}
      <group ref={rollersRef}>
        {Array.from({ length: 25 }).map((_, i) => (
          <group key={i} position={[-12 + i * 1, 0.25, 0]}>
            {/* Main roller */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 2, 16]} />
              <meshStandardMaterial
                map={showDetails ? rollerTexture : null}
                color={showDetails ? '#ffffff' : '#94a3b8'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* Roller axle ends */}
            {showDetails && (
              <>
                <mesh position={[0, 0, -1.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
                  <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
                  <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>

      {/* End stops */}
      <mesh position={[-14.5, 0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.4, 2.6]} />
        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[14.5, 0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.4, 2.6]} />
        <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Support legs */}
      {[-10, 0, 10].map((x, i) => (
        <group key={i} position={[x, -0.3, 0]}>
          <mesh position={[0, 0, -1]} castShadow>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 1]} castShadow>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Bag movement boundary (wraps from +BOUNDARY to -BOUNDARY)
const BAG_BOUNDARY = 28;

const FlourBagMesh: React.FC<{ data: FlourBag; speedMulti: number }> = React.memo(({ data, speedMulti }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const graphics = useMillStore((state) => state.graphics);
  const incrementBagsProduced = useMillStore((state) => state.incrementBagsProduced);
  const crossedBoundaryRef = useRef(false);

  // Track current X position in a ref to avoid position prop interfering
  const currentX = useRef(data.position[0]);

  useFrame((_, delta) => {
    if (!ref.current) return;

    // Cap delta to prevent huge jumps when tab regains focus (max 100ms)
    const cappedDelta = Math.min(delta, 0.1);

    currentX.current += data.speed * speedMulti * cappedDelta;

    // Track when bag crosses the boundary (simulating packed bag)
    if (currentX.current > BAG_BOUNDARY) {
      // Preserve overflow to prevent stuttering/bunching
      const overflow = currentX.current - BAG_BOUNDARY;
      currentX.current = -BAG_BOUNDARY + overflow;
      if (!crossedBoundaryRef.current) {
        incrementBagsProduced(1);
        crossedBoundaryRef.current = true;
      }
    } else {
      crossedBoundaryRef.current = false;
    }

    // Apply position from ref (not from props)
    ref.current.position.x = currentX.current;
  });

  const showDetails = graphics.enableProceduralTextures;
  const qualityColor = QUALITY_COLORS[data.quality];

  // Extract position values for stable initial position (animated via ref after mount)
  const initPosX = data.position[0];
  const initPosY = data.position[1];
  const initPosZ = data.position[2];
  const initialPosition = useMemo<[number, number, number]>(
    () => [initPosX, initPosY, initPosZ],
    [initPosX, initPosY, initPosZ]
  );

  return (
    <group
      ref={ref}
      position={initialPosition}
      rotation={[0, data.rotation, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Bag body */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.9]} />
        <meshStandardMaterial
          color={hovered ? '#fff7ed' : '#fef3c7'}
          roughness={0.9}
          emissive={hovered ? '#fbbf24' : '#000000'}
          emissiveIntensity={hovered ? 0.1 : 0}
        />
      </mesh>

      {/* Quality-colored label stripe */}
      <mesh position={[0, 0.25, 0.46]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshBasicMaterial color={qualityColor} />
      </mesh>

      {/* Batch number text on bag (3D text) */}
      {showDetails && (
        <Text
          position={[0, 0.25, 0.47]}
          fontSize={0.06}
          color="white"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {data.batchNumber}
        </Text>
      )}

      {/* Weight indicator */}
      {showDetails && (
        <Text
          position={[0, 0.15, 0.47]}
          fontSize={0.04}
          color="white"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {data.weight}kg
        </Text>
      )}

      {/* Bag stitching detail */}
      {showDetails && (
        <>
          <mesh position={[0, 0.51, 0]}>
            <boxGeometry args={[0.58, 0.02, 0.88]} />
            <meshStandardMaterial color="#d4c4a8" roughness={1} />
          </mesh>
          {/* Top fold */}
          <mesh position={[0, 0.52, 0.2]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.5, 0.01, 0.2]} />
            <meshStandardMaterial color="#f5f0e6" roughness={0.95} />
          </mesh>
        </>
      )}

      {/* Hover tooltip with full batch info */}
      {hovered && (
        <Html position={[0, 0.8, 0]} center distanceFactor={10}>
          <div className="bg-slate-900/95 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 shadow-xl pointer-events-none min-w-[120px]">
            <div className="text-xs font-mono text-white font-bold">{data.batchNumber}</div>
            <div className="text-[10px] text-slate-400 mt-1">
              <div className="flex justify-between">
                <span>Quality:</span>
                <span style={{ color: qualityColor }} className="font-medium capitalize">{data.quality}</span>
              </div>
              <div className="flex justify-between">
                <span>Weight:</span>
                <span className="text-white">{data.weight} kg</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});
