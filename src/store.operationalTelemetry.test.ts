import { beforeEach, describe, expect, it } from 'vitest';
import { OPERATION_TAG_IDS } from './scada/tagDatabase';
import { buildOperationalTelemetry } from './store';
import { useBreakdownStore } from './stores/breakdownStore';
import { useMaterialFlowStore } from './stores/materialFlowStore';
import { useQCLabStore } from './stores/qcLabStore';

describe('buildOperationalTelemetry', () => {
  beforeEach(() => {
    useMaterialFlowStore.getState().resetMaterialFlow();
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
});
