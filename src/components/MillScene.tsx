import React, { useMemo, useEffect, useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

// Import static assets so Vite handles base path correctly
import warehouseHdrUrl from '/hdri/warehouse.hdr?url';
import { Machines } from './Machines';
import { ConveyorSystem } from './ConveyorSystem';
// Using new optimized worker system with centralized animation manager
import { WorkerSystemNew as WorkerSystem } from './WorkerSystemNew';
import { FactoryInfrastructure } from './FactoryInfrastructure';
import { SpoutingSystem } from './SpoutingSystem';
import { DustParticles, GrainFlow, MachineSteamVents, DustAnimationManager } from './DustParticles';
import { FactoryExterior } from './FactoryExterior';
import { OpenDockOpening } from './infrastructure/OpenDockOpening';
import { ForkliftSystem, ForkliftData } from './ForkliftSystem';
import { FactoryEnvironment } from './Environment';
import { HolographicDisplays } from './HolographicDisplays';

// Lazy load heavy 3D components to reduce initial bundle
const TruckBay = React.lazy(() => import('./TruckBay').then((m) => ({ default: m.TruckBay })));
const AmbientDetailsGroup = React.lazy(() =>
  import('./AmbientDetails').then((m) => ({ default: m.AmbientDetailsGroup }))
);
import { VisibleChaos } from './VisibleChaos';
import { FactoryEnvironmentSystem } from './FactoryEnvironment';
import { MaintenanceSystem } from './MaintenanceSystem';
import { useMoodSimulation } from './WorkerMoodOverlay';
import { RemotePlayersGroup } from './multiplayer';
import { MachineData, MachineType, WorkerData } from '../types';
import { useGraphicsStore } from '../stores/graphicsStore';
import { useProductionStore } from '../stores/productionStore';
import { useSafetyStore } from '../stores/safetyStore';
import { useGameSimulationStore, FIRE_DRILL_EXITS } from '../stores/gameSimulationStore';
import { positionRegistry, Obstacle } from '../utils/positionRegistry';
import { useShallow } from 'zustand/react/shallow';
import { trackRender } from '../utils/renderProfiler';
import { CameraBoundsTracker } from './CameraController';
import { useCameraPositionStore } from '../stores/useCameraPositionStore';

// Single heat map point with ref-based animation (throttled to reduce CPU load)
// Memoized to prevent re-renders when parent updates
const HeatMapPoint = React.memo<{
  point: { x: number; z: number; intensity: number; type: string };
}>(({ point }) => {
  const circleMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const columnMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameCountRef = useRef(0);

  // Memoize derived values to prevent recalculation
  const intensity = useMemo(() => point.intensity / 10, [point.intensity]);
  const radius = useMemo(() => 1 + intensity * 2, [intensity]);
  const color = useMemo(
    () =>
      point.type === 'emergency'
        ? '#ef4444'
        : point.type === 'near_miss'
          ? '#f97316'
          : point.type === 'stop'
            ? '#eab308'
            : '#3b82f6',
    [point.type]
  );

  // Memoize position arrays to prevent Three.js re-renders
  const groupPosition = useMemo<[number, number, number]>(
    () => [point.x, 0.1, point.z],
    [point.x, point.z]
  );
  const columnPosition = useMemo<[number, number, number]>(
    () => [0, intensity * 2, 0],
    [intensity]
  );

  // Static positions/rotations defined outside render
  const floorRotation = useMemo<[number, number, number]>(() => [-Math.PI / 2, 0, 0], []);
  const labelPosition = useMemo<[number, number, number]>(() => [0, 0.5, 0], []);

  useFrame((state) => {
    // Throttle to every 4th frame (~15 FPS) - heat map pulse doesn't need 60 FPS
    frameCountRef.current++;
    if (frameCountRef.current % 4 !== 0) return;

    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
    if (circleMaterialRef.current) circleMaterialRef.current.opacity = 0.3 * pulse * intensity;
    if (ringMaterialRef.current) ringMaterialRef.current.opacity = 0.6 * pulse;
    if (columnMaterialRef.current) columnMaterialRef.current.opacity = 0.2 * pulse;
  });

  return (
    <group position={groupPosition}>
      {/* Heat circle on floor */}
      <mesh rotation={floorRotation}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial
          ref={circleMaterialRef}
          color={color}
          transparent
          opacity={0.3 * intensity}
        />
      </mesh>
      {/* Outer ring - raised 0.01 to prevent z-fighting with circle */}
      <mesh rotation={floorRotation} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius - 0.1, radius, 32]} />
        <meshBasicMaterial ref={ringMaterialRef} color={color} transparent opacity={0.6} />
      </mesh>
      {/* Rising column for high-intensity spots */}
      {intensity > 0.5 && (
        <mesh position={columnPosition}>
          <cylinderGeometry args={[0.3, 0.5, intensity * 4, 16]} />
          <meshBasicMaterial ref={columnMaterialRef} color={color} transparent opacity={0.2} />
        </mesh>
      )}
      {/* Intensity label for significant hotspots */}
      {point.intensity >= 3 && (
        <Text
          position={labelPosition}
          fontSize={0.4}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {point.intensity.toFixed(0)}x
        </Text>
      )}
    </group>
  );
});

