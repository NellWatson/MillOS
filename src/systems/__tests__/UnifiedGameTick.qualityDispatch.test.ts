import { beforeEach, describe, expect, it } from 'vitest';
import { unifiedGameTick } from '../UnifiedGameTick';
import type { TickContext } from '../CentralTickSystem';
import { useMaterialFlowStore } from '../../stores/materialFlowStore';
import { useQCLabStore } from '../../stores/qcLabStore';
import { useTruckScheduleStore } from '../../stores/truckScheduleStore';
import { useUIStore } from '../../stores/uiStore';
import { useOperationsCampaignStore } from '../../stores/operationsCampaignStore';

const tickContext: TickContext = {
  deltaSeconds: 0.1,
  gameTime: 0,
  gameSpeed: 1,
  elapsedTime: 0,
  tickCount: 0,
};

describe('UnifiedGameTick shipping quality interlock', () => {
  beforeEach(() => {
    useMaterialFlowStore.getState().resetMaterialFlow();
    useOperationsCampaignStore.getState().resetCampaign();
    useTruckScheduleStore.getState().resetTruckSchedule();
    useQCLabStore.setState((state) => ({
      qcLab: {
        ...state.qcLab,
        isRunning: false,
        currentTest: null,
        testHistory: [],
        certificationStatus: 'valid',
        contaminationAlerts: [],
      },
    }));
    useUIStore.setState({ alerts: [] });

    // Synchronize the module-level dock edge detector to an undocked state.
    unifiedGameTick(tickContext);

    // Build genuine packed output so batch identity and source genealogy are
    // present. Untracked aggregate flour is intentionally not dispatchable.
    useMaterialFlowStore.getState().tickMaterialFlow(1, 1);
  });

  it('holds a docked shipping truck when certification has expired', () => {
    useQCLabStore.setState((state) => ({
      qcLab: { ...state.qcLab, certificationStatus: 'expired' },
    }));
    useTruckScheduleStore.getState().setTruckDocked('shipping', true);

    unifiedGameTick(tickContext);

    expect(useMaterialFlowStore.getState().shippedKg).toBe(0);
    expect(useUIStore.getState().alerts[0]).toMatchObject({
      type: 'warning',
      title: 'Dispatch Quality Hold',
    });
  });

  it('loads released goods while docked and dispatches them on departure', () => {
    useTruckScheduleStore.getState().setTruckDocked('shipping', true);

    for (let index = 0; index < 20; index += 1) {
      unifiedGameTick({ ...tickContext, deltaSeconds: 0.5, tickCount: index + 1 });
    }

    expect(useMaterialFlowStore.getState().shippedKg).toBe(0);
    expect(useOperationsCampaignStore.getState().execution.dispatchLoad.loadedKg).toBeGreaterThan(
      0
    );

    useTruckScheduleStore.getState().setTruckDocked('shipping', false);
    unifiedGameTick({ ...tickContext, tickCount: 30 });

    expect(useMaterialFlowStore.getState().shippedKg).toBeGreaterThan(0);
    expect(useMaterialFlowStore.getState().manifests.at(-1)).toMatchObject({
      kind: 'shipping',
      dock: 'shipping',
    });
  });
});
