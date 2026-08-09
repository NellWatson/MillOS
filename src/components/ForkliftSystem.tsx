import React, { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Line } from '@react-three/drei';
import { SceneText as Text } from './shared/SceneText';
import { positionRegistry, EntityPosition } from '../utils/positionRegistry';
import { audioManager } from '../utils/audioManager';
import { useAudioInitialized } from '../hooks/useAudioState';
import { useSafetyStore } from '../stores/safetyStore';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useGraphicsStore } from '../stores/graphicsStore';
import { useTruckScheduleStore } from '../stores/truckScheduleStore';
import { useProductionStore } from '../stores/productionStore';
import { useOperationsCampaignStore } from '../stores/operationsCampaignStore';
import { useShallow } from 'zustand/react/shallow';
import { getForkliftWarningColor } from '../utils/statusColors';
import { ForkliftModel } from './models';
import { shouldRunThisFrame } from '../utils/frameThrottle';
import { ForkliftData } from '../types';
import { POLYGON_OFFSET } from '../constants/renderLayers';
import { SITE_LAYOUT } from '../constants/siteLayout';
import {
  createRoundedForkliftRoute,
  canPerformForkliftLogisticsAction,
  dampAngle,
  isForkliftSimulationPaused,
  moveTowards,
  resolveForkliftMastTilt,
  resolveForkliftSteeringAngle,
  smoothOperationHeight,
  type ForkliftOperationPhase,
  type ForkliftWaypointAction,
} from '../simulation/forkliftRoute';
import * as THREE from 'three';
import ErrorBoundary from './ErrorBoundary';
import { recoverableLazy } from '../utils/recoverableLazy';

const PhysicsForklift = recoverableLazy(() =>
  import('./physics/PhysicsForklift').then((module) => ({ default: module.PhysicsForklift }))
);

