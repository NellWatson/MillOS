import { beforeEach, describe, expect, it } from 'vitest';
import { MILL_TAGS, OPERATION_TAG_IDS, UTILITY_ASSET_TAG_IDS } from './scada/tagDatabase';
import { buildOperationalTelemetry } from './store';
import { useBreakdownStore } from './stores/breakdownStore';
import { useMaterialFlowStore } from './stores/materialFlowStore';
import { useOperationsCampaignStore } from './stores/operationsCampaignStore';
import { useQCLabStore } from './stores/qcLabStore';

describe('buildOperationalTelemetry', () => {
  beforeEach(() => {
    useMaterialFlowStore.getState().resetMaterialFlow();
    useBreakdownStore.getState().resetBreakdownStore();
    useQCLabStore.getState().resetQCLab();
    useOperationsCampaignStore.getState().resetCampaign();
  });

  it('projects the conserved flow ledger and maintenance stock into SCADA units', () => {
    const flow = useMaterialFlowStore.getState();
    const parts = useBreakdownStore.getState().partsInventory;
    const initial = buildOperationalTelemetry(flow, parts, useQCLabStore.getState().qcLab);

    expect(initial[OPERATION_TAG_IDS.rawInventory]).toBe(100);
    expect(initial[OPERATION_TAG_IDS.partsStock]).toBe(
      Object.values(parts).reduce((sum, count) => sum + count, 0)
    );
    expect(Math.abs(initial[OPERATION_TAG_IDS.materialBalanceError])).toBeLessThan(0.001);
    expect(initial[OPERATION_TAG_IDS.shippingReleased]).toBe(1);
    expect(initial[OPERATION_TAG_IDS.activeQualityHolds]).toBe(0);
    expect(initial[OPERATION_TAG_IDS.openWorkOrders]).toBe(0);

    flow.receiveGrainDelivery(1000);
    flow.tickMaterialFlow(1, 1);
    flow.shipFinishedGoods(50);
    const changed = buildOperationalTelemetry(
      useMaterialFlowStore.getState(),
      parts,
      useQCLabStore.getState().qcLab
    );

    expect(changed[OPERATION_TAG_IDS.lastReceiving]).toBe(1);
    expect(changed[OPERATION_TAG_IDS.lastShipping]).toBeCloseTo(0.05, 5);
    expect(changed[OPERATION_TAG_IDS.packerFlow]).toBeGreaterThan(0);
    expect(Math.abs(changed[OPERATION_TAG_IDS.materialBalanceError])).toBeLessThan(0.001);
  });

  it('publishes quality disposition, recall, work-order, and downtime provenance', () => {
    useMaterialFlowStore.getState().tickMaterialFlow(1, 1);
    const batches = useMaterialFlowStore.getState().productionBatches;
    useQCLabStore.getState().triggerContaminationAlert({ batchIds: [batches[0].id] });
    const recalledAlert = useQCLabStore
      .getState()
      .triggerContaminationAlert({ batchIds: [batches[1].id] });
    useQCLabStore.getState().resolveContaminationAlert(recalledAlert, 'recalled');
    useBreakdownStore.getState().triggerBreakdown('packer-0', 'Packer Line 1', 'mechanical');
    useBreakdownStore.getState().tickDowntime(37);

    const telemetry = buildOperationalTelemetry(
      useMaterialFlowStore.getState(),
      useBreakdownStore.getState().partsInventory,
      useQCLabStore.getState().qcLab,
      useBreakdownStore.getState().workOrders
    );
    expect(telemetry[OPERATION_TAG_IDS.activeQualityHolds]).toBe(1);
    expect(telemetry[OPERATION_TAG_IDS.recalledBatches]).toBe(1);
    expect(telemetry[OPERATION_TAG_IDS.openWorkOrders]).toBe(1);
    expect(telemetry[OPERATION_TAG_IDS.maintenanceDowntime]).toBe(37);
    expect(telemetry[OPERATION_TAG_IDS.shippingReleased]).toBe(0);
  });

  it('publishes every visible utility vessel through its SCADA instruments', () => {
    const utilityAssets = useOperationsCampaignStore.getState().utilityAssets;
    const telemetry = buildOperationalTelemetry(
      useMaterialFlowStore.getState(),
      useBreakdownStore.getState().partsInventory,
      useQCLabStore.getState().qcLab,
      [],
      utilityAssets
    );
    const registeredIds = new Set(MILL_TAGS.map((tag) => tag.id));

    expect(utilityAssets).toHaveLength(5);
    utilityAssets.forEach((asset) => {
      const tagIds = UTILITY_ASSET_TAG_IDS[asset.id];
      expect(tagIds).toBeDefined();
      expect(registeredIds.has(tagIds.level)).toBe(true);
      expect(registeredIds.has(tagIds.temperature)).toBe(true);
      expect(registeredIds.has(tagIds.pressure)).toBe(true);
      expect(telemetry[tagIds.level]).toBe(asset.levelPercent);
      expect(telemetry[tagIds.temperature]).toBe(asset.temperatureC);
      expect(telemetry[tagIds.pressure]).toBe(asset.pressureBar);
    });
  });
});
