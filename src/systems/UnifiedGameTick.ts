/**
 * UnifiedGameTick - Allocation-conscious game state updates
 *
 * ARCHITECTURE (per GPT 5.2 recommendations):
 * 1. REUSE OBJECTS - Module-level ctx/arrays, mutated not recreated
 * 2. STORE TRUTH ONLY - No cosmetic variance in store
 * 3. VISUAL SMOOTHING - Done at display time, not in store
 * 4. MINIMAL WRITES - Only write when truth actually changes
 *
 * The store holds TRUTH. Display adds COSMETICS.
 */

import { useEffect } from 'react';
import { centralTick, TICK_PRIORITY } from './CentralTickSystem';
import type { TickContext } from './CentralTickSystem';
import { useGameSimulationStore, getShiftForHour } from '../stores/gameSimulationStore';
import { useProductionStore, DAILY_TARGET_BAGS } from '../stores/productionStore';
import { getDispatchQualityStatus, useQCLabStore } from '../stores/qcLabStore';
import {
  useMaterialFlowStore,
  type MaterialFlowState,
  type MaterialType,
} from '../stores/materialFlowStore';
import { useTruckScheduleStore } from '../stores/truckScheduleStore';
import { useBreakdownStore, type BreakdownType } from '../stores/breakdownStore';
import { useUIStore } from '../stores/uiStore';
import { BAG_WEIGHT_KG, type MachineData } from '../types';
import {
  useOperationsCampaignStore,
  type DispatchLoadSnapshot,
  type OperationalIncident,
} from '../stores/operationsCampaignStore';
import { getFacilityBaseLoad, getMachineEnergy } from '../utils/energyCalculations';

// Tracks the receiving dock's docked state across ticks so a false->true
// transition (a grain truck arriving) triggers exactly one silo delivery.
let _lastReceivingTransferReady = false;
let _lastShippingTransferReady = false;
let _shippingLoad: DispatchLoadSnapshot = {
  cycleId: 'shipping-0',
  status: 'away',
  loadedKg: 0,
  capacityKg: 5000,
  materialType: 'flour',
  blockReason: null,
  lastDispatchKg: 0,
};

// One grain truck tops up ~15 t (silo capacity is 50 t)
const GRAIN_DELIVERY_KG = 15000;
// A shipping truck can load up to 5 t of finished flour or semolina.
const FINISHED_GOODS_SHIPMENT_KG = 5000;
const SHIPPING_LOAD_RATE_KG_PER_SECOND = 400;
let _bagProductionCarry = 0;

export const calculateBagsProducedForTick = (
  deltaSeconds: number,
  packerFlowKgPerSecond: number,
  bagWeightKg: number = BAG_WEIGHT_KG
): number => {
  if (
    !Number.isFinite(deltaSeconds) ||
    !Number.isFinite(packerFlowKgPerSecond) ||
    !Number.isFinite(bagWeightKg) ||
    bagWeightKg <= 0
  ) {
    return 0;
  }
  return (Math.max(0, deltaSeconds) * Math.max(0, packerFlowKgPerSecond)) / bagWeightKg;
};

export const calculatePackerThroughputBagsPerHour = (
  packerFlowKgPerSecond: number,
  bagWeightKg: number = BAG_WEIGHT_KG
): number =>
  Number.isFinite(packerFlowKgPerSecond) && Number.isFinite(bagWeightKg) && bagWeightKg > 0
    ? Math.round((Math.max(0, packerFlowKgPerSecond) / bagWeightKg) * 3600)
    : 0;

function sumMaterialInventory(flow: MaterialFlowState, materialType: MaterialType): number {
  let total = 0;
  flow.machineBuffers.forEach((buffer) => {
    total += buffer.inputBuffer.reduce(
      (sum, material) => sum + (material.type === materialType ? material.amount : 0),
      0
    );
    total += buffer.outputBuffer.reduce(
      (sum, material) => sum + (material.type === materialType ? material.amount : 0),
      0
    );
  });
  total += flow.network.segments.reduce(
    (sum, segment) =>
      sum +
      segment.inTransit.reduce(
        (segmentSum, material) =>
          segmentSum + (material.type === materialType ? material.amount : 0),
        0
      ),
    0
  );
  return total;
}