// Path visualization component - shows forklift routes on the floor
const ForkliftPath: React.FC<{ path: [number, number, number][]; color: string }> = ({
  path,
  color,
}) => {
  // PERF: Reuse Vector3 objects instead of allocating new ones each path change
  const pointsRef = useRef<THREE.Vector3[]>([]);
  const points = useMemo(() => {
    const pts = pointsRef.current;
    const targetLength = path.length + 1; // +1 for closing the loop
    // Resize array if needed (only grows, never shrinks to avoid allocation churn)
    while (pts.length < targetLength) {
      pts.push(new THREE.Vector3());
    }
    // Update point values
    for (let i = 0; i < path.length; i++) {
      pts[i].set(path[i][0], 0.1, path[i][2]); // Above floor to prevent z-fighting
    }
    // Close the loop
    pts[path.length].copy(pts[0]);
    // Return only the slice we need (in case array is larger from previous path)
    return pts.slice(0, targetLength);
  }, [path]);

  return (
    <group name="forklift-route-path">
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
        <group key={`waypoint-${i}-${point[0]}-${point[2]}`} position={[point[0], 0.1, point[2]]}>
          {/* Circle marker */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.5, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.6}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={POLYGON_OFFSET.standard.factor}
              polygonOffsetUnits={POLYGON_OFFSET.standard.units}
            />
          </mesh>
          {/* Direction arrow to next point */}
          {i < path.length && (
            <mesh
              rotation={[
                -Math.PI / 2,
                0,
                Math.atan2(
                  path[(i + 1) % path.length][0] - point[0],
                  path[(i + 1) % path.length][2] - point[2]
                ),
              ]}
              position={[0, 0.05, 0]}
            >
              <coneGeometry args={[0.2, 0.4, 3]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.4}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={POLYGON_OFFSET.standard.factor}
                polygonOffsetUnits={POLYGON_OFFSET.standard.units}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

/** Sweep rate of the beacon's light wedge, in radians per second. */
const BEACON_SWEEP_RATE = 4;

/**
 * Rotating safety beacon.
 *
 * THE LIGHT IS MOUNTED UNCONDITIONALLY AND DRIVEN BY `intensity`. It used to be
 * conditionally rendered AND toggled with `visible`, and both are the same
 * mistake: `WebGLRenderer.projectObject` skips invisible objects entirely, so an
 * invisible light leaves the light arrays, `numPointLights` changes, and the
 * program cache key of every material in the scene changes with it. The flash
 * runs at 5-15 Hz, so the renderer was re-acquiring programs and re-uploading
 * every material's uniforms several times a second. Holding the light in the
 * tree at `intensity = 0` keeps the count constant, and gives the beacon real
 * illumination while it is moving rather than only when it stops.
 *
 * The wedge is additive geometry rather than a spotlight for the same reason:
 * a mesh's `visible` flag costs nothing, a light's changes every shader.
 */
const WarningLight = React.memo<{
  isStopped: boolean;
  isInCrossing: boolean;
  simulationPaused: boolean;
  height: number;
}>(({ isStopped, isInCrossing, simulationPaused, height }) => {
  // Use ref instead of useState to avoid triggering re-renders in useFrame
  const flashRef = useRef(false);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const sweepRef = useRef<THREE.Group>(null);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  useFrame((state, delta) => {
    // PERFORMANCE: Skip animations when tab hidden
    if (!isTabVisible || simulationPaused) return;
    if (sweepRef.current) {
      sweepRef.current.rotation.y += BEACON_SWEEP_RATE * Math.min(delta, 0.1);
    }
    // PERFORMANCE: Throttle flash check to every 2nd frame (~30fps is plenty for light flashing)
    if (!shouldRunThisFrame(2)) return;
    // Flash faster when stopped (red), medium for crossing (blue), slower when moving (amber)
    const flashSpeed = isStopped ? 15 : isInCrossing ? 10 : 5;
    const newFlash = Math.sin(state.clock.elapsedTime * flashSpeed) > 0;

    // Update material directly via ref instead of triggering re-render
    if (newFlash !== flashRef.current) {
      flashRef.current = newFlash;
      if (materialRef.current) {
        materialRef.current.emissiveIntensity = newFlash ? 3 : 0.5;
      }
      if (lightRef.current) {
        lightRef.current.intensity = newFlash ? 1.6 : 0;
      }
    }
  });

  // Red when stopped, blue when in crossing zone, amber when normal
  const color = getForkliftWarningColor(isStopped, isInCrossing);

  return (
    <group position={[0, height, -0.3]}>
      {/* Light housing */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 10]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0}
          // TRUE, not false: this component renders at `low` as well, where
          // there is no composer and `false` would clamp the lit emissive to a
          // flat white blob instead of letting the Neutral curve roll it off.
          toneMapped
        />
      </mesh>
      {/* Sweeping light wedge - additive, so it only ever adds fill.
          16 radial segments, not 8. The cone is 1.1 m across and its material is
          unlit and constant-opacity, so what the eye gets is a hard coverage
          edge: at 8 that edge is a visible octagon on a metre-wide glow, which
          reads as a faceted cone rather than as light. The rotation is not paid
          for by the facets - the radial wobble 8 of them buy is 42 mm on a
          550 mm radius at 0.16 opacity - so smoothing costs the sweep nothing.
          16 stays divisible by 4, so the 0.55 m base radius is unchanged. */}
      <group ref={sweepRef}>
        <mesh position={[0, 0.02, 0]} renderOrder={8}>
          <coneGeometry args={[0.55, 0.9, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <pointLight ref={lightRef} color={color} intensity={0} distance={7} decay={2} />
    </group>
  );
});

// Cargo fade-in duration for billboard (matches detailed model)
const BILLBOARD_CARGO_FADE_DURATION = 0.25;

/**
 * sRGB of the authored forklift's linear `painted-safety-amber` baseColorFactor
 * (0.6939, 0.3231, 0.0242). Keeps the far LOD the same hue as the near one.
 */
const BILLBOARD_AMBER = '#d99a2b';

/**
 * LOD hysteresis band, in metres.
 *
 * Widened from 50/40. The near model is the 52k-triangle GLB and the far one is
 * a handful of boxes, so the swap is the most visible thing the forklift does;
 * pushing it out removes it from normal camera framing. The band is WIDENED,
 * never narrowed - `distanceTier` is React state written from `useFrame`, so a
 * narrow band makes `setDistanceTier` thrash and re-render every frame.
 */
const FORKLIFT_LOD_FAR_METRES = 62;
const FORKLIFT_LOD_CLOSE_METRES = 50;

// Simplified forklift billboard for distant rendering (50+ units away)
// Uses only 4 meshes instead of ~40+ for massive performance improvement
const ForkliftBillboard: React.FC<{ hasCargo: boolean; simulationPaused: boolean }> = ({
  hasCargo,
  simulationPaused,
}) => {
  // Cargo fade-in refs (no re-renders, minimal overhead)
  const cargoOpacityRef = useRef(hasCargo ? 1 : 0);
  const prevHasCargoRef = useRef(hasCargo);
  const cargoMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  useFrame((_, delta) => {
    if (!isTabVisible || simulationPaused) return;
    const animationDelta = delta * Math.max(0, useProductionStore.getState().productionSpeed);

    // Detect cargo spawn
    if (hasCargo && !prevHasCargoRef.current) {
      cargoOpacityRef.current = 0;
    }
    prevHasCargoRef.current = hasCargo;

    // Animate opacity (only when needed)
    const targetOpacity = hasCargo ? 1 : 0;
    if (cargoOpacityRef.current !== targetOpacity) {
      if (hasCargo) {
        cargoOpacityRef.current = Math.min(
          1,
          cargoOpacityRef.current + animationDelta / BILLBOARD_CARGO_FADE_DURATION
        );
      } else {
        cargoOpacityRef.current = 0;
      }
      if (cargoMaterialRef.current) {
        cargoMaterialRef.current.opacity = cargoOpacityRef.current;
        cargoMaterialRef.current.visible = cargoOpacityRef.current > 0.01;
      }
    }
  });

  return (
    <group name="forklift-billboard">
      {/* Simple body - single box.
          BILLBOARD_AMBER is the sRGB of the authored GLB's linear
          `painted-safety-amber` (0.694, 0.323, 0.024). The old `#f59e0b` was a
          different hue, so the LOD swap popped in colour as well as
          silhouette; matching it leaves only the silhouette delta. */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.2, 2.5]} />
        <meshStandardMaterial color={BILLBOARD_AMBER} roughness={0.42} metalness={0} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.5, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.8, 1]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} metalness={0} />
      </mesh>
      {/* ROPS canopy and pillars. The near model is 2.3 m tall with an overhead
          guard; without these the far tier is a 1.2 m box and the swap reads as
          a different vehicle rather than a different level of detail. */}
      <mesh position={[0, 2.05, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[1.42, 0.08, 1.22]} />
        <meshStandardMaterial color={BILLBOARD_AMBER} roughness={0.42} metalness={0} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={`rops-${x}`} position={[x, 1.6, -0.85]} castShadow receiveShadow>
          <boxGeometry args={[0.09, 0.9, 0.09]} />
          <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.85} />
        </mesh>
      ))}
      {/* Beacon, so the far silhouette has the same topmost feature. */}
      <mesh position={[0, 2.16, -0.35]}>
        <cylinderGeometry args={[0.09, 0.09, 0.14, 8]} />
        <meshStandardMaterial
          color="#4a3200"
          emissive="#ff8c00"
          emissiveIntensity={1.1}
          roughness={0.35}
          metalness={0}
          toneMapped
        />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 1.2, 1.3]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2, 0.15]} />
        <meshStandardMaterial color="#374151" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Cargo - always mounted, opacity animated */}
      <mesh
        position={[0, 1.4, 1.8]}
        castShadow
        receiveShadow
        visible={hasCargo || cargoOpacityRef.current > 0.01}
      >
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial
          ref={cargoMaterialRef}
          color="#fef3c7"
          roughness={0.7}
          metalness={0}
          transparent
          opacity={cargoOpacityRef.current}
        />
      </mesh>
    </group>
  );
};

