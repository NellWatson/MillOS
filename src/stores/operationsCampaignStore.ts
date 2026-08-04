import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MaterialManifest, MaterialType, ProductionBatch } from './materialFlowStore';
import type { WorkerData, WorkerSkills } from '../types';
import { safeJSONStorage } from './storage';

export type OrderStatus = 'planned' | 'active' | 'late' | 'fulfilled' | 'cancelled';
export type AssignmentKind =
  | 'production'
  | 'quality'
  | 'maintenance'
  | 'forklift'
  | 'supervision'
  | 'safety'
  | 'break';
export type AssignmentStatus = 'active' | 'completed' | 'blocked';
export type IncidentKind =
  | 'bearing_overheat'
  | 'dust_filter_pressure'
  | 'power_sag'
  | 'delayed_truck'
  | 'supplier_contamination'
  | 'packaging_shortage'
  | 'severe_rain'
  | 'understaffing';
export type IncidentPhase = 'raised' | 'acknowledged' | 'mitigated' | 'resolved';
export type LogCategory = 'operation' | 'quality' | 'maintenance' | 'safety' | 'shift';

export interface MillRecipe {
  id: string;
  label: string;
  finishedMaterial: Extract<MaterialType, 'flour' | 'semolina'>;
  sourceMaterial: Extract<MaterialType, 'wheat_grain' | 'corn_grain'>;
  minimumQuality: number;
}

export interface CustomerOrder {
  id: string;
  customer: string;
  recipe: MillRecipe;
  requiredKg: number;
  shippedKg: number;
  qualityFailureKg: number;
  dueAtMinute: number;
  priority: 'normal' | 'high' | 'critical';
  revenuePerKg: number;
  latePenaltyPerKgHour: number;
  status: OrderStatus;
  batchIds: string[];
  manifestIds: string[];
  completedAtMinute: number | null;
}

export interface PersonnelCampaignState {
  workerId: string;
  energy: number;
  fatigue: number;
  tasksCompleted: number;
  lastBreakAtMinute: number;
}

export interface PersonnelAssignment {
  id: string;
  workerId: string;
  kind: AssignmentKind;
  targetId: string | null;
  startedAtMinute: number;
  progress: number;
  effectiveness: number;
  certified: boolean;
  status: AssignmentStatus;
}

export interface OperationalIncident {
  id: string;
  kind: IncidentKind;
  title: string;
  description: string;
  phase: IncidentPhase;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startedAtMinute: number;
  acknowledgedAtMinute: number | null;
  resolvedAtMinute: number | null;
  affectedMachineId: string | null;
  /** Cross-system consequence has been applied exactly once. */
  effectApplied: boolean;
}

export interface CampaignEconomics {
  revenue: number;
  energyCost: number;
  labourCost: number;
  wasteCost: number;
  maintenanceCost: number;
  demurrageCost: number;
  latePenalties: number;
}

export interface ShiftCampaignMetrics extends CampaignEconomics {
  dispatchedKg: number;
  incidentsResolved: number;
  tasksCompleted: number;
}

export interface ShiftCampaignReport {
  id: string;
  shiftKey: string;
  shiftLabel: string;
  startedAtMinute: number;
  endedAtMinute: number;
  metrics: ShiftCampaignMetrics;
  completedOrderIds: string[];
  openRisks: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
}

export interface CampaignLogEntry {
  id: string;
  simulationMinute: number;
  author: string;
  category: LogCategory;
  message: string;
  relatedId: string | null;
}

export interface CampaignConstraint {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  label: string;
  detail: string;
  relatedId: string | null;
}

export interface CampaignTickContext {
  shiftKey: string;
  shiftLabel: string;
  workers: ReadonlyArray<WorkerData>;
  manifests: ReadonlyArray<MaterialManifest>;
  productionBatches: ReadonlyArray<ProductionBatch>;
  totalEnergyKw: number;
  averageQuality: number;
  wasteKg: number;
  storageUtilization: number;
  shippingDocked: boolean;
  receivingDocked: boolean;
  dispatchReleased: boolean;
  openWorkOrders: number;
}

export interface IncidentEffect {
  productionMultiplier: number;
  energyMultiplier: number;
  qualityPenalty: number;
  dispatchBlocked: boolean;
}

interface OperationsCampaignState {
  initialized: boolean;
  elapsedMinutes: number;
  orders: CustomerOrder[];
  activeOrderId: string | null;
  personnel: PersonnelCampaignState[];
  assignments: PersonnelAssignment[];
  incidents: OperationalIncident[];
  economics: CampaignEconomics;
  shiftMetrics: ShiftCampaignMetrics;
  reports: ShiftCampaignReport[];
  logbook: CampaignLogEntry[];
  constraints: CampaignConstraint[];
  processedManifestIds: string[];
  lastWasteKg: number;
  currentShiftKey: string | null;
  currentShiftLabel: string;
  shiftStartedAtMinute: number;
  sequence: number;
  initializeCampaign: (workers: ReadonlyArray<WorkerData>) => void;
  activateOrder: (orderId: string) => void;
  assignWorker: (
    worker: WorkerData,
    kind: AssignmentKind,
    targetId?: string | null
  ) => PersonnelAssignment;
  sendWorkerOnBreak: (worker: WorkerData) => PersonnelAssignment;
  triggerIncident: (kind: IncidentKind) => OperationalIncident | null;
  acknowledgeIncident: (incidentId: string) => void;
  mitigateIncident: (incidentId: string) => void;
  resolveIncident: (incidentId: string) => void;
  markIncidentEffectApplied: (incidentId: string) => void;
  addLogEntry: (
    author: string,
    category: LogCategory,
    message: string,
    relatedId?: string | null
  ) => void;
  tickCampaign: (deltaSimulationSeconds: number, context: CampaignTickContext) => void;
  getProductionMultiplier: () => number;
  getIncidentEffect: () => IncidentEffect;
  getWorkerEffectiveness: (workerId: string, kind?: AssignmentKind) => number;
  resetCampaign: () => void;
}

