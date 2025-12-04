/**
 * Visible Chaos System
 *
 * Theme Hospital-inspired visible disasters and events.
 * Grain spills, dust clouds, rat sightings, pigeon incursions,
 * and the ever-critical coffee machine breakdown.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useWorkerMoodStore } from '../stores/workerMoodStore';
import type { ChaosEvent } from '../types';

// =========================================================================
// GRAIN SPILL - Animated pile spreading on floor
// =========================================================================
const GrainSpill: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const scaleRef = useRef(0);

  const particleCount = 50;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    return Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2,
      delay: Math.random() * 0.5,
      scale: 0.05 + Math.random() * 0.1,
    }));
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const elapsed = (Date.now() - event.startTime) / 1000;
    scaleRef.current = Math.min(1, elapsed / 2); // Spread over 2 seconds

    positions.forEach((p, i) => {
      const spreadProgress = Math.max(0, Math.min(1, (scaleRef.current - p.delay) / 0.5));
      dummy.position.set(
        event.position[0] + p.x * spreadProgress * 1.5,
        0.02 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.01,
        event.position[2] + p.z * spreadProgress * 1.5
      );
      dummy.scale.setScalar(p.scale * spreadProgress);
      dummy.updateMatrix();
      particlesRef.current!.setMatrixAt(i, dummy.matrix);
    });
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[event.position[0], 0, event.position[2]]}>
      {/* Main spill pile */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <coneGeometry args={[0.8 * scaleRef.current, 0.3, 8]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>

      {/* Scattered grain particles */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, particleCount]} castShadow>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial color="#c68642" roughness={0.8} />
      </instancedMesh>

      {/* Warning sign */}
      <Billboard position={[0, 0.8, 0]}>
        <Text fontSize={0.2} color="#ef4444" anchorX="center">
          SPILL
        </Text>
      </Billboard>
    </group>
  );
});
GrainSpill.displayName = 'GrainSpill';

// =========================================================================
// DUST CLOUD - Particle burst, workers cough dramatically
// =========================================================================
const DustCloud: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = 100;
  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.5;
      arr[i * 3 + 1] = Math.random() * 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const elapsed = (Date.now() - event.startTime) / 1000;
    const expansion = Math.min(3, elapsed * 2);
    const fade = Math.max(0, 1 - elapsed / event.duration);

    particlesRef.current.scale.setScalar(expansion);
    (particlesRef.current.material as THREE.PointsMaterial).opacity = fade * 0.4;
    particlesRef.current.rotation.y = state.clock.elapsedTime * 0.2;
  });

  return (
    <group position={event.position}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#a0826d" size={0.08} transparent opacity={0.4} sizeAttenuation />
      </points>
    </group>
  );
});
DustCloud.displayName = 'DustCloud';

// =========================================================================
// RAT - Animated rat scurrying around. Everyone panics (slightly)
// =========================================================================
const Rat: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const radiusRef = useRef(0);
  const panicModeRef = useRef(false);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    // Rat scurries in expanding circles, occasionally panicking
    if (Math.random() < 0.01) panicModeRef.current = !panicModeRef.current;

    const speed = panicModeRef.current ? 8 : 3;
    angleRef.current += 0.05 * speed;
    radiusRef.current = 1 + Math.sin(time * 0.5) * 2;

    const x = event.position[0] + Math.cos(angleRef.current) * radiusRef.current;
    const z = event.position[2] + Math.sin(angleRef.current) * radiusRef.current;

    groupRef.current.position.set(x, 0.05, z);
    groupRef.current.rotation.y = angleRef.current + Math.PI / 2;

    // Tail wiggle
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(time * 15) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.01, 0.06]} castShadow>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.015, 0.03, 0.05]}>
        <sphereGeometry args={[0.01, 6, 6]} />
        <meshStandardMaterial color="#8b7b7b" />
      </mesh>
      <mesh position={[0.015, 0.03, 0.05]}>
        <sphereGeometry args={[0.01, 6, 6]} />
        <meshStandardMaterial color="#8b7b7b" />
      </mesh>

      {/* Eyes (beady) */}
      <mesh position={[-0.01, 0.02, 0.08]}>
        <sphereGeometry args={[0.004, 6, 6]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.01, 0.02, 0.08]}>
        <sphereGeometry args={[0.004, 6, 6]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Tail */}
      <mesh ref={tailRef} position={[0, 0, -0.06]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.002, 0.1, 6]} />
        <meshStandardMaterial color="#8b7b7b" />
      </mesh>

      {/* Feet (tiny) */}
      {[
        [-0.02, -0.02, 0.02],
        [0.02, -0.02, 0.02],
        [-0.02, -0.02, -0.02],
        [0.02, -0.02, -0.02],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.008, 4, 4]} />
          <meshStandardMaterial color="#8b7b7b" />
        </mesh>
      ))}
    </group>
  );
});
Rat.displayName = 'Rat';

