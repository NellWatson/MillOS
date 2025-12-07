import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Machines } from './Machines';
import { ConveyorSystem } from './ConveyorSystem';
import { WorkerSystem } from './WorkerSystem';
import { FactoryInfrastructure } from './FactoryInfrastructure';
import { SpoutingSystem } from './SpoutingSystem';
import { DustParticles, GrainFlow, AtmosphericHaze, MachineSteamVents } from './DustParticles';
import { TruckBay } from './TruckBay';
import { ForkliftSystem } from './ForkliftSystem';
import { FactoryEnvironment } from './Environment';
import { HolographicDisplays } from './HolographicDisplays';
import { AmbientDetailsGroup } from './AmbientDetails';
import { MachineData, MachineType, WorkerData } from '../types';
import { useMillStore } from '../store';

// Single heat map point with ref-based animation (no setState in useFrame)
const HeatMapPoint: React.FC<{
  point: { x: number; z: number; intensity: number; type: string };
}> = ({ point }) => {
  const circleMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const columnMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const intensity = point.intensity / 10;
  const radius = 1 + intensity * 2;
  const color = point.type === 'emergency' ? '#ef4444' :
                point.type === 'near_miss' ? '#f97316' :
                point.type === 'stop' ? '#eab308' : '#3b82f6';

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
    if (circleMaterialRef.current) circleMaterialRef.current.opacity = 0.3 * pulse * intensity;
    if (ringMaterialRef.current) ringMaterialRef.current.opacity = 0.6 * pulse;
    if (columnMaterialRef.current) columnMaterialRef.current.opacity = 0.2 * pulse;
  });

  return (
    <group position={[point.x, 0.1, point.z]}>
      {/* Heat circle on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial ref={circleMaterialRef} color={color} transparent opacity={0.3 * intensity} />
      </mesh>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.1, radius, 32]} />
        <meshBasicMaterial ref={ringMaterialRef} color={color} transparent opacity={0.6} />
      </mesh>
      {/* Rising column for high-intensity spots */}
      {intensity > 0.5 && (
        <mesh position={[0, intensity * 2, 0]}>
          <cylinderGeometry args={[0.3, 0.5, intensity * 4, 16]} />
          <meshBasicMaterial ref={columnMaterialRef} color={color} transparent opacity={0.2} />
        </mesh>
      )}
      {/* Intensity label for significant hotspots */}
      {point.intensity >= 3 && (
        <Text
          position={[0, 0.5, 0]}
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
};

// Incident Heat Map 3D Visualization
const IncidentHeatMap: React.FC = () => {
  const incidentHeatMap = useMillStore(state => state.incidentHeatMap);
  const showIncidentHeatMap = useMillStore(state => state.showIncidentHeatMap);

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
}

const FLOOR_SIZE = 80;

export const MillScene: React.FC<MillSceneProps> = ({
  productionSpeed,
  showZones,
  onSelectMachine,
  onSelectWorker
}) => {
  const setMachines = useMillStore(state => state.setMachines);
  const storeMachines = useMillStore(state => state.machines);
  const updateMachineMetrics = useMillStore(state => state.updateMachineMetrics);
  const updateMachineStatus = useMillStore(state => state.updateMachineStatus);
  const lastUpdateRef = useRef(0);

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
        metrics: { rpm: 0, temperature: 22 + Math.random() * 3, vibration: 0.1, load: 75 + Math.random() * 20 },
        lastMaintenance: '2024-01-15',
        nextMaintenance: '2024-04-15'
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
        status: Math.random() > 0.1 ? 'running' : 'warning',
        metrics: { rpm: 1400 + Math.random() * 100, temperature: 55 + Math.random() * 15, vibration: 2 + Math.random(), load: 80 + Math.random() * 15 },
        lastMaintenance: '2024-02-01',
        nextMaintenance: '2024-05-01'
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
        metrics: { rpm: 200 + Math.random() * 20, temperature: 35 + Math.random() * 5, vibration: 5 + Math.random() * 2, load: 90 + Math.random() * 8 },
        lastMaintenance: '2024-01-20',
        nextMaintenance: '2024-04-20'
      });
    }

    // ZONE 4: Packaging (Packers)
    const packerNames = ['Pack Line 1', 'Pack Line 2', 'Pack Line 3'];
    for (let i = -1; i <= 1; i++) {
      _machines.push({
        id: `packer-${i}`,
        name: packerNames[i + 1],
        type: MachineType.PACKER,
        position: [i * 8, 0, 20],
        size: [4, 6, 4],
        rotation: Math.PI,
        status: 'running',
        metrics: { rpm: 60, temperature: 28 + Math.random() * 5, vibration: 1 + Math.random(), load: 85 + Math.random() * 10 },
        lastMaintenance: '2024-02-10',
        nextMaintenance: '2024-05-10'
      });
    }

    return _machines;
  }, []);

  // Sync machines with store on mount
  useEffect(() => {
    if (machines.length > 0 && storeMachines.length === 0) {
      setMachines(machines);
    }
  }, [machines, storeMachines.length, setMachines]);

  // Simulate realistic machine metric changes over time
  useFrame((state) => {
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
      load: newLoad
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
  const graphicsQuality = useMillStore(state => state.graphics.quality);
  const isLowGraphics = graphicsQuality === 'low';

  return (
    <group>
      {/* HDRI Environment for realistic reflections - disable on low */}
      {!isLowGraphics && (
        <Environment preset="warehouse" background={false} environmentIntensity={0.4} />
      )}

      {/* Environment & Lighting */}
      <FactoryEnvironment />

      {/* Main Systems */}
      <Machines machines={displayMachines} onSelect={onSelectMachine} />
      {!isLowGraphics && <SpoutingSystem machines={displayMachines} />}
      <FactoryInfrastructure floorSize={FLOOR_SIZE} showZones={showZones} />

      {/* MASSIVE exterior floor to cover all orange/tan areas outside factory */}
      <mesh position={[-60, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 200]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      {/* Same on the other side of the factory */}
      <mesh position={[60, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 200]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Dynamic Elements */}
      <ConveyorSystem productionSpeed={productionSpeed} />
      <WorkerSystem onSelectWorker={onSelectWorker} />
      <ForkliftSystem showSpeedZones={showZones} />
      {!isLowGraphics && <TruckBay productionSpeed={productionSpeed} />}

      {/* Incident Heat Map Visualization */}
      <IncidentHeatMap />

      {/* Atmospheric Effects - controlled by graphics settings */}
      <DustParticles count={500} />
      <GrainFlow />
      {/* AtmosphericHaze disabled - causes flickering issues */}
      <MachineSteamVents />

      {/* Holographic Displays - disable on low */}
      {!isLowGraphics && <HolographicDisplays />}

      {/* Ambient Details - micro polish elements, only high/ultra (many animated lights cause flickering) */}
      {(graphicsQuality === 'high' || graphicsQuality === 'ultra') && <AmbientDetailsGroup />}
    </group>
  );
};