function getFinishedGoodsAvailability(
  flow: MaterialFlowState,
  materialType: Extract<MaterialType, 'flour' | 'semolina'>
): { availableKg: number; releasedKg: number } {
  return flow.productionBatches.reduce(
    (totals, batch) => {
      if (batch.materialType !== materialType || batch.availableKg <= 0) return totals;
      totals.availableKg += batch.availableKg;
      if (batch.disposition === 'released') totals.releasedKg += batch.availableKg;
      return totals;
    },
    { availableKg: 0, releasedKg: 0 }
  );
}

function applyCampaignIncidentConsequence(incident: OperationalIncident): void {
  const production = useProductionStore.getState();
  const flow = useMaterialFlowStore.getState();

  switch (incident.kind) {
    case 'bearing_overheat': {
      const machine = production.machines.find(
        (candidate) => candidate.id === incident.affectedMachineId
      );
      if (machine) {
        production.updateMachineStatus(machine.id, 'critical');
        useBreakdownStore.getState().triggerBreakdown(machine.id, machine.name, 'overheating');
      }
      break;
    }
    case 'dust_filter_pressure':
      if (incident.affectedMachineId) {
        production.updateMachineStatus(incident.affectedMachineId, 'warning');
      }
      break;
    case 'delayed_truck': {
      const trucks = useTruckScheduleStore.getState();
      if (!trucks.truckSchedule.shipping.truckDocked) {
        trucks.updateNextArrival('shipping', trucks.truckSchedule.shipping.nextArrivalMinutes + 45);
      }
      break;
    }
    case 'supplier_contamination':
      useQCLabStore.getState().triggerContaminationAlert({
        type: 'supplier_notification',
        severity: 'high',
        batchIds: flow.productionBatches
          .filter((batch) => batch.availableKg > 0 && batch.disposition !== 'shipped')
          .map((batch) => batch.id),
        controlSource: 'Operations campaign controller',
        controlNote: 'Supplier notification requires traceability review before dispatch release.',
      });
      break;
    case 'severe_rain':
      useGameSimulationStore.getState().setWeather('storm');
      break;
    case 'power_sag':
    case 'packaging_shortage':
    case 'control_network_degraded':
      // Their continuing effects are represented by the campaign multiplier.
      break;
  }

  useUIStore.getState().addAlert({
    id: `campaign-${incident.id}`,
    type: incident.severity === 'critical' ? 'critical' : 'warning',
    title: incident.title,
    message: `${incident.description} The operations workspace records the response and residual controls.`,
    machineId: incident.affectedMachineId ?? undefined,
    timestamp: new Date(),
    acknowledged: false,
  });
  useOperationsCampaignStore.getState().markIncidentEffectApplied(incident.id);
}

function getStorageUtilization(): number {
  let occupiedKg = 0;
  let capacityKg = 0;
  useMaterialFlowStore.getState().machineBuffers.forEach((buffer) => {
    occupiedKg += buffer.inputBuffer.reduce((sum, material) => sum + material.amount, 0);
    occupiedKg += buffer.outputBuffer.reduce((sum, material) => sum + material.amount, 0);
    capacityKg += buffer.inputCapacity + buffer.outputCapacity;
  });
  return capacityKg > 0 ? occupiedKg / capacityKg : 0;
}

// Machine status type (matches MachineData.status)
type MachineStatus = 'running' | 'idle' | 'warning' | 'critical';

// QC grade -> quality score mapping (mirrors deprecated productionStore.tickMetrics)
const QC_GRADE_SCORES: Record<string, number> = { A: 100, B: 85, C: 70, FAIL: 0 };

// Daily-target milestone tracking (percent thresholds, fired once each per day,
// reset on day rollover). Bitmask index matches _MILESTONE_THRESHOLDS.
const _MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;
let _milestonesReachedMask = 0;

// ============================================================
// REUSABLE MODULE-LEVEL OBJECTS (never recreated)
// ============================================================

// Reusable breakdowns array - cleared with .length = 0, never reallocated
const _breakdowns: Array<{
  id: string;
  name: string;
  machineType: string;
  breakdownType: BreakdownType;
}> = [];

// Reusable metrics object - mutated in place
const _metricsUpdate = {
  efficiency: 0,
  uptime: 100,
  quality: 99.5,
  throughput: 0,
};

// Reusable metric tracking object
const _metricTrackingUpdate = {
  totalRunningSeconds: 0,
  totalElapsedSeconds: 0,
  lastRecalcTime: 0,
};

