import { beforeEach, describe, expect, it } from 'vitest';
import { useBreakdownStore } from '../../stores/breakdownStore';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useMaterialFlowStore } from '../../stores/materialFlowStore';
import { useOperationsCampaignStore } from '../../stores/operationsCampaignStore';
import { useQCLabStore } from '../../stores/qcLabStore';
import { useTruckScheduleStore } from '../../stores/truckScheduleStore';
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

describe('UnifiedGameTick operations campaign consequences', () => {
  beforeEach(() => {
    useOperationsCampaignStore.getState().resetCampaign();
    useTruckScheduleStore.getState().resetTruckSchedule();
    useMaterialFlowStore.getState().resetMaterialFlow();
    useBreakdownStore.getState().resetBreakdownStore();
    useQCLabStore.getState().resetQCLab();
    useGameSimulationStore.getState().setWeather('clear');
    useUIStore.setState({ alerts: [] });

    // Synchronize the module-level dock edge detectors before each assertion.
    unifiedGameTick(context);
  });

  it('applies a delayed collection to the truck schedule exactly once', () => {
    const incident = useOperationsCampaignStore.getState().triggerIncident('delayed_truck')!;
    expect(useTruckScheduleStore.getState().truckSchedule.shipping.nextArrivalMinutes).toBe(20);

    unifiedGameTick({ ...context, tickCount: 2 });

    expect(useTruckScheduleStore.getState().truckSchedule.shipping.nextArrivalMinutes).toBe(65);
    expect(
      useOperationsCampaignStore.getState().incidents.find((item) => item.id === incident.id)
        ?.effectApplied
    ).toBe(true);

    unifiedGameTick({ ...context, tickCount: 3 });
    expect(useTruckScheduleStore.getState().truckSchedule.shipping.nextArrivalMinutes).toBe(65);
  });

  it('couples severe rain into the shared weather simulation', () => {
    useOperationsCampaignStore.getState().triggerIncident('severe_rain');

    unifiedGameTick({ ...context, tickCount: 2 });

    expect(useGameSimulationStore.getState().weather).toBe('storm');
    expect(useUIStore.getState().alerts.at(-1)).toMatchObject({
      type: 'warning',
      title: 'Severe rain and drainage loading',
    });
  });

  it('turns a supplier notification into a real quality hold', () => {
    useOperationsCampaignStore.getState().triggerIncident('supplier_contamination');

    unifiedGameTick({ ...context, tickCount: 2 });

    expect(useQCLabStore.getState().qcLab.contaminationAlerts).toHaveLength(1);
    expect(useQCLabStore.getState().qcLab.contaminationAlerts[0]).toMatchObject({
      type: 'supplier_notification',
      resolved: false,
      resolution: null,
    });
    expect(useOperationsCampaignStore.getState().getIncidentEffect().dispatchBlocked).toBe(true);
  });

  it('applies control-link degradation through the same production multiplier path', () => {
    useOperationsCampaignStore.getState().triggerIncident('control_network_degraded');

    unifiedGameTick({ ...context, tickCount: 2 });

    expect(useOperationsCampaignStore.getState().getProductionMultiplier()).toBeLessThan(1);
    expect(useUIStore.getState().alerts.at(-1)?.title).toBe('Control network degraded');
  });
});
