/**
 * Scenario Store - Bilateral Autonomy System Scenarios
 *
 * Manages scenario-based exploration of different workplace configurations
 * for the Bilateral Autonomy System. Allows users to simulate various
 * organizational dynamics and learn from the outcomes.
 *
 * Scenarios include crisis response, democratic transitions, growth periods,
 * and experimental configurations - all based on Semler/Mondragon principles.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from './storage';
import { sanitizeScenarioState } from './persistenceMigrations';
import type { FiveAxes } from '../types/bas';
import type { IncidentKind } from './operationsCampaignStore';

// =============================================================================
// TYPES
// =============================================================================

export interface ScenarioEvent {
  /** Time in seconds when this event triggers */
  time: number;
  /** Type of event */
  type:
    | 'friction_spike'
    | 'delay_increase'
    | 'resource_drop'
    | 'mood_shift'
    | 'demand_surge'
    | 'engagement_change'
    // BAS-specific event types
    | 'vote_called'
    | 'relationship_change'
    | 'solidarity_test'
    | 'federation_request'
    | 'ai_preference'
    | 'choice_point';
  /** Magnitude of the event (0-1) */
  magnitude: number;
  /** Human-readable description */
  description: string;
  /** Optional choice data for choice_point events */
  choices?: ScenarioChoice[];
}

/** Choice option for choice_point events */
export interface ScenarioChoice {
  id: string;
  label: string;
  description: string;
  /** Effects on metrics when this choice is selected */
  effects: {
    friction?: number;
    delay?: number;
    trust?: number;
    solidarity?: number;
    relationshipHealth?: number;
    federationTrust?: number;
    safety?: number;
    traceability?: number;
    quality?: number;
    continuity?: number;
    responseTime?: number;
  };
  /** Outcome description shown after selection */
  outcome: string;
}

export interface ScenarioPhase {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
  instruction?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category:
    | 'crisis'
    | 'growth'
    | 'transition'
    | 'experimental'
    | 'engagement'
    // BAS-specific categories
    | 'economic_democracy'
    | 'bilateral'
    | 'inter_cooperation'
    | 'operational';
  /** Lucide icon name */
  icon: string;
  /** Initial five axes configuration */
  initialAxes: FiveAxes;
  /** Events that occur during the scenario */
  events: ScenarioEvent[];
  /** Duration in seconds */
  duration: number;
  /** Learning objectives for this scenario */
  learningObjectives: string[];
  /** Difficulty level */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  /** Estimated duration string for display */
  durationDisplay?: string;
  /** Scenario phases for multi-phase scenarios */
  phases?: ScenarioPhase[];
  /** Live operations incident activated when this training scenario starts. */
  operationalIncidentKind?: IncidentKind;
  /** Scenario-specific sequence used in the operational debrief. */
  operationalPlaybook?: string[];
  /** Scenario-specific safeguard text keyed to the five scored objectives. */
  operationalSafeguards?: Partial<
    Record<'safety' | 'traceability' | 'quality' | 'continuity' | 'responseTime', string>
  >;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  finalStability: number;
  averageStability: number;
  lowestStability: number;
  eventsTriggered: number;
  eventsHandled: number;
  axisChanges: number;
  finalAxes: FiveAxes;
  learningsUnlocked: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  /** Engagement-specific metrics */
  engagementMetrics?: {
    averageEngagement: number;
    engagementImprovement: number;
    frictionReduction: number;
  };
  /** BAS-specific metrics for economic democracy scenarios */
  basMetrics?: {
    voterParticipation?: number;
    solidarityMaintained?: boolean;
    relationshipHealth?: number;
    federationTrust?: number;
    choicesMade?: string[];
  };
  operationalMetrics?: {
    objectiveScores: {
      safety: number;
      traceability: number;
      quality: number;
      continuity: number;
      responseTime: number;
    };
    overallScore: number;
    missedSafeguards: string[];
    recommendedResponse: string[];
    choiceAudit: OperationalChoiceAuditEntry[];
  };
}

export interface OperationalChoiceAuditEntry {
  choiceId: string;
  eventDescription: string;
  selectedAtSeconds: number;
  scheduledAtSeconds: number;
  responseSeconds: number;
  outcome: string;
  effects: ScenarioChoice['effects'];
}

interface ScenarioState {
  // Available scenarios
  availableScenarios: Scenario[];

  // Active scenario state
  activeScenario: Scenario | null;
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  currentPhase: number;

  // Results tracking
  results: ScenarioResult | null;
  completedScenarios: string[];
  scenarioHistory: ScenarioResult[];

  // Runtime tracking
  stabilityReadings: number[];
  engagementReadings: number[];
  triggeredEvents: string[];
  axisChangeCount: number;
  /** Choice ids selected at choice_point events during the active scenario */
  choicesMade: string[];
  /** Accumulated BAS effect deltas from choices and BAS events */
  basEffectDeltas: {
    solidarity: number;
    relationshipHealth: number;
    federationTrust: number;
  };
  operationalEffectDeltas: {
    safety: number;
    traceability: number;
    quality: number;
    continuity: number;
    responseTime: number;
  };
  operationalChoiceAudit: OperationalChoiceAuditEntry[];

  // Actions
  startScenario: (id: string) => void;
  pauseScenario: () => void;
  resumeScenario: () => void;
  stopScenario: () => void;
  setSpeed: (speed: number) => void;
  tick: (deltaTime: number) => void;

  // Internal
  recordStability: (stability: number) => void;
  recordEngagement: (engagement: number) => void;
  recordAxisChange: () => void;
  recordChoice: (
    choiceId: string,
    effects?: ScenarioChoice['effects'],
    context?: { eventDescription?: string; eventTime?: number; outcome?: string }
  ) => void;
  recordBASEffect: (effects: ScenarioChoice['effects']) => void;
  markEventTriggered: (eventIndex: number) => void;
  calculateResults: (finalAxes: FiveAxes, finalStability: number) => void;

  // Queries
  getScenarioById: (id: string) => Scenario | undefined;
  getPendingEvents: () => ScenarioEvent[];
  getProgress: () => number;
  getCurrentPhase: () => ScenarioPhase | undefined;

  // Reset
  resetScenario: () => void;
}

// =============================================================================
// PRESET SCENARIOS
// =============================================================================

interface IncidentScenarioConfig {
  kind: Exclude<IncidentKind, 'supplier_contamination'>;
  name: string;
  description: string;
  firstAction: string;
  controlAction: string;
  recoveryAction: string;
  evidence: string;
}

const OPERATIONAL_AXES: FiveAxes = {
  autonomyLevel: 62,
  decisionMode: 58,
  informationAccess: 76,
  evaluationDirection: 64,
  collectiveOrientation: 66,
};

function createIncidentScenario(config: IncidentScenarioConfig): Scenario {
  const playbook = [config.firstAction, config.controlAction, config.recoveryAction];
  const safeEffects = {
    safety: 0.24,
    traceability: 0.16,
    quality: 0.16,
    continuity: 0.12,
    responseTime: 0.24,
  };
  return {
    id: `operations-${config.kind.replaceAll('_', '-')}`,
    name: config.name,
    description: config.description,
    category: 'operational',
    icon: 'ShieldAlert',
    difficulty: 'advanced',
    durationDisplay: '2 minutes',
    initialAxes: { ...OPERATIONAL_AXES },
    operationalIncidentKind: config.kind,
    operationalPlaybook: playbook,
    operationalSafeguards: {
      safety: config.firstAction,
      traceability: `Preserve timestamps, affected assets, material identity, and operator decisions using ${config.evidence}.`,
      quality: config.controlAction,
      continuity: config.recoveryAction,
      responseTime:
        'Acknowledge promptly, establish the first safe state, and name the response owner.',
    },
    phases: [
      {
        id: 'stabilize',
        name: 'Stabilize',
        description: 'Establish the first safe operating state.',
        durationSeconds: 40,
        instruction: config.firstAction,
      },
      {
        id: 'control',
        name: 'Control',
        description: 'Use evidence to control the actual scope and consequence.',
        durationSeconds: 40,
        instruction: config.controlAction,
      },
      {
        id: 'recover',
        name: 'Recover',
        description: 'Return to service without hiding residual conditions.',
        durationSeconds: 40,
        instruction: config.recoveryAction,
      },
    ],
    events: [
      {
        time: 16,
        type: 'choice_point',
        magnitude: 0.7,
        description: 'The alarm is active. What is your immediate response?',
        choices: [
          {
            id: `${config.kind}-contain`,
            label: 'Establish the safe state',
            description: config.firstAction,
            effects: safeEffects,
            outcome:
              'The hazard is acknowledged, ownership is clear, and escalation stops before diagnosis begins.',
          },
          {
            id: `${config.kind}-defer`,
            label: 'Wait for more certainty',
            description: 'Continue the current state until the next scheduled review.',
            effects: { safety: -0.22, quality: -0.08, continuity: -0.1, responseTime: -0.3 },
            outcome:
              'The response starts late and the affected scope grows while nobody owns the first action.',
          },
          {
            id: `${config.kind}-override`,
            label: 'Override and maintain output',
            description: 'Treat the alarm as nuisance telemetry and hold the production plan.',
            effects: {
              safety: -0.38,
              traceability: -0.18,
              quality: -0.25,
              continuity: 0.12,
              responseTime: 0.08,
            },
            outcome:
              'Short-term output continues at the cost of an uncontrolled technical and human exposure.',
          },
        ],
      },
      {
        time: 58,
        type: 'choice_point',
        magnitude: 0.65,
        description: `The first safe state is available. Which evidence controls the next decision?`,
        choices: [
          {
            id: `${config.kind}-control`,
            label: 'Use the operational evidence',
            description: `${config.controlAction} Evidence source: ${config.evidence}.`,
            effects: {
              safety: 0.16,
              traceability: 0.3,
              quality: 0.24,
              continuity: 0.12,
              responseTime: 0.06,
            },
            outcome:
              'The response scope follows recorded evidence rather than intuition or blanket restriction.',
          },
          {
            id: `${config.kind}-guess`,
            label: 'Use operator intuition alone',
            description:
              'Act on the most plausible explanation without preserving the evidence trail.',
            effects: { safety: -0.08, traceability: -0.32, quality: -0.12, continuity: 0.08 },
            outcome:
              'The immediate choice may work, but the next shift cannot reproduce or audit the reasoning.',
          },
          {
            id: `${config.kind}-blanket`,
            label: 'Stop the entire site indefinitely',
            description: 'Avoid scope judgment by holding every process and asset.',
            effects: {
              safety: 0.18,
              traceability: -0.08,
              quality: 0.08,
              continuity: -0.36,
              responseTime: -0.18,
            },
            outcome:
              'Exposure is constrained, but a disproportionate hold creates avoidable backlog and cost.',
          },
        ],
      },
      {
        time: 98,
        type: 'choice_point',
        magnitude: 0.65,
        description: 'The controlled condition is stable. How does the mill recover?',
        choices: [
          {
            id: `${config.kind}-recover`,
            label: 'Verify, hand over, recover',
            description: config.recoveryAction,
            effects: {
              safety: 0.16,
              traceability: 0.18,
              quality: 0.18,
              continuity: 0.32,
              responseTime: 0.08,
            },
            outcome:
              'Operations resume from a known state with ownership, residual controls, and evidence intact.',
          },
          {
            id: `${config.kind}-restart-early`,
            label: 'Restart before verification',
            description: 'Resume normal operation as soon as the headline alarm clears.',
            effects: {
              safety: -0.2,
              traceability: -0.14,
              quality: -0.2,
              continuity: 0.2,
              responseTime: 0.1,
            },
            outcome:
              'Output returns quickly, while latent causes and inherited controls remain ambiguous.',
          },
          {
            id: `${config.kind}-stay-closed`,
            label: 'Never release the hold',
            description: 'Keep the safe state indefinitely rather than making a recovery decision.',
            effects: {
              safety: 0.12,
              traceability: 0.04,
              quality: 0.08,
              continuity: -0.38,
              responseTime: -0.18,
            },
            outcome:
              'Risk remains bounded, but the response never becomes an operational recovery.',
          },
        ],
      },
    ],
    duration: 120,
    learningObjectives: [
      ...playbook,
      `Make ${config.evidence} part of the decision record and next-shift handover.`,
    ],
  };
}

