#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { canonicalStringify } from '../src/agent/contracts/registryValidation.js';
import {
  AGENT_LEVEL0_MAXIMUM_BYTES,
  byteLength,
  createAgentQueryService,
} from '../src/agent/query/queryService.js';
import { SYSTEM_REGISTRY_SOURCE } from '../src/agent/registry/systemRegistrySource.js';

const root = resolve(import.meta.dirname, '..');
const outputPath = resolve(root, 'build/generated/agent/query-plane-measurement.json');
const manifest = JSON.parse(
  readFileSync(resolve(root, 'build/generated/agent/system-manifest.json'), 'utf8')
);
const observedAt = '2026-08-31T12:00:00.000Z';
const machineCount = 60;
const iterations = 300;
const fixture = createFixture(machineCount);
const service = createAgentQueryService({
  registry: SYSTEM_REGISTRY_SOURCE,
  capture: fixture.capture,
  now: () => new Date(observedAt),
});

for (let index = 0; index < 20; index += 1) {
  service.brief();
  service.query({ view: 'domain', domainId: 'production', limit: 100 });
}

const sourceBefore = canonicalStringify(fixture.capture());
const heapBefore = process.memoryUsage().heapUsed;
const briefSamples = measure(iterations, () => service.brief());
const domainSamples = measure(iterations, () =>
  service.query({ view: 'domain', domainId: 'production', limit: 100 })
);
const heapAfter = process.memoryUsage().heapUsed;
const sourceAfter = canonicalStringify(fixture.capture());
const full = service.query({ view: 'domain', domainId: 'production', limit: 100 });
const previousProductionRevision = full.domainRevisions.production;
fixture.machines[Math.floor(machineCount / 2)].metrics.temperature += 0.5;
const delta = service.query({
  view: 'domain',
  domainId: 'production',
  sinceRevision: previousProductionRevision,
});
const brief = service.brief();
const fullBytes = byteLength(full);
const deltaBytes = byteLength(delta);
const retainedHeapDeltaBytes = heapAfter - heapBefore;
const measurement = {
  schemaVersion: 1,
  measurementKind: 'local-synthetic-query-plane',
  measuredAt: new Date().toISOString(),
  contractSourceFingerprint: manifest.generation.sourceFingerprint,
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
  },
  workload: {
    iterationsPerOperation: iterations,
    machineCount,
    snapshotHistorySize: SYSTEM_REGISTRY_SOURCE.queryPlane.snapshotHistorySize,
  },
  responseBytes: {
    level0Brief: byteLength(brief),
    fullProductionDomain: fullBytes,
    oneMachineFieldDelta: deltaBytes,
    changedDeltaRatio: Number((deltaBytes / fullBytes).toFixed(4)),
    changedDeltaReductionPercent: Number(((1 - deltaBytes / fullBytes) * 100).toFixed(2)),
  },
  latencyMs: {
    brief: summarize(briefSamples),
    productionDomain: summarize(domainSamples),
  },
  allocationIndicators: {
    retainedHeapDeltaBytes,
    retainedHeapBytesPerMeasuredOperation: Number(
      (retainedHeapDeltaBytes / (iterations * 2)).toFixed(2)
    ),
    level0SerializedAllocationBytes: byteLength(brief),
    note: 'Heap retention is process-noisy. Serialized response size is the stable lower-bound allocation indicator.',
  },
  sourceEffects: {
    sourceStateUnchangedAcrossMeasurement: sourceBefore === sourceAfter,
    subscriptionsInstalled: 0,
    ReactRendersRequested: 0,
  },
  budgets: {
    level0MaximumBytes: AGENT_LEVEL0_MAXIMUM_BYTES,
    briefP95MaximumMs: 20,
    domainP95MaximumMs: 20,
    changedDeltaMaximumRatio: 0.2,
  },
  pass: {
    level0Bytes: byteLength(brief) <= AGENT_LEVEL0_MAXIMUM_BYTES,
    briefLatency: percentile(briefSamples, 95) <= 20,
    domainLatency: percentile(domainSamples, 95) <= 20,
    changedDeltaSize: deltaBytes / fullBytes <= 0.2,
    sourceStateUnchanged: sourceBefore === sourceAfter,
  },
};

