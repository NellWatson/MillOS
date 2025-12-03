import React, { useMemo } from 'react';
import { Machines } from './Machines';
import { ConveyorSystem } from './ConveyorSystem';
import { WorkerSystem } from './WorkerSystem';
import { FactoryInfrastructure } from './FactoryInfrastructure';
import { SpoutingSystem } from './SpoutingSystem';
import { DustParticles, GrainFlow } from './DustParticles';
import { TruckBay } from './TruckBay';
import { ForkliftSystem } from './ForkliftSystem';
import { FactoryEnvironment } from './Environment';
import { HolographicDisplays } from './HolographicDisplays';
import { MachineData, MachineType, WorkerData } from '../types';

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

  return (
    <group>
      {/* Environment & Lighting */}
      <FactoryEnvironment />

      {/* Main Systems */}
      <Machines machines={machines} onSelect={onSelectMachine} />
      <SpoutingSystem machines={machines} />
      <FactoryInfrastructure floorSize={FLOOR_SIZE} showZones={showZones} />

      {/* Dynamic Elements */}
      <ConveyorSystem productionSpeed={productionSpeed} />
      <WorkerSystem onSelectWorker={onSelectWorker} />
      <ForkliftSystem />
      <TruckBay productionSpeed={productionSpeed} />

      {/* Atmospheric Effects */}
      <DustParticles count={500} />
      <GrainFlow />

      {/* Holographic Displays */}
      <HolographicDisplays />
    </group>
  );
};