const MAX_LOG_ENTRIES = 160;
const MAX_REPORTS = 12;
const MAX_INCIDENTS = 32;
const MAX_PROCESSED_MANIFESTS = 120;
const EPSILON_KG = 1e-6;

const ZERO_ECONOMICS: CampaignEconomics = {
  revenue: 0,
  energyCost: 0,
  labourCost: 0,
  wasteCost: 0,
  maintenanceCost: 0,
  demurrageCost: 0,
  latePenalties: 0,
};

const ZERO_SHIFT_METRICS: ShiftCampaignMetrics = {
  ...ZERO_ECONOMICS,
  dispatchedKg: 0,
  incidentsResolved: 0,
  tasksCompleted: 0,
};

export const MILL_RECIPES: Record<string, MillRecipe> = {
  strong_white: {
    id: 'strong_white',
    label: 'Strong white bread flour',
    finishedMaterial: 'flour',
    sourceMaterial: 'wheat_grain',
    minimumQuality: 95,
  },
  fine_semolina: {
    id: 'fine_semolina',
    label: 'Fine pasta semolina',
    finishedMaterial: 'semolina',
    sourceMaterial: 'corn_grain',
    minimumQuality: 90,
  },
  community_flour: {
    id: 'community_flour',
    label: 'Community all-purpose flour',
    finishedMaterial: 'flour',
    sourceMaterial: 'wheat_grain',
    minimumQuality: 92,
  },
};

function createInitialOrders(): CustomerOrder[] {
  return [
    {
      id: 'order-001',
      customer: "Riverside Bakers' Cooperative",
      recipe: MILL_RECIPES.strong_white,
      requiredKg: 6000,
      shippedKg: 0,
      qualityFailureKg: 0,
      dueAtMinute: 240,
      priority: 'critical',
      revenuePerKg: 0.82,
      latePenaltyPerKgHour: 0.035,
      status: 'active',
      batchIds: [],
      manifestIds: [],
      completedAtMinute: null,
    },
    {
      id: 'order-002',
      customer: 'Community Pasta Works',
      recipe: MILL_RECIPES.fine_semolina,
      requiredKg: 4000,
      shippedKg: 0,
      qualityFailureKg: 0,
      dueAtMinute: 360,
      priority: 'high',
      revenuePerKg: 0.94,
      latePenaltyPerKgHour: 0.03,
      status: 'planned',
      batchIds: [],
      manifestIds: [],
      completedAtMinute: null,
    },
    {
      id: 'order-003',
      customer: 'County School Meals',
      recipe: MILL_RECIPES.community_flour,
      requiredKg: 8000,
      shippedKg: 0,
      qualityFailureKg: 0,
      dueAtMinute: 480,
      priority: 'normal',
      revenuePerKg: 0.68,
      latePenaltyPerKgHour: 0.02,
      status: 'planned',
      batchIds: [],
      manifestIds: [],
      completedAtMinute: null,
    },
  ];
}

export const INCIDENT_DEFINITIONS: Record<
  IncidentKind,
  Omit<
    OperationalIncident,
    | 'id'
    | 'phase'
    | 'startedAtMinute'
    | 'acknowledgedAtMinute'
    | 'resolvedAtMinute'
    | 'effectApplied'
  > & {
    effect: IncidentEffect;
  }
