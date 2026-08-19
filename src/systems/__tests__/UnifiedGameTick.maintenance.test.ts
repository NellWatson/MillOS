import { beforeEach, describe, expect, it } from 'vitest';
import { MachineType, type MachineData } from '../../types';
import { useBreakdownStore } from '../../stores/breakdownStore';
import { useMaterialFlowStore } from '../../stores/materialFlowStore';
import { useProductionStore } from '../../stores/productionStore';
import { useUIStore } from '../../stores/uiStore';
import type { TickContext } from '../CentralTickSystem';
import { unifiedGameTick } from '../UnifiedGameTick';

const context: TickContext = {
  deltaSeconds: 0.5,
  gameTime: 0,
  gameSpeed: 1,
  elapsedTime: 0,
  tickCount: 1,
};

const failingPacker: MachineData = {
  id: 'packer-0',
  name: 'Packer Line 1',
  type: MachineType.PACKER,
  position: [0, 0, 0],
  size: [1, 1, 1],
  rotation: 0,
  status: 'running',
  metrics: {
    rpm: 450,
    temperature: 70,
    vibration: 2,
    load: 80,
    wear: 89,
    efficiency: 70,
  },
  lastMaintenance: '2026-08-01T00:00:00.000Z',
  nextMaintenance: '2026-08-08T00:00:00.000Z',
};

describe('UnifiedGameTick maintenance causality', () => {
  beforeEach(() => {
    useBreakdownStore.getState().resetBreakdownStore();
    useMaterialFlowStore.getState().resetMaterialFlow();
    useProductionStore.setState({ machines: [failingPacker], productionSpeed: 1 });
    useUIStore.setState({ alerts: [] });
  });

  it('locks out flow on failure and restores it only after verified restart', () => {
    unifiedGameTick(context);

    let maintenance = useBreakdownStore.getState();
    expect(useProductionStore.getState().machines[0].status).toBe('critical');
    expect(useMaterialFlowStore.getState().getMachineBuffer('packer-0')?.isProcessing).toBe(false);
    expect(maintenance.activeBreakdowns).toHaveLength(1);
    expect(maintenance.workOrders[0]).toMatchObject({
      id: 'wo-00001',
      machineId: 'packer-0',
      phase: 'diagnosed',
      cause: 'mechanical',
    });
    expect(useUIStore.getState().alerts.at(-1)?.message).toContain('wo-00001');

    const breakdownId = maintenance.activeBreakdowns[0].id;
    expect(useBreakdownStore.getState().startRepair(breakdownId).started).toBe(true);
    useBreakdownStore.getState().updateRepairProgress(breakdownId, 100);
    expect(useBreakdownStore.getState().verifyRepair(breakdownId)).toBe(true);
    expect(useBreakdownStore.getState().requestMachineRestart(breakdownId)).toBe(true);

    // Restart remains queued until the central simulation applies the machine
    // maintenance result and confirms the far-side production state.
    expect(useProductionStore.getState().machines[0].status).toBe('critical');
    unifiedGameTick({ ...context, tickCount: 2 });

    maintenance = useBreakdownStore.getState();
    expect(useProductionStore.getState().machines[0].status).not.toBe('critical');
    expect(useMaterialFlowStore.getState().getMachineBuffer('packer-0')?.isProcessing).toBe(true);
    expect(maintenance.activeBreakdowns).toHaveLength(0);
    expect(maintenance.breakdownHistory).toHaveLength(1);
    expect(maintenance.workOrders[0].phase).toBe('returned_to_service');
    expect(maintenance.workOrders[0].consumedParts).toEqual(['bearings', 'belts']);
  });
});
