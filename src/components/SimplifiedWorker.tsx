import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../utils/frameThrottle';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useGraphicsStore } from '../stores/graphicsStore';
import { Billboard } from '@react-three/drei';

// Simplified worker for medium-distance LOD (15-40m)
// Uses minimal primitives to reduce draw calls from ~15 to ~5

interface SimplifiedWorkerProps {
  position: [number, number, number];
  rotation: number;
  uniformColor: string;
  skinTone: string;
  isWalking: boolean;
  walkCycle: number;
}

// Medium LOD - Simple capsule worker (5 draw calls)
export const SimplifiedWorker: React.FC<SimplifiedWorkerProps> = React.memo(
  ({ position, rotation, uniformColor, skinTone, isWalking, walkCycle }) => {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Mesh>(null);
    const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);
    const quality = useGraphicsStore((state) => state.graphics.quality);

    // Simple walking animation
    useFrame(() => {
      if (!isTabVisible || quality === 'low') return;
      if (!shouldRunThisFrame(3)) return; // Throttle to 20fps

      if (bodyRef.current && isWalking) {
        // Simple bob
        const bob = Math.sin(walkCycle) * 0.03;
        bodyRef.current.position.y = 0.3 + bob;
      }
    });

    return (
      <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
        {/* Body cylinder */}
        <mesh ref={bodyRef} position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 0.6, 8]} />
          <meshStandardMaterial color={uniformColor} roughness={0.7} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={skinTone} roughness={0.8} />
        </mesh>

        {/* Hat */}
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.06, 8]} />
          <meshStandardMaterial color="#eab308" roughness={0.6} />
        </mesh>

        {/* Legs (simple boxes) */}
        <mesh position={[-0.08, -0.15, 0]} castShadow>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        <mesh position={[0.08, -0.15, 0]} castShadow>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
      </group>
    );
  }
);

SimplifiedWorker.displayName = 'SimplifiedWorker';

// Far LOD - Billboard impostor (1 draw call)
interface WorkerImpostorProps {
  position: [number, number, number];
  uniformColor: string;
}

export const WorkerImpostor: React.FC<WorkerImpostorProps> = React.memo(
  ({ position, uniformColor }) => {
    return (
      <Billboard position={position}>
        <mesh>
          <planeGeometry args={[0.4, 0.8]} />
          <meshBasicMaterial color={uniformColor} transparent opacity={0.9} depthWrite={false} />
        </mesh>
        {/* Simple dot for head */}
        <mesh position={[0, 0.3, 0.01]}>
          <circleGeometry args={[0.08, 8]} />
          <meshBasicMaterial color="#f5d0c5" />
        </mesh>
      </Billboard>
    );
  }
);

WorkerImpostor.displayName = 'WorkerImpostor';