// Reusable arrays for machine change tracking (cleared each tick, never reallocated)
const _changedIndices: number[] = [];
const _changedData: Array<{
  newStatus: MachineStatus;
  newWear: number;
  newEfficiency: number;
  newTemp: number;
}> = [];

// ============================================================
// WEAR CONFIGURATION (static, never changes)
// ============================================================

const WEAR_CONFIG: Record<
  string,
  { wearRatePerSecond: number; warningThreshold: number; breakdownThreshold: number }
> = {
  SILO: { wearRatePerSecond: 0.0001, warningThreshold: 70, breakdownThreshold: 95 },
  ROLLER_MILL: { wearRatePerSecond: 0.0005, warningThreshold: 60, breakdownThreshold: 90 },
  PLANSIFTER: { wearRatePerSecond: 0.0003, warningThreshold: 65, breakdownThreshold: 92 },
  PACKER: { wearRatePerSecond: 0.0004, warningThreshold: 55, breakdownThreshold: 88 },
};

function getWearConfig(machineType: string) {
  return WEAR_CONFIG[machineType] || WEAR_CONFIG.ROLLER_MILL;
}

function calculateEfficiency(wear: number, machineType: string): number {
  const config = getWearConfig(machineType);
  if (wear >= config.breakdownThreshold) return 0;
  if (wear < config.warningThreshold * 0.5) return 100;
  const degradationRange = config.breakdownThreshold - config.warningThreshold * 0.5;
  const wearInRange = wear - config.warningThreshold * 0.5;
  const degradation = Math.min(1, wearInRange / degradationRange);
  return Math.round((1 - degradation * 0.4) * 100);
}

function inferBreakdownType(machine: MachineData): BreakdownType {
  if (machine.metrics.temperature >= 80) return 'overheating';
  if (machine.type === 'PLANSIFTER') return 'vibration_failure';
  if (machine.type === 'SILO') return 'electrical';
  return 'mechanical';
}

// ============================================================
// MACHINE UPDATE - TRUTH ONLY (no cosmetic variance)
// ============================================================

/**
 * Check if a machine's TRUTH has changed (not cosmetic values)
 * Truth = status, wear, efficiency
 * Cosmetics = RPM variance, load variance, temp fluctuation
 */
function updateMachineTruth(
  machine: MachineData,
  deltaSeconds: number
): {
  changed: boolean;
  newStatus: MachineStatus;
  newWear: number;
  newEfficiency: number;
  newTemp: number;
  breakdown: boolean;
} {
  const isRunning = machine.status === 'running' || machine.status === 'warning';
  const isBrokenDown = machine.status === 'critical';

  // Broken machines don't change
  if (isBrokenDown) {
    return {
      changed: false,
      newStatus: machine.status,
      newWear: machine.metrics.wear ?? 0,
      newEfficiency: machine.metrics.efficiency ?? 100,
      newTemp: machine.metrics.temperature,
      breakdown: false,
    };
  }

  const baseWear = machine.metrics.wear ?? 0;
  const baseTemp = machine.metrics.temperature;
  const baseLoad = machine.metrics.load;
  const wearConfig = getWearConfig(machine.type);

  // Temperature changes (this IS truth, affects machine health).
  // Keep 0.1C resolution and DON'T floor the per-tick step at 0.1: the old
  // `Math.round(... Math.max(0.1, delta))` forced a minimum +0.1 then rounded
  // it back off, so as the proportional delta shrank near the target the
  // temperature froze a full degree below 75C and never converged. Rounding to
  // one decimal (matching Machines.tsx) lets it settle within 0.1C of target.
  let newTemp = baseTemp;
  if (isRunning) {
    const tempTarget = 75;
    const tempDelta = (tempTarget - baseTemp) * 0.02 * deltaSeconds;
    newTemp = Math.round(Math.min(85, baseTemp + tempDelta) * 10) / 10;
  } else {
    const tempTarget = 25;
    const tempDelta = (baseTemp - tempTarget) * 0.01 * deltaSeconds;
    newTemp = Math.round(Math.max(25, baseTemp - tempDelta) * 10) / 10;
  }

  // Wear accumulation (this IS truth)
  let newWear = baseWear;
  if (isRunning) {
    const loadFactor = 0.5 + baseLoad / 100;
    const wearIncrement = wearConfig.wearRatePerSecond * deltaSeconds * loadFactor;
    newWear = Math.min(100, baseWear + wearIncrement);
  }

  // Efficiency based on wear (derived truth)
  const newEfficiency = calculateEfficiency(newWear, machine.type);

  // Status based on wear (truth)
  let newStatus = machine.status;
  let breakdown = false;
  if (newWear >= wearConfig.breakdownThreshold) {
    newStatus = 'critical';
    breakdown = true;
  } else if (newWear >= wearConfig.warningThreshold && machine.status === 'running') {
    newStatus = 'warning';
  }

  // Check if truth actually changed (not cosmetics)
  const wearChanged = Math.abs(newWear - baseWear) > 0.001; // Threshold to avoid float noise
  const tempChanged = newTemp !== baseTemp;
  const efficiencyChanged = newEfficiency !== (machine.metrics.efficiency ?? 100);
  const statusChanged = newStatus !== machine.status;

  return {
    changed: wearChanged || tempChanged || efficiencyChanged || statusChanged,
    newStatus,
    newWear: Math.round(newWear * 100) / 100,
    newEfficiency,
    newTemp,
    breakdown,
  };
}

