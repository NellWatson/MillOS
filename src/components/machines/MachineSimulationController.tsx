import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { MachineData } from '../../types';
import { useProductionStore } from '../../stores/productionStore';
import { useWorkerMoodStore } from '../../stores/workerMoodStore';

/**
 * Isolated, deterministic metric simulation. Keeping this in a small module
 * lets the default renderer lazy-load the high-detail machine authoring code.
 */
export function MachineSimulationController() {
  const { storeMachines, batchUpdateMachineMetrics, updateMachineStatus, scadaLive } =
    useProductionStore(
      useShallow((state) => ({
        storeMachines: state.machines,
        batchUpdateMachineMetrics: state.batchUpdateMachineMetrics,
        updateMachineStatus: state.updateMachineStatus,
        scadaLive: state.scadaLive,
      }))
    );
  const lastUpdateRef = useRef(0);
  const frameCountRef = useRef(0);
  const productionSpeed = useProductionStore((state) => state.productionSpeed);
  const workforceProductivity = useWorkerMoodStore((state) =>
    state.getWorkforceProductivityMultiplier()
  );

  useFrame((state) => {
    if (scadaLive) return;
    frameCountRef.current += 1;
    if (frameCountRef.current % 30 !== 0) return;

    const now = state.clock.elapsedTime;
    if (now - lastUpdateRef.current < 2 || storeMachines.length === 0) return;
    lastUpdateRef.current = now;

    const metricUpdates: {
      machineId: string;
      metrics: Partial<MachineData['metrics']>;
    }[] = [];

    for (const machine of storeMachines) {
      const isRunning =
        productionSpeed > 0 && (machine.status === 'running' || machine.status === 'warning');
      const isIdle = machine.status === 'idle';
      const isCritical = machine.status === 'critical';
      const baseTemperature: Record<string, number> = {
        SILO: 20,
        ROLLER_MILL: 42,
        PLANSIFTER: 28,
        PACKER: 28,
        CONTROL_ROOM: 22,
      };
      const machineBaseTemperature = baseTemperature[machine.type] ?? 30;

      let targetLoad = machine.metrics.load;
      if (isRunning) {
        targetLoad = (50 + productionSpeed * 30) * workforceProductivity;
      } else if (isIdle) {
        targetLoad = 0;
      }
      const newLoad = THREE.MathUtils.clamp(
        machine.metrics.load + (targetLoad - machine.metrics.load) * 0.1,
        0,
        100
      );

      let targetTemperature = machineBaseTemperature;
      if (isRunning) targetTemperature += (newLoad / 100) * 20;
      else if (isIdle) targetTemperature = 20;
      else if (isCritical) targetTemperature += 40;
      const newTemperature = THREE.MathUtils.clamp(
        machine.metrics.temperature + (targetTemperature - machine.metrics.temperature) * 0.05,
        15,
        90
      );

      let targetVibration = 1;
      if (isRunning) {
        targetVibration = 1 + (machine.metrics.rpm / 1200) * 2 + newLoad / 100;
        if (machine.status === 'warning') targetVibration *= 1.5;
      } else if (isCritical) {
        targetVibration = 7;
      } else {
        targetVibration = 0.2;
      }
      const newVibration = THREE.MathUtils.clamp(
        machine.metrics.vibration + (targetVibration - machine.metrics.vibration) * 0.1,
        0,
        10
      );

      metricUpdates.push({
        machineId: machine.id,
        metrics: {
          temperature: Math.round(newTemperature * 10) / 10,
          vibration: Math.round(newVibration * 100) / 100,
          load: Math.round(newLoad * 10) / 10,
        },
      });

      if (machine.status === 'running' && (newTemperature > 70 || newVibration > 5)) {
        updateMachineStatus(machine.id, 'warning');
      } else if (machine.status === 'warning') {
        if (newTemperature > 80 || newVibration > 8) {
          updateMachineStatus(machine.id, 'critical');
        } else if (newTemperature < 55 && newVibration < 3.5) {
          updateMachineStatus(machine.id, 'running');
        }
      } else if (machine.status === 'critical' && newTemperature < 40 && newVibration < 2) {
        updateMachineStatus(machine.id, 'warning');
      }
    }

    if (metricUpdates.length > 0) batchUpdateMachineMetrics(metricUpdates);
  });

  return null;
}
