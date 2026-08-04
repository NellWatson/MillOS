/**
 * PredictiveMaintenancePanel Component
 *
 * UI panel showing:
 * - Active predictions (machines predicted to fail)
 * - Parts inventory status
 * - Maintenance schedule
 */

import React from 'react';
import {
  AlertTriangle,
  Wrench,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  UserCheck,
  Play,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react';
import { useBreakdownStore, type PredictiveAlert } from '../../stores/breakdownStore';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useProductionStore } from '../../stores/productionStore';

// Parts display with low inventory warning
const PartsInventorySection: React.FC = () => {
  const partsInventory = useBreakdownStore((state) => state.partsInventory);
  const hasLowInventory = useBreakdownStore((state) => state.hasLowInventory());

  const parts = [
    { key: 'bearings', label: 'Bearings' },
    { key: 'belts', label: 'Belts' },
    { key: 'filters', label: 'Filters' },
    { key: 'motors', label: 'Motors' },
    { key: 'sensors', label: 'Sensors' },
  ] as const;

  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-blue-400" />
        <h4 className="text-sm font-semibold text-slate-200">Parts Inventory</h4>
        {hasLowInventory && (
          <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">LOW</span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {parts.map(({ key, label }) => {
          const count = partsInventory[key];
          const isLow = count < 3;
          return (
            <div
              key={key}
              className={`text-center p-2 rounded ${
                isLow ? 'bg-red-500/20 border border-red-500/30' : 'bg-slate-700/50'
              }`}
            >
              <div className={`text-lg font-bold ${isLow ? 'text-red-400' : 'text-slate-200'}`}>
                {count}
              </div>
              <div className="text-xs text-slate-400 truncate">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Active predictions list
const PredictionsSection: React.FC = () => {
  const predictiveAlerts = useBreakdownStore((state) => state.predictiveAlerts);
  const acknowledgePredictiveAlert = useBreakdownStore((state) => state.acknowledgePredictiveAlert);
  const maintenanceSchedule = useBreakdownStore((state) => state.maintenanceSchedule);
  const scheduleMaintenanceTask = useBreakdownStore((state) => state.scheduleMaintenanceTask);
  const getPartsForBreakdown = useBreakdownStore((state) => state.getPartsForBreakdown);
  const gameTime = useGameSimulationStore((state) => state.gameTime);

  const unacknowledgedAlerts = predictiveAlerts.filter((a) => !a.acknowledged);
  const scheduledMachineIds = new Set(
    maintenanceSchedule.filter((task) => !task.completed).map((task) => task.machineId)
  );
  const schedulePrediction = (alert: PredictiveAlert) => {
    const leadTimeHours = Math.max(5, alert.predictedTimeToFailure * 0.5) / 60;
    scheduleMaintenanceTask({
      machineId: alert.machineId,
      machineName: alert.machineName,
      scheduledTime: (gameTime + leadTimeHours) % 24,
      type: 'predictive',
      priority: alert.confidence >= 85 ? 'high' : alert.confidence >= 70 ? 'medium' : 'low',
      partsNeeded: getPartsForBreakdown(alert.predictedFailureType),
    });
    acknowledgePredictiveAlert(alert.id);
  };

  if (unacknowledgedAlerts.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-200">Predictive Alerts</h4>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-sm py-2">
          <CheckCircle className="w-4 h-4" />
          <span>No predicted failures</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-slate-200">Predictive Alerts</h4>
        <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
          {unacknowledgedAlerts.length}
        </span>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {unacknowledgedAlerts.map((alert) => {
          const alreadyScheduled = scheduledMachineIds.has(alert.machineId);
          return (
            <div key={alert.id} className="rounded border border-amber-500/35 bg-slate-700/50 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">{alert.machineName}</div>
                  <div className="text-xs text-slate-400">
                    {alert.predictedFailureType.replaceAll('_', ' ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-400">{alert.confidence}%</div>
                  <div className="text-xs text-slate-500">model confidence</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-600">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Estimated window: {alert.predictedTimeToFailure} min</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => schedulePrediction(alert)}
                    disabled={alreadyScheduled}
                    className="min-h-11 px-3 text-xs bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-600 disabled:text-white/90 text-white rounded transition-colors"
                  >
                    {alreadyScheduled ? 'Scheduled' : 'Schedule'}
                  </button>
                  <button
                    onClick={() => acknowledgePredictiveAlert(alert.id)}
                    className="min-h-11 px-3 text-xs bg-blue-800 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Active breakdowns list
const ActiveBreakdownsSection: React.FC = () => {
  const activeBreakdowns = useBreakdownStore((state) => state.activeBreakdowns);
  const workOrders = useBreakdownStore((state) => state.workOrders);
  const partsInventory = useBreakdownStore((state) => state.partsInventory);
  const assignRepairWorker = useBreakdownStore((state) => state.assignRepairWorker);
  const startRepair = useBreakdownStore((state) => state.startRepair);
  const updateRepairProgress = useBreakdownStore((state) => state.updateRepairProgress);
  const verifyRepair = useBreakdownStore((state) => state.verifyRepair);
  const requestMachineRestart = useBreakdownStore((state) => state.requestMachineRestart);
  const workers = useProductionStore((state) => state.workers);

  const getTechnician = () =>
    workers.find((worker) => worker.role === 'Maintenance' && worker.status !== 'responding') ??
    workers.find((worker) => worker.role === 'Engineer' && worker.status !== 'responding') ??
    workers.find((worker) => worker.role === 'Maintenance' || worker.role === 'Engineer');

  if (activeBreakdowns.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-4 h-4 text-red-400" />
        <h4 className="text-sm font-semibold text-red-300">Active Faults</h4>
        <span className="text-xs bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded">
          {activeBreakdowns.length}
        </span>
      </div>
      <div className="space-y-2">
        {activeBreakdowns.map((breakdown) => {
          const workOrder = workOrders.find((candidate) => candidate.id === breakdown.workOrderId);
          if (!workOrder) return null;
          const unavailableParts = workOrder.requiredParts.filter(
            (part) => partsInventory[part] <= 0
          );
          const phaseLabel = workOrder.phase.replaceAll('_', ' ');
          const technician = getTechnician();

          return (
            <div key={breakdown.id} className="bg-slate-800/50 rounded p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-200">{breakdown.machineName}</div>
                  <div className="text-[11px] text-slate-500">{workOrder.id}</div>
                </div>
                <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300 capitalize">
                  {phaseLabel}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-2">{breakdown.description}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">
                  Technician:{' '}
                  <span
                    className={workOrder.assignedWorkerName ? 'text-amber-300' : 'text-red-300'}
                  >
                    {workOrder.assignedWorkerName ?? 'unassigned'}
                  </span>
                </div>
                <div className="text-right text-slate-400">
                  Downtime:{' '}
                  <span className="text-slate-200">{Math.round(workOrder.downtimeSeconds)} s</span>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Parts: {workOrder.requiredParts.join(', ')}
              </div>
              {unavailableParts.length > 0 && (
                <div role="status" className="mt-1 text-xs text-red-300">
                  Awaiting stock: {unavailableParts.join(', ')}
                </div>
              )}
              {breakdown.repairProgress > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Repair progress</span>
                  <span className="text-emerald-300">{Math.round(breakdown.repairProgress)}%</span>
                </div>
              )}
              {breakdown.repairProgress > 0 && (
                <div className="bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${breakdown.repairProgress}%` }}
                  />
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!workOrder.assignedWorkerId && (
                  <button
                    type="button"
                    disabled={!technician}
                    onClick={() => {
                      if (technician) {
                        assignRepairWorker(breakdown.id, technician.id, technician.name);
                      }
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded bg-blue-800 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600 disabled:text-white/90"
                  >
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                    Assign technician
                  </button>
                )}
                {(workOrder.phase === 'diagnosed' || workOrder.phase === 'awaiting_parts') &&
                  workOrder.assignedWorkerId && (
                    <button
                      type="button"
                      disabled={unavailableParts.length > 0}
                      onClick={() => startRepair(breakdown.id)}
                      className="inline-flex min-h-11 items-center gap-2 rounded bg-amber-800 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:bg-slate-600 disabled:text-white/90"
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Start repair
                    </button>
                  )}
                {workOrder.phase === 'repairing' && (
                  <button
                    type="button"
                    onClick={() => updateRepairProgress(breakdown.id, 100)}
                    className="inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    Complete repair
                  </button>
                )}
                {workOrder.phase === 'verification' && (
                  <button
                    type="button"
                    onClick={() => verifyRepair(breakdown.id)}
                    className="inline-flex min-h-11 items-center gap-2 rounded bg-cyan-800 px-3 text-xs font-semibold text-white hover:bg-cyan-700"
                  >
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    Verify repair
                  </button>
                )}
                {workOrder.phase === 'ready_to_restart' && (
                  <button
                    type="button"
                    onClick={() => requestMachineRestart(breakdown.id)}
                    className="inline-flex min-h-11 items-center gap-2 rounded bg-purple-800 px-3 text-xs font-semibold text-white hover:bg-purple-700"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restart machine
                  </button>
                )}
                {workOrder.phase === 'restart_requested' && (
                  <div role="status" className="flex min-h-11 items-center text-xs text-purple-300">
                    Controlled restart queued
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Maintenance schedule section
const ScheduleSection: React.FC = () => {
  const maintenanceSchedule = useBreakdownStore((state) => state.maintenanceSchedule);
  const partsInventory = useBreakdownStore((state) => state.partsInventory);
  const completeMaintenanceTask = useBreakdownStore((state) => state.completeMaintenanceTask);
  const pendingTasks = maintenanceSchedule.filter((t) => !t.completed);
  const formatScheduledTime = (time: number): string => {
    const normalized = ((time % 24) + 24) % 24;
    const hours = Math.floor(normalized);
    const minutes = Math.floor((normalized - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (pendingTasks.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-semibold text-slate-200">Scheduled Maintenance</h4>
        </div>
        <div className="text-sm text-slate-400 py-2">No scheduled maintenance</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-purple-400" />
        <h4 className="text-sm font-semibold text-slate-200">Scheduled Maintenance</h4>
      </div>
      <div className="space-y-2 max-h-[150px] overflow-y-auto">
        {pendingTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-2 bg-slate-700/50 rounded p-2"
          >
            <div className="min-w-0">
              <div className="text-sm text-slate-200">{task.machineName}</div>
              <div className="text-xs text-slate-400">
                {task.type} at {formatScheduledTime(task.scheduledTime)}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Parts:{' '}
                {task.partsNeeded.length > 0 ? task.partsNeeded.join(', ') : 'inspection only'}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  task.priority === 'high'
                    ? 'bg-red-500/20 text-red-400'
                    : task.priority === 'medium'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-600 text-slate-400'
                }`}
              >
                {task.priority}
              </span>
              <button
                onClick={() => completeMaintenanceTask(task.id)}
                disabled={!task.partsNeeded.every((part) => partsInventory[part] > 0)}
                title={
                  task.partsNeeded.every((part) => partsInventory[part] > 0)
                    ? 'Complete maintenance and consume listed parts'
                    : 'Required parts are unavailable'
                }
                className="min-h-11 px-3 rounded bg-purple-800 text-xs font-semibold text-white hover:bg-purple-700 disabled:bg-slate-600 disabled:text-white/90"
              >
                Complete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main panel component
export const PredictiveMaintenancePanel: React.FC = () => {
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-700 p-4 w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
        <Wrench className="w-5 h-5 text-blue-400" />
        <h3 className="text-base font-semibold text-slate-100">Predictive Maintenance</h3>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <ActiveBreakdownsSection />
        <PredictionsSection />
        <PartsInventorySection />
        <ScheduleSection />
      </div>
    </div>
  );
};

export default PredictiveMaintenancePanel;