type ForkliftOperation = ForkliftOperationPhase;

type WaypointAction = ForkliftWaypointAction;

interface Forklift {
  id: string;
  position: [number, number, number];
  rotation: number;
  speed: number;
  path: [number, number, number][];
  pathActions: WaypointAction[]; // Action at each waypoint
  pathIndex: number;
  cargo: 'empty' | 'pallet';
}

const withRoundedRoute = (forklift: Forklift): Forklift => {
  const route = createRoundedForkliftRoute(forklift.path, forklift.pathActions);
  return {
    ...forklift,
    path: route.path,
    pathActions: route.actions,
  };
};

// Path colors for each forklift
const PATH_COLORS = ['#f59e0b', '#3b82f6']; // Amber for first, blue for second

// Conveyor crossing zones - areas where forklifts must yield
// Main conveyor at z=24, roller conveyor at z=21 (updated for new layout)
interface CrossingZone {
  id: string;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  type: 'conveyor' | 'intersection';
}

const CROSSING_ZONES: CrossingZone[] = Object.values(SITE_LAYOUT.routeHazards).map(
  ({ id, type, bounds }) => ({
    id,
    type,
    xMin: bounds.minX,
    xMax: bounds.maxX,
    zMin: bounds.minZ,
    zMax: bounds.maxZ,
  })
);

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
      {CROSSING_ZONES.map((zone) => {
        // Guard against NaN/invalid dimensions
        const xWidth = Math.max(0.1, Math.abs(zone.xMax - zone.xMin));
        const zHeight = Math.max(0.1, Math.abs(zone.zMax - zone.zMin));

        return (
          <group key={zone.id}>
            {/* Hazard stripe markings on floor - raised to prevent z-fighting */}
            <mesh
              position={[(zone.xMin + zone.xMax) / 2, 0.08, zone.zMin]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[xWidth, 0.3]} />
              <meshBasicMaterial
                color="#fbbf24"
                transparent
                opacity={0.6}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={POLYGON_OFFSET.standard.factor}
                polygonOffsetUnits={POLYGON_OFFSET.standard.units}
              />
            </mesh>
            <mesh
              position={[(zone.xMin + zone.xMax) / 2, 0.08, zone.zMax]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[xWidth, 0.3]} />
              <meshBasicMaterial
                color="#fbbf24"
                transparent
                opacity={0.6}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={POLYGON_OFFSET.standard.factor}
                polygonOffsetUnits={POLYGON_OFFSET.standard.units}
              />
            </mesh>
            {/* Side markers */}
            <mesh
              position={[zone.xMin, 0.08, (zone.zMin + zone.zMax) / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.3, zHeight]} />
              <meshBasicMaterial
                color="#fbbf24"
                transparent
                opacity={0.6}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={POLYGON_OFFSET.standard.factor}
                polygonOffsetUnits={POLYGON_OFFSET.standard.units}
              />
            </mesh>
            <mesh
              position={[zone.xMax, 0.08, (zone.zMin + zone.zMax) / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.3, zHeight]} />
              <meshBasicMaterial
                color="#fbbf24"
                transparent
                opacity={0.6}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={POLYGON_OFFSET.standard.factor}
                polygonOffsetUnits={POLYGON_OFFSET.standard.units}
              />
            </mesh>
            {/* Warning text */}
            <Text
              position={[zone.xMin + 3, 0.1, (zone.zMin + zone.zMax) / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.5}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
            >
              YIELD
            </Text>
            <Text
              position={[zone.xMax - 3, 0.1, (zone.zMin + zone.zMax) / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.5}
              color="#fbbf24"
              anchorX="center"
              anchorY="middle"
            >
              YIELD
            </Text>
          </group>
        );
      })}
    </group>
  );
};

// ForkliftData is now imported from types.ts - use the canonical definition
// Re-export for backwards compatibility
export type { ForkliftData } from '../types';

interface ForkliftSystemProps {
  showSpeedZones?: boolean;
  onSelectForklift?: (forklift: ForkliftData) => void;
}

