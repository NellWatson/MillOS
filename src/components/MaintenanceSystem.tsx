/**
 * Maintenance System
 *
 * Handles visible maintenance activities:
 * - Sweeping (dust cleanup)
 * - Oiling machines
 * - Watering plants
 *
 * Also handles worker reactions to chaos events:
 * - Slipping on grain spills
 * - Coughing in dust clouds
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkerMoodStore } from '../stores/workerMoodStore';
import { WORKER_ROSTER } from '../types';

// =========================================================================
// MAINTENANCE WORKER WITH BROOM (Sweeping Animation)
// =========================================================================
interface SweepingWorkerProps {
  position: [number, number, number];
  targetPosition: [number, number, number];
}

const SweepingWorker: React.FC<SweepingWorkerProps> = React.memo(({ position, targetPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const broomRef = useRef<THREE.Group>(null);
  const sweepPhaseRef = useRef(0);
  const positionRef = useRef(new THREE.Vector3(...position));
  const targetRef = useRef(new THREE.Vector3(...targetPosition));
  const directionRef = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    if (!groupRef.current || !broomRef.current) return;

    // Move toward target slowly
    positionRef.current.lerp(targetRef.current, delta * 0.3);
    groupRef.current.position.copy(positionRef.current);

    // Face movement direction
    const dir = directionRef.current.copy(targetRef.current).sub(positionRef.current);
    if (dir.length() > 0.1) {
      groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Sweeping animation - back and forth
    sweepPhaseRef.current += delta * 4;
    const sweepAngle = Math.sin(sweepPhaseRef.current) * 0.4;
    broomRef.current.rotation.y = sweepAngle;
    broomRef.current.position.x = Math.sin(sweepPhaseRef.current) * 0.15;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Simple maintenance worker body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
        <meshStandardMaterial color="#f97316" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>

      {/* Hard hat */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#eab308" roughness={0.6} />
      </mesh>

      {/* Broom */}
      <group ref={broomRef} position={[0.2, 0.6, 0.3]}>
        {/* Handle */}
        <mesh rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.2, 8]} />
          <meshStandardMaterial color="#8b4513" roughness={0.9} />
        </mesh>
        {/* Bristles */}
        <mesh position={[0, -0.5, 0.1]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.15, 0.08, 0.12]} />
          <meshStandardMaterial color="#d4a574" roughness={1} />
        </mesh>
      </group>
    </group>
  );
});
SweepingWorker.displayName = 'SweepingWorker';

// =========================================================================
// WATERING CAN ANIMATION
// =========================================================================
interface WateringWorkerProps {
  position: [number, number, number];
  plantPosition: [number, number, number];
}

