import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialWorkers, type WorkerData } from '../types';
import type { MaterialManifest, ProductionBatch } from './materialFlowStore';
import {
  calculateWorkerEffectiveness,
  deriveWorkerSkills,
  isWorkerCertified,
  useOperationsCampaignStore,
  type CampaignTickContext,
} from './operationsCampaignStore';

const workers = createInitialWorkers();

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
    workers,
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

describe('operationsCampaignStore', () => {
  beforeEach(() => {
    useOperationsCampaignStore.getState().resetCampaign();
  });

  it('derives role-specific skills without inventing missing credentials', () => {
    const qualityWorker = workers.find((worker) => worker.role === 'Quality Control')!;
    const operator = workers.find((worker) => worker.role === 'Operator')!;

    expect(deriveWorkerSkills(qualityWorker).qualityControl).toBe(5);
    expect(isWorkerCertified(qualityWorker, 'quality')).toBe(true);
    expect(isWorkerCertified(operator, 'quality')).toBe(false);
    expect(calculateWorkerEffectiveness(operator, undefined, 'quality')).toBeLessThan(
      calculateWorkerEffectiveness(qualityWorker, undefined, 'quality')
    );
  });

  it('initializes deterministic assignments against the existing roster', () => {
    useOperationsCampaignStore.getState().initializeCampaign(workers);
    const state = useOperationsCampaignStore.getState();

    expect(state.initialized).toBe(true);
    expect(state.personnel).toHaveLength(workers.length);
    expect(state.assignments).toHaveLength(workers.length);
    expect(state.assignments.find((assignment) => assignment.workerId === 'w1')?.kind).toBe(
      'supervision'
    );
    expect(state.assignments.find((assignment) => assignment.workerId === 'w4')?.kind).toBe(
      'quality'
    );
  });

  it('turns the selected customer recipe into the active physical production plan', () => {
    useOperationsCampaignStore.getState().activateOrder('order-002');

    expect(useOperationsCampaignStore.getState().getActiveProductionPlan()).toMatchObject({
      orderId: 'order-002',
      sourceMaterial: 'corn_grain',
      finishedMaterial: 'semolina',
    });
    expect(useOperationsCampaignStore.getState().logbook.at(-1)?.message).toContain(
      'corn_grain to semolina'
    );
  });

  it('publishes production, quality, and truck loading as one execution state', () => {
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

  it('raises a critical recipe constraint when the active feedstock is exhausted', () => {
    useOperationsCampaignStore.getState().activateOrder('order-002');
    useOperationsCampaignStore.getState().tickCampaign(60, context({ sourceInventoryKg: 0 }));

    expect(useOperationsCampaignStore.getState().constraints).toContainEqual(
      expect.objectContaining({
        id: 'recipe-feed-order-002',
        severity: 'critical',
        detail: expect.stringContaining('corn grain'),
        relatedId: 'order-002',
      })
    );
  });

  it('keeps all visible utility vessel telemetry finite and bounded', () => {
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

  it('allocates each shipping manifest once to the earliest matching commitment', () => {
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
    expect(order.batchIds).toEqual(['batch-0001']);
    expect(useOperationsCampaignStore.getState().economics.revenue).toBeCloseTo(4100, 5);
  });

  it('applies and reduces incident effects without silently clearing the incident', () => {
    const store = useOperationsCampaignStore.getState();
    store.initializeCampaign(workers);
    const incident = store.triggerIncident('supplier_contamination')!;

    expect(store.getIncidentEffect().dispatchBlocked).toBe(true);
    expect(store.getProductionMultiplier()).toBeLessThan(1);

    store.mitigateIncident(incident.id);
    expect(useOperationsCampaignStore.getState().getIncidentEffect().dispatchBlocked).toBe(false);
    expect(
      useOperationsCampaignStore.getState().incidents.find((item) => item.id === incident.id)?.phase
    ).toBe('mitigated');

    store.resolveIncident(incident.id);
    expect(
      useOperationsCampaignStore.getState().incidents.find((item) => item.id === incident.id)?.phase
    ).toBe('resolved');
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

  it('closes a causal report when the simulation crosses a shift boundary', () => {
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
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
  });

  it('bounds operator log entries during a long campaign', () => {
    const store = useOperationsCampaignStore.getState();
    for (let index = 0; index < 220; index += 1) {
      store.addLogEntry('Test operator', 'operation', `Entry ${index}`);
    }
    expect(useOperationsCampaignStore.getState().logbook).toHaveLength(160);
    expect(useOperationsCampaignStore.getState().logbook[0]?.message).toBe('Entry 60');
  });

  it('marks uncertified assignments explicitly and penalizes effectiveness', () => {
    const worker: WorkerData = {
      ...workers.find((candidate) => candidate.role === 'Operator')!,
      certifications: [],
    };
    const assignment = useOperationsCampaignStore.getState().assignWorker(worker, 'forklift');
    expect(assignment.certified).toBe(false);
    expect(assignment.effectiveness).toBeLessThan(0.7);
  });
});
