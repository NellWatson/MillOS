import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import { positionRegistry } from '../utils/positionRegistry';
import { audioManager } from '../utils/audioManager';
import { useMillStore } from '../store';
import * as THREE from 'three';

// Path visualization component - shows forklift routes on the floor
const ForkliftPath: React.FC<{ path: [number, number, number][]; color: string }> = ({ path, color }) => {
  // Create a closed loop by adding the first point at the end
  const points = useMemo(() => {
    const pts = path.map(p => new THREE.Vector3(p[0], 0.05, p[2])); // Slightly above floor
    pts.push(pts[0].clone()); // Close the loop
    return pts;
  }, [path]);

  return (
    <group>
      {/* Main path line */}
      <Line
        points={points}
        color={color}
        lineWidth={2}
        dashed
        dashSize={0.5}
        dashScale={2}
        gapSize={0.3}
      />
      {/* Waypoint markers */}
      {path.map((point, i) => (
        <group key={i} position={[point[0], 0.02, point[2]]}>
          {/* Circle marker */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.5, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
          {/* Direction arrow to next point */}
          {i < path.length && (
            <mesh
              rotation={[-Math.PI / 2, 0, Math.atan2(
                path[(i + 1) % path.length][0] - point[0],
                path[(i + 1) % path.length][2] - point[2]
              )]}
              position={[0, 0.01, 0]}
            >
              <coneGeometry args={[0.2, 0.4, 3]} />
              <meshBasicMaterial color={color} transparent opacity={0.4} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

// Warning light component that changes color when stopped
const WarningLight: React.FC<{ isStopped: boolean }> = ({ isStopped }) => {
  const [flash, setFlash] = useState(false);

  useFrame((state) => {
    // Flash faster when stopped (red), slower when moving (amber)
    const flashRate = isStopped ? 0.03 : 0.01;
    setFlash(Math.sin(state.clock.elapsedTime * (isStopped ? 15 : 5)) > 0);
  });

  const color = isStopped ? '#ef4444' : '#f59e0b'; // Red when stopped, amber when moving

  return (
    <group position={[0, 2.3, -0.3]}>
      {/* Light housing */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={flash ? 3 : 0.5}
          toneMapped={false}
        />
      </mesh>
      {/* Glow effect when stopped */}
      {isStopped && flash && (
        <pointLight color="#ef4444" intensity={2} distance={5} />
      )}
    </group>
  );
};

interface Forklift {
  id: string;
  position: [number, number, number];
  rotation: number;
  speed: number;
  path: [number, number, number][];
  pathIndex: number;
  cargo: 'empty' | 'pallet';
  operatorName: string;
}

// Path colors for each forklift
const PATH_COLORS = ['#f59e0b', '#3b82f6']; // Amber for first, blue for second

export const ForkliftSystem: React.FC = () => {
  const forklifts = useMemo<Forklift[]>(() => [
    {
      id: 'forklift-1',
      position: [-25, 0, -15],
      rotation: 0,
      speed: 3,
      path: [[-25, 0, -15], [-25, 0, 15], [25, 0, 15], [25, 0, -15]],
      pathIndex: 0,
      cargo: 'pallet',
      operatorName: 'Tom'
    },
    {
      id: 'forklift-2',
      position: [25, 0, 10],
      rotation: Math.PI,
      speed: 2.5,
      path: [[25, 0, 10], [25, 0, -20], [-20, 0, -20], [-20, 0, 10]],
      pathIndex: 0,
      cargo: 'empty',
      operatorName: 'Jake'
    }
  ], []);

  return (
    <group>
      {/* Render path lines on floor */}
      {forklifts.map((f, i) => (
        <ForkliftPath key={`path-${f.id}`} path={f.path} color={PATH_COLORS[i % PATH_COLORS.length]} />
      ))}
      {/* Render forklifts */}
      {forklifts.map(f => (
        <Forklift key={f.id} data={f} />
      ))}
    </group>
  );
};

const Forklift: React.FC<{ data: Forklift }> = ({ data }) => {
  const ref = useRef<THREE.Group>(null);
  const pathIndexRef = useRef(0);
  const currentTarget = useRef(new THREE.Vector3(...data.path[0]));
  const [isStopped, setIsStopped] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const directionRef = useRef(new THREE.Vector3());
  const prevDirectionRef = useRef(new THREE.Vector3(0, 0, 1));
  const wasStoppedRef = useRef(false);
  const recordSafetyStop = useMillStore(state => state.recordSafetyStop);

  // Play horn when stopping for safety
  useEffect(() => {
    if (isStopped && !wasStoppedRef.current) {
      audioManager.playHorn(data.id);
      recordSafetyStop();
    }
    wasStoppedRef.current = isStopped;
  }, [isStopped, data.id, recordSafetyStop]);

  useFrame((state, delta) => {
    if (!ref.current) return;

    const pos = ref.current.position;
    const target = currentTarget.current;
    const direction = new THREE.Vector3().subVectors(target, pos);
    const distance = direction.length();

    // Collision avoidance: check for workers and other forklifts ahead
    const SAFETY_RADIUS = 2.5; // Distance to keep from entities
    const FORKLIFT_SAFETY_RADIUS = 4; // Larger radius for forklift-to-forklift
    const CHECK_DISTANCE = 5; // How far ahead to check
    const dirNormalized = direction.clone().normalize();

    // Detect if reversing (direction changed significantly)
    const dotProduct = dirNormalized.dot(prevDirectionRef.current);
    const reversing = dotProduct < -0.5; // Roughly opposite direction
    setIsReversing(reversing);

    // Play backup beeper when reversing
    if (reversing && !isStopped) {
      audioManager.playBackupBeep(data.id);
    }

    prevDirectionRef.current.copy(dirNormalized);
    directionRef.current.copy(dirNormalized);

    // Register this forklift's position and direction
    positionRegistry.register(data.id, pos.x, pos.z, 'forklift', dirNormalized.x, dirNormalized.z);

    // Check path is clear of workers and other forklifts
    const pathClear = positionRegistry.isPathClear(
      pos.x, pos.z,
      dirNormalized.x, dirNormalized.z,
      CHECK_DISTANCE,
      SAFETY_RADIUS,
      data.id // Pass forklift ID to also check for other forklifts
    );

    // Check immediate vicinity for workers
    const workersNearby = positionRegistry.getWorkersNearby(pos.x, pos.z, SAFETY_RADIUS);

    // Check immediate vicinity for other forklifts
    const forkliftsNearby = positionRegistry.getForkliftsNearby(pos.x, pos.z, FORKLIFT_SAFETY_RADIUS, data.id);

    const isSafeToMove = pathClear && workersNearby.length === 0 && forkliftsNearby.length === 0;
    setIsStopped(!isSafeToMove);

    if (distance < 0.5) {
      // Move to next waypoint
      pathIndexRef.current = (pathIndexRef.current + 1) % data.path.length;
      currentTarget.current.set(...data.path[pathIndexRef.current]);
    } else if (isSafeToMove) {
      // Move towards target only if path is clear
      direction.normalize();
      pos.add(direction.multiplyScalar(data.speed * delta));

      // Rotate to face direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotation, 0.1);

      // Wheel rotation animation (only when moving)
      const wheels = ref.current.children.filter((_, i) => i >= 4 && i < 8);
      wheels.forEach(wheel => {
        (wheel as THREE.Mesh).rotation.x += delta * 5;
      });
    }
  });

  return (
    <group ref={ref} position={new THREE.Vector3(...data.position)}>
      {/* Main body */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.5, 1, 2.5]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Cabin */}
      <mesh castShadow position={[0, 1.4, -0.3]}>
        <boxGeometry args={[1.3, 1.2, 1.2]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Roof */}
      <mesh castShadow position={[0, 2.1, -0.3]}>
        <boxGeometry args={[1.4, 0.1, 1.3]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Mast */}
      <mesh castShadow position={[0, 1.2, 1.3]}>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh castShadow position={[0.5, 1.2, 1.3]}>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh castShadow position={[-0.5, 1.2, 1.3]}>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Forks */}
      <mesh castShadow position={[-0.3, 0.3, 1.8]}>
        <boxGeometry args={[0.1, 0.08, 1.2]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0.3, 0.3, 1.8]}>
        <boxGeometry args={[0.1, 0.08, 1.2]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      <mesh castShadow position={[-0.6, 0.25, 0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh castShadow position={[0.6, 0.25, 0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh castShadow position={[-0.6, 0.25, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh castShadow position={[0.6, 0.25, -0.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Cargo (pallet) */}
      {data.cargo === 'pallet' && (
        <group position={[0, 0.6, 2]}>
          <mesh castShadow>
            <boxGeometry args={[1, 0.15, 1]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.9, 0.6, 0.9]} />
            <meshStandardMaterial color="#fef3c7" />
          </mesh>
        </group>
      )}

      {/* Warning light - flashes red when stopped */}
      <WarningLight isStopped={isStopped} />

      {/* Operator name */}
      <Text
        position={[0, 2.6, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {data.operatorName}
      </Text>
    </group>
  );
};