export const ForkliftSystem: React.FC<ForkliftSystemProps> = ({
  showSpeedZones = false,
  onSelectForklift,
}) => {
  // Updated paths for the canonical 120x100 factory:
  // - Shipping dock at z=50 (front), Receiving dock at z=-50 (back)
  // - Packers at z=25, Silos at z=-22
  // - Conveyors at z=24 (main, x:-28 to 28) and z=21 (roller, x:-15 to 15)
  // IMPORTANT: Forklifts must go AROUND conveyors, not through them
  // Main conveyor blocks z=22.5-25.5 for x in [-28, 28]
  // Roller conveyor blocks z=19.5-22.5 for x in [-15, 15]
  const forklifts = useMemo<Forklift[]>(
    () =>
      (
        [
          {
            id: 'forklift-1',
            position: [45, 0, 32], // Start in east corridor (clear of amenities)
            rotation: 0,
            speed: 3.5,
            // Shipping route: Packing area -> Shipping dock (front, z=50)
            // IMPORTANT: Dock platform obstacle is x:-10 to 10, z:44 to 54
            // Must stay outside those bounds - approach from side at x=15
            // IMPORTANT: Break room at [35,0,25] (x:32-38, z:22.5-27.5) and
            // Toilet block at [35,0,35] (x:31-39, z:32.5-37.5) - route around east side
            path: SITE_LAYOUT.routes.forklifts.shipping.points.map((point) => [...point]),
            pathActions: [
              { type: 'pickup', duration: 2.0 }, // Load pallet at packing area
              { type: 'none', duration: 0 },
              { type: 'none', duration: 0 },
              { type: 'none', duration: 0 },
              { type: 'dropoff', duration: 2.0 }, // Unload at shipping dock
              { type: 'none', duration: 0 },
              { type: 'none', duration: 0 },
              { type: 'none', duration: 0 },
            ],
            pathIndex: 0,
            cargo: 'empty',
          },
          {
            id: 'forklift-2',
            position: [-35, 0, -40], // Start in center of west corridor
            rotation: Math.PI,
            speed: 3,
            // Receiving route: Receiving dock (back, z=-50) -> Silo area
            // IMPORTANT: Dock platform obstacle is x:-10 to 10, z:-54 to -44
            // Must stay outside - approach from side at x=-15
            path: SITE_LAYOUT.routes.forklifts.receiving.points.map((point) => [...point]),
            pathActions: [
              { type: 'pickup', duration: 2.0 }, // Load at receiving dock
              { type: 'none', duration: 0 },
              { type: 'none', duration: 0 },
              { type: 'dropoff', duration: 2.0 }, // Unload at silos
              { type: 'none', duration: 0 },
              { type: 'none', duration: 0 },
            ],
            pathIndex: 0,
            cargo: 'empty',
          },
        ] as Forklift[]
      ).map(withRoundedRoute),
    []
  );

  return (
    <group name="forklift-system">
      {/* Render crossing zone markers on floor */}
      {showSpeedZones && (
        <>
          <CrossingZoneMarkers />
          {forklifts.map((f, i) => (
            <ForkliftPath
              key={`path-${f.id}`}
              path={f.path}
              color={PATH_COLORS[i % PATH_COLORS.length]}
            />
          ))}
        </>
      )}
      {/* Render forklifts */}
      {forklifts.map((f) => (
        <Forklift key={f.id} data={f} onSelect={onSelectForklift} />
      ))}
    </group>
  );
};

// Reusable vectors at module level to avoid GC pressure in hot paths
const _tempWorldPos = new THREE.Vector3();