// =========================================================================
// PIGEON - A pigeon got in. It's judging everyone.
// =========================================================================
const Pigeon: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const groupRef = useRef<THREE.Group>(null);
  const wingLeftRef = useRef<THREE.Mesh>(null);
  const wingRightRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const isFlying = useRef(false);
  const flyTargetRef = useRef({ x: event.position[0], y: 0.5, z: event.position[2] });
  const flyTargetVecRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    // Randomly decide to fly or walk
    if (Math.random() < 0.005) {
      isFlying.current = !isFlying.current;
      if (isFlying.current) {
        flyTargetRef.current = {
          x: event.position[0] + (Math.random() - 0.5) * 6,
          y: 1 + Math.random() * 2,
          z: event.position[2] + (Math.random() - 0.5) * 6,
        };
      }
    }

    const pos = groupRef.current.position;

    if (isFlying.current) {
      // Flying behavior
      flyTargetVecRef.current.set(
        flyTargetRef.current.x,
        flyTargetRef.current.y,
        flyTargetRef.current.z
      );
      pos.lerp(flyTargetVecRef.current, 0.02);

      // Wing flapping
      if (wingLeftRef.current && wingRightRef.current) {
        const flap = Math.sin(time * 20) * 0.8;
        wingLeftRef.current.rotation.z = flap;
        wingRightRef.current.rotation.z = -flap;
      }
    } else {
      // Walking/pecking behavior
      pos.y = 0.1;

      // Waddle walk
      if (Math.random() < 0.02) {
        pos.x += (Math.random() - 0.5) * 0.1;
        pos.z += (Math.random() - 0.5) * 0.1;
      }

      // Wings folded
      if (wingLeftRef.current && wingRightRef.current) {
        wingLeftRef.current.rotation.z = THREE.MathUtils.lerp(wingLeftRef.current.rotation.z, 0, 0.1);
        wingRightRef.current.rotation.z = THREE.MathUtils.lerp(wingRightRef.current.rotation.z, 0, 0.1);
      }

      // Head bobbing (classic pigeon)
      if (headRef.current) {
        headRef.current.position.z = 0.06 + Math.sin(time * 8) * 0.02;
      }
    }
  });

  return (
    <group ref={groupRef} position={[event.position[0], 0.5, event.position[2]]}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.05, 0.08, 4, 8]} />
        <meshStandardMaterial color="#7a7a8a" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 0.02, 0.06]} castShadow>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#6a6a7a" roughness={0.8} />
      </mesh>

      {/* Beak */}
      <mesh position={[0, 0.01, 0.09]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.01, 0.025, 4]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>

      {/* Eyes (judgmental) */}
      <mesh position={[-0.015, 0.035, 0.08]}>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#ff6b00" />
      </mesh>
      <mesh position={[0.015, 0.035, 0.08]}>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#ff6b00" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.015, 0.035, 0.086]}>
        <sphereGeometry args={[0.004, 4, 4]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.015, 0.035, 0.086]}>
        <sphereGeometry args={[0.004, 4, 4]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Wings */}
      <mesh ref={wingLeftRef} position={[-0.05, 0, 0]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.06]} />
        <meshStandardMaterial color="#5a5a6a" />
      </mesh>
      <mesh ref={wingRightRef} position={[0.05, 0, 0]} rotation={[0, -0.2, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.06]} />
        <meshStandardMaterial color="#5a5a6a" />
      </mesh>

      {/* Tail */}
      <mesh position={[0, 0, -0.08]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.03, 0.01, 0.06]} />
        <meshStandardMaterial color="#4a4a5a" />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.02, -0.06, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 4]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
      <mesh position={[0.02, -0.06, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 4]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>
    </group>
  );
});
Pigeon.displayName = 'Pigeon';

// =========================================================================
// MYSTERIOUS PUDDLE - Nobody knows where it came from
// =========================================================================
const MysteriousPuddle: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      // Subtle ripple effect
      materialRef.current.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={[event.position[0], 0.01, event.position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.8, 24]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#4a90b8"
          transparent
          opacity={0.6}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
      {/* Reflection highlight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.005, -0.1]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>

      {/* Question mark */}
      <Billboard position={[0, 0.5, 0]}>
        <Text fontSize={0.25} color="#4a90b8" anchorX="center">
          ?
        </Text>
      </Billboard>
    </group>
  );
});
MysteriousPuddle.displayName = 'MysteriousPuddle';

// =========================================================================
// CONVEYOR JAM - Bags piling up ominously
// =========================================================================
const ConveyorJam: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const bagsRef = useRef<THREE.Group>(null);

  const bagPositions = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: (Math.random() - 0.5) * 1.5,
      y: 0.15 + (i * 0.12) + Math.random() * 0.05,
      z: (Math.random() - 0.5) * 0.8,
      rotX: (Math.random() - 0.5) * 0.3,
      rotZ: (Math.random() - 0.5) * 0.3,
    }));
  }, []);

  useFrame((state) => {
    if (bagsRef.current) {
      // Subtle wobble
      bagsRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.02;
    }
  });

  return (
    <group ref={bagsRef} position={event.position}>
      {bagPositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, pos.z]} rotation={[pos.rotX, 0, pos.rotZ]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.15]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#e5d5c5' : '#d4c4b4'} roughness={0.9} />
        </mesh>
      ))}

      {/* Warning text */}
      <Billboard position={[0, 1.2, 0]}>
        <Text fontSize={0.15} color="#ef4444" anchorX="center">
          JAM!
        </Text>
      </Billboard>
    </group>
  );
});
ConveyorJam.displayName = 'ConveyorJam';