> = {
  bearing_overheat: {
    kind: 'bearing_overheat',
    title: 'Roller mill bearing overheat',
    description: 'R.M. 101 bearing temperature is rising toward the trip point.',
    severity: 'high',
    affectedMachineId: 'rm-101',
    effect: {
      productionMultiplier: 0.82,
      energyMultiplier: 1.08,
      qualityPenalty: 0,
      dispatchBlocked: false,
    },
  },
  dust_filter_pressure: {
    kind: 'dust_filter_pressure',
    title: 'Dust-filter differential pressure',
    description: 'Extraction resistance is increasing around the sifting floor.',
    severity: 'high',
    affectedMachineId: 'sifter-b',
    effect: {
      productionMultiplier: 0.88,
      energyMultiplier: 1.12,
      qualityPenalty: 3,
      dispatchBlocked: false,
    },
  },
  power_sag: {
    kind: 'power_sag',
    title: 'Site power sag',
    description: 'Incoming voltage is unstable and motor protection is limiting load.',
    severity: 'critical',
    affectedMachineId: null,
    effect: {
      productionMultiplier: 0.45,
      energyMultiplier: 0.7,
      qualityPenalty: 1,
      dispatchBlocked: false,
    },
  },
  delayed_truck: {
    kind: 'delayed_truck',
    title: 'Delayed dispatch truck',
    description: 'The scheduled collection is delayed, increasing finished-goods pressure.',
    severity: 'medium',
    affectedMachineId: null,
    effect: {
      productionMultiplier: 0.92,
      energyMultiplier: 1,
      qualityPenalty: 0,
      dispatchBlocked: false,
    },
  },
  supplier_contamination: {
    kind: 'supplier_contamination',
    title: 'Supplier contamination alert',
    description: 'A source-lot notification requires immediate hold and traceability review.',
    severity: 'critical',
    affectedMachineId: null,
    effect: {
      productionMultiplier: 0.7,
      energyMultiplier: 1,
      qualityPenalty: 10,
      dispatchBlocked: true,
    },
  },
  packaging_shortage: {
    kind: 'packaging_shortage',
    title: 'Packaging material shortage',
    description: 'Packer consumables are below the quantity required for the active commitments.',
    severity: 'high',
    affectedMachineId: 'packer-0',
    effect: {
      productionMultiplier: 0.6,
      energyMultiplier: 0.88,
      qualityPenalty: 0,
      dispatchBlocked: false,
    },
  },
  severe_rain: {
    kind: 'severe_rain',
    title: 'Severe rain and drainage loading',
    description: 'Yard drainage and the stream are rising, slowing vehicle movements.',
    severity: 'high',
    affectedMachineId: null,
    effect: {
      productionMultiplier: 0.9,
      energyMultiplier: 1.06,
      qualityPenalty: 1,
      dispatchBlocked: false,
    },
  },
  understaffing: {
    kind: 'understaffing',
    title: 'Understaffed shift',
    description: 'Critical roles are uncovered and response capacity is reduced.',
    severity: 'high',
    affectedMachineId: null,
    effect: {
      productionMultiplier: 0.75,
      energyMultiplier: 1.03,
      qualityPenalty: 4,
      dispatchBlocked: false,
    },
  },
};

const ASSIGNMENT_DURATION_HOURS: Record<AssignmentKind, number | null> = {
  production: null,
  quality: 0.35,
  maintenance: 0.75,
  forklift: 0.5,
  supervision: null,
  safety: 0.5,
  break: 0.35,
};

const ASSIGNMENT_SKILL: Record<AssignmentKind, keyof WorkerSkills> = {
  production: 'machineOperation',
  quality: 'qualityControl',
  maintenance: 'troubleshooting',
  forklift: 'machineOperation',
  supervision: 'teamwork',
  safety: 'safetyProtocols',
  break: 'teamwork',
};

const ASSIGNMENT_CERTIFICATIONS: Partial<Record<AssignmentKind, readonly string[]>> = {
  quality: ['HACCP', 'Lab Analysis', 'ISO 17025', 'Food Science'],
  maintenance: ['Electrical Systems', 'Mechanical Systems', 'Pneumatics', 'PLC Programming'],
  forklift: ['Forklift License'],
  safety: ['OSHA', 'Fire Safety', 'First Aid'],
};