// ============================================================
// UNIFIED TICK - ZERO ALLOCATION PATH
// ============================================================

function unifiedGameTick(ctx: TickContext): void {
  const { deltaSeconds: rawDeltaSeconds, gameSpeed } = ctx;

  // Skip if paused
  if (gameSpeed === 0) return;

  // Cap delta to prevent large time jumps (e.g., from tab being hidden)
  // Must be >= tickInterval (0.5s) to avoid slowing down game time
  // Cap at 1.0s to handle minor frame drops while preventing runaway accumulation
  const deltaSeconds = Math.min(rawDeltaSeconds, 1.0);

  // Validate gameSpeed is reasonable (0-1000x is sane range)
  const safeGameSpeed = Math.max(0, Math.min(gameSpeed, 1000));

  // Clear reusable arrays (no allocation)
  _breakdowns.length = 0;

  // 1. Calculate new game time (pure math, no allocation)
  const gameStore = useGameSimulationStore.getState();
  const hoursElapsed = (deltaSeconds * safeGameSpeed) / 3600;
  const newGameTime = (((gameStore.gameTime + hoursElapsed) % 24) + 24) % 24;

  // Handle day rollover
  let newGameDay = gameStore.gameDay;
  if (newGameTime < gameStore.gameTime && hoursElapsed > 0) {
    newGameDay++;

    // Close out the production day: celebrate the result, then reset the
    // daily counter and milestone tracking so the target loop restarts fresh.
    const dayEndStore = useProductionStore.getState();
    const dayBags = dayEndStore.dailyBagsProduced;
    gameStore.triggerCelebration('shift_complete', {
      value: dayBags,
      message:
        dayBags >= DAILY_TARGET_BAGS
          ? `Day complete: ${Math.round(dayBags).toLocaleString()} bags - target met!`
          : `Day complete: ${Math.round(dayBags).toLocaleString()} of ${DAILY_TARGET_BAGS.toLocaleString()} bags`,
    });
    dayEndStore.resetDailyBagsProduced();
    _milestonesReachedMask = 0;
  }

  // 2. Update machine TRUTH (not cosmetics)
  let prodStore = useProductionStore.getState();
  const campaign = useOperationsCampaignStore.getState();
  campaign.initializeCampaign();
  useOperationsCampaignStore
    .getState()
    .incidents.filter((incident) => incident.phase !== 'resolved' && !incident.effectApplied)
    .forEach(applyCampaignIncidentConsequence);
  prodStore = useProductionStore.getState();
  const maintenanceStore = useBreakdownStore.getState();
  maintenanceStore.tickDowntime(deltaSeconds);

  // A restart request is the final far-side contract in the maintenance loop.
  // The production store resets machine wear/status first; only then does the
  // work order close and release the lockout.
  let maintenanceRestarted = false;
  for (const workOrder of maintenanceStore.workOrders) {
    if (workOrder.phase === 'restart_requested') {
      const result = useProductionStore.getState().performMaintenance(workOrder.machineId);
      if (result.success) {
        useBreakdownStore.getState().confirmMachineRestart(workOrder.breakdownId);
        maintenanceRestarted = true;
      }
    }
  }
  if (maintenanceRestarted) {
    prodStore = useProductionStore.getState();
  }
  const machines = prodStore.machines;

  let anyMachineChanged = false;
  let runningCount = 0;
  let totalRunningDelta = 0;
  let efficiencySum = 0;

  // Check each machine for truth changes
  // Use module-level reusable arrays (cleared here, never reallocated)
  _changedIndices.length = 0;
  _changedData.length = 0;

  for (let i = 0; i < machines.length; i++) {
    const machine = machines[i];
    const isRunning = machine.status === 'running' || machine.status === 'warning';

    if (isRunning) {
      runningCount++;
      totalRunningDelta += deltaSeconds;
    }
    efficiencySum += machine.metrics.efficiency ?? 100;

    const result = updateMachineTruth(machine, deltaSeconds);

    if (result.breakdown) {
      _breakdowns.push({
        id: machine.id,
        name: machine.name,
        machineType: machine.type,
        breakdownType: inferBreakdownType(machine),
      });
    }

    if (result.changed) {
      anyMachineChanged = true;
      _changedIndices.push(i);
      _changedData.push({
        newStatus: result.newStatus,
        newWear: result.newWear,
        newEfficiency: result.newEfficiency,
        newTemp: result.newTemp,
      });
    }
  }

  // 3. Count running packers for throughput calculation
  let runningPackerCount = 0;
  for (let i = 0; i < machines.length; i++) {
    const m = machines[i];
    if (m.type === 'PACKER' && (m.status === 'running' || m.status === 'warning')) {
      runningPackerCount++;
    }
  }

  // 4. Calculate metrics (always, not just when machines change)
  const totalMachines = machines.length || 1;
  const { productionSpeed } = prodStore;
  const campaignStore = useOperationsCampaignStore.getState();
  const campaignMultiplier = campaignStore.getProductionMultiplier();
  const activeProductionPlan = campaignStore.getActiveProductionPlan();
  const effectiveProductionSpeed = productionSpeed * campaignMultiplier;

  // Efficiency: percentage of machines running
  _metricsUpdate.efficiency = Math.round((runningCount / totalMachines) * 100 * 10) / 10;

  // Quality: latest QC Lab test grade (A=100, B=85, C=70, FAIL=0 - mirrors the
  // deprecated productionStore.tickMetrics mapping). Before any test exists,
  // derive an estimate from average machine health so the KPI isn't frozen at
  // its 99.5 initial value: pristine machines read 99.5, worn ones drag it down.
  const qcHistory = useQCLabStore.getState().qcLab.testHistory;
  const latestTest = qcHistory[qcHistory.length - 1];
  if (latestTest) {
    _metricsUpdate.quality = QC_GRADE_SCORES[latestTest.grade] ?? 99.5;
  } else {
    const avgMachineEfficiency = efficiencySum / totalMachines; // 0-100
    _metricsUpdate.quality =
      Math.round(Math.max(0, Math.min(99.5, 99.5 * (avgMachineEfficiency / 100))) * 10) / 10;
  }
  _metricsUpdate.quality = Math.max(
    0,
    _metricsUpdate.quality -
      useOperationsCampaignStore.getState().getIncidentEffect().qualityPenalty
  );

  // Update tracking
  _metricTrackingUpdate.totalRunningSeconds =
    prodStore._metricTracking.totalRunningSeconds + totalRunningDelta;
  _metricTrackingUpdate.totalElapsedSeconds =
    prodStore._metricTracking.totalElapsedSeconds + deltaSeconds;

  // Uptime: percentage of time machines have been running
  _metricsUpdate.uptime =
    _metricTrackingUpdate.totalElapsedSeconds > 0
      ? Math.round(
          (_metricTrackingUpdate.totalRunningSeconds /
            (_metricTrackingUpdate.totalElapsedSeconds * totalMachines)) *
            100 *
            10
        ) / 10
      : 100;

  // The operator KPI follows the same final-stage mass flow used by SCADA.
  // This value is from the preceding material tick, so it is one 500 ms sample
  // behind the scene while remaining stable and free of an extra store write.
  _metricsUpdate.throughput = calculatePackerThroughputBagsPerHour(
    useMaterialFlowStore.getState().currentPackerFlowRate
  );

  // 5. Update store - machines only if changed, metrics always
  if (anyMachineChanged) {
    // Create new machines array only when needed
    const newMachines = [...machines];
    for (let j = 0; j < _changedIndices.length; j++) {
      const idx = _changedIndices[j];
      const data = _changedData[j];
      const oldMachine = machines[idx];

      newMachines[idx] = {
        ...oldMachine,
        status: data.newStatus,
        metrics: {
          ...oldMachine.metrics,
          wear: data.newWear,
          efficiency: data.newEfficiency,
          temperature: data.newTemp,
        },
      };
    }

    useProductionStore.setState({
      machines: newMachines,
      _metricTracking: { ..._metricTrackingUpdate },
      metrics: { ..._metricsUpdate },
    });
  } else {
    // Still update metrics and tracking even if machines didn't change
    useProductionStore.setState({
      _metricTracking: { ..._metricTrackingUpdate },
      metrics: { ..._metricsUpdate },
    });
  }

  // 3b. Daily-target milestones: celebrate 25/50/75/100% once each per day
  // (mask resets on day rollover above). 100% counts as target met.
  if (DAILY_TARGET_BAGS > 0) {
    const dailyProgressPct = (prodStore.dailyBagsProduced / DAILY_TARGET_BAGS) * 100;
    for (let t = 0; t < _MILESTONE_THRESHOLDS.length; t++) {
      const threshold = _MILESTONE_THRESHOLDS[t];
      const bit = 1 << t;
      if (dailyProgressPct >= threshold && (_milestonesReachedMask & bit) === 0) {
        _milestonesReachedMask |= bit;
        gameStore.triggerCelebration(threshold === 100 ? 'target_met' : 'milestone', {
          value: Math.round(prodStore.dailyBagsProduced),
          message:
            threshold === 100
              ? `Daily target reached: ${DAILY_TARGET_BAGS.toLocaleString()} bags!`
              : `Daily target ${threshold}% complete`,
        });
      }
    }
  }

  // 4. Update game time only if changed
  const timeChanged =
    Math.abs(newGameTime - gameStore.gameTime) > 0.0001 || newGameDay !== gameStore.gameDay;
  if (timeChanged) {
    useGameSimulationStore.setState({
      gameTime: newGameTime,
      gameDay: newGameDay,
    });

    // Keep the shift in lock-step with the clock. This unified tick replaced the
    // store's tickGameTime (which reconciled the shift inline); without this the
    // clock advanced but currentShift stayed frozen at its load-time value, so
    // the HUD showed e.g. "Afternoon" at 23:59. getShiftForHour derives from the
    // final time, so a single high-speed tick spanning multiple boundaries still
    // lands on the correct shift. setShift silently updates shiftData too.
    const expectedShift = getShiftForHour(newGameTime);
    if (expectedShift !== gameStore.currentShift) {
      gameStore.setShift(expectedShift);
    }
  }

  // 4b. Advance the material-flow simulation (grain -> mills -> sifters -> packers).
  // This tick was orphaned when ConveyorSystem was modularized (a5d0c21) — the
  // whole flow network silently froze. It belongs here, on the simulation tick,
  // not in a render-loop useFrame.
  const flowStore = useMaterialFlowStore.getState();
  // Couple machine status to flow FIRST so a stopped/broken machine stops
  // processing material this same tick (action -> consequence).
  flowStore.syncMachineProcessing(
    anyMachineChanged ? useProductionStore.getState().machines : machines
  );
  flowStore.tickMaterialFlow(
    deltaSeconds,
    effectiveProductionSpeed,
    activeProductionPlan
      ? {
          sourceMaterial: activeProductionPlan.sourceMaterial,
          finishedMaterial: activeProductionPlan.finishedMaterial,
        }
      : undefined
  );

  // 4c. Convert the exact final-stage mass flow into completed 25 kg bags on
  // the same central cadence. Fractional carry preserves mass across ticks.
  // The HUD, SCADA packer-flow tag, finished inventory and bag counter now all
  // describe the same packer output rather than parallel rate estimates.
  if (runningPackerCount > 0) {
    const liveFlow = useMaterialFlowStore.getState();
    const flowRate = liveFlow.currentPackerFlowRate;
    _bagProductionCarry += calculateBagsProducedForTick(deltaSeconds, flowRate);
    const completedBags = Math.floor(_bagProductionCarry);
    if (completedBags > 0) {
      _bagProductionCarry -= completedBags;
      useProductionStore.getState().incrementBagsProduced(completedBags);
    }
  }

  // 4d. Grain deliveries: when a receiving truck docks, it refills the
  // emptiest silo — without this the silos drain dry in under an hour of
  // simulation and the flow network starves permanently.
  const receivingTransferReady =
    useTruckScheduleStore.getState().truckSchedule.receiving.transferReady;
  if (receivingTransferReady && !_lastReceivingTransferReady) {
    flowStore.receiveGrainDelivery(GRAIN_DELIVERY_KG);
    // The same truck also carries a spare-parts resupply, closing the
    // maintenance loop: consume parts to repair, trucks bring them back.
    useBreakdownStore.getState().restockDelivery();
  }
  _lastReceivingTransferReady = receivingTransferReady;

  // 4e. Loading is a docked operation. Product remains conserved in finished
  // goods until the vehicle actually departs, when the material store creates
  // the authoritative dispatch manifest. The load snapshot is operational
  // intent only, never a second inventory ledger.
  const shippingSchedule = useTruckScheduleStore.getState().truckSchedule.shipping;
  const shippingTransferReady = shippingSchedule.transferReady;
  const dockFlow = useMaterialFlowStore.getState();
  const reasonByCode = {
    certification_expired: 'Quality certification is expired.',
    unresolved_contamination: 'A contamination alert remains unresolved.',
    failed_quality_test: 'The latest laboratory result failed.',
    batch_quality_hold: 'Available production batches remain on quality hold.',
    batch_recalled: 'Recalled production remains isolated from dispatch.',
  } as const;
  if (shippingTransferReady && !_lastShippingTransferReady) {
    _shippingLoad = {
      cycleId: `shipping-${shippingSchedule.departureCount + 1}`,
      status: 'loading',
      loadedKg: 0,
      capacityKg: FINISHED_GOODS_SHIPMENT_KG,
      materialType: activeProductionPlan?.finishedMaterial ?? 'flour',
      blockReason: null,
      lastDispatchKg: 0,
    };
  }

  if (shippingTransferReady) {
    const qualityStatus = getDispatchQualityStatus(
      useQCLabStore.getState().qcLab,
      dockFlow.productionBatches
    );
    const incidentDispatchBlocked = useOperationsCampaignStore
      .getState()
      .getIncidentEffect().dispatchBlocked;
    const qualityBlockReason = incidentDispatchBlocked
      ? 'An active operational incident requires dispatch isolation.'
      : qualityStatus.reason
        ? reasonByCode[qualityStatus.reason]
        : !qualityStatus.released
          ? 'The quality interlock is not released.'
          : null;
    const releasedKg = getFinishedGoodsAvailability(
      dockFlow,
      _shippingLoad.materialType
    ).releasedKg;
    const activeOrder = useOperationsCampaignStore
      .getState()
      .orders.find((order) => order.id === activeProductionPlan?.orderId);
    const orderRemainingKg = activeOrder
      ? Math.max(0, activeOrder.requiredKg - activeOrder.shippedKg)
      : FINISHED_GOODS_SHIPMENT_KG;
    const loadTargetKg = Math.min(
      _shippingLoad.capacityKg,
      orderRemainingKg,
      Math.max(_shippingLoad.loadedKg, releasedKg)
    );
    const previousStatus = _shippingLoad.status;

    if (qualityBlockReason) {
      _shippingLoad = { ..._shippingLoad, status: 'held', blockReason: qualityBlockReason };
    } else if (releasedKg <= _shippingLoad.loadedKg + 1e-6) {
      _shippingLoad = {
        ..._shippingLoad,
        status: _shippingLoad.loadedKg > 0 ? 'ready' : 'held',
        blockReason:
          _shippingLoad.loadedKg > 0
            ? null
            : `Waiting for released ${_shippingLoad.materialType} at the packers.`,
      };
    } else {
      const loadedKg = Math.min(
        loadTargetKg,
        _shippingLoad.loadedKg + SHIPPING_LOAD_RATE_KG_PER_SECOND * deltaSeconds
      );
      _shippingLoad = {
        ..._shippingLoad,
        loadedKg,
        status:
          loadedKg >= _shippingLoad.capacityKg - 1e-6 || loadedKg >= orderRemainingKg - 1e-6
            ? 'ready'
            : 'loading',
        blockReason: null,
      };
    }

    if (_shippingLoad.status === 'held' && previousStatus !== 'held') {
      useUIStore.getState().addAlert({
        id: `dispatch-quality-hold-${_shippingLoad.cycleId}`,
        type: 'warning',
        title: 'Dispatch Quality Hold',
        message: `${_shippingLoad.blockReason ?? 'Loading is held.'} Clear the condition before release.`,
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  } else if (_lastShippingTransferReady) {
    const actualKg = dockFlow.shipFinishedGoods(_shippingLoad.loadedKg, _shippingLoad.materialType);
    _shippingLoad = {
      ..._shippingLoad,
      status: 'departed',
      loadedKg: actualKg,
      lastDispatchKg: actualKg,
      blockReason:
        actualKg > 0
          ? null
          : (_shippingLoad.blockReason ?? 'Truck departed without a released load.'),
    };
  } else if (shippingSchedule.departureCount === 0 && _shippingLoad.status !== 'away') {
    _shippingLoad = {
      ..._shippingLoad,
      cycleId: 'shipping-0',
      status: 'away',
      loadedKg: 0,
      lastDispatchKg: 0,
      blockReason: null,
    };
  }
  _lastShippingTransferReady = shippingTransferReady;

  const latestProduction = useProductionStore.getState();
  const latestFlow = useMaterialFlowStore.getState();
  const latestGame = useGameSimulationStore.getState();
  const latestTrucks = useTruckScheduleStore.getState().truckSchedule;
  const dispatchStatus = getDispatchQualityStatus(
    useQCLabStore.getState().qcLab,
    latestFlow.productionBatches
  );
  const totalEnergyKw =
    latestProduction.machines.reduce((sum, machine) => sum + getMachineEnergy(machine), 0) +
    getFacilityBaseLoad(latestGame.gameTime).total;
  const executionPlan = useOperationsCampaignStore.getState().getActiveProductionPlan();
  const executionMaterial = executionPlan?.finishedMaterial ?? _shippingLoad.materialType;
  const finishedAvailability = getFinishedGoodsAvailability(latestFlow, executionMaterial);
  useOperationsCampaignStore.getState().tickCampaign(deltaSeconds * safeGameSpeed, {
    shiftKey: `day-${latestGame.gameDay}-${latestGame.currentShift}`,
    shiftLabel: `${latestGame.currentShift[0].toUpperCase()}${latestGame.currentShift.slice(1)}`,
    manifests: latestFlow.manifests,
    productionBatches: latestFlow.productionBatches,
    totalEnergyKw,
    averageQuality: latestProduction.metrics.quality,
    wasteKg: latestFlow.wasteKg,
    storageUtilization: getStorageUtilization(),
    shippingDocked: latestTrucks.shipping.truckDocked,
    receivingDocked: latestTrucks.receiving.truckDocked,
    dispatchReleased: dispatchStatus.released,
    sourceInventoryKg: executionPlan
      ? sumMaterialInventory(latestFlow, executionPlan.sourceMaterial)
      : 0,
    finishedAvailableKg: finishedAvailability.availableKg,
    releasedFinishedKg: finishedAvailability.releasedKg,
    dispatchLoad: { ..._shippingLoad },
    openWorkOrders: useBreakdownStore
      .getState()
      .workOrders.filter((workOrder) => workOrder.phase !== 'returned_to_service').length,
  });

  // 5. Handle breakdowns (async, outside main path)
  if (_breakdowns.length > 0) {
    // Copy breakdowns before async (since we reuse the array)
    const breakdownsCopy = _breakdowns.map((b) => ({ ...b }));
    breakdownsCopy.forEach(({ id, name, machineType, breakdownType }) => {
      const breakdown = useBreakdownStore.getState().triggerBreakdown(id, name, breakdownType);
      if (!breakdown) return;
      useUIStore.getState().addAlert({
        id: `breakdown-${id}-${Date.now()}`,
        type: 'critical',
        title: 'Machine Breakdown',
        message: `${name} (${machineType}) has broken down due to excessive wear. Work order ${breakdown.workOrderId} requires repair, verification, and controlled restart.`,
        machineId: id,
        timestamp: new Date(),
        acknowledged: false,
      });
    });
  }
}

// ============================================================
// HOOK TO REGISTER TICK
// ============================================================

export function useUnifiedGameTick(): void {
  useEffect(() => {
    centralTick.register('unified-game-tick', unifiedGameTick, TICK_PRIORITY.CRITICAL);
    return () => centralTick.unregister('unified-game-tick');
  }, []);
}

export { unifiedGameTick };