// Incident Heat Map 3D Visualization
const IncidentHeatMap: React.FC = () => {
  const incidentHeatMap = useSafetyStore((state) => state.incidentHeatMap);
  const showIncidentHeatMap = useSafetyStore((state) => state.showIncidentHeatMap);

  if (!showIncidentHeatMap || incidentHeatMap.length === 0) return null;

  return (
    <group>
      {incidentHeatMap.map((point) => (
        // PERFORMANCE: Use stable position-based key instead of array index to prevent unnecessary re-renders
        <HeatMapPoint key={`${point.x}-${point.z}`} point={point} />
      ))}
    </group>
  );
};

// Fire Drill Exit Markers - glowing green markers at each exit point
const FireDrillExitMarkers: React.FC = () => {
  const emergencyDrillMode = useGameSimulationStore((state) => state.emergencyDrillMode);
  const drillMetrics = useGameSimulationStore((state) => state.drillMetrics);
  const materialRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  // Pulsing animation for exit markers
  useFrame((state) => {
    if (!emergencyDrillMode) return;
    const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 0.7;
    materialRefs.current.forEach((mat) => {
      if (mat) {
        mat.emissiveIntensity = pulse * 2;
        mat.opacity = 0.6 + pulse * 0.4;
      }
    });
  });

  // Only show during active fire drill
  if (!emergencyDrillMode || !drillMetrics.active) return null;

  return (
    <group>
      {FIRE_DRILL_EXITS.map((exit, i) => (
        <group key={exit.id} position={[exit.position.x, 0.1, exit.position.z]}>
          {/* Glowing circle on floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2, 3.5, 32]} />
            <meshStandardMaterial
              ref={(el) => {
                materialRefs.current[i] = el;
              }}
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.5}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Inner solid circle */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[2, 32]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={0.5}
              transparent
              opacity={0.4}
            />
          </mesh>
          {/* Exit label */}
          <Text
            position={[0, 2, 0]}
            fontSize={1.2}
            color="#22c55e"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {exit.label.toUpperCase()}
          </Text>
          {/* Pointing arrow above */}
          <mesh position={[0, 3.5, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.5, 1, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

interface MillSceneProps {
  productionSpeed: number;
  showZones: boolean;
  onSelectMachine: (data: MachineData) => void;
  onSelectWorker: (data: WorkerData) => void;
  onSelectForklift?: (data: ForkliftData) => void;
}

const FLOOR_SIZE_X = 120; // Wide enough for interior operations
const FLOOR_SIZE_Z = 160; // Extended for front/back truck yards
const FLOOR_SIZE = 120; // Legacy reference for components using single value

export const MillScene: React.FC<MillSceneProps> = ({
  productionSpeed,
  showZones,
  onSelectForklift,
  onSelectMachine,
  onSelectWorker,
}) => {
  // PERF DEBUG: Track renders
  trackRender('MillScene');

  const { setMachines, storeMachines, updateMachineMetrics, updateMachineStatus, scadaLive } =
    useProductionStore(
      useShallow((state) => ({
        setMachines: state.setMachines,
        storeMachines: state.machines,
        updateMachineMetrics: state.updateMachineMetrics,
        updateMachineStatus: state.updateMachineStatus,
        scadaLive: state.scadaLive,
      }))
    );
  const lastUpdateRef = useRef(0);
  const frameCountRef = useRef(0);

  // Worker mood simulation - Theme Hospital inspired mood system
  useMoodSimulation();

  const machines = useMemo(() => {
    const _machines: MachineData[] = [];

    // ZONE 1: Raw Material Storage (Silos) - Back Row
    const siloNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
    for (let i = -2; i <= 2; i++) {
      _machines.push({
        id: `silo-${i}`,
        name: `Silo ${siloNames[i + 2]}`,
        type: MachineType.SILO,
        position: [i * 9, 0, -22],
        size: [4.5, 16, 4.5],
        rotation: 0,
        status: 'running',
        metrics: {
          rpm: 0,
          temperature: 20 + Math.random() * 2,
          vibration: 0.8 + Math.random() * 0.2,
          load: 60 + Math.random() * 15,
        },
        lastMaintenance: '2024-01-15',
        nextMaintenance: '2024-04-15',
      });
    }

    // ZONE 2: Milling Floor (Roller Mills)
    const millNames = ['RM-101', 'RM-102', 'RM-103', 'RM-104', 'RM-105', 'RM-106'];
    let millIndex = 0;
    for (let i = -3; i <= 3; i += 1.5) {
      if (Math.abs(i) < 0.5) continue;
      _machines.push({
        id: `mill-${i}`,
        name: millNames[millIndex],
        type: MachineType.ROLLER_MILL,
        position: [i * 5, 0, -6],
        size: [3.5, 5, 3.5],
        rotation: 0,
        status: 'running', // Always start running (no random warning)
        metrics: {
          rpm: 1200 + Math.random() * 50,
          temperature: 42 + Math.random() * 5,
          vibration: 1.5 + Math.random() * 0.5,
          load: 70 + Math.random() * 10,
        },
        lastMaintenance: '2024-02-01',
        nextMaintenance: '2024-05-01',
      });
      millIndex++;
    }

    // ZONE 3: Sifting (Plansifters) - Elevated
    const sifterNames = ['Sifter A', 'Sifter B', 'Sifter C'];
    for (let i = -1; i <= 1; i++) {
      _machines.push({
        id: `sifter-${i}`,
        name: sifterNames[i + 1],
        type: MachineType.PLANSIFTER,
        position: [i * 14, 9, 6],
        size: [7, 7, 7],
        rotation: 0,
        status: 'running',
        metrics: {
          rpm: 200 + Math.random() * 20,
          temperature: 28 + Math.random() * 4,
          vibration: 5.5 + Math.random() * 1,
          load: 75 + Math.random() * 10,
        },
        lastMaintenance: '2024-01-20',
        nextMaintenance: '2024-04-20',
      });
    }

    // ZONE 4: Packaging (Packers) - Moved forward to z=25 for more space
    const packerNames = ['Pack Line 1', 'Pack Line 2', 'Pack Line 3'];
    for (let i = -1; i <= 1; i++) {
      _machines.push({
        id: `packer-${i}`,
        name: packerNames[i + 1],
        type: MachineType.PACKER,
        position: [i * 8, 0, 25],
        size: [4, 6, 4],
        rotation: Math.PI,
        status: 'running',
        metrics: {
          rpm: 60,
          temperature: 28 + Math.random() * 5,
          vibration: 1 + Math.random(),
          load: 85 + Math.random() * 10,
        },
        lastMaintenance: '2024-02-10',
        nextMaintenance: '2024-05-10',
      });
    }

    return _machines;
  }, []);

  // Define obstacle regions for worker pathfinding
  const obstacles = useMemo<Obstacle[]>(() => {
    const obs: Obstacle[] = [];
    const WORKER_PADDING = 1.0; // Extra padding around machines

    // SILOS (Zone 1, z=-22) - including legs and hopper
    // Silos have size [4.5, 16, 4.5] at positions [i*9, 0, -22]
    for (let i = -2; i <= 2; i++) {
      const x = i * 9;
      obs.push({
        id: `silo-obs-${i}`,
        minX: x - 2.25 - WORKER_PADDING,
        maxX: x + 2.25 + WORKER_PADDING,
        minZ: -22 - 2.25 - WORKER_PADDING,
        maxZ: -22 + 2.25 + WORKER_PADDING,
      });
    }

    // ROLLER MILLS (Zone 2, z=-6)
    // Mills have size [3.5, 5, 3.5] at positions [i*5, 0, -6] for i in [-3, -1.5, 1.5, 3]
    for (const i of [-3, -1.5, 1.5, 3]) {
      const x = i * 5;
      obs.push({
        id: `mill-obs-${i}`,
        minX: x - 1.75 - WORKER_PADDING,
        maxX: x + 1.75 + WORKER_PADDING,
        minZ: -6 - 1.75 - WORKER_PADDING,
        maxZ: -6 + 1.75 + WORKER_PADDING,
      });
    }

    // PLANSIFTERS (Zone 3, z=6) - elevated at y=9, but have hanging cables
    // Workers can walk under these, but the cables at corners need small obstacles
    for (let i = -1; i <= 1; i++) {
      const x = i * 14;
      // Just mark small cable anchor points at corners (not full machine footprint)
      const cablePositions = [
        [-3.2, -3.2],
        [-3.2, 3.2],
        [3.2, -3.2],
        [3.2, 3.2],
      ];
      cablePositions.forEach(([dx, dz], idx) => {
        obs.push({
          id: `sifter-cable-${i}-${idx}`,
          minX: x + dx - 0.3,
          maxX: x + dx + 0.3,
          minZ: 6 + dz - 0.3,
          maxZ: 6 + dz + 0.3,
        });
      });
    }

    // PACKERS (Zone 4, z=25)
    // Packers have size [4, 6, 4] at positions [i*8, 0, 25]
    for (let i = -1; i <= 1; i++) {
      const x = i * 8;
      obs.push({
        id: `packer-obs-${i}`,
        minX: x - 2 - WORKER_PADDING,
        maxX: x + 2 + WORKER_PADDING,
        minZ: 25 - 2 - WORKER_PADDING,
        maxZ: 25 + 2 + WORKER_PADDING,
      });
    }

    // CONVEYOR SYSTEM OBSTACLES - Full belt structures
    // Workers and forklifts must walk around the conveyors
    // Main conveyor belt at z=24, length 55 (x from -27.5 to 27.5)
    obs.push({
      id: 'main-conveyor-belt',
      minX: -28,
      maxX: 28,
      minZ: 22.5,
      maxZ: 25.5,
    });

    // Roller conveyor at z=21, length 30 (x from -15 to 15)
    obs.push({
      id: 'roller-conveyor-belt',
      minX: -15,
      maxX: 15,
      minZ: 19.5,
      maxZ: 22.5,
    });

    // LOADING DOCK PLATFORMS - Forklifts must not drive onto elevated docks
    // Shipping dock (front, z=50): platform at [0, 1, 47], size 32x6 (expanded for 2 bays)
    obs.push({
      id: 'shipping-dock-platform',
      minX: -18,
      maxX: 18,
      minZ: 44,
      maxZ: 54,
    });

    // Receiving dock (back, z=-50): platform at [0, 1, -47], size 16x6
    obs.push({
      id: 'receiving-dock-platform',
      minX: -10,
      maxX: 10,
      minZ: -54,
      maxZ: -44,
    });

    // AMENITY BUILDINGS - Break rooms, toilet blocks, locker rooms
    // These are forklift-only obstacles (workers can enter/exit normally)
    // Moved to back wall area, away from truck paths

    // Left break room at [-50, 0, -20], floor 6x5
    obs.push({
      id: 'break-room-left',
      minX: -53,
      maxX: -47,
      minZ: -22.5,
      maxZ: -17.5,
      forkliftOnly: true,
    });

    // Right break room at [50, 0, -20], floor 6x5
    obs.push({
      id: 'break-room-right',
      minX: 47,
      maxX: 53,
      minZ: -22.5,
      maxZ: -17.5,
      forkliftOnly: true,
    });

    // Toilet block at [35, 0, 35], floor 8x5
    obs.push({
      id: 'toilet-block',
      minX: 31,
      maxX: 39,
      minZ: 32.5,
      maxZ: 37.5,
      forkliftOnly: true,
    });

    // Locker room at [-50, 0, -35], floor 8x6 - moved to back wall area
    obs.push({
      id: 'locker-room',
      minX: -54,
      maxX: -46,
      minZ: -38,
      maxZ: -32,
      forkliftOnly: true,
    });

    // Manager's office at [-20, 0, 30], floor 8x6
    obs.push({
      id: 'manager-office',
      minX: -24,
      maxX: -16,
      minZ: 27,
      maxZ: 33,
      forkliftOnly: true,
    });

    return obs;
  }, []);

  // Register obstacles with position registry on mount
  useEffect(() => {
    positionRegistry.registerObstacles(obstacles);
  }, [obstacles]);

  // Sync machines with store on mount
  useEffect(() => {
    if (machines.length > 0 && storeMachines.length === 0) {
      setMachines(machines);
    }
  }, [machines, storeMachines.length, setMachines]);

  // Simulate realistic machine metric changes over time
  // Throttled to check every 30 frames (~0.5s at 60fps) instead of every frame
  useFrame((state) => {
    // When SCADA is driving metrics, skip local randomization
    if (scadaLive) return;
    frameCountRef.current++;

    // Only check time every 30 frames to reduce overhead
    if (frameCountRef.current % 30 !== 0) return;

    const now = state.clock.elapsedTime;

    // Update every 2 seconds
    if (now - lastUpdateRef.current < 2) return;
    lastUpdateRef.current = now;

    // Only update if store has machines
    if (storeMachines.length === 0) return;

    // Randomly select a machine to update (simulates real sensor data)
    const machineIndex = Math.floor(Math.random() * storeMachines.length);
    const machine = storeMachines[machineIndex];

    // Calculate metric changes based on machine type and current state
    const tempDrift = (Math.random() - 0.5) * 2;
    const vibrationDrift = (Math.random() - 0.5) * 0.3;
    const loadDrift = (Math.random() - 0.5) * 3;

    // Apply changes
    const newTemp = Math.max(20, Math.min(85, machine.metrics.temperature + tempDrift));
    const newVibration = Math.max(0, Math.min(10, machine.metrics.vibration + vibrationDrift));
    const newLoad = Math.max(50, Math.min(100, machine.metrics.load + loadDrift));

    updateMachineMetrics(machine.id, {
      temperature: newTemp,
      vibration: newVibration,
      load: newLoad,
    });

    // Occasionally trigger status changes based on metrics
    if (machine.status === 'running') {
      if (newTemp > 70 || newVibration > 5) {
        if (Math.random() < 0.1) {
          updateMachineStatus(machine.id, 'warning');
        }
      }
    } else if (machine.status === 'warning') {
      if (newTemp < 60 && newVibration < 4) {
        if (Math.random() < 0.2) {
          updateMachineStatus(machine.id, 'running');
        }
      }
    }
  });

  // Use store machines if available, otherwise use local machines
  const displayMachines = storeMachines.length > 0 ? storeMachines : machines;
  // PERFORMANCE: Consolidated store subscriptions with useShallow to prevent unnecessary re-renders
  const { graphicsQuality, perfDebug } = useGraphicsStore(
    useShallow((state) => ({
      graphicsQuality: state.graphics.quality,
      perfDebug: state.graphics.perfDebug,
    }))
  );
  const isLowGraphics = graphicsQuality === 'low';

  // Camera-based visibility culling - hide interior when outside, hide exterior when inside
  // Exception: In dock zones (near open dock openings), show BOTH interior and exterior
  const isCameraInside = useCameraPositionStore((state) => state.isCameraInside);
  const isCameraInDockZone = useCameraPositionStore((state) => state.isCameraInDockZone);

  // Show interior when inside OR in dock transition zone
  const showInterior = isCameraInside || isCameraInDockZone;
  // Show exterior when outside OR in dock transition zone
  const showExterior = !isCameraInside || isCameraInDockZone;

  return (
    <group>
      {/* Internal Dock Elements - Shipping and Receiving */}
      {/* These large black doors link the interior and exterior visually */}
      {showInterior && !isLowGraphics && (
        <>
          {/* Shipping Dock (Front) */}
          <OpenDockOpening position={[0, 0, 48]} rotation={0} width={30} height={14} label="SHIPPING" />
          {/* Receiving Dock (Back) */}
          <OpenDockOpening
            position={[0, 0, -48]}
            rotation={Math.PI}
            width={18}
            height={14}
            label="RECEIVING"
          />
        </>
      )}

      {/* HDRI Environment for realistic reflections - disable on low */}
      {/* Uses local HDRI to avoid network dependency on GitHub CDN */}
      {/* CRITICAL: Wrapped in its own Suspense to prevent blocking the entire scene during load */}
      {!isLowGraphics && (
        <Suspense fallback={null}>
          <Environment files={warehouseHdrUrl} background={false} environmentIntensity={0.55} />
        </Suspense>
      )}

      {/* Environment & Lighting */}
      {!perfDebug?.disableEnvironment && <FactoryEnvironment />}

      {/* Camera bounds tracker for inside/outside detection */}
      <CameraBoundsTracker />

      {/* Main Systems - Respect perfDebug toggles for A/B testing */}
      {/* PERFORMANCE: Interior systems only render when camera is inside factory or in dock zone */}
      {showInterior && !perfDebug?.disableMachines && (
        <Machines machines={displayMachines} onSelect={onSelectMachine} />
      )}
      {showInterior && !isLowGraphics && !perfDebug?.disableMachines && (
        <SpoutingSystem machines={displayMachines} />
      )}
      {/* CRITICAL: Wrapped in Suspense to prevent MeshReflectorMaterial from breaking scene on quality change */}
      <Suspense fallback={null}>
        <FactoryInfrastructure
          floorSize={FLOOR_SIZE}
          floorWidth={FLOOR_SIZE_X}
          floorDepth={FLOOR_SIZE_Z}
          showZones={showZones}
        />
      </Suspense>

      {/* Dynamic Elements - Respect perfDebug toggles */}
      {/* PERFORMANCE: Interior systems only render when camera is inside factory or in dock zone */}
      {showInterior && !perfDebug?.disableConveyorSystem && (
        <ConveyorSystem productionSpeed={productionSpeed} />
      )}
      {showInterior && !perfDebug?.disableWorkerSystem && (
        <WorkerSystem onSelectWorker={onSelectWorker} />
      )}
      {/* Remote multiplayer players */}
      <RemotePlayersGroup />
      {showInterior && !perfDebug?.disableForkliftSystem && (
        <ForkliftSystem showSpeedZones={showZones} onSelectForklift={onSelectForklift} />
      )}
      {/* PERFORMANCE: TruckBay renders when camera is outside OR in dock zone (to see trucks through openings) */}
      {showExterior &&
        (graphicsQuality === 'medium' ||
          graphicsQuality === 'high' ||
          graphicsQuality === 'ultra') &&
        !perfDebug?.disableTruckBay && (
          <Suspense fallback={null}>
            <TruckBay productionSpeed={productionSpeed} />
          </Suspense>
        )}

      {/* Factory exterior walls and signage - renders when camera is outside or in dock zone */}
      {showExterior && <FactoryExterior />}

      {/* Theme Hospital-inspired Mood & Chaos Systems */}
      {/* PERFORMANCE: Interior-only systems, ultra quality only */}
      {showInterior && graphicsQuality === 'ultra' && <VisibleChaos />}
      {showInterior && graphicsQuality === 'ultra' && <FactoryEnvironmentSystem />}
      {showInterior && graphicsQuality === 'ultra' && <MaintenanceSystem />}

      {/* Incident Heat Map Visualization */}
      <IncidentHeatMap />

      {/* Fire Drill Exit Markers - shown during active drill */}
      <FireDrillExitMarkers />

      {/* Atmospheric Effects - heavily reduced for performance */}
      {/* PERFORMANCE: Interior-only particle effects */}
      {showInterior && graphicsQuality !== 'low' && (
        <DustAnimationManager>
          <DustParticles
            count={graphicsQuality === 'ultra' ? 150 : graphicsQuality === 'high' ? 80 : 30}
          />
          {(graphicsQuality === 'high' || graphicsQuality === 'ultra') && <GrainFlow />}
          {(graphicsQuality === 'high' || graphicsQuality === 'ultra') && <MachineSteamVents />}
        </DustAnimationManager>
      )}

      {/* Holographic Displays - interior only, high/ultra */}
      {showInterior && (graphicsQuality === 'high' || graphicsQuality === 'ultra') && (
        <HolographicDisplays />
      )}

      {/* Ambient Details - interior only, ultra */}
      {showInterior && graphicsQuality === 'ultra' && (
        <Suspense fallback={null}>
          <AmbientDetailsGroup />
        </Suspense>
      )}
    </group>
  );
};