const WateringWorker: React.FC<WateringWorkerProps> = React.memo(({ position, plantPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const canRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Points>(null);
  const pourPhaseRef = useRef(0);
  const directionRef = useRef(new THREE.Vector3());

  // Water droplet positions
  const waterPositions = useMemo(() => {
    const arr = new Float32Array(15 * 3);
    for (let i = 0; i < 15; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.1;
      arr[i * 3 + 1] = -Math.random() * 0.3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    return arr;
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current || !canRef.current) return;

    // Face the plant
    const dir = directionRef.current.set(...plantPosition).sub(groupRef.current.position);
    groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);

    // Tilt watering can
    pourPhaseRef.current += delta * 2;
    const tiltAmount = Math.sin(pourPhaseRef.current * 0.5) * 0.1 + 0.5;
    canRef.current.rotation.z = -tiltAmount;

    // Animate water droplets
    if (waterRef.current) {
      const geo = waterRef.current.geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - delta * 0.5;
        if (y < -0.4) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Worker body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#e0ac69" roughness={0.9} />
      </mesh>

      {/* Watering can */}
      <group ref={canRef} position={[0.25, 1.0, 0.2]}>
        {/* Can body */}
        <mesh>
          <cylinderGeometry args={[0.08, 0.1, 0.15, 12]} />
          <meshStandardMaterial color="#22c55e" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Spout */}
        <mesh position={[0.1, 0.02, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.015, 0.02, 0.12, 8]} />
          <meshStandardMaterial color="#22c55e" metalness={0.3} />
        </mesh>
        {/* Handle */}
        <mesh position={[-0.05, 0.1, 0]}>
          <torusGeometry args={[0.04, 0.01, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Water droplets */}
        <points ref={waterRef} position={[0.15, -0.05, 0]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[waterPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#3b82f6" size={0.02} transparent opacity={0.7} sizeAttenuation />
        </points>
      </group>
    </group>
  );
});
WateringWorker.displayName = 'WateringWorker';

// =========================================================================
// OILING ANIMATION
// =========================================================================
interface OilingWorkerProps {
  position: [number, number, number];
  machinePosition: [number, number, number];
}

const OilingWorker: React.FC<OilingWorkerProps> = React.memo(({ position, machinePosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const canRef = useRef<THREE.Group>(null);
  const squeezePhaseRef = useRef(0);
  const directionRef = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    if (!groupRef.current || !canRef.current) return;

    // Face the machine
    const dir = directionRef.current.set(...machinePosition).sub(groupRef.current.position);
    groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);

    // Squeeze animation
    squeezePhaseRef.current += delta * 3;
    const squeeze = Math.sin(squeezePhaseRef.current) * 0.1;
    canRef.current.scale.x = 1 - Math.abs(squeeze);
    canRef.current.scale.z = 1 - Math.abs(squeeze);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Worker body - maintenance orange */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
        <meshStandardMaterial color="#ea580c" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#8d5524" roughness={0.9} />
      </mesh>

      {/* Safety glasses */}
      <mesh position={[0, 1.52, 0.1]}>
        <boxGeometry args={[0.18, 0.04, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
      </mesh>

      {/* Oil can */}
      <group ref={canRef} position={[0.2, 1.1, 0.25]} rotation={[0.3, 0, 0]}>
        {/* Can body */}
        <mesh>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 12]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        {/* Long spout */}
        <mesh position={[0, 0.08, 0.06]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.005, 0.15, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
        </mesh>
        {/* Trigger */}
        <mesh position={[0, 0.03, -0.03]}>
          <boxGeometry args={[0.02, 0.04, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
    </group>
  );
});
OilingWorker.displayName = 'OilingWorker';

// =========================================================================
// WORKER REACTION OVERLAY - Slip and Cough animations
// =========================================================================
interface WorkerReactionOverlayProps {
  workerId: string;
  position: [number, number, number];
}

export const WorkerReactionOverlay: React.FC<WorkerReactionOverlayProps> = React.memo(
  ({ workerId, position }) => {
    const reaction = useWorkerMoodStore((state) => state.workerReactions[workerId]);

    if (!reaction || reaction.reaction === 'none') return null;

    return (
      <group position={position}>
        {reaction.reaction === 'slipping' && <SlipEffect />}
        {reaction.reaction === 'coughing' && <CoughEffect />}
      </group>
    );
  }
);
WorkerReactionOverlay.displayName = 'WorkerReactionOverlay';

// Slip effect - motion lines and stars
const SlipEffect: React.FC = React.memo(() => {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(0);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    phaseRef.current += delta * 8;

    // Wobble the whole effect
    groupRef.current.rotation.z = Math.sin(phaseRef.current) * 0.3;
    groupRef.current.position.y = 1.5 + Math.sin(phaseRef.current * 2) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {/* Motion lines */}
      {[-0.3, -0.15, 0, 0.15, 0.3].map((offset, i) => (
        <mesh key={i} position={[offset, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.02, 0.15 + Math.random() * 0.1]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8 - i * 0.15} />
        </mesh>
      ))}

      {/* Stars around head */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={`star-${i}`}
            position={[Math.cos(angle) * 0.25, 0.2, Math.sin(angle) * 0.25]}
          >
            <octahedronGeometry args={[0.04]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        );
      })}
    </group>
  );
});
SlipEffect.displayName = 'SlipEffect';

// Cough effect - puff clouds
const CoughEffect: React.FC = React.memo(() => {
  const puffsRef = useRef<THREE.Mesh[]>([]);
  const phases = useMemo(() => [0, 0.3, 0.6], []);

  useFrame((state) => {
    puffsRef.current.forEach((ref, i) => {
      if (!ref) return;
      const phase = (state.clock.elapsedTime * 2 + phases[i]) % 1;

      // Puffs expand and fade as they move outward
      ref.position.z = 0.3 + phase * 0.4;
      ref.position.y = 1.4 + phase * 0.2;
      ref.scale.setScalar(0.05 + phase * 0.1);
      (ref.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.6;
    });
  });

  return (
    <group>
      {phases.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) puffsRef.current[i] = el;
          }}
          position={[0, 1.4, 0.3]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#a0826d" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
});
CoughEffect.displayName = 'CoughEffect';

// =========================================================================
// CHAOS EVENT REACTIONS SYSTEM
// Detects workers near chaos events and triggers reactions
// =========================================================================
export const useChaosReactions = () => {
  const chaosEvents = useWorkerMoodStore((state) => state.chaosEvents);
  const triggerWorkerReaction = useWorkerMoodStore((state) => state.triggerWorkerReaction);
  const lastCheckRef = useRef(0);

  useFrame(() => {
    const now = Date.now();
    // Check every 500ms
    if (now - lastCheckRef.current < 500) return;
    lastCheckRef.current = now;

    // For each active chaos event, check if workers should react
    chaosEvents.forEach((event) => {
      if (event.resolved) return;

      // Random chance for workers to react when near event
      WORKER_ROSTER.forEach((worker) => {
        // 5% chance per check to trigger reaction if affected
        if (event.affectedWorkerIds.includes(worker.id) && Math.random() < 0.05) {
          if (event.type === 'grain_spill') {
            triggerWorkerReaction(worker.id, 'slipping', 1500);
          } else if (event.type === 'dust_cloud') {
            triggerWorkerReaction(worker.id, 'coughing', 2000);
          }
        }
      });
    });
  });
};

// =========================================================================
// MAIN MAINTENANCE SYSTEM COMPONENT
// =========================================================================
export const MaintenanceSystem: React.FC = () => {
  const maintenanceTasks = useWorkerMoodStore((state) => state.maintenanceTasks);
  const factoryEnvironment = useWorkerMoodStore((state) => state.factoryEnvironment);
  const addMaintenanceTask = useWorkerMoodStore((state) => state.addMaintenanceTask);
  const cleanDust = useWorkerMoodStore((state) => state.cleanDust);

  // Use the chaos reactions hook
  useChaosReactions();

  // Auto-spawn maintenance tasks when needed
  useEffect(() => {
    const interval = setInterval(() => {
      // If dust is high and no sweeping task, add one
      if (factoryEnvironment.dustLevel > 40 && !maintenanceTasks.some((t) => t.type === 'sweeping')) {
        addMaintenanceTask({
          type: 'sweeping',
          position: [(Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 40],
          priority: factoryEnvironment.dustLevel > 70 ? 'high' : 'medium',
          description: 'Sweeping up dust',
        });
      }

      // Check for thirsty plants
      factoryEnvironment.plants.forEach((plant) => {
        if (
          plant.health < 50 &&
          !maintenanceTasks.some((t) => t.type === 'plant_watering' && t.description.includes(plant.id))
        ) {
          addMaintenanceTask({
            type: 'plant_watering',
            position: plant.position,
            priority: plant.health < 30 ? 'high' : 'low',
            description: `Watering ${plant.name || plant.id}`,
          });
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [factoryEnvironment, maintenanceTasks, addMaintenanceTask]);

  // Slowly clean dust when sweeping task exists
  useEffect(() => {
    if (maintenanceTasks.some((t) => t.type === 'sweeping')) {
      const interval = setInterval(() => {
        cleanDust(2);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [maintenanceTasks, cleanDust]);

  return (
    <group>
      {/* Render maintenance workers for active tasks */}
      {maintenanceTasks.map((task) => {
        if (task.type === 'sweeping') {
          return (
            <SweepingWorker
              key={task.id}
              position={[task.position[0] - 2, 0, task.position[2]]}
              targetPosition={task.position}
            />
          );
        }
        if (task.type === 'plant_watering') {
          return (
            <WateringWorker
              key={task.id}
              position={[task.position[0] + 0.5, 0, task.position[2] + 0.5]}
              plantPosition={task.position}
            />
          );
        }
        if (task.type === 'oiling') {
          return (
            <OilingWorker
              key={task.id}
              position={[task.position[0] + 1, 0, task.position[2]]}
              machinePosition={task.position}
            />
          );
        }
        return null;
      })}
    </group>
  );
};

export default MaintenanceSystem;
