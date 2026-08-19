import { beforeEach, describe, expect, it } from 'vitest';
import type { MaterialManifest, ProductionBatch } from './materialFlowStore';
import { useOperationsCampaignStore, type CampaignTickContext } from './operationsCampaignStore';

const flourBatch: ProductionBatch = {
  id: 'batch-0001',
  packerId: 'packer-0',
  materialType: 'flour',
  producedKg: 5000,
  availableKg: 0,
  simulationTime: 10,
  sourceContributions: [{ lotId: 'lot-0001', amount: 5000, path: ['silo-0', 'packer-0'] }],
  disposition: 'shipped',
  dispositionReason: 'Fully dispatched',
  qcTestIds: ['qc-1'],
  dispatchManifestIds: ['shipping-0001'],
  sealed: true,
};

const shippingManifest: MaterialManifest = {
  id: 'shipping-0001',
  kind: 'shipping',
  dock: 'shipping',
  requestedKg: 5000,
  actualKg: 5000,
  materials: [{ type: 'flour', amount: 5000 }],
  sourceLots: [{ lotId: 'lot-0001', amount: 5000, path: ['silo-0', 'packer-0'] }],
  productBatches: [{ batchId: 'batch-0001', amount: 5000 }],
  simulationTime: 20,
};

function context(overrides: Partial<CampaignTickContext> = {}): CampaignTickContext {
  return {
    shiftKey: 'day-1-morning',
    shiftLabel: 'Morning',
    manifests: [],
    productionBatches: [],
    totalEnergyKw: 450,
    averageQuality: 99,
    wasteKg: 0,
    storageUtilization: 0.5,
    shippingDocked: false,
    receivingDocked: false,
    dispatchReleased: true,
    sourceInventoryKg: 50000,
    finishedAvailableKg: 0,
    releasedFinishedKg: 0,
    dispatchLoad: {
      cycleId: 'shipping-0',
      status: 'away',
      loadedKg: 0,
      capacityKg: 5000,
      materialType: 'flour',
      blockReason: null,
      lastDispatchKg: 0,
    },
    openWorkOrders: 0,
    ...overrides,
  };
}

