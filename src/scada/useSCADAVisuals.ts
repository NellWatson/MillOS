/**
 * React Hook for SCADA Visual Properties
 *
 * Provides real-time visual properties for 3D machine components
 * based on SCADA tag values and alarms.
 */

import { useMemo, useCallback } from 'react';
import { useSCADA } from './useSCADA';
import {
  MachineVisualProperties,
  calculateMachineVisuals,
  scadaToStoreMetrics,
  SCADAToStoreSync,
  getAlarmVisualConfig,
  AlarmVisualConfig,
} from './SCADABridge';
import { Alarm, AlarmPriority } from './types';

/**
 * Hook to get visual properties for a single machine
 */
export function useSCADAMachineVisuals(
  machineId: string,
  machineStatus: 'running' | 'idle' | 'warning' | 'critical' = 'running'
): MachineVisualProperties {
  const { values, alarms } = useSCADA();

  return useMemo(
    () => calculateMachineVisuals(machineId, values, alarms, machineStatus),
    [machineId, values, alarms, machineStatus]
  );
}

/**
 * Hook to get visual properties for all machines
 */
export function useSCADAAllMachineVisuals(
  machines: Array<{ id: string; status: 'running' | 'idle' | 'warning' | 'critical' }>
): Map<string, MachineVisualProperties> {
  const { values, alarms } = useSCADA();

  return useMemo(() => {
    const result = new Map<string, MachineVisualProperties>();

    for (const machine of machines) {
      const visuals = calculateMachineVisuals(machine.id, values, alarms, machine.status);
      result.set(machine.id, visuals);
    }

    return result;
  }, [machines, values, alarms]);
}

/**
 * Hook to get store-compatible metrics from SCADA values
 * Returns a callback that can sync SCADA values to the store
 */
export function useSCADASync(): {
  getSyncData: (machineId: string) => SCADAToStoreSync | null;
  getAllSyncData: (machineIds: string[]) => SCADAToStoreSync[];
} {
  const { values, alarms } = useSCADA();

  const getSyncData = useCallback(
    (machineId: string) => scadaToStoreMetrics(machineId, values, alarms),
    [values, alarms]
  );

  const getAllSyncData = useCallback(
    (machineIds: string[]) =>
      machineIds
        .map((id) => scadaToStoreMetrics(id, values, alarms))
        .filter((sync): sync is SCADAToStoreSync => sync !== null),
    [values, alarms]
  );

  return { getSyncData, getAllSyncData };
}

/**
 * Hook to get alarm visual configurations for a machine
 */
export function useSCADAAlarmVisuals(machineId: string): {
  alarms: Array<Alarm & { visualConfig: AlarmVisualConfig }>;
  highestPriority: AlarmPriority | null;
  hasUnacknowledged: boolean;
} {
  const { alarms } = useSCADA();

  return useMemo(() => {
    const machineAlarms = alarms.filter((a) => a.machineId === machineId);

    const alarmsWithConfig = machineAlarms.map((alarm) => ({
      ...alarm,
      visualConfig: getAlarmVisualConfig(alarm.priority, alarm.state),
    }));

    // Find highest priority
    const priorities: AlarmPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    let highestPriority: AlarmPriority | null = null;
    for (const priority of priorities) {
      if (machineAlarms.some((a) => a.priority === priority)) {
        highestPriority = priority;
        break;
      }
    }

    const hasUnacknowledged = machineAlarms.some(
      (a) => a.state === 'UNACK' || a.state === 'RTN_UNACK'
    );

    return {
      alarms: alarmsWithConfig,
      highestPriority,
      hasUnacknowledged,
    };
  }, [alarms, machineId]);
}

/**
 * Hook to get temperature color for a value
 * Useful for standalone temperature displays
 */
export function useSCADATemperatureColor(tagId: string): {
  color: string;
  value: number | null;
  glow: number;
} {
  const { getValue } = useSCADA();

  return useMemo(() => {
    const tagValue = getValue(tagId);
    if (!tagValue || tagValue.quality !== 'GOOD' || typeof tagValue.value !== 'number') {
      return { color: '#64748b', value: null, glow: 0 };
    }

    const temp = tagValue.value;

    // Temperature gradient
    let color: string;
    let glow = 0;

    if (temp <= 30) {
      color = '#3b82f6'; // Blue - cold
    } else if (temp <= 50) {
      color = '#22c55e'; // Green - normal
    } else if (temp <= 65) {
      color = '#eab308'; // Yellow - warm
      glow = (temp - 50) / 30;
    } else {
      color = '#ef4444'; // Red - hot
      glow = Math.min(1, (temp - 50) / 30);
    }

    return { color, value: temp, glow };
  }, [getValue, tagId]);
}

/**
 * Hook to determine if any machine has critical alarms
 */
export function useSCADACriticalStatus(): {
  hasCritical: boolean;
  criticalMachines: string[];
  criticalAlarms: Alarm[];
} {
  const { alarms } = useSCADA();

  return useMemo(() => {
    const criticalAlarms = alarms.filter(
      (a) => a.priority === 'CRITICAL' && (a.state === 'UNACK' || a.state === 'ACKED')
    );

    const criticalMachines = [
      ...new Set(criticalAlarms.map((a) => a.machineId).filter((id): id is string => !!id)),
    ];

    return {
      hasCritical: criticalAlarms.length > 0,
      criticalMachines,
      criticalAlarms,
    };
  }, [alarms]);
}
