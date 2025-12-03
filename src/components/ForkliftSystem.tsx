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

// Warning light component that changes color based on state
const WarningLight: React.FC<{ isStopped: boolean; isInCrossing: boolean }> = ({ isStopped, isInCrossing }) => {
  const [flash, setFlash] = useState(false);

  useFrame((state) => {
    // Flash faster when stopped (red), medium for crossing (blue), slower when moving (amber)
    const flashSpeed = isStopped ? 15 : isInCrossing ? 10 : 5;
    const newFlash = Math.sin(state.clock.elapsedTime * flashSpeed) > 0;
    if (newFlash !== flash) {
      setFlash(newFlash);
    }
  });

  // Red when stopped, blue when in crossing zone, amber when normal
  const color = isStopped ? '#ef4444' : isInCrossing ? '#3b82f6' : '#f59e0b';
  const glowColor = isStopped ? '#ef4444' : isInCrossing ? '#3b82f6' : '#f59e0b';

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
      {/* Glow effect when stopped or in crossing */}
      {(isStopped || isInCrossing) && flash && (
        <pointLight color={glowColor} intensity={2} distance={5} />
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

// Conveyor crossing zones - areas where forklifts must yield
// Main conveyor at z=19, roller conveyor at z=16
interface CrossingZone {
  id: string;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  type: 'conveyor' | 'intersection';
}

const CROSSING_ZONES: CrossingZone[] = [
  // Main conveyor crossing zone (z=19, with buffer)
  { id: 'main-conveyor', xMin: -28, xMax: 28, zMin: 17, zMax: 21, type: 'conveyor' },
  // Roller conveyor crossing zone (z=16, with buffer)
  { id: 'roller-conveyor', xMin: -16, xMax: 16, zMin: 14, zMax: 18, type: 'conveyor' },
];

// Check if a position is within any crossing zone
const isInCrossingZone = (x: number, z: number): CrossingZone | null => {
  for (const zone of CROSSING_ZONES) {
    if (x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax) {
      return zone;
    }
  }
  return null;
};

// Crossing zone visual component
const CrossingZoneMarkers: React.FC = () => {
  return (
    <group>
      {CROSSING_ZONES.map((zone) => (
        <group key={zone.id}>
          {/* Hazard stripe markings on floor */}
          <mesh position={[(zone.xMin + zone.xMax) / 2, 0.02, zone.zMin]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[zone.xMax - zone.xMin, 0.3]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
          </mesh>
          <mesh position={[(zone.xMin + zone.xMax) / 2, 0.02, zone.zMax]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[zone.xMax - zone.xMin, 0.3]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
          </mesh>
          {/* Side markers */}
          <mesh position={[zone.xMin, 0.02, (zone.zMin + zone.zMax) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, zone.zMax - zone.zMin]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
          </mesh>
          <mesh position={[zone.xMax, 0.02, (zone.zMin + zone.zMax) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, zone.zMax - zone.zMin]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
          </mesh>
          {/* Warning text */}
          <Text
            position={[zone.xMin + 3, 0.03, (zone.zMin + zone.zMax) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.5}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
          >
            YIELD
          </Text>
          <Text
            position={[zone.xMax - 3, 0.03, (zone.zMin + zone.zMax) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.5}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
          >
            YIELD
          </Text>
        </group>
      ))}
    </group>
  );
};

export const ForkliftSystem: React.FC = () => {
  // Adjusted paths to avoid conveyor belt intersections
  // Main conveyor at z=19, roller conveyor at z=16
  // Keep forklifts in safe zones: z < 12 or use designated crossing points
  const forklifts = useMemo<Forklift[]>(() => [
    {
      id: 'forklift-1',
      position: [-25, 0, -15],
      rotation: 0,
      speed: 3,
      // Adjusted path: stays at z=10 max to avoid roller conveyor (z=16)
      path: [[-25, 0, -15], [-25, 0, 10], [25, 0, 10], [25, 0, -15]],
      pathIndex: 0,
      cargo: 'pallet',
      operatorName: 'Tom'
    },
    {
      id: 'forklift-2',
      position: [25, 0, 5],
      rotation: Math.PI,
      speed: 2.5,
      // Adjusted path: stays at z=5 max, well clear of conveyors
      path: [[25, 0, 5], [25, 0, -20], [-20, 0, -20], [-20, 0, 5]],
      pathIndex: 0,
      cargo: 'empty',
      operatorName: 'Jake'
    }
  ], []);

  return (
    <group>
      {/* Render crossing zone markers on floor */}
      <CrossingZoneMarkers />
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
  const [isInCrossing, setIsInCrossing] = useState(false); // Track if in crossing zone
  const directionRef = useRef(new THREE.Vector3());
  const dirNormalizedRef = useRef(new THREE.Vector3());
  const prevDirectionRef = useRef(new THREE.Vector3(0, 0, 1));
  const wasStoppedRef = useRef(false);
  const stateChangeTimerRef = useRef(0); // Hysteresis timer
  const crossingTimerRef = useRef(0); // Time spent waiting at crossing
  const wheelRefsRef = useRef<THREE.Mesh[]>([]); // Cached wheel references
  const HYSTERESIS_TIME = 0.15; // 150ms before state can change
  const CROSSING_WAIT_TIME = 1.5; // Wait 1.5s before entering crossing zone
  const CROSSING_APPROACH_DISTANCE = 3; // Distance to start slowing for crossing
  const recordSafetyStop = useMillStore(state => state.recordSafetyStop);

  // Play horn when stopping for safety
  useEffect(() => {
    if (isStopped && !wasStoppedRef.current) {
      audioManager.playHorn(data.id);
      recordSafetyStop();
    }
    wasStoppedRef.current = isStopped;
  }, [isStopped, data.id, recordSafetyStop]);

  // Set initial position only once (not via prop to avoid reset on re-render)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      ref.current.position.set(...data.position);
      initializedRef.current = true;
    }
  }, [data.position]);

  useFrame((state, delta) => {
    if (!ref.current) return;

    const pos = ref.current.position;
    const target = currentTarget.current;
    // Reuse Vector3 refs to avoid GC pressure
    const direction = directionRef.current.subVectors(target, pos);
    const distance = direction.length();

    // Collision avoidance: check for workers and other forklifts ahead
    const SAFETY_RADIUS = 2.5; // Distance to keep from entities
    const FORKLIFT_SAFETY_RADIUS = 4; // Larger radius for forklift-to-forklift
    const CHECK_DISTANCE = 5; // How far ahead to check
    const dirNormalized = dirNormalizedRef.current.copy(direction).normalize();

    // Detect if reversing (direction changed significantly)
    const dotProduct = dirNormalized.dot(prevDirectionRef.current);
    const reversing = dotProduct < -0.5; // Roughly opposite direction
    if (reversing !== isReversing) {
      setIsReversing(reversing);
    }

    // Play backup beeper when reversing
    if (reversing && !isStopped) {
      audioManager.playBackupBeep(data.id);
    }

    prevDirectionRef.current.copy(dirNormalized);

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

    // Check if currently in or approaching a crossing zone
    const currentCrossingZone = isInCrossingZone(pos.x, pos.z);

    // Check if next position (ahead by CROSSING_APPROACH_DISTANCE) would be in crossing zone
    const lookAheadX = pos.x + dirNormalized.x * CROSSING_APPROACH_DISTANCE;
    const lookAheadZ = pos.z + dirNormalized.z * CROSSING_APPROACH_DISTANCE;
    const approachingCrossingZone = isInCrossingZone(lookAheadX, lookAheadZ);

    // Update crossing state
    const nowInCrossing = currentCrossingZone !== null || approachingCrossingZone !== null;
    if (nowInCrossing !== isInCrossing) {
      setIsInCrossing(nowInCrossing);
    }

    // Crossing zone logic: slow down or wait before entering
    let crossingClear = true;
    let speedMultiplier = 1.0;

    if (approachingCrossingZone && !currentCrossingZone) {
      // Approaching a crossing zone - wait before entering
      crossingTimerRef.current += delta;
      if (crossingTimerRef.current < CROSSING_WAIT_TIME) {
        crossingClear = false; // Must wait
      }
      speedMultiplier = 0.5; // Slow approach
    } else if (currentCrossingZone) {
      // In a crossing zone - move at reduced speed
      speedMultiplier = 0.6;
      crossingTimerRef.current = 0; // Reset timer once we're in
    } else {
      crossingTimerRef.current = 0; // Reset when not near crossing
    }

    const isSafeToMove = pathClear && workersNearby.length === 0 && forkliftsNearby.length === 0 && crossingClear;
    const newIsStopped = !isSafeToMove;

    // Register position with CURRENT frame's stopped state (not delayed React state)
    // This ensures workers see the forklift's intent immediately
    positionRegistry.register(data.id, pos.x, pos.z, 'forklift', dirNormalized.x, dirNormalized.z, newIsStopped);

    // Hysteresis: require stable state for HYSTERESIS_TIME before changing React state
    if (newIsStopped !== isStopped) {
      stateChangeTimerRef.current += delta;
      if (stateChangeTimerRef.current >= HYSTERESIS_TIME) {
        setIsStopped(newIsStopped);
        stateChangeTimerRef.current = 0;
      }
    } else {
      stateChangeTimerRef.current = 0; // Reset timer if state matches
    }

    if (distance < 0.5) {
      // Move to next waypoint
      pathIndexRef.current = (pathIndexRef.current + 1) % data.path.length;
      currentTarget.current.set(...data.path[pathIndexRef.current]);
    } else if (isSafeToMove) {
      // Move towards target only if path is clear
      // Apply speed multiplier for crossing zone slowdown
      const effectiveSpeed = data.speed * speedMultiplier;
      direction.normalize();
      pos.add(direction.multiplyScalar(effectiveSpeed * delta));

      // Rotate to face direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotation, 0.1);

      // Wheel rotation animation (only when moving, scaled by speed)
      // Cache wheel references on first access (indices 8-11: after body, cabin, roof, 3 masts, and 2 forks)
      if (wheelRefsRef.current.length === 0 && ref.current.children.length >= 12) {
        wheelRefsRef.current = ref.current.children.slice(8, 12) as THREE.Mesh[];
      }
      for (let i = 0; i < wheelRefsRef.current.length; i++) {
        wheelRefsRef.current[i].rotation.x += delta * 5 * speedMultiplier;
      }
    }
  });

  return (
    <group ref={ref}>
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
      <WarningLight isStopped={isStopped} isInCrossing={isInCrossing} />

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