mkdirSync(resolve(outputPath, '..'), { recursive: true });
writeFileSync(outputPath, `${canonicalStringify(measurement, 2)}\n`);
console.log(`wrote ${outputPath.replace(`${root}/`, '')}`);
console.log(
  `brief p95 ${measurement.latencyMs.brief.p95} ms, domain p95 ${measurement.latencyMs.productionDomain.p95} ms, L0 ${measurement.responseBytes.level0Brief} bytes, delta reduction ${measurement.responseBytes.changedDeltaReductionPercent}%`
);

if (Object.values(measurement.pass).some((passed) => !passed)) process.exit(1);

function measure(count, operation) {
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const started = performance.now();
    operation();
    samples.push(performance.now() - started);
  }
  return samples;
}

function summarize(samples) {
  return {
    minimum: rounded(Math.min(...samples)),
    p50: rounded(percentile(samples, 50)),
    p95: rounded(percentile(samples, 95)),
    maximum: rounded(Math.max(...samples)),
    mean: rounded(samples.reduce((total, value) => total + value, 0) / samples.length),
  };
}

function percentile(samples, target) {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1)];
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function createFixture(count) {
  const machines = Array.from({ length: count }, (_, index) => ({
    id: `rm-${String(index + 1).padStart(3, '0')}`,
    name: `Roller Mill ${index + 1}`,
    status: 'running',
    metrics: {
      rpm: 740 + index,
      temperature: 55 + index / 10,
      vibration: 1.2,
      load: 72,
      wear: 12,
      efficiency: 94,
    },
  }));
  const domains = Object.fromEntries(
    SYSTEM_REGISTRY_SOURCE.domains.map((domain) => [domain.id, {}])
  );
  domains.simulation = {
    gameDay: 2,
    gameTime: 10.5,
    gameSpeed: 1,
    emergencyActive: false,
    crisis: { active: false },
  };
  domains.production = {
    productionSpeed: 82,
    machines,
    metrics: { throughput: 1100, efficiency: 94, uptime: 98, quality: 96 },
  };
  domains.material = {
    productionBatches: Array.from({ length: 40 }, (_, index) => ({
      id: `batch-${String(index + 1).padStart(3, '0')}`,
      availableKg: 900,
      disposition: 'released',
    })),
    manifests: [],
  };
  domains.quality = { dispatchReleased: true, dispatchHoldReason: null, contaminationAlerts: [] };
  domains.maintenance = { activeBreakdowns: [], workOrders: [], partsInventory: {} };
  domains.campaign = {
    activeOrderId: 'order-001',
    orders: [
      {
        id: 'order-001',
        customer: 'Benchmark Cooperative',
        priority: 'critical',
        status: 'active',
        requiredKg: 6000,
        dueAtMinute: 240,
        recipe: { minimumQuality: 95 },
      },
    ],
    incidents: [],
    constraints: [],
    execution: { stage: 'milling', lineSetpointPercent: 82 },
  };
  domains.logistics = { receiving: {}, shipping: {} };
  domains.safety = { forkliftEmergencyStop: false, safetyMetrics: {}, safetyIncidents: [] };
  domains.scada = { externalObservationClaimed: false, connectionVerified: false };
  domains.experience = { operationalProjectionOnly: true };
  domains.evidence = { replayFrameCount: 0, decisionHistoryCount: 0, commands: [] };
  return {
    machines,
    capture: () => ({
      domains,
      simulationTime: { day: 2, hour: 10.5 },
      mode: 'simulation',
      build: 'query-measurement',
      seed: 'query-measurement-seed',
      completeness: 'complete',
      freshness: [{ source: 'synthetic-fixture', observedAt, staleAfterMs: 1000, quality: 'good' }],
      warnings: [],
    }),
  };
}