// =========================================================================
// TEMPERATURE SPIKE - Steam venting, red glow
// =========================================================================
const TemperatureSpike: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const steamRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const steamPositions = useMemo(() => {
    const arr = new Float32Array(50 * 3);
    for (let i = 0; i < 50; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.5;
      arr[i * 3 + 1] = Math.random() * 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (steamRef.current) {
      steamRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      const geo = steamRef.current.geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, (pos.getY(i) + 0.02) % 2);
      }
      pos.needsUpdate = true;
    }
    if (glowRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={event.position}>
      {/* Red warning glow */}
      <mesh ref={glowRef} position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.15} />
      </mesh>

      {/* Steam particles */}
      <points ref={steamRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[steamPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.1} transparent opacity={0.5} sizeAttenuation />
      </points>

      {/* Warning text */}
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.2} color="#ef4444" anchorX="center">
          HOT!
        </Text>
      </Billboard>
    </group>
  );
});
TemperatureSpike.displayName = 'TemperatureSpike';

// =========================================================================
// POWER FLICKER - Handled via scene lighting, this is just the indicator
// =========================================================================
const PowerFlicker: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (lightRef.current) {
      // Flickering effect
      const flicker = Math.random() > 0.3 ? 1 : 0.2;
      lightRef.current.intensity = flicker * 2;
    }
  });

  return (
    <group position={event.position}>
      <pointLight ref={lightRef} color="#fef3c7" intensity={2} distance={10} />
      <Billboard position={[0, 2, 0]}>
        <Text fontSize={0.2} color="#eab308" anchorX="center">
          *flicker*
        </Text>
      </Billboard>
    </group>
  );
});
PowerFlicker.displayName = 'PowerFlicker';

// =========================================================================
// COFFEE MACHINE BROKEN - The most serious disaster
// =========================================================================
const CoffeeMachineBroken: React.FC<{ event: ChaosEvent }> = React.memo(({ event }) => {
  const smokeRef = useRef<THREE.Points>(null);

  const smokePositions = useMemo(() => {
    const arr = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = Math.random() * 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (smokeRef.current) {
      const geo = smokeRef.current.geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, (pos.getY(i) + 0.01) % 1);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group position={event.position}>
      {/* Coffee machine body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>

      {/* Screen (showing error) */}
      <mesh position={[0, 0.5, 0.16]}>
        <planeGeometry args={[0.2, 0.1]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Sad smoke */}
      <points ref={smokeRef} position={[0, 0.7, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smokePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#6b7280" size={0.05} transparent opacity={0.4} sizeAttenuation />
      </points>

      {/* Crisis text */}
      <Billboard position={[0, 1.2, 0]}>
        <Text fontSize={0.15} color="#ef4444" anchorX="center" fontWeight="bold">
          CRITICAL
        </Text>
      </Billboard>
      <Billboard position={[0, 1, 0]}>
        <Text fontSize={0.12} color="#6b7280" anchorX="center">
          Coffee Machine Down
        </Text>
      </Billboard>
    </group>
  );
});
CoffeeMachineBroken.displayName = 'CoffeeMachineBroken';

// =========================================================================
// MAIN CHAOS RENDERER
// =========================================================================
const ChaosEventRenderer: React.FC<{ event: ChaosEvent }> = ({ event }) => {
  if (event.resolved) return null;

  switch (event.type) {
    case 'grain_spill':
      return <GrainSpill event={event} />;
    case 'dust_cloud':
      return <DustCloud event={event} />;
    case 'rat_sighting':
      return <Rat event={event} />;
    case 'pigeon_incursion':
      return <Pigeon event={event} />;
    case 'mysterious_puddle':
      return <MysteriousPuddle event={event} />;
    case 'conveyor_jam':
      return <ConveyorJam event={event} />;
    case 'temperature_spike':
      return <TemperatureSpike event={event} />;
    case 'power_flicker':
      return <PowerFlicker event={event} />;
    case 'coffee_machine_broken':
      return <CoffeeMachineBroken event={event} />;
    default:
      return null;
  }
};

// Main visible chaos system component
export const VisibleChaos: React.FC = () => {
  const chaosEvents = useWorkerMoodStore((state) => state.chaosEvents);

  return (
    <group>
      {chaosEvents.map((event) => (
        <ChaosEventRenderer key={event.id} event={event} />
      ))}
    </group>
  );
};

export default VisibleChaos;