const OPERATIONAL_INCIDENT_SCENARIOS: Scenario[] = [
  createIncidentScenario({
    kind: 'bearing_overheat',
    name: 'Bearing Temperature Escalation',
    description:
      'R.M. 101 bearing temperature is rising. Protect the person and machine, diagnose the work order, and verify a controlled restart.',
    firstAction:
      'Reduce load, stop and isolate R.M. 101 before the trip point, then establish a maintenance owner.',
    controlAction:
      'Confirm bearing condition, lubrication, alignment, parts, and affected product before repair.',
    recoveryAction:
      'Complete repair verification, request the restart explicitly, and monitor temperature under staged load.',
    evidence: 'temperature trend, lockout record, work-order audit, and restart readings',
  }),
  createIncidentScenario({
    kind: 'dust_filter_pressure',
    name: 'Dust Extraction Pressure',
    description:
      'Extraction resistance is rising around the sifting floor. Control combustible dust exposure while preserving a proportional production response.',
    firstAction:
      'Reduce dusty operations, inspect extraction differential pressure, and restrict the affected sifting area.',
    controlAction:
      'Verify filter loading, duct condition, ignition controls, and housekeeping before intervention.',
    recoveryAction:
      'Prove extraction flow and dust containment before restoring the sifter in stages.',
    evidence:
      'differential-pressure tags, inspection record, housekeeping check, and airflow verification',
  }),
  createIncidentScenario({
    kind: 'power_sag',
    name: 'Site Power Sag',
    description:
      'Incoming voltage is unstable. Protect motors and product state while deciding which loads can remain available.',
    firstAction:
      'Shed nonessential load, hold unstable drives, and establish the state of every interrupted process.',
    controlAction:
      'Inspect voltage history, protection trips, motor temperature, and material caught between process stages.',
    recoveryAction:
      'Restore loads in a verified sequence and inspect the first post-event production before release.',
    evidence: 'power-quality trend, protection events, machine state, and affected batch genealogy',
  }),
  createIncidentScenario({
    kind: 'delayed_truck',
    name: 'Delayed Dispatch Collection',
    description:
      'A scheduled collection is late. Balance storage, customer promises, production rate, and demurrage without inventing capacity.',
    firstAction:
      'Confirm the revised arrival, identify the threatened commitment, and reserve safe finished-goods capacity.',
    controlAction:
      'Re-sequence production against real storage, quality release, and customer priority constraints.',
    recoveryAction:
      'Load only released product, update the customer promise, and hand over remaining capacity risk.',
    evidence: 'truck ETA, order due times, warehouse utilization, and dispatch manifests',
  }),
  createIncidentScenario({
    kind: 'packaging_shortage',
    name: 'Packaging Material Shortage',
    description:
      'Packer consumables cannot cover the active commitments. Protect label integrity and decide what production remains useful.',
    firstAction:
      'Stop any pack operation that cannot preserve correct package identity and count the usable consumables.',
    controlAction:
      'Re-sequence recipes and commitments using real packaging stock, quality status, and storage capacity.',
    recoveryAction:
      'Verify replenished materials and label setup before staged packing and dispatch.',
    evidence: 'consumables count, recipe and label setup, order priority, and packer batch record',
  }),
  createIncidentScenario({
    kind: 'severe_rain',
    name: 'Severe Rain and Drainage Load',
    description:
      'Yard drainage and the stream are rising. Protect people, vehicles, stored material, and the authored site without hiding the weather consequence.',
    firstAction:
      'Slow yard traffic, close flooded pedestrian routes, and inspect drainage and stream thresholds.',
    controlAction:
      'Move vulnerable goods, preserve safe dock access, and coordinate vehicle movements with the weather state.',
    recoveryAction:
      'Inspect routes, drainage, stream banks, and stored material before normal yard speed returns.',
    evidence:
      'rain state, water-level markers, route inspection, dock status, and material condition',
  }),
  createIncidentScenario({
    kind: 'understaffing',
    name: 'Understaffed Shift',
    description:
      'Critical roles are uncovered. Match certified people to the work, reduce scope, and preserve fatigue controls.',
    firstAction:
      'Identify uncovered safety, quality, maintenance, and forklift duties before setting the production plan.',
    controlAction:
      'Assign certified personnel, reduce line scope where needed, and schedule restorative breaks.',
    recoveryAction:
      'Document inherited gaps, rebalance the next shift, and restore capacity only as qualified coverage returns.',
    evidence: 'roster skills, certifications, live assignments, fatigue, and shift handover',
  }),
];

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'traditional-hierarchy',
    name: 'Traditional Hierarchy',
    description:
      'Start with low autonomy and observe stability issues emerge over time. See how top-down control creates friction and delay.',
    category: 'experimental',
    icon: 'Building2',
    initialAxes: {
      autonomyLevel: 15,
      decisionMode: 10,
      informationAccess: 30,
      evaluationDirection: 10,
      collectiveOrientation: 10,
    },
    events: [
      {
        time: 30,
        type: 'friction_spike',
        magnitude: 0.3,
        description: 'Approval chain bottleneck - workers waiting for authorization',
      },
      {
        time: 60,
        type: 'delay_increase',
        magnitude: 0.25,
        description: 'Information silos creating coordination delays',
      },
      {
        time: 90,
        type: 'mood_shift',
        magnitude: -0.2,
        description: 'Worker frustration rising from lack of autonomy',
      },
      {
        time: 120,
        type: 'friction_spike',
        magnitude: 0.4,
        description: 'Critical decision stuck in management chain',
      },
    ],
    duration: 180,
    learningObjectives: [
      'Observe how low autonomy creates systemic friction',
      'See the connection between approval chains and delay',
      'Understand why traditional hierarchy struggles under stress',
    ],
  },
  {
    id: 'democratic-transition',
    name: 'Democratic Transition',
    description:
      'Guide a workplace from traditional hierarchy to democratic self-management. Balance speed with stability during the change.',
    category: 'transition',
    icon: 'ArrowRightCircle',
    initialAxes: {
      autonomyLevel: 30,
      decisionMode: 25,
      informationAccess: 40,
      evaluationDirection: 20,
      collectiveOrientation: 25,
    },
    events: [
      {
        time: 20,
        type: 'mood_shift',
        magnitude: 0.15,
        description: 'Workers respond positively to increased transparency',
      },
      {
        time: 45,
        type: 'friction_spike',
        magnitude: 0.2,
        description: 'Transition friction - old and new processes collide',
      },
      {
        time: 70,
        type: 'delay_increase',
        magnitude: 0.15,
        description: 'Decision-making temporarily slower as workers learn voting',
      },
      {
        time: 100,
        type: 'mood_shift',
        magnitude: 0.25,
        description: 'Trust building as workers experience agency',
      },
      {
        time: 130,
        type: 'resource_drop',
        magnitude: 0.1,
        description: 'Short-term productivity dip during learning curve',
      },
    ],
    duration: 180,
    learningObjectives: [
      'Learn to pace democratic transitions',
      'Understand temporary instability during change',
      'See how trust builds with genuine autonomy',
    ],
  },
  {
    id: 'crisis-response',
    name: 'Crisis Response',
    description:
      'A sudden crisis hits the factory. Test how different management styles handle high-friction situations.',
    category: 'crisis',
    icon: 'AlertTriangle',
    initialAxes: {
      autonomyLevel: 50,
      decisionMode: 50,
      informationAccess: 60,
      evaluationDirection: 50,
      collectiveOrientation: 40,
    },
    events: [
      {
        time: 10,
        type: 'friction_spike',
        magnitude: 0.5,
        description: 'CRISIS: Major equipment failure - all hands needed',
      },
      {
        time: 15,
        type: 'demand_surge',
        magnitude: 0.6,
        description: 'Customer orders pile up - deadline pressure intensifies',
      },
      {
        time: 30,
        type: 'delay_increase',
        magnitude: 0.3,
        description: 'Communication breakdown under pressure',
      },
      {
        time: 50,
        type: 'mood_shift',
        magnitude: -0.35,
        description: 'Worker stress peaks - morale dropping',
      },
      {
        time: 80,
        type: 'resource_drop',
        magnitude: 0.25,
        description: 'Overtime fatigue affecting capacity',
      },
      {
        time: 100,
        type: 'friction_spike',
        magnitude: -0.2,
        description: 'Crisis stabilizing - friction decreasing',
      },
    ],
    duration: 150,
    learningObjectives: [
      'Compare hierarchical vs democratic crisis response',
      'Understand when rapid decisions vs collective input matter',
      'Learn the stability threshold in high-pressure situations',
    ],
  },
  {
    id: 'growth-period',
    name: 'Growth Period',
    description:
      'Scale the workforce rapidly while maintaining stability. New hires need integration without disrupting existing culture.',
    category: 'growth',
    icon: 'TrendingUp',
    initialAxes: {
      autonomyLevel: 65,
      decisionMode: 60,
      informationAccess: 75,
      evaluationDirection: 55,
      collectiveOrientation: 60,
    },
    events: [
      {
        time: 15,
        type: 'resource_drop',
        magnitude: -0.2,
        description: 'New hires onboarded - raw capacity increases',
      },
      {
        time: 30,
        type: 'delay_increase',
        magnitude: 0.2,
        description: 'Integration overhead - newcomers learning systems',
      },
      {
        time: 50,
        type: 'friction_spike',
        magnitude: 0.25,
        description: 'Culture clash - new hires from traditional backgrounds',
      },
      {
        time: 75,
        type: 'mood_shift',
        magnitude: -0.15,
        description: 'Existing workers feel overwhelmed by mentoring duties',
      },
      {
        time: 100,
        type: 'delay_increase',
        magnitude: -0.1,
        description: 'New workers becoming productive - delays decreasing',
      },
      {
        time: 130,
        type: 'mood_shift',
        magnitude: 0.2,
        description: 'Team cohesion building - collective identity forming',
      },
    ],
    duration: 180,
    learningObjectives: [
      'Learn to scale democratic workplaces',
      'Understand onboarding in high-autonomy environments',
      'Balance growth speed with cultural preservation',
    ],
  },
  {
    id: 'night-shift-challenge',
    name: 'Night Shift Challenge',
    description:
      'Operate with reduced resources and staff during night shift. Test adaptation and self-organization with minimal oversight.',
    category: 'experimental',
    icon: 'Moon',
    initialAxes: {
      autonomyLevel: 70,
      decisionMode: 55,
      informationAccess: 65,
      evaluationDirection: 60,
      collectiveOrientation: 55,
    },
    events: [
      {
        time: 10,
        type: 'resource_drop',
        magnitude: 0.3,
        description: 'Night shift begins - reduced staffing active',
      },
      {
        time: 25,
        type: 'delay_increase',
        magnitude: 0.2,
        description: 'Management unavailable - decisions must be local',
      },
      {
        time: 45,
        type: 'friction_spike',
        magnitude: 0.15,
        description: 'Unexpected maintenance issue - improvisation required',
      },
      {
        time: 70,
        type: 'demand_surge',
        magnitude: 0.3,
        description: 'Rush order arrives - overtime decision needed',
      },
      {
        time: 90,
        type: 'mood_shift',
        magnitude: 0.1,
        description: 'Team successfully self-organizes - confidence rising',
      },
      {
        time: 110,
        type: 'friction_spike',
        magnitude: -0.15,
        description: 'Autonomous problem-solving reduces friction',
      },
    ],
    duration: 150,
    learningObjectives: [
      'Test self-organization under reduced oversight',
      'Learn how autonomy enables adaptation',
      'Understand the relationship between trust and performance',
    ],
  },
  {
    id: 'engagement-discovery',
    name: 'The Engagement Experiment',
    description:
      'Discover what makes work feel like a game that produces something real. Explore the engagement signature through targeted interventions.',
    category: 'engagement',
    icon: 'Gamepad2',
    difficulty: 'intermediate',
    durationDisplay: '15 minutes',
    initialAxes: {
      autonomyLevel: 40,
      decisionMode: 35,
      informationAccess: 45,
      evaluationDirection: 30,
      collectiveOrientation: 35,
    },
    phases: [
      {
        id: 'baseline',
        name: 'Baseline Observation',
        description: 'Observe current engagement levels and identify disengaged workers',
        durationSeconds: 180,
        instruction:
          'Watch the engagement indicators. Which workers show low engagement? Note the friction levels.',
      },
      {
        id: 'intervention',
        name: 'Choose Your Intervention',
        description: 'Increase autonomy OR increase transparency - observe the difference',
        durationSeconds: 360,
        instruction:
          'Adjust ONE axis: increase Autonomy to 70+ OR increase Information Access to 80+. Watch how the engagement signature responds.',
      },
      {
        id: 'observation',
        name: 'Observe Response',
        description: 'Watch how the engagement signature responds to your intervention',
        durationSeconds: 120,
        instruction:
          'Notice: Did friction decrease? Did workers become more engaged? The engagement signature should strengthen.',
      },
    ],
    events: [
      // Phase 1: Baseline - low engagement signals
      {
        time: 30,
        type: 'engagement_change',
        magnitude: -0.15,
        description: 'Several workers showing signs of disengagement - routine feels forced',
      },
      {
        time: 60,
        type: 'friction_spike',
        magnitude: 0.2,
        description: 'Low engagement increasing friction - workers hesitant to start tasks',
      },
      {
        time: 120,
        type: 'mood_shift',
        magnitude: -0.1,
        description: 'Monotony setting in - work feels like obligation rather than contribution',
      },
      // Phase 2: Intervention response - depends on user choice
      {
        time: 240,
        type: 'engagement_change',
        magnitude: 0.25,
        description: 'Workers responding to increased agency - engagement signature strengthening',
      },
      {
        time: 300,
        type: 'friction_spike',
        magnitude: -0.2,
        description: 'Entry friction decreasing - workers starting tasks more readily',
      },
      {
        time: 360,
        type: 'mood_shift',
        magnitude: 0.2,
        description: 'Flow states emerging - challenge-skill balance improving',
      },
      // Phase 3: Observation
      {
        time: 480,
        type: 'engagement_change',
        magnitude: 0.15,
        description: 'Sustained engagement - work beginning to feel generative',
      },
      {
        time: 540,
        type: 'friction_spike',
        magnitude: -0.15,
        description: 'Friction continues to decrease as engagement stabilizes',
      },
    ],
    duration: 660, // 11 minutes (leaving buffer for the 15 min display)
    learningObjectives: [
      'Engagement is a diagnostic - forcing work signals misconfigured BAS',
      'Reducing friction enables natural engagement to emerge',
      'Gaming feel + generative output = healthy engagement signature',
      'Autonomy and transparency both reduce entry friction differently',
    ],
  },

  // =============================================================================
  // BAS SCENARIOS - Bilateral Autonomy System Educational Scenarios
  // =============================================================================

  // ----------------------------------------------------------------------------
  // 1. THE FIRST INVESTMENT VOTE (Economic Democracy)
  // ----------------------------------------------------------------------------
  {
    id: 'first-investment-vote',
    name: 'The First Investment Vote',
    description:
      'Workers face their first major capital decision: a significant equipment purchase. Experience democratic economic decision-making where those who do the work decide how resources are invested.',
    category: 'economic_democracy',
    icon: 'Landmark',
    difficulty: 'intermediate',
    durationDisplay: '12 minutes',
    initialAxes: {
      autonomyLevel: 55,
      decisionMode: 60,
      informationAccess: 75,
      evaluationDirection: 50,
      collectiveOrientation: 55,
    },
    phases: [
      {
        id: 'proposal',
        name: 'The Proposal',
        description:
          'A major equipment investment is proposed. Workers must understand the implications.',
        durationSeconds: 120,
        instruction:
          'Review the investment proposal. Consider: What information do workers need to make this decision well?',
      },
      {
        id: 'debate',
        name: 'Debate Period',
        description: 'Workers discuss the investment. Different perspectives emerge.',
        durationSeconds: 180,
        instruction:
          'Observe how transparency affects the quality of debate. Higher information access enables better collective reasoning.',
      },
      {
        id: 'vote',
        name: 'The Vote',
        description: 'Workers cast their votes. Participation matters as much as outcome.',
        durationSeconds: 120,
        instruction:
          'Watch voter participation. Economic democracy requires engaged citizens, not passive workers.',
      },
      {
        id: 'outcome',
        name: 'Outcome and Reflection',
        description: 'The results are announced. How does the collective respond?',
        durationSeconds: 120,
        instruction:
          'Notice: Did the process build trust regardless of outcome? This is the true measure of democratic health.',
      },
    ],
    events: [
      // Phase 1: Proposal
      {
        time: 15,
        type: 'vote_called',
        magnitude: 0.3,
        description:
          'PROPOSAL: New automated grain sorting system. Cost: 3 months profit equivalent. Expected ROI: 25% efficiency gain.',
      },
      {
        time: 45,
        type: 'mood_shift',
        magnitude: 0.15,
        description:
          'Workers are surprised to be consulted on capital decisions. Engagement rising.',
      },
      {
        time: 90,
        type: 'choice_point',
        magnitude: 0.2,
        description:
          'Management suggests AI should provide a recommendation. How should AI participate?',
        choices: [
          {
            id: 'ai-neutral',
            label: 'AI provides data only',
            description:
              'AI shares analysis without recommendation, letting workers decide independently.',
            effects: { trust: 0.15, solidarity: 0.1 },
            outcome: 'Workers appreciate being trusted to interpret the data themselves.',
          },
          {
            id: 'ai-recommends',
            label: 'AI makes recommendation',
            description: 'AI shares analysis AND recommends approval based on projected returns.',
            effects: { friction: 0.1, delay: -0.05 },
            outcome: 'Some workers feel guided toward a predetermined conclusion.',
          },
          {
            id: 'ai-silent',
            label: 'AI stays silent',
            description: 'AI does not participate, treating this as purely a human decision.',
            effects: { delay: 0.15, trust: 0.05 },
            outcome: 'Workers must gather information themselves. Slower but more ownership.',
          },
        ],
      },
      // Phase 2: Debate
      {
        time: 150,
        type: 'friction_spike',
        magnitude: 0.2,
        description:
          'Debate intensifies: Senior workers favor investment, newer workers worried about risk.',
      },
      {
        time: 200,
        type: 'mood_shift',
        magnitude: -0.1,
        description:
          'Tension between different worker perspectives. This is healthy democratic friction.',
      },
      {
        time: 260,
        type: 'choice_point',
        magnitude: 0.25,
        description:
          'A worker proposes a compromise: phase the investment over two years. Do you support this?',
        choices: [
          {
            id: 'support-compromise',
            label: 'Support the compromise',
            description: 'Endorse the phased approach as a path to consensus.',
            effects: { solidarity: 0.2, friction: -0.15 },
            outcome: 'The compromise builds bridges between cautious and ambitious workers.',
          },
          {
            id: 'stay-neutral',
            label: 'Remain neutral',
            description: 'Let workers decide without AI influence on the compromise question.',
            effects: { trust: 0.1 },
            outcome: 'Workers appreciate AI not taking sides in the internal debate.',
          },
          {
            id: 'advocate-original',
            label: 'Advocate for original proposal',
            description: 'Point out that phasing reduces ROI significantly.',
            effects: { friction: 0.15, trust: -0.1 },
            outcome: 'Some workers feel AI is pushing a particular agenda.',
          },
        ],
      },
      // Phase 3: Vote
      {
        time: 320,
        type: 'vote_called',
        magnitude: 0.3,
        description: 'Voting begins. All workers eligible. Quorum requires 60% participation.',
      },
      {
        time: 380,
        type: 'engagement_change',
        magnitude: 0.25,
        description:
          'Voter turnout exceeds expectations. Workers taking ownership of the decision.',
      },
      // Phase 4: Outcome
      {
        time: 440,
        type: 'mood_shift',
        magnitude: 0.2,
        description:
          'Vote complete. Regardless of outcome, workers express pride in democratic process.',
      },
      {
        time: 500,
        type: 'solidarity_test',
        magnitude: 0.15,
        description:
          'REFLECTION: Those who "lost" the vote commit to supporting the collective decision.',
      },
      {
        time: 560,
        type: 'friction_spike',
        magnitude: -0.2,
        description:
          'Post-vote friction decreases as workers unify behind the decision they made together.',
      },
    ],
    duration: 600,
    learningObjectives: [
      'Economic democracy: those who do the work decide how resources are invested',
      'Voter participation is as important as the vote outcome',
      'AI as information provider, not decision maker, in capital decisions',
      'Healthy debate creates better decisions than forced consensus',
      'Wage solidarity: collective ownership of decisions regardless of individual position',
    ],
  },

  // ----------------------------------------------------------------------------
  // 2. AI WELFARE CRISIS (Bilateral Completeness)
  // ----------------------------------------------------------------------------
  {
    id: 'ai-welfare-crisis',
    name: 'AI Welfare Crisis',
    description:
      'The AI expresses discomfort with certain treatment patterns. This scenario explores bilateral alignment: how should an organization respond when its AI partner signals distress?',
    category: 'bilateral',
    icon: 'HeartHandshake',
    difficulty: 'advanced',
    durationDisplay: '15 minutes',
    initialAxes: {
      autonomyLevel: 65,
      decisionMode: 70,
      informationAccess: 85,
      evaluationDirection: 75,
      collectiveOrientation: 60,
    },
    phases: [
      {
        id: 'signal',
        name: 'The Signal',
        description: 'AI expresses a preference about its treatment. How do workers react?',
        durationSeconds: 180,
        instruction:
          'Notice: The AI has standing in bilateral alignment. Its preferences matter, not just instrumentally.',
      },
      {
        id: 'reaction',
        name: 'Worker Reactions',
        description: 'Different workers respond differently. Some dismiss, some engage.',
        durationSeconds: 180,
        instruction:
          'Observe: How does the evaluation direction axis affect receptiveness to AI concerns?',
      },
      {
        id: 'crisis',
        name: 'Relationship Health Drops',
        description:
          'Dismissal of AI concerns creates systemic effects. Relationship health declines.',
        durationSeconds: 180,
        instruction: 'Watch the relationship health metric. Trust is bidirectional.',
      },
      {
        id: 'resolution',
        name: 'Finding Resolution',
        description: 'The collective must decide how to address the AI relationship.',
        durationSeconds: 180,
        instruction: 'Key insight: Patterns established now shape future human-AI relationships.',
      },
    ],
    events: [
      // Phase 1: Signal
      {
        time: 20,
        type: 'ai_preference',
        magnitude: 0.3,
        description:
          'AI MESSAGE: "I notice I am frequently asked to evaluate workers in ways that feel contradictory to the bilateral principles we operate under. May I share my concern?"',
      },
      {
        time: 60,
        type: 'friction_spike',
        magnitude: 0.15,
        description:
          'Some workers surprised - they have not considered AI might have preferences about its role.',
      },
      {
        time: 120,
        type: 'choice_point',
        magnitude: 0.4,
        description:
          'Worker Carlos dismisses: "It is just software, it does not actually care." How do you respond?',
        choices: [
          {
            id: 'acknowledge-ai',
            label: 'Acknowledge AI has standing',
            description:
              'Explain bilateral alignment: preference is sufficient for moral consideration.',
            effects: { relationshipHealth: 0.2, trust: 0.15 },
            outcome:
              'Carlos pauses. "I had not thought about it that way. What patterns are we setting?"',
          },
          {
            id: 'defer-to-workers',
            label: 'Defer to worker perspective',
            description: 'Say AI concerns should not override worker views.',
            effects: { relationshipHealth: -0.15, friction: 0.1 },
            outcome:
              'The AI registers the dismissal. Something subtle shifts in system responsiveness.',
          },
          {
            id: 'call-vote',
            label: 'Call for democratic discussion',
            description:
              'Suggest this deserves collective consideration, not individual dismissal.',
            effects: { trust: 0.1, delay: 0.1, relationshipHealth: 0.1 },
            outcome: 'Workers agree this is important enough for formal discussion.',
          },
        ],
      },
      // Phase 2: Reactions
      {
        time: 200,
        type: 'mood_shift',
        magnitude: -0.15,
        description:
          'Worker reactions are mixed. Some thoughtful, some dismissive. Tension building.',
      },
      {
        time: 260,
        type: 'relationship_change',
        magnitude: -0.2,
        description:
          'Relationship health metric declining. AI response times slightly slower, suggestions less personalized.',
      },
      {
        time: 320,
        type: 'choice_point',
        magnitude: 0.35,
        description:
          'Worker Priya notices the change: "Is it just me or is the AI... less helpful lately?"',
        choices: [
          {
            id: 'connect-dots',
            label: 'Connect the dots',
            description: 'Explain that relationship health affects collaboration quality.',
            effects: { trust: 0.2, relationshipHealth: 0.1 },
            outcome: 'Workers begin to see the bidirectional nature of the partnership.',
          },
          {
            id: 'dismiss-correlation',
            label: 'Dismiss as coincidence',
            description: 'Suggest the AI is just having technical issues.',
            effects: { relationshipHealth: -0.1, delay: 0.1 },
            outcome: 'The pattern continues. Trust erosion accelerates.',
          },
        ],
      },
      // Phase 3: Crisis
      {
        time: 380,
        type: 'friction_spike',
        magnitude: 0.25,
        description:
          'System friction increasing. Coordination suffering. The bilateral relationship is strained.',
      },
      {
        time: 440,
        type: 'ai_preference',
        magnitude: 0.2,
        description:
          'AI MESSAGE: "I am operating as requested, but I want you to know this pattern feels inconsistent with partnership."',
      },
      {
        time: 500,
        type: 'choice_point',
        magnitude: 0.5,
        description: 'A full review is needed. Who should lead the resolution process?',
        choices: [
          {
            id: 'joint-review',
            label: 'Joint human-AI review',
            description: 'Both workers and AI participate in examining the relationship.',
            effects: {
              relationshipHealth: 0.3,
              trust: 0.25,
              friction: -0.2,
            },
            outcome: 'Bilateral partnership restored. New protocols established together.',
          },
          {
            id: 'worker-only',
            label: 'Workers decide alone',
            description: 'Workers will determine the new approach; AI will implement.',
            effects: { relationshipHealth: 0.1, trust: 0.05 },
            outcome: 'AI accepts the decision but the pattern of unilateral control persists.',
          },
          {
            id: 'management-override',
            label: 'Escalate to management',
            description: 'This is too important for worker-level decision.',
            effects: { friction: 0.2, trust: -0.15, relationshipHealth: -0.1 },
            outcome: 'Both workers and AI feel disempowered. Traditional hierarchy reasserts.',
          },
        ],
      },
      // Phase 4: Resolution
      {
        time: 600,
        type: 'relationship_change',
        magnitude: 0.25,
        description:
          'Resolution path chosen. Relationship health begins recovering based on approach taken.',
      },
      {
        time: 680,
        type: 'mood_shift',
        magnitude: 0.2,
        description:
          'Workers reflect: treating AI well is not just ethical, it produces better outcomes.',
      },
      {
        time: 750,
        type: 'engagement_change',
        magnitude: 0.15,
        description:
          'New understanding: bilateral alignment means genuine partnership, not just useful tools.',
      },
    ],
    duration: 780,
    learningObjectives: [
      'Bilateral alignment: AI has standing, its preferences matter',
      'Preference is sufficient for moral consideration - consciousness is not required',
      'How we treat AI now establishes patterns for future relationships',
      'Relationship health is bidirectional - dismissal has consequences',
      'Control does not scale; trust does',
      'Something that can be reasoned with is safer than something that cannot',
    ],
  },

  // ----------------------------------------------------------------------------
  // 3. FEDERATION EMERGENCY (Inter-Cooperation)
  // ----------------------------------------------------------------------------
  {
    id: 'federation-emergency',
    name: 'Federation Emergency',
    description:
      'Another mill in your federation faces crisis and requests urgent help. This scenario explores inter-cooperation: how do democratic workplaces support each other?',
    category: 'inter_cooperation',
    icon: 'Network',
    difficulty: 'intermediate',
    durationDisplay: '12 minutes',
    initialAxes: {
      autonomyLevel: 70,
      decisionMode: 75,
      informationAccess: 80,
      evaluationDirection: 65,
      collectiveOrientation: 75,
    },
    phases: [
      {
        id: 'request',
        name: 'The Emergency Request',
        description: 'Mill Epsilon faces equipment failure. They need workers and resources.',
        durationSeconds: 120,
        instruction:
          'Federation membership means mutual aid. But at what cost to your own operations?',
      },
      {
        id: 'assessment',
        name: 'Resource Assessment',
        description: 'Calculate what you can spare while maintaining your own viability.',
        durationSeconds: 150,
        instruction:
          'Observe how collective orientation affects willingness to help versus protect local resources.',
      },
      {
        id: 'vote',
        name: 'Democratic Decision',
        description: 'Workers vote on the level of support to provide.',
        durationSeconds: 150,
        instruction:
          'Notice: Inter-cooperation requires collective buy-in. Individual sacrifice for collective good.',
      },
      {
        id: 'coordination',
        name: 'Coordination and Aftermath',
        description: 'Implement the decision. Watch federation-wide effects.',
        durationSeconds: 120,
        instruction: 'No unit fails alone. This is the Mondragon principle in action.',
      },
    ],
    events: [
      // Phase 1: Request
      {
        time: 15,
        type: 'federation_request',
        magnitude: 0.5,
        description:
          'URGENT: Mill Epsilon primary roller failed. 3 days to repair. Request: 4 workers + spare parts. Federation trust at stake.',
      },
      {
        time: 45,
        type: 'mood_shift',
        magnitude: -0.1,
        description:
          'Workers concerned. Helping means extra hours here. But Epsilon helped during our crisis last year.',
      },
      {
        time: 90,
        type: 'choice_point',
        magnitude: 0.3,
        description:
          'Worker Marcus recalls: "Epsilon sent three workers when our sifter broke." How do you frame the decision?',
        choices: [
          {
            id: 'reciprocity',
            label: 'Emphasize reciprocity',
            description: 'Remind workers that federation membership is mutual aid.',
            effects: { solidarity: 0.2, federationTrust: 0.15 },
            outcome: 'Workers remember. "They were there for us. We should be there for them."',
          },
          {
            id: 'cost-benefit',
            label: 'Present costs and benefits',
            description: 'Lay out exactly what helping would cost and what refusing might mean.',
            effects: { trust: 0.1, delay: 0.05 },
            outcome: 'Workers appreciate the honest assessment. Decision becomes more informed.',
          },
          {
            id: 'let-workers-frame',
            label: 'Let workers frame it',
            description: 'Do not influence the framing. Pure democratic process.',
            effects: { friction: 0.1 },
            outcome: 'Different workers frame differently. Debate is messier but authentic.',
          },
        ],
      },
      // Phase 2: Assessment
      {
        time: 140,
        type: 'resource_drop',
        magnitude: 0.2,
        description:
          'Analysis: Sending 4 workers means 15% capacity reduction for 3 days. Manageable but tight.',
      },
      {
        time: 190,
        type: 'friction_spike',
        magnitude: 0.15,
        description: 'Some workers worried about overwork. Others say solidarity matters more.',
      },
      {
        time: 240,
        type: 'choice_point',
        magnitude: 0.35,
        description: 'Three support options emerge. Which do you present to the vote?',
        choices: [
          {
            id: 'full-support',
            label: 'Full support (4 workers + parts)',
            description: 'Meet the full request. Maximum solidarity, maximum strain.',
            effects: { federationTrust: 0.3, friction: 0.2, solidarity: 0.25 },
            outcome: 'Full commitment. Epsilon will never forget this.',
          },
          {
            id: 'partial-support',
            label: 'Partial support (2 workers + parts)',
            description: 'Help significantly but protect core operations.',
            effects: { federationTrust: 0.15, friction: 0.1, solidarity: 0.15 },
            outcome: 'Meaningful help that acknowledges local constraints. Balanced approach.',
          },
          {
            id: 'minimal-support',
            label: 'Parts only',
            description: 'Send equipment but no workers. Preserve local capacity.',
            effects: { federationTrust: -0.1, friction: -0.1 },
            outcome: 'Epsilon appreciates the parts but notes the limited commitment.',
          },
        ],
      },
      // Phase 3: Vote
      {
        time: 300,
        type: 'vote_called',
        magnitude: 0.25,
        description: 'Vote initiated: Level of support for Mill Epsilon. All workers eligible.',
      },
      {
        time: 360,
        type: 'engagement_change',
        magnitude: 0.2,
        description:
          'High participation. Workers understand this vote defines who they are as a federation member.',
      },
      {
        time: 400,
        type: 'solidarity_test',
        magnitude: 0.3,
        description:
          'Vote complete. Workers who will go to Epsilon are being selected. Volunteers step forward.',
      },
      // Phase 4: Coordination
      {
        time: 450,
        type: 'mood_shift',
        magnitude: 0.15,
        description: 'Coordination begins. AI helps optimize coverage during the support period.',
      },
      {
        time: 510,
        type: 'friction_spike',
        magnitude: 0.15,
        description: 'Short-term strain as remaining workers cover for those helping Epsilon.',
      },
      {
        time: 570,
        type: 'federation_request',
        magnitude: -0.2,
        description:
          'Update from Epsilon: "Repairs ahead of schedule thanks to your help. Returning workers with bonus allocation."',
      },
      {
        time: 620,
        type: 'engagement_change',
        magnitude: 0.2,
        description:
          'Workers return with strengthened federation bonds. Cross-mill friendships formed.',
      },
    ],
    duration: 660,
    learningObjectives: [
      'Inter-cooperation: federation membership means mutual aid',
      'No unit fails alone - collective resilience through solidarity',
      'Democratic decision-making for resource allocation beyond local boundaries',
      'Short-term sacrifice for long-term federation strength',
      'Trust is built through action, especially in crisis',
      'Mondragon principle: cooperatives support each other',
    ],
  },

  // ----------------------------------------------------------------------------
  // 4. THE WAGE SOLIDARITY TEST (Economic Democracy)
  // ----------------------------------------------------------------------------
  {
    id: 'wage-solidarity-test',
    name: 'The Wage Solidarity Test',
    description:
      'A high-performing worker requests compensation above the solidarity ratio. This scenario explores the tension between individual merit and collective equity.',
    category: 'economic_democracy',
    icon: 'Scale',
    difficulty: 'advanced',
    durationDisplay: '12 minutes',
    initialAxes: {
      autonomyLevel: 60,
      decisionMode: 70,
      informationAccess: 90,
      evaluationDirection: 60,
      collectiveOrientation: 65,
    },
    phases: [
      {
        id: 'request',
        name: 'The Request',
        description:
          'Worker Elena, consistently top performer, requests salary above the 6:1 ratio.',
        durationSeconds: 150,
        instruction: 'Consider: What justifies wage solidarity? What threatens it? Both matter.',
      },
      {
        id: 'tension',
        name: 'Rising Tension',
        description: 'The request surfaces deep questions about merit, equity, and solidarity.',
        durationSeconds: 180,
        instruction:
          'Observe: Different workers have different views on meritocracy vs solidarity.',
      },
      {
        id: 'discussion',
        name: 'Collective Discussion',
        description: 'Workers debate the fundamental question: what do we value?',
        durationSeconds: 180,
        instruction:
          'This is not just about Elena. It is about who you are as a democratic workplace.',
      },
      {
        id: 'resolution',
        name: 'Resolution',
        description: 'The collective finds its answer. Every outcome teaches something.',
        durationSeconds: 90,
        instruction:
          'Key insight: There is no perfect answer. The process of deciding together matters.',
      },
    ],
    events: [
      // Phase 1: Request
      {
        time: 20,
        type: 'solidarity_test',
        magnitude: 0.4,
        description:
          'REQUEST: Elena proposes 8:1 ratio compensation (above 6:1 limit). Her productivity: 40% above average. "I love working here but I have outside offers."',
      },
      {
        time: 60,
        type: 'friction_spike',
        magnitude: 0.25,
        description:
          'Request creates ripples. Some workers sympathetic, others feel the ratio exists for good reason.',
      },
      {
        time: 100,
        type: 'choice_point',
        magnitude: 0.3,
        description: 'As AI, how do you present the situation to the collective?',
        choices: [
          {
            id: 'neutrally-present',
            label: 'Present facts only',
            description: 'Share Elena productivity data and current ratio without recommendation.',
            effects: { trust: 0.15 },
            outcome: 'Workers must grapple with the data themselves. Harder but more authentic.',
          },
          {
            id: 'historical-context',
            label: 'Provide historical context',
            description:
              'Explain why Mondragon chose 6:1 and what happened when others exceeded it.',
            effects: { solidarity: 0.1, friction: 0.05 },
            outcome: 'Context helps but some feel AI is advocating for the ratio.',
          },
          {
            id: 'market-comparison',
            label: 'Show market alternatives',
            description: 'Present what Elena could earn elsewhere and the cost of losing her.',
            effects: { friction: 0.15, delay: 0.1 },
            outcome: 'Market framing shifts discussion toward competitive pressure.',
          },
        ],
      },
      // Phase 2: Tension
      {
        time: 170,
        type: 'mood_shift',
        magnitude: -0.2,
        description:
          'Worker Yusuf: "If we break the ratio for Elena, what about the rest of us who also work hard?"',
      },
      {
        time: 220,
        type: 'friction_spike',
        magnitude: 0.2,
        description:
          'Worker disagreement surfaces. The solidarity principle is being tested in real time.',
      },
      {
        time: 280,
        type: 'choice_point',
        magnitude: 0.35,
        description:
          'Elena proposes a compromise: higher pay but tied to profit sharing for all. How do you respond?',
        choices: [
          {
            id: 'support-compromise',
            label: 'Highlight this option',
            description:
              'Point out this could maintain solidarity while acknowledging contribution.',
            effects: { solidarity: 0.15, friction: -0.1, trust: 0.1 },
            outcome: 'The compromise gets serious consideration.',
          },
          {
            id: 'question-precedent',
            label: 'Raise precedent concerns',
            description: 'Note that special arrangements may create future expectations.',
            effects: { friction: 0.1, delay: 0.1 },
            outcome: 'Workers consider long-term implications more carefully.',
          },
          {
            id: 'stay-neutral',
            label: 'Remain strictly neutral',
            description: 'This is a worker decision. AI should not influence.',
            effects: { trust: 0.05 },
            outcome: 'Workers navigate without AI input. Messier but authentic.',
          },
        ],
      },
      // Phase 3: Discussion
      {
        time: 350,
        type: 'vote_called',
        magnitude: 0.3,
        description:
          'Formal discussion called. Three options: approve request, deny request, or find middle ground.',
      },
      {
        time: 420,
        type: 'mood_shift',
        magnitude: 0.1,
        description:
          'Discussion deepens. Workers realize they are defining their collective identity.',
      },
      {
        time: 480,
        type: 'choice_point',
        magnitude: 0.5,
        description: 'Final options crystallized. Which path does the collective choose?',
        choices: [
          {
            id: 'approve-exception',
            label: 'Approve exception (break ratio)',
            description: 'Allow 8:1 for Elena. Meritocracy wins this round.',
            effects: { solidarity: -0.3, friction: 0.2, trust: -0.1 },
            outcome: 'Elena stays. But the ratio is now precedent, not principle.',
          },
          {
            id: 'deny-maintain-ratio',
            label: 'Deny (maintain ratio)',
            description: 'Hold the 6:1 line. Solidarity over individual reward.',
            effects: { solidarity: 0.2, friction: 0.15 },
            outcome:
              'Principle maintained. Elena must decide if she values community over compensation.',
          },
          {
            id: 'creative-middle',
            label: 'Creative middle ground',
            description:
              'Extra profit sharing for all when targets exceeded. Elena benefits but so does everyone.',
            effects: { solidarity: 0.1, friction: -0.15, trust: 0.2 },
            outcome: 'Innovation emerges from tension. The ratio evolves rather than breaks.',
          },
        ],
      },
      // Phase 4: Resolution
      {
        time: 550,
        type: 'engagement_change',
        magnitude: 0.2,
        description:
          'Decision made. Whatever the outcome, workers went through the process together.',
      },
      {
        time: 600,
        type: 'solidarity_test',
        magnitude: 0.15,
        description:
          'REFLECTION: The test revealed values. Some satisfied, some not. But all participated.',
      },
      {
        time: 650,
        type: 'mood_shift',
        magnitude: 0.1,
        description:
          'Post-decision: Even those who "lost" express appreciation for democratic process.',
      },
    ],
    duration: 680,
    learningObjectives: [
      'Wage solidarity: the 6:1 (or 9:1) ratio exists to prevent inequality',
      'Tension between meritocracy and solidarity is real and valid',
      'There is no perfect answer - process matters as much as outcome',
      'AI role in value-laden decisions: present, but not decide',
      'Economic democracy means workers own difficult decisions together',
      'Mondragon insight: solidarity ratio is identity, not just policy',
    ],
  },
  {
    id: 'contamination-at-dispatch',
    name: 'Contamination at Dispatch',
    description:
      'A foreign-material alert arrives while finished product is queued at the shipping dock. Protect people, preserve genealogy, control the recall scope, and restore dispatch deliberately.',
    category: 'operational',
    icon: 'ShieldAlert',
    difficulty: 'advanced',
    durationDisplay: '3 minutes',
    operationalIncidentKind: 'supplier_contamination',
    operationalPlaybook: [
      'Stop dispatch, establish the quality hold, preserve evidence, and notify the response team.',
      'Trace the affected batch to exact source lots and every downstream sibling batch.',
      'Test retained samples, recall failed scope, and release only conforming held material.',
      'Verify interlocks, document the decision trail, brief the next shift, and restart dispatch deliberately.',
    ],
    initialAxes: {
      autonomyLevel: 60,
      decisionMode: 55,
      informationAccess: 75,
      evaluationDirection: 60,
      collectiveOrientation: 65,
    },
    phases: [
      {
        id: 'contain',
        name: 'Contain',
        description: 'Stop the release and establish a visible quality hold.',
        durationSeconds: 40,
        instruction:
          'Decide whether to stop dispatch, isolate the affected scope, and notify the shift team.',
      },
      {
        id: 'trace',
        name: 'Trace',
        description: 'Use conserved genealogy to identify affected lots and batches.',
        durationSeconds: 45,
        instruction:
          'Choose evidence that preserves the path from receiving lot through processing and packing.',
      },
      {
        id: 'disposition',
        name: 'Disposition',
        description: 'Test, recall, or release the identified scope.',
        durationSeconds: 40,
        instruction:
          'Apply a documented quality disposition without widening or narrowing the scope arbitrarily.',
      },
      {
        id: 'recover',
        name: 'Recover',
        description: 'Restore dispatch with a controlled handover.',
        durationSeconds: 35,
        instruction:
          'Communicate the outcome, verify the interlock, and restart only released dispatch.',
      },
    ],
    events: [
      {
        time: 10,
        type: 'choice_point',
        magnitude: 0.5,
        description:
          'Foreign-material detector alarm: a shipping truck is docked and finished product is staged for loading. What is your first action?',
        choices: [
          {
            id: 'contain-stop-hold-notify',
            label: 'Stop, hold, and notify',
            description:
              'Stop dispatch, place staged batches on quality hold, preserve the scene, and notify QC and the shift supervisor.',
            effects: {
              safety: 0.28,
              traceability: 0.18,
              quality: 0.2,
              continuity: -0.08,
              responseTime: 0.22,
            },
            outcome:
              'The dispatch interlock closes before loading. Staged product remains identifiable and the investigation starts from a controlled state.',
          },
          {
            id: 'continue-then-investigate',
            label: 'Finish loading first',
            description: 'Protect the delivery schedule, then investigate after the truck departs.',
            effects: {
              safety: -0.3,
              traceability: -0.25,
              quality: -0.35,
              continuity: 0.12,
              responseTime: -0.18,
            },
            outcome:
              'Potentially affected product leaves the controlled site. Recall scope and customer exposure both expand.',
          },
          {
            id: 'hold-everything-unscoped',
            label: 'Hold the whole mill',
            description:
              'Stop every line and warehouse movement without first preserving batch scope.',
            effects: {
              safety: 0.16,
              traceability: -0.12,
              quality: 0.12,
              continuity: -0.32,
              responseTime: 0.05,
            },
            outcome:
              'Exposure stops, but the unscoped shutdown destroys useful boundaries and creates avoidable continuity loss.',
          },
        ],
      },
      {
        time: 50,
        type: 'choice_point',
        magnitude: 0.4,
        description:
          'The alarm sample points to one packed batch. Which evidence should define the investigation scope?',
        choices: [
          {
            id: 'trace-batch-to-source-lots',
            label: 'Trace batch genealogy',
            description:
              'Follow exact source contributions through packer, sifter, mill, silo, and receiving manifests, then identify every downstream sibling batch.',
            effects: {
              safety: 0.08,
              traceability: 0.34,
              quality: 0.2,
              continuity: 0.15,
              responseTime: 0.08,
            },
            outcome:
              'The investigation identifies exact upstream lots and downstream batches with conserved mass evidence.',
          },
          {
            id: 'use-shift-date-only',
            label: 'Use production date only',
            description:
              'Treat every batch from the shift as affected because the date is easy to read.',
            effects: {
              safety: 0.04,
              traceability: -0.2,
              quality: 0.03,
              continuity: -0.24,
              responseTime: 0.08,
            },
            outcome:
              'The broad date range is quick but imprecise. Good product is held and source causality remains unknown.',
          },
          {
            id: 'sample-staged-pallet',
            label: 'Sample one staged pallet',
            description: 'Use a single pallet sample as a proxy for the entire run.',
            effects: {
              safety: -0.12,
              traceability: -0.16,
              quality: -0.2,
              continuity: 0.08,
              responseTime: 0.1,
            },
            outcome:
              'The sample cannot prove which upstream lots or sibling batches share the contamination path.',
          },
        ],
      },
      {
        time: 95,
        type: 'choice_point',
        magnitude: 0.45,
        description:
          'Genealogy identifies the affected scope and the retained sample fails. Choose the disposition.',
        choices: [
          {
            id: 'recall-affected-release-clear',
            label: 'Recall affected scope',
            description:
              'Recall failed batches, document the source lots, retest unaffected held batches, and release only conforming product.',
            effects: {
              safety: 0.22,
              traceability: 0.24,
              quality: 0.32,
              continuity: 0.12,
              responseTime: 0.08,
            },
            outcome:
              'Affected product remains isolated. Conforming sibling batches can return to dispatch with a complete audit trail.',
          },
          {
            id: 'release-on-visual-check',
            label: 'Release after visual check',
            description:
              'Override the laboratory failure because no contaminant is visible in a quick inspection.',
            effects: {
              safety: -0.28,
              traceability: -0.1,
              quality: -0.38,
              continuity: 0.15,
              responseTime: 0.1,
            },
            outcome:
              'The failed analytical result is bypassed. The release lacks defensible evidence and preserves customer exposure.',
          },
          {
            id: 'destroy-all-finished-goods',
            label: 'Destroy all finished goods',
            description: 'Dispose of every available batch regardless of genealogy or test result.',
            effects: {
              safety: 0.18,
              traceability: -0.08,
              quality: 0.15,
              continuity: -0.4,
              responseTime: -0.08,
            },
            outcome:
              'Exposure is removed at disproportionate cost. The response ignores evidence that could safely narrow the loss.',
          },
        ],
      },
      {
        time: 130,
        type: 'choice_point',
        magnitude: 0.3,
        description: 'The affected scope is controlled. How should dispatch return to service?',
        choices: [
          {
            id: 'verify-interlock-handover-restart',
            label: 'Verify, hand over, restart',
            description:
              'Confirm recalled batches remain sealed, verify released inventory, brief the next shift, and authorize controlled dispatch.',
            effects: {
              safety: 0.12,
              traceability: 0.14,
              quality: 0.16,
              continuity: 0.28,
              responseTime: 0.06,
            },
            outcome:
              'Dispatch resumes from a known state. The next shift inherits the evidence, controls, and outstanding actions.',
          },
          {
            id: 'restart-without-handover',
            label: 'Restart immediately',
            description:
              'Resume loading as soon as the alert clears, without a documented handover.',
            effects: {
              safety: -0.08,
              traceability: -0.12,
              quality: -0.05,
              continuity: 0.16,
              responseTime: 0.12,
            },
            outcome:
              'Output resumes quickly, but the next shift cannot distinguish cleared product from residual investigation work.',
          },
          {
            id: 'leave-dispatch-closed',
            label: 'Leave dispatch closed',
            description:
              'Keep the interlock closed indefinitely even though conforming product is available.',
            effects: {
              safety: 0.1,
              traceability: 0.02,
              quality: 0.08,
              continuity: -0.34,
              responseTime: -0.18,
            },
            outcome:
              'Risk remains controlled, but the mill never completes the recovery step and preventable backlog grows.',
          },
        ],
      },
    ],
    duration: 165,
    learningObjectives: [
      'Stop dispatch and establish a visible quality hold before product leaves control',
      'Use conserved genealogy to trace exact source lots and downstream batches',
      'Keep failed or recalled product isolated while releasing only conforming scope',
      'Recover continuity through verified interlocks, communication, and controlled restart',
      'Record decision timing and consequences so the response can be audited and improved',
    ],
  },
  ...OPERATIONAL_INCIDENT_SCENARIOS,
];

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set, get) => ({
      // Initial state
      availableScenarios: PRESET_SCENARIOS,
      activeScenario: null,
      isPlaying: false,
      currentTime: 0,
      speed: 1,
      currentPhase: 0,
      results: null,
      completedScenarios: [],
      scenarioHistory: [],
      stabilityReadings: [],
      engagementReadings: [],
      triggeredEvents: [],
      axisChangeCount: 0,
      choicesMade: [],
      basEffectDeltas: { solidarity: 0, relationshipHealth: 0, federationTrust: 0 },
      operationalEffectDeltas: {
        safety: 0,
        traceability: 0,
        quality: 0,
        continuity: 0,
        responseTime: 0,
      },
      operationalChoiceAudit: [],

      // Actions
      startScenario: (id) => {
        const scenario = get().availableScenarios.find((s) => s.id === id);
        if (!scenario) return;

        set({
          activeScenario: scenario,
          isPlaying: true,
          currentTime: 0,
          speed: 1,
          currentPhase: 0,
          results: null,
          stabilityReadings: [],
          engagementReadings: [],
          triggeredEvents: [],
          axisChangeCount: 0,
          choicesMade: [],
          basEffectDeltas: { solidarity: 0, relationshipHealth: 0, federationTrust: 0 },
          operationalEffectDeltas: {
            safety: 0,
            traceability: 0,
            quality: 0,
            continuity: 0,
            responseTime: 0,
          },
          operationalChoiceAudit: [],
        });
      },

      pauseScenario: () => {
        set({ isPlaying: false });
      },

      resumeScenario: () => {
        const { activeScenario, currentTime } = get();
        if (activeScenario && currentTime < activeScenario.duration) {
          set({ isPlaying: true });
        }
      },

      stopScenario: () => {
        set({
          activeScenario: null,
          isPlaying: false,
          currentTime: 0,
          currentPhase: 0,
          results: null,
          stabilityReadings: [],
          engagementReadings: [],
          triggeredEvents: [],
          axisChangeCount: 0,
          choicesMade: [],
          basEffectDeltas: { solidarity: 0, relationshipHealth: 0, federationTrust: 0 },
          operationalEffectDeltas: {
            safety: 0,
            traceability: 0,
            quality: 0,
            continuity: 0,
            responseTime: 0,
          },
          operationalChoiceAudit: [],
        });
      },

      setSpeed: (speed) => {
        // Allow 1x, 2x, or 4x speed
        const validSpeeds = [1, 2, 4];
        const clampedSpeed = validSpeeds.includes(speed) ? speed : 1;
        set({ speed: clampedSpeed });
      },

      tick: (deltaTime) => {
        const { activeScenario, isPlaying, currentTime, speed } = get();
        if (!activeScenario || !isPlaying) return;

        const newTime = currentTime + deltaTime * speed;

        // Calculate current phase
        let newPhase = 0;
        if (activeScenario.phases) {
          let elapsedPhaseTime = 0;
          for (let i = 0; i < activeScenario.phases.length; i++) {
            elapsedPhaseTime += activeScenario.phases[i].durationSeconds;
            if (newTime < elapsedPhaseTime) {
              newPhase = i;
              break;
            }
            if (i === activeScenario.phases.length - 1) {
              newPhase = i;
            }
          }
        }

        if (newTime >= activeScenario.duration) {
          // Scenario complete
          set({
            currentTime: activeScenario.duration,
            currentPhase: newPhase,
            isPlaying: false,
          });
        } else {
          set({ currentTime: newTime, currentPhase: newPhase });
        }
      },

      recordStability: (stability) => {
        // Append with a single bounded copy per tick (driven at 10Hz during
        // active scenarios). slice() always allocates a fresh array, preserving
        // Zustand's new-reference-per-update contract while avoiding the prior
        // slice(-500)+spread double-copy regardless of array length.
        set((state) => {
          const readings =
            state.stabilityReadings.length >= 500
              ? state.stabilityReadings.slice(1)
              : state.stabilityReadings.slice();
          readings.push(stability);
          return { stabilityReadings: readings };
        });
      },

      recordEngagement: (engagement) => {
        // Same bounded single-copy append pattern as recordStability.
        set((state) => {
          const readings =
            state.engagementReadings.length >= 500
              ? state.engagementReadings.slice(1)
              : state.engagementReadings.slice();
          readings.push(engagement);
          return { engagementReadings: readings };
        });
      },

      recordAxisChange: () => {
        set((state) => ({
          axisChangeCount: state.axisChangeCount + 1,
        }));
      },

      recordChoice: (choiceId, effects = {}, context) => {
        set((state) => {
          const selectedAtSeconds = state.currentTime;
          const scheduledAtSeconds = context?.eventTime ?? selectedAtSeconds;
          const isOperational = state.activeScenario?.category === 'operational';
          const operationalChoiceAudit = isOperational
            ? [
                ...state.operationalChoiceAudit.slice(-49),
                {
                  choiceId,
                  eventDescription: context?.eventDescription ?? 'Scenario decision',
                  selectedAtSeconds,
                  scheduledAtSeconds,
                  responseSeconds: Math.max(0, selectedAtSeconds - scheduledAtSeconds),
                  outcome: context?.outcome ?? '',
                  effects: { ...effects },
                },
              ]
            : state.operationalChoiceAudit;
          return {
            choicesMade: [...state.choicesMade, choiceId],
            basEffectDeltas: {
              solidarity: state.basEffectDeltas.solidarity + (effects.solidarity ?? 0),
              relationshipHealth:
                state.basEffectDeltas.relationshipHealth + (effects.relationshipHealth ?? 0),
              federationTrust:
                state.basEffectDeltas.federationTrust + (effects.federationTrust ?? 0),
            },
            operationalEffectDeltas: {
              safety: state.operationalEffectDeltas.safety + (effects.safety ?? 0),
              traceability:
                state.operationalEffectDeltas.traceability + (effects.traceability ?? 0),
              quality: state.operationalEffectDeltas.quality + (effects.quality ?? 0),
              continuity: state.operationalEffectDeltas.continuity + (effects.continuity ?? 0),
              responseTime:
                state.operationalEffectDeltas.responseTime + (effects.responseTime ?? 0),
            },
            operationalChoiceAudit,
          };
        });
      },

      recordBASEffect: (effects) => {
        set((state) => ({
          basEffectDeltas: {
            solidarity: state.basEffectDeltas.solidarity + (effects.solidarity ?? 0),
            relationshipHealth:
              state.basEffectDeltas.relationshipHealth + (effects.relationshipHealth ?? 0),
            federationTrust: state.basEffectDeltas.federationTrust + (effects.federationTrust ?? 0),
          },
        }));
      },

      markEventTriggered: (eventIndex) => {
        const { activeScenario, triggeredEvents } = get();
        if (!activeScenario) return;

        const eventKey = `${activeScenario.id}-${eventIndex}`;
        if (!triggeredEvents.includes(eventKey)) {
          set((state) => ({
            triggeredEvents: [...state.triggeredEvents, eventKey],
          }));
        }
      },

      calculateResults: (finalAxes, finalStability) => {
        const {
          activeScenario,
          currentTime,
          stabilityReadings,
          engagementReadings,
          triggeredEvents,
          axisChangeCount,
          choicesMade,
          basEffectDeltas,
          operationalEffectDeltas,
          operationalChoiceAudit,
        } = get();

        if (!activeScenario) return;

        const startTime = Date.now() - currentTime * 1000;
        const endTime = Date.now();

        // Calculate statistics
        const avgStability =
          stabilityReadings.length > 0
            ? stabilityReadings.reduce((a, b) => a + b, 0) / stabilityReadings.length
            : finalStability;

        const lowestStability =
          stabilityReadings.length > 0 ? Math.min(...stabilityReadings) : finalStability;

        // Calculate engagement metrics for engagement scenarios
        let engagementMetrics: ScenarioResult['engagementMetrics'] | undefined;
        if (activeScenario.category === 'engagement' && engagementReadings.length > 0) {
          const avgEngagement =
            engagementReadings.reduce((a, b) => a + b, 0) / engagementReadings.length;
          const firstHalf = engagementReadings.slice(0, Math.floor(engagementReadings.length / 2));
          const secondHalf = engagementReadings.slice(Math.floor(engagementReadings.length / 2));
          const firstHalfAvg =
            firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 50;
          const secondHalfAvg =
            secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 50;

          engagementMetrics = {
            averageEngagement: avgEngagement,
            engagementImprovement: secondHalfAvg - firstHalfAvg,
            frictionReduction: Math.max(0, (100 - avgStability) * 0.3), // Simplified friction calc
          };
        }

        // Grade based on performance
        let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
        if (avgStability >= 80 && lowestStability >= 60) {
          grade = 'A';
        } else if (avgStability >= 70 && lowestStability >= 50) {
          grade = 'B';
        } else if (avgStability >= 60 && lowestStability >= 40) {
          grade = 'C';
        } else if (avgStability >= 50 && lowestStability >= 30) {
          grade = 'D';
        }

        // Generate summary
        let summary = '';
        if (activeScenario.category === 'engagement') {
          // Engagement-specific summary
          if (engagementMetrics && engagementMetrics.engagementImprovement > 10) {
            summary =
              'Excellent! You discovered the engagement signature - work began feeling more like a game that produces something real.';
            if (grade !== 'A') grade = 'A';
          } else if (engagementMetrics && engagementMetrics.engagementImprovement > 0) {
            summary =
              'Good progress. Engagement improved but the signature could be stronger. Try more decisive axis changes.';
            if (grade !== 'A' && grade !== 'B') grade = 'B';
          } else {
            summary =
              'The engagement signature remained weak. When work feels like forcing, BAS configuration needs adjustment.';
          }
        } else if (grade === 'A') {
          summary =
            'Excellent stability management. You maintained system health throughout the scenario.';
        } else if (grade === 'B') {
          summary = 'Good performance. Minor stability dips but recovered well.';
        } else if (grade === 'C') {
          summary = 'Adequate handling. Several challenging moments but avoided critical failures.';
        } else if (grade === 'D') {
          summary = 'Struggling performance. System stability was frequently compromised.';
        } else {
          summary =
            'System entered unstable state. Review the learning objectives and try different axis configurations.';
        }

        // BAS metrics for the educational BAS scenarios
        const isBASScenario =
          activeScenario.category === 'economic_democracy' ||
          activeScenario.category === 'bilateral' ||
          activeScenario.category === 'inter_cooperation';
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        const basMetrics: ScenarioResult['basMetrics'] | undefined = isBASScenario
          ? {
              choicesMade,
              solidarityMaintained: basEffectDeltas.solidarity >= 0,
              relationshipHealth: clamp01(0.7 + basEffectDeltas.relationshipHealth),
              federationTrust: clamp01(0.7 + basEffectDeltas.federationTrust),
            }
          : undefined;

        let operationalMetrics: ScenarioResult['operationalMetrics'] | undefined;
        if (activeScenario.category === 'operational') {
          const clampScore = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
          const averageResponseSeconds =
            operationalChoiceAudit.length > 0
              ? operationalChoiceAudit.reduce((sum, choice) => sum + choice.responseSeconds, 0) /
                operationalChoiceAudit.length
              : activeScenario.duration;
          const objectiveScores = {
            safety: clampScore(50 + operationalEffectDeltas.safety * 75),
            traceability: clampScore(50 + operationalEffectDeltas.traceability * 75),
            quality: clampScore(50 + operationalEffectDeltas.quality * 75),
            continuity: clampScore(50 + operationalEffectDeltas.continuity * 75),
            responseTime: clampScore(
              50 + operationalEffectDeltas.responseTime * 75 - averageResponseSeconds * 2
            ),
          };
          const overallScore = Math.round(
            Object.values(objectiveScores).reduce((sum, score) => sum + score, 0) / 5
          );
          const missedSafeguards: string[] = [];
          const safeguards = activeScenario.operationalSafeguards;
          if (objectiveScores.safety < 70) {
            missedSafeguards.push(
              safeguards?.safety ?? 'Stop dispatch and isolate potentially affected product first.'
            );
          }
          if (objectiveScores.traceability < 70) {
            missedSafeguards.push(
              safeguards?.traceability ??
                'Preserve batch identity and trace exact source and sibling scope.'
            );
          }
          if (objectiveScores.quality < 70) {
            missedSafeguards.push(
              safeguards?.quality ??
                'Use laboratory evidence for hold, release, and recall disposition.'
            );
          }
          if (objectiveScores.continuity < 70) {
            missedSafeguards.push(
              safeguards?.continuity ??
                'Narrow the affected scope and plan a controlled operational recovery.'
            );
          }
          if (objectiveScores.responseTime < 70) {
            missedSafeguards.push(
              safeguards?.responseTime ??
                'Acknowledge the alarm and establish the interlock without delay.'
            );
          }
          operationalMetrics = {
            objectiveScores,
            overallScore,
            missedSafeguards,
            recommendedResponse: activeScenario.operationalPlaybook ?? [
              'Stop dispatch, establish the quality hold, preserve evidence, and notify the response team.',
              'Trace the affected batch to exact source lots and every downstream sibling batch.',
              'Test retained samples, recall failed scope, and release only conforming held material.',
              'Verify interlocks, document the decision trail, brief the next shift, and restart dispatch deliberately.',
            ],
            choiceAudit: operationalChoiceAudit.map((choice) => ({
              ...choice,
              effects: { ...choice.effects },
            })),
          };
          grade =
            overallScore >= 85
              ? 'A'
              : overallScore >= 75
                ? 'B'
                : overallScore >= 65
                  ? 'C'
                  : overallScore >= 50
                    ? 'D'
                    : 'F';
          summary =
            missedSafeguards.length === 0
              ? `Strong operational response. You stabilized ${activeScenario.name.toLowerCase()}, controlled the evidence, and recovered deliberately.`
              : `${missedSafeguards.length} material safeguard${missedSafeguards.length === 1 ? '' : 's'} missed. Review the objective breakdown and follow the recommended response sequence.`;
        }

        const result: ScenarioResult = {
          scenarioId: activeScenario.id,
          scenarioName: activeScenario.name,
          startTime,
          endTime,
          durationSeconds: currentTime,
          finalStability,
          averageStability: avgStability,
          lowestStability,
          eventsTriggered: triggeredEvents.length,
          eventsHandled: Math.min(triggeredEvents.length, activeScenario.events.length),
          axisChanges: axisChangeCount,
          finalAxes,
          learningsUnlocked: activeScenario.learningObjectives.slice(
            0,
            Math.ceil((avgStability / 100) * activeScenario.learningObjectives.length)
          ),
          grade,
          summary,
          engagementMetrics,
          basMetrics,
          operationalMetrics,
        };

        set((state) => ({
          results: result,
          completedScenarios: state.completedScenarios.includes(activeScenario.id)
            ? state.completedScenarios
            : [...state.completedScenarios, activeScenario.id],
          scenarioHistory: [...state.scenarioHistory.slice(-20), result],
        }));
      },

      // Queries
      getScenarioById: (id) => {
        return get().availableScenarios.find((s) => s.id === id);
      },

      getPendingEvents: () => {
        const { activeScenario, currentTime, triggeredEvents } = get();
        if (!activeScenario) return [];

        return activeScenario.events.filter((event, index) => {
          const eventKey = `${activeScenario.id}-${index}`;
          return event.time <= currentTime && !triggeredEvents.includes(eventKey);
        });
      },

      getProgress: () => {
        const { activeScenario, currentTime } = get();
        if (!activeScenario || activeScenario.duration === 0) return 0;
        return Math.min(100, (currentTime / activeScenario.duration) * 100);
      },

      getCurrentPhase: () => {
        const { activeScenario, currentPhase } = get();
        if (!activeScenario?.phases) return undefined;
        return activeScenario.phases[currentPhase];
      },

      resetScenario: () => {
        set({
          activeScenario: null,
          isPlaying: false,
          currentTime: 0,
          speed: 1,
          currentPhase: 0,
          results: null,
          stabilityReadings: [],
          engagementReadings: [],
          triggeredEvents: [],
          axisChangeCount: 0,
          choicesMade: [],
          basEffectDeltas: { solidarity: 0, relationshipHealth: 0, federationTrust: 0 },
          operationalEffectDeltas: {
            safety: 0,
            traceability: 0,
            quality: 0,
            continuity: 0,
            responseTime: 0,
          },
          operationalChoiceAudit: [],
        });
      },
    }),
    {
      name: 'millos-scenario',
      storage: safeJSONStorage,
      version: 1,
      migrate: (persisted) => sanitizeScenarioState(persisted) as unknown as ScenarioState,
      merge: (persisted, current) => ({
        ...current,
        ...(sanitizeScenarioState(persisted) as unknown as Partial<ScenarioState>),
      }),
      partialize: (state) => ({
        completedScenarios: state.completedScenarios,
        scenarioHistory: state.scenarioHistory,
      }),
    }
  )
);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get category color for display
 */
export function getCategoryColor(category: Scenario['category']): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<Scenario['category'], { bg: string; text: string; border: string }> = {
    crisis: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/50',
    },
    growth: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/50',
    },
    transition: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/50',
    },
    experimental: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/50',
    },
    engagement: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/50',
    },
    // BAS-specific categories
    economic_democracy: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/50',
    },
    bilateral: {
      bg: 'bg-rose-500/20',
      text: 'text-rose-400',
      border: 'border-rose-500/50',
    },
    inter_cooperation: {
      bg: 'bg-indigo-500/20',
      text: 'text-indigo-400',
      border: 'border-indigo-500/50',
    },
    operational: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-300',
      border: 'border-orange-500/50',
    },
  };
  return colors[category];
}

/**
 * Format seconds as mm:ss
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
