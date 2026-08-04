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