function cloneEconomics(source: CampaignEconomics): CampaignEconomics {
  return { ...source };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function appendBounded<T>(values: readonly T[], value: T, limit: number): T[] {
  return [...values.slice(-(limit - 1)), value];
}

function priorityRank(priority: CustomerOrder['priority']): number {
  return priority === 'critical' ? 0 : priority === 'high' ? 1 : 2;
}

export function deriveWorkerSkills(worker: WorkerData): WorkerSkills {
  const experience = clamp(Math.floor(worker.experience / 3) + 1, 1, 5) as 1 | 2 | 3 | 4 | 5;
  const base: WorkerSkills = {
    machineOperation: Math.max(1, Math.min(5, experience)) as WorkerSkills['machineOperation'],
    safetyProtocols: Math.max(1, Math.min(5, experience)) as WorkerSkills['safetyProtocols'],
    qualityControl: Math.max(1, Math.min(5, experience - 1)) as WorkerSkills['qualityControl'],
    troubleshooting: Math.max(1, Math.min(5, experience - 1)) as WorkerSkills['troubleshooting'],
    teamwork: Math.max(1, Math.min(5, experience)) as WorkerSkills['teamwork'],
  };

  if (worker.role === 'Quality Control') base.qualityControl = 5;
  if (worker.role === 'Maintenance' || worker.role === 'Engineer') base.troubleshooting = 5;
  if (worker.role === 'Safety Officer') base.safetyProtocols = 5;
  if (worker.role === 'Supervisor') base.teamwork = 5;
  if (worker.role === 'Operator')
    base.machineOperation = Math.max(3, base.machineOperation) as WorkerSkills['machineOperation'];
  return worker.skills ?? base;
}

export function isWorkerCertified(worker: WorkerData, kind: AssignmentKind): boolean {
  const required = ASSIGNMENT_CERTIFICATIONS[kind];
  return (
    !required || required.some((certification) => worker.certifications.includes(certification))
  );
}

export function calculateWorkerEffectiveness(
  worker: WorkerData,
  personnel: PersonnelCampaignState | undefined,
  kind: AssignmentKind
): number {
  if (kind === 'break') return 1;
  const skills = deriveWorkerSkills(worker);
  const skill = skills[ASSIGNMENT_SKILL[kind]] / 5;
  const energy = clamp(personnel?.energy ?? worker.energy ?? 100, 0, 100) / 100;
  const experience = clamp(worker.experience / 15, 0, 1);
  const certified = isWorkerCertified(worker, kind);
  return clamp((skill * 0.6 + energy * 0.3 + experience * 0.1) * (certified ? 1 : 0.55), 0.2, 1.15);
}

export function getAssignmentLabel(assignment: PersonnelAssignment): string {
  const target = assignment.targetId ? ` at ${assignment.targetId}` : '';
  switch (assignment.kind) {
    case 'production':
      return `Running production${target}`;
    case 'quality':
      return `Sampling and quality release${target}`;
    case 'maintenance':
      return `Repair and verification${target}`;
    case 'forklift':
      return `Moving materials${target}`;
    case 'supervision':
      return 'Coordinating the shift';
    case 'safety':
      return `Safety inspection${target}`;
    case 'break':
      return 'Taking a restorative break';
  }
}

function defaultAssignmentFor(worker: WorkerData): AssignmentKind {
  if (worker.role === 'Quality Control') return 'quality';
  if (worker.role === 'Maintenance') return 'maintenance';
  if (worker.role === 'Safety Officer') return 'safety';
  if (worker.role === 'Supervisor') return 'supervision';
  if (worker.role === 'Operator' && worker.certifications.includes('Forklift License'))
    return 'forklift';
  return 'production';
}

function emptyState() {
  return {
    initialized: false,
    elapsedMinutes: 0,
    orders: createInitialOrders(),
    activeOrderId: 'order-001',
    personnel: [] as PersonnelCampaignState[],
    assignments: [] as PersonnelAssignment[],
    incidents: [] as OperationalIncident[],
    economics: cloneEconomics(ZERO_ECONOMICS),
    shiftMetrics: { ...ZERO_SHIFT_METRICS },
    reports: [] as ShiftCampaignReport[],
    logbook: [] as CampaignLogEntry[],
    constraints: [] as CampaignConstraint[],
    processedManifestIds: [] as string[],
    lastWasteKg: 0,
    currentShiftKey: null as string | null,
    currentShiftLabel: 'Morning',
    shiftStartedAtMinute: 0,
    sequence: 0,
  };
}

function combinedIncidentEffect(incidents: ReadonlyArray<OperationalIncident>): IncidentEffect {
  const effect: IncidentEffect = {
    productionMultiplier: 1,
    energyMultiplier: 1,
    qualityPenalty: 0,
    dispatchBlocked: false,
  };
  incidents.forEach((incident) => {
    if (incident.phase === 'resolved') return;
    const definition = INCIDENT_DEFINITIONS[incident.kind].effect;
    const mitigation = incident.phase === 'mitigated' ? 0.5 : 1;
    effect.productionMultiplier *= 1 - (1 - definition.productionMultiplier) * mitigation;
    effect.energyMultiplier *= 1 + (definition.energyMultiplier - 1) * mitigation;
    effect.qualityPenalty += definition.qualityPenalty * mitigation;
    effect.dispatchBlocked ||= definition.dispatchBlocked && incident.phase !== 'mitigated';
  });
  effect.productionMultiplier = clamp(effect.productionMultiplier, 0.2, 1);
  effect.energyMultiplier = clamp(effect.energyMultiplier, 0.5, 1.5);
  effect.qualityPenalty = clamp(effect.qualityPenalty, 0, 30);
  return effect;
}

function gradeShift(
  metrics: ShiftCampaignMetrics,
  openRisks: string[]
): ShiftCampaignReport['grade'] {
  const margin =
    metrics.revenue -
    metrics.energyCost -
    metrics.labourCost -
    metrics.wasteCost -
    metrics.maintenanceCost -
    metrics.demurrageCost -
    metrics.latePenalties;
  if (openRisks.length === 0 && margin >= 0 && metrics.dispatchedKg >= 4000) return 'A';
  if (openRisks.length <= 1 && margin >= 0 && metrics.dispatchedKg >= 2500) return 'B';
  if (openRisks.length <= 2 && metrics.dispatchedKg > 0) return 'C';
  if (metrics.dispatchedKg > 0) return 'D';
  return 'F';
}

function makeConstraints(
  state: Pick<OperationsCampaignState, 'orders' | 'incidents' | 'elapsedMinutes' | 'personnel'>,
  context: CampaignTickContext,
  incidentEffect: IncidentEffect
): CampaignConstraint[] {
  const constraints: CampaignConstraint[] = [];
  if (context.storageUtilization >= 0.85) {
    constraints.push({
      id: 'storage-high',
      severity: context.storageUtilization >= 0.95 ? 'critical' : 'warning',
      label: 'Storage capacity',
      detail: `${Math.round(context.storageUtilization * 100)}% of material capacity is occupied.`,
      relatedId: null,
    });
  }
  const nextOrder = state.orders
    .filter((order) => order.status !== 'fulfilled' && order.status !== 'cancelled')
    .sort((a, b) => a.dueAtMinute - b.dueAtMinute)[0];
  if (nextOrder) {
    const remainingMinutes = nextOrder.dueAtMinute - state.elapsedMinutes;
    if (remainingMinutes <= 90) {
      constraints.push({
        id: `order-due-${nextOrder.id}`,
        severity: remainingMinutes <= 0 ? 'critical' : 'warning',
        label: `${nextOrder.customer} commitment`,
        detail: `${Math.max(0, nextOrder.requiredKg - nextOrder.shippedKg).toFixed(0)} kg remains, ${Math.round(Math.abs(remainingMinutes))} min ${remainingMinutes < 0 ? 'late' : 'to due time'}.`,
        relatedId: nextOrder.id,
      });
    }
  }
  if (context.shippingDocked && (!context.dispatchReleased || incidentEffect.dispatchBlocked)) {
    constraints.push({
      id: 'dispatch-blocked',
      severity: 'critical',
      label: 'Dispatch interlock',
      detail: 'A truck is at the bay but quality or incident controls block loading.',
      relatedId: null,
    });
  }
  if (context.openWorkOrders > 0) {
    constraints.push({
      id: 'maintenance-open',
      severity: 'warning',
      label: 'Maintenance capacity',
      detail: `${context.openWorkOrders} work order${context.openWorkOrders === 1 ? '' : 's'} remains open.`,
      relatedId: null,
    });
  }
  const fatigued = state.personnel.filter((person) => person.energy < 35).length;
  if (fatigued > 0) {
    constraints.push({
      id: 'fatigue',
      severity: fatigued >= 3 ? 'critical' : 'warning',
      label: 'Personnel fatigue',
      detail: `${fatigued} person${fatigued === 1 ? '' : 'nel'} needs a restorative break.`,
      relatedId: null,
    });
  }
  state.incidents
    .filter((incident) => incident.phase !== 'resolved')
    .slice(-3)
    .forEach((incident) => {
      constraints.push({
        id: `incident-${incident.id}`,
        severity: incident.severity === 'critical' ? 'critical' : 'warning',
        label: incident.title,
        detail: `${incident.phase}: ${incident.description}`,
        relatedId: incident.id,
      });
    });
  return constraints.slice(0, 8);
}

export const useOperationsCampaignStore = create<OperationsCampaignState>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      initializeCampaign: (workers) => {
        if (get().initialized) return;
        const personnel = workers.map((worker) => ({
          workerId: worker.id,
          energy: clamp(worker.energy ?? 100, 0, 100),
          fatigue: clamp(100 - (worker.energy ?? 100), 0, 100),
          tasksCompleted: worker.tasksCompleted ?? 0,
          lastBreakAtMinute: 0,
        }));
        let sequence = 0;
        const assignments = workers.map((worker) => {
          sequence += 1;
          const kind = defaultAssignmentFor(worker);
          return {
            id: `assignment-${String(sequence).padStart(4, '0')}`,
            workerId: worker.id,
            kind,
            targetId: worker.targetMachine ?? null,
            startedAtMinute: 0,
            progress: 0,
            effectiveness: calculateWorkerEffectiveness(
              worker,
              personnel.find((person) => person.workerId === worker.id),
              kind
            ),
            certified: isWorkerCertified(worker, kind),
            status: 'active' as const,
          };
        });
        set({
          initialized: true,
          personnel,
          assignments,
          logbook: [
            {
              id: `log-${String(sequence + 1).padStart(4, '0')}`,
              simulationMinute: 0,
              author: 'Shift system',
              category: 'shift',
              message: 'Operations campaign initialized with the current roster and commitments.',
              relatedId: 'order-001',
            },
          ],
          sequence: sequence + 1,
        });
      },

      activateOrder: (orderId) =>
        set((state) => ({
          activeOrderId: state.orders.some((order) => order.id === orderId)
            ? orderId
            : state.activeOrderId,
          orders: state.orders.map((order) =>
            order.id === orderId && order.status === 'planned'
              ? { ...order, status: 'active' }
              : order
          ),
        })),

      assignWorker: (worker, kind, targetId = null) => {
        const state = get();
        const sequence = state.sequence + 1;
        const personnel = state.personnel.find((person) => person.workerId === worker.id);
        const assignment: PersonnelAssignment = {
          id: `assignment-${String(sequence).padStart(4, '0')}`,
          workerId: worker.id,
          kind,
          targetId,
          startedAtMinute: state.elapsedMinutes,
          progress: 0,
          effectiveness: calculateWorkerEffectiveness(worker, personnel, kind),
          certified: isWorkerCertified(worker, kind),
          status: 'active',
        };
        set({
          assignments: [
            ...state.assignments.map((candidate) =>
              candidate.workerId === worker.id && candidate.status === 'active'
                ? { ...candidate, status: 'completed' as const }
                : candidate
            ),
            assignment,
          ].slice(-80),
          sequence,
        });
        return assignment;
      },

      sendWorkerOnBreak: (worker) => get().assignWorker(worker, 'break', 'break-room'),

      triggerIncident: (kind) => {
        const state = get();
        if (
          state.incidents.some(
            (incident) => incident.kind === kind && incident.phase !== 'resolved'
          )
        ) {
          return null;
        }
        const definition = INCIDENT_DEFINITIONS[kind];
        const sequence = state.sequence + 1;
        const incident: OperationalIncident = {
          id: `incident-${String(sequence).padStart(4, '0')}`,
          kind,
          title: definition.title,
          description: definition.description,
          phase: 'raised',
          severity: definition.severity,
          startedAtMinute: state.elapsedMinutes,
          acknowledgedAtMinute: null,
          resolvedAtMinute: null,
          affectedMachineId: definition.affectedMachineId,
          effectApplied: false,
        };
        const log: CampaignLogEntry = {
          id: `log-${String(sequence + 1).padStart(4, '0')}`,
          simulationMinute: state.elapsedMinutes,
          author: 'Incident monitor',
          category: definition.severity === 'critical' ? 'safety' : 'operation',
          message: `${definition.title}: ${definition.description}`,
          relatedId: incident.id,
        };
        set({
          incidents: appendBounded(state.incidents, incident, MAX_INCIDENTS),
          logbook: appendBounded(state.logbook, log, MAX_LOG_ENTRIES),
          sequence: sequence + 1,
        });
        return incident;
      },

      acknowledgeIncident: (incidentId) =>
        set((state) => ({
          incidents: state.incidents.map((incident) =>
            incident.id === incidentId && incident.phase === 'raised'
              ? {
                  ...incident,
                  phase: 'acknowledged',
                  acknowledgedAtMinute: state.elapsedMinutes,
                }
              : incident
          ),
        })),

      mitigateIncident: (incidentId) =>
        set((state) => ({
          incidents: state.incidents.map((incident) =>
            incident.id === incidentId && incident.phase !== 'resolved'
              ? {
                  ...incident,
                  phase: 'mitigated',
                  acknowledgedAtMinute: incident.acknowledgedAtMinute ?? state.elapsedMinutes,
                }
              : incident
          ),
        })),

      resolveIncident: (incidentId) =>
        set((state) => {
          const incident = state.incidents.find((candidate) => candidate.id === incidentId);
          if (!incident || incident.phase === 'resolved') return state;
          const sequence = state.sequence + 1;
          return {
            incidents: state.incidents.map((candidate) =>
              candidate.id === incidentId
                ? { ...candidate, phase: 'resolved', resolvedAtMinute: state.elapsedMinutes }
                : candidate
            ),
            shiftMetrics: {
              ...state.shiftMetrics,
              incidentsResolved: state.shiftMetrics.incidentsResolved + 1,
            },
            logbook: appendBounded(
              state.logbook,
              {
                id: `log-${String(sequence).padStart(4, '0')}`,
                simulationMinute: state.elapsedMinutes,
                author: 'Shift operator',
                category: 'operation',
                message: `${incident.title} marked resolved. Residual machine, quality, and maintenance interlocks remain explicit.`,
                relatedId: incident.id,
              },
              MAX_LOG_ENTRIES
            ),
            sequence,
          };
        }),

      markIncidentEffectApplied: (incidentId) =>
        set((state) => ({
          incidents: state.incidents.map((incident) =>
            incident.id === incidentId && !incident.effectApplied
              ? { ...incident, effectApplied: true }
              : incident
          ),
        })),

      addLogEntry: (author, category, message, relatedId = null) => {
        const cleanMessage = message.trim().slice(0, 500);
        if (!cleanMessage) return;
        set((state) => {
          const sequence = state.sequence + 1;
          return {
            logbook: appendBounded(
              state.logbook,
              {
                id: `log-${String(sequence).padStart(4, '0')}`,
                simulationMinute: state.elapsedMinutes,
                author: author.trim().slice(0, 80) || 'Simulation operator',
                category,
                message: cleanMessage,
                relatedId,
              },
              MAX_LOG_ENTRIES
            ),
            sequence,
          };
        });
      },

      tickCampaign: (deltaSimulationSeconds, context) => {
        if (!Number.isFinite(deltaSimulationSeconds) || deltaSimulationSeconds <= 0) return;
        if (!get().initialized) get().initializeCampaign(context.workers);
        set((state) => {
          const deltaHours = Math.min(deltaSimulationSeconds, 300) / 3600;
          const elapsedMinutes = state.elapsedMinutes + deltaHours * 60;
          const incidentEffect = combinedIncidentEffect(state.incidents);
          let sequence = state.sequence;
          const economics = { ...state.economics };
          let shiftMetrics = { ...state.shiftMetrics };
          let logbook = state.logbook;
          let processedManifestIds = [...state.processedManifestIds];
          let orders = state.orders.map((order) => ({
            ...order,
            batchIds: [...order.batchIds],
            manifestIds: [...order.manifestIds],
          }));
          let assignments = state.assignments.map((assignment) => ({ ...assignment }));
          const personnel = state.personnel.map((person) => ({ ...person }));

          const personnelById = new Map(personnel.map((person) => [person.workerId, person]));
          const workersById = new Map(context.workers.map((worker) => [worker.id, worker]));
          assignments = assignments.map((assignment) => {
            if (assignment.status !== 'active') return assignment;
            const worker = workersById.get(assignment.workerId);
            const person = personnelById.get(assignment.workerId);
            if (!worker || !person) return { ...assignment, status: 'blocked' };
            const drainPerHour =
              assignment.kind === 'break'
                ? -45
                : assignment.kind === 'supervision'
                  ? 3
                  : assignment.kind === 'safety' || assignment.kind === 'quality'
                    ? 4
                    : 5.5;
            person.energy = clamp(person.energy - drainPerHour * deltaHours, 0, 100);
            person.fatigue = 100 - person.energy;
            if (assignment.kind === 'break') person.lastBreakAtMinute = elapsedMinutes;
            const effectiveness = calculateWorkerEffectiveness(worker, person, assignment.kind);
            const duration = ASSIGNMENT_DURATION_HOURS[assignment.kind];
            const progress =
              duration === null
                ? assignment.progress
                : clamp(
                    assignment.progress + (deltaHours / duration) * 100 * effectiveness,
                    0,
                    100
                  );
            const completed = duration !== null && progress >= 100;
            if (completed) {
              person.tasksCompleted += 1;
              shiftMetrics.tasksCompleted += 1;
            }
            return {
              ...assignment,
              effectiveness,
              progress,
              status: completed ? 'completed' : assignment.status,
            };
          });

          const batchesById = new Map(context.productionBatches.map((batch) => [batch.id, batch]));
          const newShippingManifests = context.manifests.filter(
            (manifest) =>
              manifest.kind === 'shipping' && !processedManifestIds.includes(manifest.id)
          );
          newShippingManifests.forEach((manifest) => {
            processedManifestIds.push(manifest.id);
            const contributions = manifest.productBatches.length
              ? manifest.productBatches
              : manifest.materials.map((material, index) => ({
                  batchId: `unattributed-${manifest.id}-${index}`,
                  amount: material.amount,
                }));
            contributions.forEach((contribution) => {
              const batch = batchesById.get(contribution.batchId);
              const materialType = batch?.materialType ?? 'flour';
              let remaining = contribution.amount;
              const candidates = orders
                .filter(
                  (order) =>
                    order.status !== 'fulfilled' &&
                    order.status !== 'cancelled' &&
                    order.recipe.finishedMaterial === materialType
                )
                .sort(
                  (a, b) =>
                    priorityRank(a.priority) - priorityRank(b.priority) ||
                    a.dueAtMinute - b.dueAtMinute ||
                    a.id.localeCompare(b.id)
                );
              for (const order of candidates) {
                if (remaining <= EPSILON_KG) break;
                const orderRemaining = Math.max(0, order.requiredKg - order.shippedKg);
                const allocated = Math.min(orderRemaining, remaining);
                if (allocated <= EPSILON_KG) continue;
                order.shippedKg += allocated;
                remaining -= allocated;
                order.status =
                  order.shippedKg >= order.requiredKg - EPSILON_KG ? 'fulfilled' : 'active';
                if (order.status === 'fulfilled') order.completedAtMinute = elapsedMinutes;
                if (context.averageQuality < order.recipe.minimumQuality) {
                  order.qualityFailureKg += allocated;
                  economics.latePenalties += allocated * 0.08;
                  shiftMetrics.latePenalties += allocated * 0.08;
                }
                if (batch && !order.batchIds.includes(batch.id)) order.batchIds.push(batch.id);
                if (!order.manifestIds.includes(manifest.id)) order.manifestIds.push(manifest.id);
                const revenue = allocated * order.revenuePerKg;
                economics.revenue += revenue;
                shiftMetrics.revenue += revenue;
                shiftMetrics.dispatchedKg += allocated;
              }
            });
            sequence += 1;
            logbook = appendBounded(
              logbook,
              {
                id: `log-${String(sequence).padStart(4, '0')}`,
                simulationMinute: elapsedMinutes,
                author: 'Dispatch system',
                category: 'operation',
                message: `${manifest.id} allocated ${manifest.actualKg.toFixed(1)} kg across active customer commitments.`,
                relatedId: manifest.id,
              },
              MAX_LOG_ENTRIES
            );
          });
          processedManifestIds = processedManifestIds.slice(-MAX_PROCESSED_MANIFESTS);

          orders = orders.map((order) => {
            if (
              order.status !== 'fulfilled' &&
              order.status !== 'cancelled' &&
              elapsedMinutes > order.dueAtMinute
            ) {
              return { ...order, status: 'late' };
            }
            return order;
          });

          const effectiveEnergyKw = Math.max(
            0,
            context.totalEnergyKw * incidentEffect.energyMultiplier
          );
          const tariff =
            elapsedMinutes % (24 * 60) >= 9 * 60 && elapsedMinutes % (24 * 60) <= 21 * 60
              ? 0.15
              : 0.08;
          const energyCost = effectiveEnergyKw * tariff * deltaHours;
          const labourCost = context.workers.length * 32 * deltaHours;
          const wasteDelta = Math.max(0, context.wasteKg - state.lastWasteKg);
          const wasteCost = wasteDelta * 0.18;
          const maintenanceCost = context.openWorkOrders * 90 * deltaHours;
          const demurrageCost =
            context.shippingDocked && (!context.dispatchReleased || incidentEffect.dispatchBlocked)
              ? 120 * deltaHours
              : 0;
          const latePenalties = orders.reduce((sum, order) => {
            if (order.status !== 'late') return sum;
            const remainingKg = Math.max(0, order.requiredKg - order.shippedKg);
            return sum + remainingKg * order.latePenaltyPerKgHour * deltaHours;
          }, 0);
          economics.energyCost += energyCost;
          economics.labourCost += labourCost;
          economics.wasteCost += wasteCost;
          economics.maintenanceCost += maintenanceCost;
          economics.demurrageCost += demurrageCost;
          economics.latePenalties += latePenalties;
          shiftMetrics.energyCost += energyCost;
          shiftMetrics.labourCost += labourCost;
          shiftMetrics.wasteCost += wasteCost;
          shiftMetrics.maintenanceCost += maintenanceCost;
          shiftMetrics.demurrageCost += demurrageCost;
          shiftMetrics.latePenalties += latePenalties;

          let reports = state.reports;
          let currentShiftKey = state.currentShiftKey ?? context.shiftKey;
          let currentShiftLabel = state.currentShiftKey
            ? state.currentShiftLabel
            : context.shiftLabel;
          let shiftStartedAtMinute = state.currentShiftKey
            ? state.shiftStartedAtMinute
            : state.elapsedMinutes;
          if (currentShiftKey !== context.shiftKey) {
            const openRisks = makeConstraints(
              { orders, incidents: state.incidents, elapsedMinutes, personnel },
              context,
              incidentEffect
            )
              .filter((constraint) => constraint.severity !== 'info')
              .map((constraint) => constraint.label);
            const grade = gradeShift(shiftMetrics, openRisks);
            sequence += 1;
            const report: ShiftCampaignReport = {
              id: `shift-report-${String(sequence).padStart(4, '0')}`,
              shiftKey: currentShiftKey,
              shiftLabel: currentShiftLabel,
              startedAtMinute: shiftStartedAtMinute,
              endedAtMinute: elapsedMinutes,
              metrics: { ...shiftMetrics },
              completedOrderIds: orders
                .filter(
                  (order) =>
                    order.status === 'fulfilled' &&
                    order.completedAtMinute !== null &&
                    order.completedAtMinute >= shiftStartedAtMinute
                )
                .map((order) => order.id),
              openRisks,
              grade,
              summary:
                grade === 'A' || grade === 'B'
                  ? 'Commitments, controls, and recovery actions remained coherent through the shift.'
                  : 'The next shift inherits material constraints or unresolved operational risk.',
            };
            reports = appendBounded(reports, report, MAX_REPORTS);
            sequence += 1;
            logbook = appendBounded(
              logbook,
              {
                id: `log-${String(sequence).padStart(4, '0')}`,
                simulationMinute: elapsedMinutes,
                author: 'Shift system',
                category: 'shift',
                message: `${currentShiftLabel} shift closed with grade ${grade}.`,
                relatedId: report.id,
              },
              MAX_LOG_ENTRIES
            );
            currentShiftKey = context.shiftKey;
            currentShiftLabel = context.shiftLabel;
            shiftStartedAtMinute = elapsedMinutes;
            shiftMetrics = { ...ZERO_SHIFT_METRICS };
          }

          const constraints = makeConstraints(
            { orders, incidents: state.incidents, elapsedMinutes, personnel },
            context,
            incidentEffect
          );

          return {
            elapsedMinutes,
            orders,
            personnel,
            assignments: assignments.slice(-80),
            economics,
            shiftMetrics,
            reports,
            logbook,
            constraints,
            processedManifestIds,
            lastWasteKg: context.wasteKg,
            currentShiftKey,
            currentShiftLabel,
            shiftStartedAtMinute,
            sequence,
          };
        });
      },

      getIncidentEffect: () => combinedIncidentEffect(get().incidents),

      getProductionMultiplier: () => {
        const state = get();
        const incidentMultiplier = combinedIncidentEffect(state.incidents).productionMultiplier;
        const activeAssignments = state.assignments.filter(
          (assignment) => assignment.status === 'active' && assignment.kind !== 'break'
        );
        const operationalAssignments = activeAssignments.filter((assignment) =>
          ['production', 'forklift', 'supervision'].includes(assignment.kind)
        );
        const personnelMultiplier = operationalAssignments.length
          ? clamp(
              operationalAssignments.reduce(
                (sum, assignment) => sum + assignment.effectiveness,
                0
              ) / operationalAssignments.length,
              0.65,
              1.08
            )
          : 1;
        return clamp(incidentMultiplier * personnelMultiplier, 0.2, 1.08);
      },

      getWorkerEffectiveness: (workerId, kind) => {
        const assignments = get().assignments.filter(
          (assignment) =>
            assignment.workerId === workerId &&
            assignment.status === 'active' &&
            (!kind || assignment.kind === kind)
        );
        return assignments.length
          ? assignments.reduce((sum, assignment) => sum + assignment.effectiveness, 0) /
              assignments.length
          : 1;
      },

      resetCampaign: () => set(emptyState()),
    }),
    {
      name: 'millos-operations-campaign',
      storage: safeJSONStorage,
      version: 1,
      partialize: (state) => ({
        initialized: state.initialized,
        elapsedMinutes: state.elapsedMinutes,
        orders: state.orders,
        activeOrderId: state.activeOrderId,
        personnel: state.personnel,
        assignments: state.assignments,
        incidents: state.incidents,
        economics: state.economics,
        shiftMetrics: state.shiftMetrics,
        reports: state.reports,
        logbook: state.logbook,
        constraints: state.constraints,
        processedManifestIds: state.processedManifestIds,
        lastWasteKg: state.lastWasteKg,
        currentShiftKey: state.currentShiftKey,
        currentShiftLabel: state.currentShiftLabel,
        shiftStartedAtMinute: state.shiftStartedAtMinute,
        sequence: state.sequence,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted && typeof persisted === 'object' ? persisted : {}),
      }),
    }
  )
);
