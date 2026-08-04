import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  BookOpenText,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Coffee,
  Gauge,
  PlayCircle,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useProductionStore } from '../../stores/productionStore';
import {
  INCIDENT_DEFINITIONS,
  getAssignmentLabel,
  useOperationsCampaignStore,
  type AssignmentKind,
  type IncidentKind,
  type LogCategory,
} from '../../stores/operationsCampaignStore';

const ASSIGNMENT_OPTIONS: ReadonlyArray<{ value: AssignmentKind; label: string }> = [
  { value: 'production', label: 'Production' },
  { value: 'quality', label: 'Quality' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'supervision', label: 'Supervision' },
  { value: 'safety', label: 'Safety' },
];

const LOG_CATEGORIES: LogCategory[] = ['operation', 'quality', 'maintenance', 'safety', 'shift'];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);

const formatMinute = (minute: number): string => {
  const total = Math.max(0, Math.round(minute));
  return `T+${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

export const OperationsCampaignPanel: React.FC = React.memo(() => {
  const {
    elapsedMinutes,
    orders,
    activeOrderId,
    personnel,
    assignments,
    incidents,
    economics,
    constraints,
    reports,
    logbook,
    activateOrder,
    assignWorker,
    sendWorkerOnBreak,
    triggerIncident,
    acknowledgeIncident,
    mitigateIncident,
    resolveIncident,
    addLogEntry,
  } = useOperationsCampaignStore(
    useShallow((state) => ({
      elapsedMinutes: state.elapsedMinutes,
      orders: state.orders,
      activeOrderId: state.activeOrderId,
      personnel: state.personnel,
      assignments: state.assignments,
      incidents: state.incidents,
      economics: state.economics,
      constraints: state.constraints,
      reports: state.reports,
      logbook: state.logbook,
      activateOrder: state.activateOrder,
      assignWorker: state.assignWorker,
      sendWorkerOnBreak: state.sendWorkerOnBreak,
      triggerIncident: state.triggerIncident,
      acknowledgeIncident: state.acknowledgeIncident,
      mitigateIncident: state.mitigateIncident,
      resolveIncident: state.resolveIncident,
      addLogEntry: state.addLogEntry,
    }))
  );
  const workers = useProductionStore((state) => state.workers);
  const [selectedWorkerId, setSelectedWorkerId] = useState(() => workers[0]?.id ?? '');
  const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>('production');
  const [assignmentTarget, setAssignmentTarget] = useState('');
  const [logCategory, setLogCategory] = useState<LogCategory>('operation');
  const [logMessage, setLogMessage] = useState('');

  const activeAssignments = useMemo(
    () =>
      new Map(
        assignments.filter((item) => item.status === 'active').map((item) => [item.workerId, item])
      ),
    [assignments]
  );
  const personnelByWorker = useMemo(
    () => new Map(personnel.map((person) => [person.workerId, person])),
    [personnel]
  );
  const activeIncidents = incidents.filter((incident) => incident.phase !== 'resolved');
  const activeIncidentKinds = new Set(activeIncidents.map((incident) => incident.kind));
  const latestReport = reports[reports.length - 1] ?? null;
  const totalCosts =
    economics.energyCost +
    economics.labourCost +
    economics.wasteCost +
    economics.maintenanceCost +
    economics.demurrageCost +
    economics.latePenalties;
  const margin = economics.revenue - totalCosts;

  const submitAssignment = () => {
    const worker = workers.find((candidate) => candidate.id === selectedWorkerId);
    if (!worker) return;
    assignWorker(worker, assignmentKind, assignmentTarget.trim() || null);
  };

  const submitLogEntry = (event: React.FormEvent) => {
    event.preventDefault();
    addLogEntry('Simulation operator', logCategory, logMessage);
    setLogMessage('');
  };

  return (
    <section
      className="rounded-xl border border-cyan-500/20 bg-slate-900/65 p-3"
      aria-labelledby="operations-campaign-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id="operations-campaign-heading"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300"
          >
            <BriefcaseBusiness size={15} aria-hidden="true" />
            v0.40 Operations Campaign
          </h3>
          <p className="mt-1 text-[10px] text-slate-400">
            Persistent commitments, people, incidents, costs, and shift handover.
          </p>
        </div>
        <time className="shrink-0 font-mono text-[10px] text-slate-400">
          {formatMinute(elapsedMinutes)}
        </time>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-800/70 p-2">
          <dt className="flex items-center gap-1 text-[9px] uppercase text-slate-500">
            <Banknote size={11} aria-hidden="true" /> Margin
          </dt>
          <dd
            className={`mt-1 font-mono text-sm font-bold ${margin >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
          >
            {formatCurrency(margin)}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-800/70 p-2">
          <dt className="flex items-center gap-1 text-[9px] uppercase text-slate-500">
            <ClipboardList size={11} aria-hidden="true" /> Orders
          </dt>
          <dd className="mt-1 font-mono text-sm font-bold text-white">
            {orders.filter((order) => order.status === 'fulfilled').length}/{orders.length}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-800/70 p-2">
          <dt className="flex items-center gap-1 text-[9px] uppercase text-slate-500">
            <ShieldAlert size={11} aria-hidden="true" /> Incidents
          </dt>
          <dd
            className={`mt-1 font-mono text-sm font-bold ${activeIncidents.length ? 'text-amber-300' : 'text-emerald-300'}`}
          >
            {activeIncidents.length}
          </dd>
        </div>
      </dl>

      {constraints.length > 0 && (
        <div className="mt-3 space-y-1" aria-live="polite">
          {constraints.slice(0, 4).map((constraint) => (
            <div
              key={constraint.id}
              className={`rounded border px-2 py-1.5 text-[10px] ${
                constraint.severity === 'critical'
                  ? 'border-rose-500/35 bg-rose-950/35 text-rose-200'
                  : constraint.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-950/30 text-amber-100'
                    : 'border-cyan-500/25 bg-cyan-950/25 text-cyan-100'
              }`}
            >
              <span className="font-semibold">{constraint.label}:</span> {constraint.detail}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <ClipboardList size={13} aria-hidden="true" /> Customer commitments
        </h4>
        <div className="mt-2 space-y-2">
          {orders.map((order) => {
            const progress = Math.min(100, (order.shippedKg / Math.max(1, order.requiredKg)) * 100);
            return (
              <article
                key={order.id}
                className={`rounded-lg border p-2 ${
                  order.id === activeOrderId
                    ? 'border-cyan-500/40 bg-cyan-950/20'
                    : 'border-slate-700/70 bg-slate-800/45'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-white">
                      {order.customer}
                    </div>
                    <div className="truncate text-[9px] text-slate-400">{order.recipe.label}</div>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      order.status === 'fulfilled'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : order.status === 'late'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                  <span>
                    {order.shippedKg.toFixed(0)} / {order.requiredKg.toFixed(0)} kg
                  </span>
                  <span>Due {formatMinute(order.dueAtMinute)}</span>
                </div>
                {order.status === 'planned' && (
                  <button
                    type="button"
                    onClick={() => activateOrder(order.id)}
                    className="mt-2 min-h-11 w-full rounded bg-cyan-700 px-3 text-[10px] font-bold text-white hover:bg-cyan-600"
                  >
                    Make active commitment
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Users size={13} aria-hidden="true" /> Personnel deployment
        </h4>
        <ul className="mt-2 space-y-1.5">
          {workers.map((worker) => {
            const assignment = activeAssignments.get(worker.id);
            const person = personnelByWorker.get(worker.id);
            return (
              <li key={worker.id} className="rounded-lg bg-slate-800/45 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-slate-100">
                      {worker.name}
                    </div>
                    <div className="truncate text-[9px] text-slate-400">
                      {assignment ? getAssignmentLabel(assignment) : worker.currentTask}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`font-mono text-[10px] ${(person?.energy ?? 100) < 35 ? 'text-rose-300' : 'text-emerald-300'}`}
                    >
                      {Math.round(person?.energy ?? worker.energy ?? 100)}% energy
                    </div>
                    {assignment && (
                      <div
                        className={`text-[9px] ${assignment.certified ? 'text-cyan-300' : 'text-amber-300'}`}
                      >
                        {assignment.certified ? 'certified' : 'skills penalty'}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[9px] uppercase text-slate-500">
            Person
            <select
              value={selectedWorkerId}
              onChange={(event) => setSelectedWorkerId(event.target.value)}
              className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-800 px-2 text-[10px] normal-case text-white"
            >
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[9px] uppercase text-slate-500">
            Assignment
            <select
              value={assignmentKind}
              onChange={(event) => setAssignmentKind(event.target.value as AssignmentKind)}
              className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-800 px-2 text-[10px] normal-case text-white"
            >
              {ASSIGNMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-2 block text-[9px] uppercase text-slate-500">
          Target machine or area
          <input
            value={assignmentTarget}
            onChange={(event) => setAssignmentTarget(event.target.value)}
            placeholder="Optional target ID"
            className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-800 px-3 text-[10px] normal-case text-white placeholder:text-slate-600"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={submitAssignment}
            disabled={!selectedWorkerId}
            className="flex min-h-11 items-center justify-center gap-2 rounded bg-cyan-700 px-2 text-[10px] font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            <PlayCircle size={14} aria-hidden="true" /> Assign
          </button>
          <button
            type="button"
            onClick={() => {
              const worker = workers.find((candidate) => candidate.id === selectedWorkerId);
              if (worker) sendWorkerOnBreak(worker);
            }}
            disabled={!selectedWorkerId}
            className="flex min-h-11 items-center justify-center gap-2 rounded bg-slate-700 px-2 text-[10px] font-bold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            <Coffee size={14} aria-hidden="true" /> Rest break
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <ShieldAlert size={13} aria-hidden="true" /> Incident library
        </h4>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(INCIDENT_DEFINITIONS) as IncidentKind[]).map((kind) => {
            const definition = INCIDENT_DEFINITIONS[kind];
            return (
              <button
                key={kind}
                type="button"
                disabled={activeIncidentKinds.has(kind)}
                onClick={() => triggerIncident(kind)}
                className="min-h-11 rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-left text-[9px] font-semibold text-white hover:border-amber-500/50 hover:bg-amber-950/20 disabled:cursor-not-allowed disabled:opacity-40"
                title={definition.description}
              >
                {definition.title}
              </button>
            );
          })}
        </div>
        {activeIncidents.length > 0 && (
          <div className="mt-2 space-y-2" aria-live="polite">
            {activeIncidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-300"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-amber-100">{incident.title}</div>
                    <div className="mt-0.5 text-[9px] text-amber-100/70">
                      {incident.description}
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => acknowledgeIncident(incident.id)}
                    disabled={incident.phase !== 'raised'}
                    className="min-h-11 rounded bg-slate-700 text-[9px] font-bold text-white disabled:opacity-35"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => mitigateIncident(incident.id)}
                    disabled={incident.phase === 'mitigated'}
                    className="min-h-11 rounded bg-amber-700 text-[9px] font-bold text-white disabled:opacity-35"
                  >
                    Mitigate
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveIncident(incident.id)}
                    className="min-h-11 rounded bg-emerald-700 text-[9px] font-bold text-white"
                  >
                    Resolve
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-800/45 p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase text-slate-500">
            <Zap size={11} /> Energy
          </div>
          <div className="mt-1 font-mono text-xs text-slate-200">
            {formatCurrency(economics.energyCost)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-800/45 p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase text-slate-500">
            <Gauge size={11} /> Demurrage
          </div>
          <div className="mt-1 font-mono text-xs text-slate-200">
            {formatCurrency(economics.demurrageCost)}
          </div>
        </div>
      </div>

      {latestReport && (
        <div className="mt-4 rounded-lg border border-indigo-500/25 bg-indigo-950/20 p-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-200">
              <BadgeCheck size={13} aria-hidden="true" /> Latest handover
            </h4>
            <span className="font-mono text-lg font-bold text-white">{latestReport.grade}</span>
          </div>
          <p className="mt-1 text-[9px] text-slate-300">{latestReport.summary}</p>
          {latestReport.openRisks.length > 0 && (
            <p className="mt-1 text-[9px] text-amber-200">
              Inherited: {latestReport.openRisks.join(', ')}
            </p>
          )}
        </div>
      )}

      <form onSubmit={submitLogEntry} className="mt-4">
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <BookOpenText size={13} aria-hidden="true" /> Operator logbook
        </h4>
        <div className="mt-2 flex gap-2">
          <select
            value={logCategory}
            onChange={(event) => setLogCategory(event.target.value as LogCategory)}
            aria-label="Log category"
            className="min-h-11 w-28 rounded border border-slate-600 bg-slate-800 px-2 text-[10px] capitalize text-white"
          >
            {LOG_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            value={logMessage}
            onChange={(event) => setLogMessage(event.target.value)}
            aria-label="Operator log message"
            placeholder="Record a decision or observation"
            maxLength={500}
            className="min-h-11 min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-3 text-[10px] text-white placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!logMessage.trim()}
            aria-label="Add operator log entry"
            className="flex min-h-11 min-w-11 items-center justify-center rounded bg-indigo-700 text-white disabled:opacity-40"
          >
            <CheckCircle2 size={15} aria-hidden="true" />
          </button>
        </div>
        <ol className="mt-2 space-y-1">
          {logbook
            .slice(-4)
            .reverse()
            .map((entry) => (
              <li
                key={entry.id}
                className="rounded bg-slate-800/35 px-2 py-1.5 text-[9px] text-slate-300"
              >
                <span className="font-mono text-slate-500">
                  {formatMinute(entry.simulationMinute)}
                </span>{' '}
                <span className="font-semibold text-slate-200">{entry.author}:</span>{' '}
                {entry.message}
              </li>
            ))}
        </ol>
      </form>
    </section>
  );
});

OperationsCampaignPanel.displayName = 'OperationsCampaignPanel';