const Forklift: React.FC<{ data: Forklift; onSelect?: (forklift: ForkliftData) => void }> = ({
  data,
  onSelect,
}) => {
  const ref = useRef<THREE.Group>(null);
  const pathIndexRef = useRef(0);
  const currentTarget = useRef(new THREE.Vector3(...data.path[0]));
  const [isStopped, setIsStopped] = useState(false);
  const [distanceTier, setDistanceTier] = useState<'close' | 'far'>('close'); // LOD tier for rendering
  const [hasCargo, setHasCargo] = useState(data.cargo === 'pallet');
  const [currentOperation, setCurrentOperation] = useState<ForkliftOperation>('traveling');
  const forkHeightRef = useRef(0); // Ref for fork animation - avoids re-renders
  const hasCargoRef = useRef(data.cargo === 'pallet'); // Ref mirror for useFrame access
  const operationRef = useRef<ForkliftOperation>('traveling'); // Ref mirror for useFrame access
  const cameraDistanceRef = useRef(0); // Track distance to camera
  const isReversingRef = useRef(false); // Changed to ref to avoid re-renders in useFrame
  const isInCrossingRef = useRef(false); // Changed to ref to avoid re-renders // Track if in crossing zone
  const directionRef = useRef(new THREE.Vector3());
  const dirNormalizedRef = useRef(new THREE.Vector3());
  const prevDirectionRef = useRef(new THREE.Vector3(0, 0, 1));
  const wasStoppedRef = useRef(false);
  const stateChangeTimerRef = useRef(0); // Hysteresis timer
  const frameCountRef = useRef(0); // Frame counter for throttling
  const lastCollisionCheckRef = useRef({
    pathClear: true,
    forkliftsNearby: [] as EntityPosition[],
  });
  const crossingTimerRef = useRef(0); // Time spent waiting at crossing
  const operationTimerRef = useRef(0); // Time spent on current loading/unloading operation
  const operationDurationRef = useRef(0); // Target duration for current operation
  const currentSpeedRef = useRef(0);
  const previousSpeedRef = useRef(0);
  const steeringAngleRef = useRef(0);
  const mastTiltRef = useRef(resolveForkliftMastTilt('traveling', data.cargo === 'pallet'));
  const safetyStopTimerRef = useRef(0); // Time since safety stop started (for resume delay)
  const HYSTERESIS_TIME = 0.15; // 150ms before state can change
  const SAFETY_RESUME_DELAY = 1.0; // Hold one second after a route conflict clears
  const CROSSING_WAIT_TIME = 1.0; // Wait 1.0s before entering crossing zone
  const CROSSING_APPROACH_DISTANCE = 3; // Distance to start slowing for crossing
  const FORK_LIFT_HEIGHT = 1.2; // Max height forks raise during load/unload
  const recordSafetyStop = useSafetyStore((state) => state.recordSafetyStop);
  const forkliftEmergencyStop = useSafetyStore((state) => state.forkliftEmergencyStop);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);
  const emergencyDrillMode = useGameSimulationStore((state) => state.emergencyDrillMode);
  const gameSpeed = useGameSimulationStore((state) => state.gameSpeed);
  const productionSpeed = useProductionStore((state) => state.productionSpeed);
  const audioReady = useAudioInitialized();
  const truckDocked = useTruckScheduleStore(
    useShallow((state) => ({
      shipping: state.truckSchedule.shipping.truckDocked,
      receiving: state.truckSchedule.receiving.truckDocked,
    }))
  );
  const dispatchExecution = useOperationsCampaignStore(
    useShallow((state) => ({
      releasedFinishedKg: state.execution.releasedFinishedKg,
      loadStatus: state.execution.dispatchLoad.status,
    }))
  );
  const vehicleSpeedMultiplier = useOperationsCampaignStore(
    (state) => state.getIncidentEffect().vehicleSpeedMultiplier
  );
  const canPerformWaypointAction = useCallback(
    (action: 'pickup' | 'dropoff'): boolean => {
      return canPerformForkliftLogisticsAction({
        forkliftId: data.id,
        action,
        shippingDocked: truckDocked.shipping,
        receivingDocked: truckDocked.receiving,
        releasedFinishedKg: dispatchExecution.releasedFinishedKg,
        dispatchLoadStatus: dispatchExecution.loadStatus,
      });
    },
    [
      data.id,
      dispatchExecution.loadStatus,
      dispatchExecution.releasedFinishedKg,
      truckDocked.receiving,
      truckDocked.shipping,
    ]
  );

  // Physics system toggle
  const enablePhysics = useGraphicsStore((state) => state.graphics.enablePhysics);
  const graphicsQuality = useGraphicsStore((state) => state.graphics.quality);
  const authoredVehicleVisual = graphicsQuality !== 'low';

  // Callback for physics forklift position updates
  // Note: We do NOT update the position of ref.current here because in physics mode,
  // ref.current is a child of the RigidBody and moves with it automatically.
  // Updating it here would cause double-transformation (moving it relative to the moving parent).
  const handlePhysicsPositionUpdate = useCallback((_x: number, _z: number, _rotation: number) => {
    // Left empty intentionally to prevent double-transformation
    // The physics engine handles the movement of the parent RigidBody
  }, []);

  // Callbacks for physics forklift state updates
  const handleCargoChange = useCallback((cargo: boolean) => {
    setHasCargo(cargo);
    hasCargoRef.current = cargo;
  }, []);

  const handleOperationChange = useCallback((op: ForkliftOperation) => {
    setCurrentOperation(op);
    operationRef.current = op;
  }, []);

  // Physics mode skips the legacy movement branch that maintains isStopped.
  // Derive its safety stop from the inputs the physics wrapper also honours.
  // Per-vehicle wear. Two identically-grimy forklifts read as one asset drawn
  // twice, so the amount is derived from the id and differs across the fleet.
  const forkliftGrime = data.id === 'forklift-1' ? 0.74 : 0.52;
  const effectiveStopped = enablePhysics ? forkliftEmergencyStop || emergencyDrillMode : isStopped;
  const simulationPaused = isForkliftSimulationPaused(productionSpeed, gameSpeed);
  const motionStopped = effectiveStopped || simulationPaused;
  const isOperating = currentOperation === 'loading' || currentOperation === 'unloading';

  useEffect(() => {
    if (!audioReady) return undefined;
    audioManager.startForkliftEngine(data.id);
    return () => audioManager.stopForkliftEngine(data.id);
  }, [audioReady, data.id]);

  useEffect(() => {
    if (!audioReady) return;
    audioManager.updateForkliftEngine(data.id, !motionStopped && !isOperating, effectiveStopped);
  }, [audioReady, data.id, effectiveStopped, isOperating, motionStopped]);

  useEffect(() => {
    if (!audioReady) return;
    const duration = Math.max(0.6, operationDurationRef.current || 1.5);
    if (currentOperation === 'loading') {
      audioManager.playHydraulicLift(data.id, duration);
    } else if (currentOperation === 'unloading') {
      audioManager.playHydraulicLower(data.id, duration);
    }
  }, [audioReady, currentOperation, data.id]);

  // Play horn when stopping for safety
  useEffect(() => {
    if (effectiveStopped && !wasStoppedRef.current) {
      audioManager.playHorn(data.id);
      recordSafetyStop();
    }
    wasStoppedRef.current = effectiveStopped;
  }, [effectiveStopped, data.id, recordSafetyStop]);

  // Set initial position only once (not via prop to avoid reset on re-render)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      ref.current.position.set(...data.position);
      initializedRef.current = true;
    }
  }, [data.position]);

  // Cleanup: unregister from position registry on unmount
  useEffect(() => {
    return () => {
      positionRegistry.unregister(data.id);
    };
  }, [data.id]);

  useFrame((state, delta) => {
    // PERFORMANCE: Skip all forklift logic when tab hidden
    if (!ref.current || !isTabVisible) return;

    // Visual articulation remains live in both movement implementations. This
    // must run before the physics branch returns because physics owns vehicle
    // translation, not the model's mast pose.
    const visualDelta = Math.min(Math.max(delta, 1 / 240), 0.1);
    mastTiltRef.current = THREE.MathUtils.damp(
      mastTiltRef.current,
      resolveForkliftMastTilt(operationRef.current, hasCargoRef.current),
      7,
      visualDelta
    );

    const publishMotionTelemetry = (): void => {
      if (!ref.current) return;
      Object.assign(ref.current.userData, {
        phase: operationRef.current,
        speed: currentSpeedRef.current,
        steeringAngle: steeringAngleRef.current,
        forkHeight: forkHeightRef.current,
        mastTilt: mastTiltRef.current,
        cargo: hasCargoRef.current ? 'pallet' : 'empty',
        stopped: simulationPaused || effectiveStopped || currentSpeedRef.current <= 0.01,
      });
    };

    // When physics is enabled, skip all movement - physics handles position
    // But still update LOD and wheel animations
    if (enablePhysics) {
      steeringAngleRef.current = 0;
      // Calculate world distance for LOD (ref.current is local (0,0,0) inside physics body)
      // Uses module-level vector to avoid GC pressure
      ref.current.getWorldPosition(_tempWorldPos);
      cameraDistanceRef.current = state.camera.position.distanceTo(_tempWorldPos);

      if (distanceTier === 'close' && cameraDistanceRef.current > FORKLIFT_LOD_FAR_METRES) {
        setDistanceTier('far');
      } else if (distanceTier === 'far' && cameraDistanceRef.current < FORKLIFT_LOD_CLOSE_METRES) {
        setDistanceTier('close');
      }
      publishMotionTelemetry();
      return; // Skip all legacy movement code
    }

    // Update camera distance for LOD (with hysteresis to prevent flickering)
    cameraDistanceRef.current = state.camera.position.distanceTo(ref.current.position);
    if (distanceTier === 'close' && cameraDistanceRef.current > FORKLIFT_LOD_FAR_METRES) {
      setDistanceTier('far');
    } else if (distanceTier === 'far' && cameraDistanceRef.current < FORKLIFT_LOD_CLOSE_METRES) {
      setDistanceTier('close');
    }

    const pos = ref.current.position;
    if (simulationPaused) {
      currentSpeedRef.current = 0;
      previousSpeedRef.current = 0;
      steeringAngleRef.current = 0;
      const direction = dirNormalizedRef.current;
      positionRegistry.register(data.id, pos.x, pos.z, direction.x, direction.z, true, pos.y);
      publishMotionTelemetry();
      return;
    }

    const wallDelta = Math.min(delta, 0.1);
    const simulationDelta = wallDelta * Math.max(0, productionSpeed);
    const target = currentTarget.current;
    // Reuse Vector3 refs to avoid GC pressure
    const direction = directionRef.current.subVectors(target, pos);
    const distance = direction.length();

    // Collision avoidance: check other autonomous vehicles and static obstacles ahead
    const SAFETY_RADIUS = 2.5; // Distance to keep from entities
    const FORKLIFT_SAFETY_RADIUS = 4; // Larger radius for forklift-to-forklift
    const CHECK_DISTANCE = 5; // How far ahead to check
    const dirNormalized = dirNormalizedRef.current.copy(direction).normalize();

    // Detect if reversing (direction changed significantly)
    const dotProduct = dirNormalized.dot(prevDirectionRef.current);
    const reversing = dotProduct < -0.5; // Roughly opposite direction
    if (reversing !== isReversingRef.current) {
      isReversingRef.current = reversing;
    }

    // Play backup beeper when reversing
    if (reversing && !isStopped) {
      audioManager.playBackupBeep(data.id);
    }

    prevDirectionRef.current.copy(dirNormalized);

    // Throttle expensive collision detection to every 3 frames (~20Hz instead of 60Hz)
    // This significantly reduces CPU load while still being responsive enough for safety
    frameCountRef.current++;
    const shouldCheckCollisions = frameCountRef.current % 3 === 0;

    let pathClear: boolean;
    let forkliftsNearby: EntityPosition[];

    if (shouldCheckCollisions) {
      // Check the predicted route against autonomous vehicles and static obstacles
      pathClear = positionRegistry.isPathClear(
        pos.x,
        pos.z,
        dirNormalized.x,
        dirNormalized.z,
        CHECK_DISTANCE,
        SAFETY_RADIUS,
        data.id, // Pass forklift ID to also check for other forklifts
        true, // Enable obstacle checking
        pos.y // Pass Y position for height checks
      );

      // Check immediate vicinity for other forklifts
      forkliftsNearby = positionRegistry.getForkliftsNearby(
        pos.x,
        pos.z,
        FORKLIFT_SAFETY_RADIUS,
        data.id,
        pos.y
      );

      // Cache the results
      lastCollisionCheckRef.current = { pathClear, forkliftsNearby };
    } else {
      // Use cached results
      ({ pathClear, forkliftsNearby } = lastCollisionCheckRef.current);
    }

    // Check if currently in or approaching a crossing zone
    const currentCrossingZone = isInCrossingZone(pos.x, pos.z);

    // Check if next position (ahead by CROSSING_APPROACH_DISTANCE) would be in crossing zone
    const lookAheadX = pos.x + dirNormalized.x * CROSSING_APPROACH_DISTANCE;
    const lookAheadZ = pos.z + dirNormalized.z * CROSSING_APPROACH_DISTANCE;
    const approachingCrossingZone = isInCrossingZone(lookAheadX, lookAheadZ);

    // Update crossing state
    const nowInCrossing = currentCrossingZone !== null || approachingCrossingZone !== null;
    if (nowInCrossing !== isInCrossingRef.current) {
      isInCrossingRef.current = nowInCrossing;
    }

    // Crossing zone logic: slow down or wait before entering
    let crossingClear = true;
    let speedMultiplier = 1.0;

    if (approachingCrossingZone && !currentCrossingZone) {
      // Approaching a crossing zone - wait before entering
      crossingTimerRef.current += simulationDelta;
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

    // Truck coordination: speed up when relevant truck is docked
    // forklift-1 handles shipping dock, forklift-2 handles receiving dock
    const isShippingForklift = data.id === 'forklift-1';
    const isReceivingForklift = data.id === 'forklift-2';
    if (
      (isShippingForklift && truckDocked.shipping) ||
      (isReceivingForklift && truckDocked.receiving)
    ) {
      speedMultiplier *= 1.3; // 30% speed boost when truck is waiting
    }

    // Check emergency stop states (forklift E-stop or fire drill in progress)
    const emergencyStopActive = forkliftEmergencyStop || emergencyDrillMode;

    // Basic safety conditions (path clear, no nearby entities)
    const basicSafetyMet =
      !emergencyStopActive && pathClear && forkliftsNearby.length === 0 && crossingClear;

    // Track safety stop timer - prevents thrash by requiring delay before resume
    // Timer represents time spent in "safe" state since last safety stop
    // When basically safe and timer > 0, we're in the resume delay countdown
    if (!basicSafetyMet) {
      // Currently unsafe - reset the resume timer to start fresh on next safe transition
      // We mark this as -1 to indicate "was recently unsafe"
      if (safetyStopTimerRef.current !== -1) {
        safetyStopTimerRef.current = -1;
      }
    } else if (safetyStopTimerRef.current === -1) {
      // Just transitioned from unsafe to safe - start the resume delay timer
      safetyStopTimerRef.current = 0;
    } else if (safetyStopTimerRef.current < SAFETY_RESUME_DELAY) {
      // In resume delay - count up
      safetyStopTimerRef.current += wallDelta;
    }
    // When timer >= SAFETY_RESUME_DELAY, forklift can move

    // Only safe to move if basic safety met AND resume delay has passed
    const resumeDelayPassed = safetyStopTimerRef.current >= SAFETY_RESUME_DELAY;
    const isSafeToMove = basicSafetyMet && resumeDelayPassed;
    const newIsStopped = !isSafeToMove;

    // Register position with CURRENT frame's stopped state (not delayed React state)
    // Publish the current intent immediately for peer-vehicle avoidance
    positionRegistry.register(
      data.id,
      pos.x,
      pos.z,
      dirNormalized.x,
      dirNormalized.z,
      newIsStopped,
      pos.y
    );

    // Hysteresis: require stable state for HYSTERESIS_TIME before changing React state
    if (newIsStopped !== isStopped) {
      stateChangeTimerRef.current += wallDelta;
      if (stateChangeTimerRef.current >= HYSTERESIS_TIME) {
        setIsStopped(newIsStopped);
        stateChangeTimerRef.current = 0;
      }
    } else {
      stateChangeTimerRef.current = 0; // Reset timer if state matches
    }

    // Handle loading/unloading operations (use ref for immediate access)
    const currentOp = operationRef.current;
    if (currentOp === 'loading' || currentOp === 'unloading') {
      operationTimerRef.current += simulationDelta;
      const duration = operationDurationRef.current || 1; // Prevent division by zero
      const progress = Math.min(operationTimerRef.current / duration, 1);

      forkHeightRef.current = smoothOperationHeight(progress, FORK_LIFT_HEIGHT);
      currentSpeedRef.current = 0;
      steeringAngleRef.current = 0;
      const bodySettle = 1 - Math.exp(-8 * simulationDelta);
      ref.current.rotation.x += (0 - ref.current.rotation.x) * bodySettle;
      ref.current.rotation.z += (0 - ref.current.rotation.z) * bodySettle;

      // Toggle cargo at midpoint of operation
      if (progress >= 0.5 && !hasCargoRef.current && currentOp === 'loading') {
        hasCargoRef.current = true;
        setHasCargo(true);
      } else if (progress >= 0.5 && hasCargoRef.current && currentOp === 'unloading') {
        hasCargoRef.current = false;
        setHasCargo(false);
      }

      // Operation complete
      if (progress >= 1) {
        operationTimerRef.current = 0;
        operationRef.current = 'traveling';
        setCurrentOperation('traveling');
        forkHeightRef.current = 0;
        // Move to next waypoint
        pathIndexRef.current = (pathIndexRef.current + 1) % data.path.length;
        currentTarget.current.set(...data.path[pathIndexRef.current]);
      }
      publishMotionTelemetry();
      return; // Don't move while operating
    }

    if (distance < 0.5) {
      currentSpeedRef.current = 0;
      steeringAngleRef.current = 0;
      // Arrived at waypoint - check for action
      // Defensive: pathActions may be shorter than path if the two arrays ever
      // diverge (e.g. a route edited in one array only). Without this guard,
      // an out-of-range action is undefined and action.type below would throw
      // inside useFrame, killing the render loop.
      if (pathIndexRef.current >= data.pathActions.length) {
        pathIndexRef.current = (pathIndexRef.current + 1) % data.path.length;
        currentTarget.current.set(...data.path[pathIndexRef.current]);
        publishMotionTelemetry();
        return;
      }
      const action = data.pathActions[pathIndexRef.current];
      const currentlyHasCargo = hasCargoRef.current; // Use ref for immediate value
      if (
        (action.type === 'pickup' && !currentlyHasCargo && !canPerformWaypointAction('pickup')) ||
        (action.type === 'dropoff' && currentlyHasCargo && !canPerformWaypointAction('dropoff'))
      ) {
        publishMotionTelemetry();
        return;
      }

      if (action.type === 'pickup' && !currentlyHasCargo) {
        // Start loading operation
        operationTimerRef.current = 0;
        operationDurationRef.current = action.duration;
        operationRef.current = 'loading';
        setCurrentOperation('loading');
        publishMotionTelemetry();
        return;
      } else if (action.type === 'dropoff' && currentlyHasCargo) {
        // Start unloading operation
        operationTimerRef.current = 0;
        operationDurationRef.current = action.duration;
        operationRef.current = 'unloading';
        setCurrentOperation('unloading');
        publishMotionTelemetry();
        return;
      } else {
        // No action or action not applicable, move to next waypoint
        pathIndexRef.current = (pathIndexRef.current + 1) % data.path.length;
        currentTarget.current.set(...data.path[pathIndexRef.current]);
      }
    } else if (isSafeToMove) {
      const effectiveSpeed = data.speed * speedMultiplier * vehicleSpeedMultiplier;
      const brakingSpeed = Math.sqrt(Math.max(0, 2 * 3.8 * (distance - 0.2)));
      const desiredSpeed = Math.min(effectiveSpeed, brakingSpeed);
      currentSpeedRef.current = moveTowards(
        currentSpeedRef.current,
        desiredSpeed,
        (desiredSpeed > currentSpeedRef.current ? 2.4 : 4.8) * simulationDelta
      );
      direction.normalize();
      pos.add(
        direction.multiplyScalar(Math.min(distance, currentSpeedRef.current * simulationDelta))
      );

      const targetRotation = Math.atan2(direction.x, direction.z);
      const previousHeading = ref.current.rotation.y;
      const steeringTarget = resolveForkliftSteeringAngle(previousHeading, targetRotation);
      steeringAngleRef.current +=
        (steeringTarget - steeringAngleRef.current) * (1 - Math.exp(-10 * simulationDelta));
      ref.current.rotation.y = dampAngle(previousHeading, targetRotation, 7, simulationDelta);
      const headingDelta = Math.atan2(
        Math.sin(ref.current.rotation.y - previousHeading),
        Math.cos(ref.current.rotation.y - previousHeading)
      );
      const acceleration =
        (currentSpeedRef.current - previousSpeedRef.current) / Math.max(simulationDelta, 1 / 240);
      const poseResponse = 1 - Math.exp(-7 * simulationDelta);
      const targetRoll = THREE.MathUtils.clamp(-headingDelta * 0.9, -0.045, 0.045);
      const targetPitch = THREE.MathUtils.clamp(-acceleration * 0.005, -0.025, 0.025);
      ref.current.rotation.z += (targetRoll - ref.current.rotation.z) * poseResponse;
      ref.current.rotation.x += (targetPitch - ref.current.rotation.x) * poseResponse;
      previousSpeedRef.current = currentSpeedRef.current;
    } else {
      currentSpeedRef.current = 0;
      previousSpeedRef.current = 0;
      steeringAngleRef.current = 0;
      const poseResponse = 1 - Math.exp(-10 * simulationDelta);
      ref.current.rotation.x += (0 - ref.current.rotation.x) * poseResponse;
      ref.current.rotation.z += (0 - ref.current.rotation.z) * poseResponse;
    }
    publishMotionTelemetry();
  });

  // Handle click on forklift
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (onSelect && ref.current) {
      const status =
        currentOperation === 'loading'
          ? 'loading'
          : currentOperation === 'unloading'
            ? 'unloading'
            : motionStopped
              ? 'idle'
              : 'moving';
      onSelect({
        id: data.id,
        cargo: hasCargo ? 'pallet' : 'empty',
        position: [ref.current.position.x, ref.current.position.y, ref.current.position.z],
        rotation: ref.current.rotation.y,
        status,
      });
    }
  };

  // Visual content for the forklift
  const forkliftContent = (
    <group
      ref={ref}
      name={data.id}
      userData={{ forkliftId: data.id, type: 'forklift' }}
      onClick={handleClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* Forklift model - full detail when close, billboard when far */}
      {distanceTier === 'close' ? (
        <ForkliftModel
          hasCargo={hasCargo}
          isMoving={!motionStopped && !isOperating}
          forkHeightRef={forkHeightRef}
          mastTiltRef={mastTiltRef}
          steeringAngleRef={steeringAngleRef}
          grime={forkliftGrime}
        />
      ) : (
        <ForkliftBillboard hasCargo={hasCargo} simulationPaused={simulationPaused} />
      )}

      {/* Warning light - only render when close (flashing light not visible from far anyway) */}
      {distanceTier === 'close' && (
        <WarningLight
          isStopped={effectiveStopped}
          isInCrossing={isInCrossingRef.current}
          simulationPaused={simulationPaused}
          height={authoredVehicleVisual ? 1.86 : 2.3}
        />
      )}

      {/* Fleet identity and operation status, rendered only when close */}
      {distanceTier === 'close' && (
        <Billboard position={[0, authoredVehicleVisual ? 2.18 : 2.48, 0]} follow>
          <Text
            fontSize={0.17}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {data.id}
          </Text>
          {/* Show operation status when loading/unloading */}
          {isOperating && (
            <Text
              position={[0, 0.24, 0]}
              fontSize={0.14}
              color={currentOperation === 'loading' ? '#22c55e' : '#f59e0b'}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {currentOperation === 'loading' ? 'LOADING' : 'UNLOADING'}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  );

  // When physics is enabled, wrap in PhysicsForklift for collision/movement
  if (enablePhysics) {
    return (
      <ErrorBoundary fallback={forkliftContent} resetKeys={[enablePhysics, data.id]}>
        <Suspense fallback={forkliftContent}>
          <PhysicsForklift
            data={{
              id: data.id,
              position: data.position,
              rotation: data.rotation,
              speed: data.speed,
              path: data.path,
              pathActions: data.pathActions,
              pathIndex: data.pathIndex,
              cargo: data.cargo,
            }}
            onPositionUpdate={handlePhysicsPositionUpdate}
            onCargoChange={handleCargoChange}
            onOperationChange={handleOperationChange}
            canPerformAction={canPerformWaypointAction}
            vehicleSpeedMultiplier={vehicleSpeedMultiplier}
          >
            {forkliftContent}
          </PhysicsForklift>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Legacy mode - no physics wrapper
  return forkliftContent;
};
