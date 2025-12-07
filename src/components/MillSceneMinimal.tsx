/**
 * MINIMAL MILL SCENE - Performance Testing
 *
 * This is a stripped-down version of MillScene for A/B testing performance.
 * Start with this minimal version, then add components back one by one
 * to identify the performance culprit.
 *
 * Usage: In App.tsx, temporarily replace <MillScene /> with <MillSceneMinimal />
 */

import React from 'react';
import { Environment } from '@react-three/drei';
import { FactoryInfrastructure } from './FactoryInfrastructure';
import { MachineData, WorkerData } from '../types';
import { ForkliftData } from './ForkliftSystem';
import { useGraphicsStore } from '../stores/graphicsStore';
import { trackRender } from '../utils/renderProfiler';

// Import static assets so Vite handles base path correctly
import warehouseHdrUrl from '/hdri/warehouse.hdr?url';

interface MillSceneMinimalProps {
  productionSpeed: number;
  showZones: boolean;
  onSelectMachine: (data: MachineData) => void;
  onSelectWorker: (data: WorkerData) => void;
  onSelectForklift?: (data: ForkliftData) => void;
}

const FLOOR_SIZE_X = 120;
const FLOOR_SIZE_Z = 160;
const FLOOR_SIZE = 120;

/**
 * TESTING CHECKLIST - Uncomment one at a time to find the culprit:
 *
 * 1. Start with just floor + lighting (this file as-is)
 * 2. Uncomment Machines
 * 3. Uncomment ConveyorSystem
 * 4. Uncomment WorkerSystem
 * 5. Uncomment ForkliftSystem
 * 6. Uncomment TruckBay
 * 7. Uncomment Environment effects
 *
 * After each step, check FPS in console with: renderReport()
 */

export const MillSceneMinimal: React.FC<MillSceneMinimalProps> = ({
  productionSpeed: _productionSpeed,
  showZones,
  onSelectForklift: _onSelectForklift,
  onSelectMachine: _onSelectMachine,
  onSelectWorker: _onSelectWorker,
}) => {
  trackRender('MillSceneMinimal');

  const graphicsQuality = useGraphicsStore((state) => state.graphics.quality);
  const isLowGraphics = graphicsQuality === 'low';

  return (
    <group>
      {/* STEP 1: Basic lighting - should be 60fps */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 50, 25]} intensity={1} />

      {/* STEP 1: HDRI (skip on low) */}
      {!isLowGraphics && (
        <Environment files={warehouseHdrUrl} background={false} environmentIntensity={0.4} />
      )}

      {/* STEP 1: Floor only */}
      <FactoryInfrastructure
        floorSize={FLOOR_SIZE}
        floorWidth={FLOOR_SIZE_X}
        floorDepth={FLOOR_SIZE_Z}
        showZones={showZones}
      />

      {/* STEP 2: Uncomment to test Machines (9 useFrame hooks)
      <Machines machines={[]} onSelect={onSelectMachine} />
      */}

      {/* STEP 3: Uncomment to test ConveyorSystem
      <ConveyorSystem productionSpeed={productionSpeed} />
      */}

      {/* STEP 4: Uncomment to test WorkerSystem
      <WorkerSystem onSelectWorker={onSelectWorker} />
      */}

      {/* STEP 5: Uncomment to test ForkliftSystem
      <ForkliftSystem showSpeedZones={showZones} onSelectForklift={onSelectForklift} />
      */}

      {/* STEP 6: Uncomment to test FactoryEnvironment (18+ useFrame hooks)
      <FactoryEnvironment />
      */}

      {/* STEP 7: Uncomment to test TruckBay (28+ useFrame hooks) - medium+ only
      {graphicsQuality !== 'low' && <TruckBay productionSpeed={productionSpeed} />}
      */}
    </group>
  );
};

export default MillSceneMinimal;