describe('autonomous operations programme', () => {
  beforeEach(() => useOperationsCampaignStore.getState().resetCampaign());

  it('initializes from equipment and inventory state without a roster', () => {
    useOperationsCampaignStore.getState().initializeCampaign();
    const state = useOperationsCampaignStore.getState();
    expect(state.initialized).toBe(true);
    expect(state.logbook.at(-1)).toMatchObject({ source: 'Autonomous execution' });
  });

  it('turns the selected recipe into the active physical production plan', () => {
    useOperationsCampaignStore.getState().activateOrder('order-002');
    expect(useOperationsCampaignStore.getState().getActiveProductionPlan()).toMatchObject({
      orderId: 'order-002',
      sourceMaterial: 'corn_grain',
      finishedMaterial: 'semolina',
    });
  });

  it('publishes process, quality, and truck loading as one execution state', () => {
    useOperationsCampaignStore.getState().tickCampaign(
      60,
      context({
        sourceInventoryKg: 42000,
        finishedAvailableKg: 1600,
        releasedFinishedKg: 1200,
        dispatchLoad: {
          cycleId: 'shipping-1',
          status: 'loading',
          loadedKg: 800,
          capacityKg: 5000,
          materialType: 'flour',
          blockReason: null,
          lastDispatchKg: 0,
        },
      })
    );
    expect(useOperationsCampaignStore.getState().execution).toMatchObject({
      orderId: 'order-001',
      sourceMaterial: 'wheat_grain',
      finishedMaterial: 'flour',
      stage: 'loading',
      sourceInventoryKg: 42000,
      releasedFinishedKg: 1200,
      dispatchLoad: { loadedKg: 800 },
    });
  });

  it('raises a critical recipe constraint when feedstock is exhausted', () => {
    useOperationsCampaignStore.getState().activateOrder('order-002');
    useOperationsCampaignStore.getState().tickCampaign(60, context({ sourceInventoryKg: 0 }));
    expect(useOperationsCampaignStore.getState().constraints).toContainEqual(
      expect.objectContaining({
        id: 'recipe-feed-order-002',
        severity: 'critical',
        relatedId: 'order-002',
      })
    );
  });

  it('keeps every visible utility vessel reading finite and bounded', () => {
    useOperationsCampaignStore.getState().tickCampaign(300, context());
    const assets = useOperationsCampaignStore.getState().utilityAssets;
    expect(assets).toHaveLength(5);
    for (const asset of assets) {
      expect(Number.isFinite(asset.levelPercent)).toBe(true);
      expect(Number.isFinite(asset.temperatureC)).toBe(true);
      expect(Number.isFinite(asset.pressureBar)).toBe(true);
      expect(asset.levelPercent).toBeGreaterThanOrEqual(0);
      expect(asset.levelPercent).toBeLessThanOrEqual(100);
    }
  });

  it('allocates each shipping manifest exactly once', () => {
    const store = useOperationsCampaignStore.getState();
    store.tickCampaign(
      60,
      context({ manifests: [shippingManifest], productionBatches: [flourBatch] })
    );
    store.tickCampaign(
      60,
      context({ manifests: [shippingManifest], productionBatches: [flourBatch] })
    );
    const order = useOperationsCampaignStore
      .getState()
      .orders.find((candidate) => candidate.id === 'order-001')!;
    expect(order.shippedKg).toBe(5000);
    expect(order.manifestIds).toEqual(['shipping-0001']);
    expect(useOperationsCampaignStore.getState().economics.revenue).toBeCloseTo(4100, 5);
  });

  it('applies, mitigates, and resolves incident effects explicitly', () => {
    const store = useOperationsCampaignStore.getState();
    const incident = store.triggerIncident('supplier_contamination')!;
    expect(store.getIncidentEffect().dispatchBlocked).toBe(true);
    store.mitigateIncident(incident.id);
    expect(useOperationsCampaignStore.getState().getIncidentEffect().dispatchBlocked).toBe(false);
    store.resolveIncident(incident.id);
    expect(useOperationsCampaignStore.getState().getIncidentEffect().productionMultiplier).toBe(1);
  });

  it('slows yard vehicles during severe rain and restores them through mitigation', () => {
    const store = useOperationsCampaignStore.getState();
    const incident = store.triggerIncident('severe_rain')!;
    expect(store.getIncidentEffect().vehicleSpeedMultiplier).toBeCloseTo(0.55);
    store.mitigateIncident(incident.id);
    expect(
      useOperationsCampaignStore.getState().getIncidentEffect().vehicleSpeedMultiplier
    ).toBeCloseTo(0.775);
    store.resolveIncident(incident.id);
    expect(useOperationsCampaignStore.getState().getIncidentEffect().vehicleSpeedMultiplier).toBe(
      1
    );
  });

  it('closes a causal report when the simulation crosses a production period boundary', () => {
    const store = useOperationsCampaignStore.getState();
    store.tickCampaign(
      60,
      context({ manifests: [shippingManifest], productionBatches: [flourBatch] })
    );
    useOperationsCampaignStore
      .getState()
      .tickCampaign(60, context({ shiftKey: 'day-1-afternoon', shiftLabel: 'Afternoon' }));
    const report = useOperationsCampaignStore.getState().reports.at(-1)!;
    expect(report.shiftKey).toBe('day-1-morning');
    expect(report.metrics.dispatchedKg).toBe(5000);
    expect(report.metrics.revenue).toBeCloseTo(4100, 5);
  });

  it('bounds controller log entries during a long run', () => {
    const store = useOperationsCampaignStore.getState();
    for (let index = 0; index < 220; index += 1) {
      store.addLogEntry('Test controller', 'operation', `Entry ${index}`);
    }
    expect(useOperationsCampaignStore.getState().logbook).toHaveLength(160);
    expect(useOperationsCampaignStore.getState().logbook[0]?.message).toBe('Entry 60');
  });
});
