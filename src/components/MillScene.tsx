import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Machines } from './Machines';
import { ConveyorSystem } from './ConveyorSystem';
import { WorkerSystem } from './WorkerSystem';
import { FactoryInfrastructure } from './FactoryInfrastructure';
import { SpoutingSystem } from './SpoutingSystem';
import { DustParticles, GrainFlow, MachineSteamVents } from './DustParticles';
import { TruckBay } from './TruckBay';
import { ForkliftSystem, ForkliftData } from './ForkliftSystem';
import { FactoryEnvironment } from './Environment';
import { HolographicDisplays } from './HolographicDisplays';
import { AmbientDetailsGroup } from './AmbientDetails';
import { VisibleChaos } from './VisibleChaos';
import { FactoryEnvironmentSystem } from './FactoryEnvironment';
import { MaintenanceSystem } from './MaintenanceSystem';
import { useMoodSimulation } from './WorkerMoodOverlay';
import { MachineData, MachineType, WorkerData } from '../types';
import { useMillStore } from '../store';
import { positionRegistry, Obstacle } from '../utils/positionRegistry';

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
      {/* Outer ring */}
      <mesh rotation={floorRotation}>
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
  const incidentHeatMap = useMillStore((state) => state.incidentHeatMap);
  const showIncidentHeatMap = useMillStore((state) => state.showIncidentHeatMap);

  if (!showIncidentHeatMap || incidentHeatMap.length === 0) return null;

  return (
    <group>
      {incidentHeatMap.map((point, i) => (
        <HeatMapPoint key={i} point={point} />
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
  const setMachines = useMillStore((state) => state.setMachines);
  const storeMachines = useMillStore((state) => state.machines);
  const updateMachineMetrics = useMillStore((state) => state.updateMachineMetrics);
  const updateMachineStatus = useMillStore((state) => state.updateMachineStatus);
  const scadaLive = useMillStore((state) => state.scadaLive);
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
    // Shipping dock (front, z=50): platform at [0, 1, 47], size 16x6
    obs.push({
      id: 'shipping-dock-platform',
      minX: -10,
      maxX: 10,
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

    // Left break room at [-35, 0, 25], floor 6x5
    obs.push({
      id: 'break-room-left',
      minX: -38,
      maxX: -32,
      minZ: 22.5,
      maxZ: 27.5,
      forkliftOnly: true,
    });

    // Right break room at [35, 0, 25], floor 6x5
    obs.push({
      id: 'break-room-right',
      minX: 32,
      maxX: 38,
      minZ: 22.5,
      maxZ: 27.5,
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

    // Locker room at [-35, 0, 35], floor 8x6
    obs.push({
      id: 'locker-room',
      minX: -39,
      maxX: -31,
      minZ: 32,
      maxZ: 38,
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
  const graphicsQuality = useMillStore((state) => state.graphics.quality);
  const isLowGraphics = graphicsQuality === 'low';

  return (
    <group>
      {/* HDRI Environment for realistic reflections - disable on low */}
      {/* Uses local HDRI to avoid network dependency on GitHub CDN */}
      {!isLowGraphics && (
        <Environment files="/hdri/warehouse.hdr" background={false} environmentIntensity={0.4} />
      )}

      {/* Environment & Lighting */}
      <FactoryEnvironment />

      {/* Main Systems */}
      <Machines machines={displayMachines} onSelect={onSelectMachine} />
      {!isLowGraphics && <SpoutingSystem machines={displayMachines} />}
      <FactoryInfrastructure
        floorSize={FLOOR_SIZE}
        floorWidth={FLOOR_SIZE_X}
        floorDepth={FLOOR_SIZE_Z}
        showZones={showZones}
      />

      {/* Dynamic Elements */}
      <ConveyorSystem productionSpeed={productionSpeed} />
      <WorkerSystem onSelectWorker={onSelectWorker} />
      <ForkliftSystem showSpeedZones={showZones} onSelectForklift={onSelectForklift} />
      <TruckBay productionSpeed={productionSpeed} />

      {/* Theme Hospital-inspired Mood & Chaos Systems */}
      {/* Visible chaos events - rats, pigeons, grain spills, etc. */}
      <VisibleChaos />
      {/* Factory plants, dust accumulation, coffee machine */}
      {!isLowGraphics && <FactoryEnvironmentSystem />}
      {/* Maintenance workers with sweeping, watering, oiling animations */}
      <MaintenanceSystem />

      {/* Incident Heat Map Visualization */}
      <IncidentHeatMap />

      {/* Atmospheric Effects - heavily reduced for performance */}
      {/* PERFORMANCE: Disable particle effects on low, reduce on medium */}
      {graphicsQuality !== 'low' && (
        <DustParticles
          count={graphicsQuality === 'ultra' ? 150 : graphicsQuality === 'high' ? 80 : 30}
        />
      )}
      {(graphicsQuality === 'high' || graphicsQuality === 'ultra') && <GrainFlow />}
      {(graphicsQuality === 'high' || graphicsQuality === 'ultra') && <MachineSteamVents />}

      {/* Holographic Displays - only high/ultra (has multiple useFrame callbacks) */}
      {(graphicsQuality === 'high' || graphicsQuality === 'ultra') && <HolographicDisplays />}

      {/* Ambient Details - micro polish elements, only high/ultra (many animated lights cause flickering) */}
      {graphicsQuality === 'ultra' && <AmbientDetailsGroup />}
    </group>
  );
};
