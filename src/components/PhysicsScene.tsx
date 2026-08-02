import React from 'react';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MillScene } from './MillScene';
import { PhysicsFirstPersonController } from './physics/PhysicsFirstPersonController';
import { FactoryColliders } from './physics/FactoryColliders';
import { ExitZoneSensors } from './physics/ExitZoneSensors';
import { PhysicsDebug } from './physics/PhysicsDebug';
import { MobileFirstPersonController } from './mobile/MobileFirstPersonController';
import type { MachineData, WorkerData } from '../types';
import type { ForkliftData } from './ForkliftSystem';

interface PhysicsSceneProps {
  fpsMode: boolean;
  isMobile: boolean;
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  productionSpeed: number;
  showZones: boolean;
  onLockChange: (locked: boolean) => void;
  onSelectMachine: (machine: MachineData) => void;
  onSelectWorker: (worker: WorkerData) => void;
  onSelectForklift: (forklift: ForkliftData) => void;
}

export const PhysicsScene: React.FC<PhysicsSceneProps> = ({
  fpsMode,
  isMobile,
  orbitControlsRef,
  productionSpeed,
  showZones,
  onLockChange,
  onSelectMachine,
  onSelectWorker,
  onSelectForklift,
}) => (
  <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
    <FactoryColliders />
    <ExitZoneSensors />
    <PhysicsDebug />

    {fpsMode ? (
      isMobile ? (
        <MobileFirstPersonController />
      ) : (
        <PhysicsFirstPersonController onLockChange={onLockChange} />
      )
    ) : (
      <OrbitControls
        ref={orbitControlsRef}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.2}
        minDistance={15}
        maxDistance={100}
        autoRotate
        autoRotateSpeed={0}
        target={[0, 5, 0]}
        enableDamping
        dampingFactor={0.05}
        enableRotate={!isMobile}
        makeDefault
      />
    )}

    <MillScene
      productionSpeed={productionSpeed}
      showZones={showZones}
      onSelectMachine={onSelectMachine}
      onSelectWorker={onSelectWorker}
      onSelectForklift={onSelectForklift}
    />
  </Physics>
);

export default PhysicsScene;
