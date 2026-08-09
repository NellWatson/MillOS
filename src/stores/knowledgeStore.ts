/** Technical Datalinks for the autonomous MillOS digital twin. */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from './storage';
import { sanitizeKnowledgeState } from './persistenceMigrations';

export type KnowledgeCategory = 'principles' | 'pioneers' | 'systems' | 'case-studies';
export type KnowledgeIcon =
  | 'handshake'
  | 'heart-handshake'
  | 'vote'
  | 'flower-2'
  | 'sparkles'
  | 'user'
  | 'settings'
  | 'sliders'
  | 'chart-bar'
  | 'refresh-cw'
  | 'network'
  | 'heart'
  | 'factory'
  | 'book-open'
  | 'scale'
  | 'brain'
  | 'gamepad-2'
  | 'sprout'
  | 'users'
  | 'cog'
  | 'library';

export interface KnowledgeQuote {
  text: string;
  author: string;
}

export interface UnlockCondition {
  type: 'achievement' | 'feature-use' | 'time-played' | 'always';
  requirement?: string;
  description: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  icon: KnowledgeIcon;
  tooltip: string;
  brief: string;
  article: string;
  relatedEntries: string[];
  seeInAction: string[];
  unlockCondition: UnlockCondition;
  quote?: KnowledgeQuote;
  portraitPath?: string;
}

export interface UnlockContext {
  minutesPlayed?: number;
}

export interface KnowledgeState {
  unlockedEntries: Set<string>;
  readEntries: Set<string>;
  newEntries: Set<string>;
  showTooltips: boolean;
  showLoadingQuotes: boolean;
  showAINarration: boolean;
  showUnlockNotifications: boolean;
  unlockEntry: (entryId: string) => void;
  markAsRead: (entryId: string) => void;
  clearNewBadge: (entryId: string) => void;
  checkUnlockConditions: (context: UnlockContext) => void;
  setShowTooltips: (show: boolean) => void;
  setShowLoadingQuotes: (show: boolean) => void;
  setShowAINarration: (show: boolean) => void;
  setShowUnlockNotifications: (show: boolean) => void;
  getEntry: (id: string) => KnowledgeEntry | undefined;
  getEntriesByCategory: (category: KnowledgeCategory) => KnowledgeEntry[];
  isUnlocked: (id: string) => boolean;
  isNew: (id: string) => boolean;
  getUnlockedCount: () => number;
  getTotalCount: () => number;
}

const always: UnlockCondition = {
  type: 'always',
  description: 'Available in the autonomous operations library',
};

export const LOADING_QUOTES: KnowledgeQuote[] = [
  {
    text: 'Trace every lot, state change, alarm, and dispatch.',
    author: 'MillOS control principle',
  },
  {
    text: 'A safe stop is part of production, not a failure of it.',
    author: 'MillOS control principle',
  },
  {
    text: 'Motion should reveal process state before decoration.',
    author: 'MillOS visual principle',
  },
  {
    text: 'One world, one clock, one source of operational truth.',
    author: 'MillOS architecture principle',
  },
  { text: 'Autonomy earns trust through legible evidence.', author: 'MillOS autonomy principle' },
  {
    text: 'Every alarm needs a condition, disposition, and recovery path.',
    author: 'MillOS SCADA principle',
  },
];

export const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'unified-digital-twin',
    title: 'Unified Digital Twin',
    category: 'principles',
    icon: 'factory',
    tooltip: 'Interior, yard, village, farm, and water share one simulation.',
    brief:
      'MillOS keeps the factory and its surrounding site in one continuous coordinate system, with a shared clock, weather state, and production model.',
    article: `## One Continuous Site\n\nThe mill floor, loading yard, maintenance garage, village, farm, stream, culvert, and distant terrain remain part of one authored world. Camera travel changes viewpoint, not simulation mode.\n\nA unified world prevents duplicated state and discontinuous lighting. Trucks can approach the same docks seen from inside. Water crosses terrain through the same culvert visible from the road. The sun, moon, windows, exterior lamps, and process clocks all derive from the same time source.\n\nThis architecture also makes faults easier to diagnose. Positioning, occlusion, route clearance, and z-layer policies can be measured in one coordinate system instead of translated between disconnected scenes.`,
    relatedEntries: ['autonomous-material-flow', 'environment-cycle'],
    seeInAction: ['3D world', 'Overview workspace'],
    unlockCondition: always,
  },
  {
    id: 'autonomous-material-flow',
    title: 'Autonomous Material Flow',
    category: 'systems',
    icon: 'network',
    tooltip: 'Source lots remain traceable through silos, mills, sifters, and packers.',
    brief:
      'The material-flow ledger connects receiving manifests, source lots, production batches, QC disposition, and dispatch loads.',
    article: `## Causal Material Flow\n\nGrain enters through a receiving manifest and becomes a source lot. Each transformation records mass transfer, equipment identity, time, and disposition. Packers create production batches from explicit source contributions. Dispatch can load only released material.\n\nThe genealogy balance compares received, in-process, shipped, and lost mass. A non-zero balance error is treated as a control defect. Quality holds follow the affected batches and source contributions instead of applying an unexplained global penalty.\n\nThis gives the SCADA workspace evidence for every major action and makes replay useful: a state can be reconstructed from its inputs rather than inferred from a dashboard number.`,
    relatedEntries: ['scada-alarm-lifecycle', 'batch-quality'],
    seeInAction: ['SCADA provenance', 'Batch genealogy'],
    unlockCondition: always,
  },
  {
    id: 'scada-alarm-lifecycle',
    title: 'SCADA Alarm Lifecycle',
    category: 'systems',
    icon: 'chart-bar',
    tooltip: 'Alarms expose state, acknowledgement, disposition, and recovery.',
    brief:
      'MillOS distinguishes active conditions, returned conditions, acknowledgement, shelving, suppression, and out-of-service disposition.',
    article: `## Alarm State Is Evidence\n\nAn alarm occurrence records the tag, limit, measured value, priority, timestamp, and literal condition. Acknowledgement does not erase the process condition. Return-to-normal does not erase the acknowledgement requirement.\n\nShelving is temporary visibility control. Suppression is a bounded control disposition. Out-of-service status declares that a signal cannot currently be trusted for normal alarm service. Each action requires a control identity and a reason so the timeline stays auditable.\n\nFlood monitoring counts occurrences over a rolling interval. The interface keeps event history separate from the active alarm list, preventing a cleared symptom from disappearing from operational memory.`,
    relatedEntries: ['predictive-maintenance', 'autonomous-evidence'],
    seeInAction: ['SCADA alarms', 'Event history'],
    unlockCondition: always,
  },
  {
    id: 'predictive-maintenance',
    title: 'Predictive Maintenance Loop',
    category: 'systems',
    icon: 'settings',
    tooltip: 'Wear becomes diagnosis, parts demand, repair, verification, and restart.',
    brief:
      'Equipment wear drives a causal work-order state machine with inventory checks and controlled restart.',
    article: `## From Signal to Return to Service\n\nTemperature, vibration, load, and wear can trigger a predictive alert before a machine fails. A breakdown opens a work order with a diagnosed cause and required parts. Repair cannot begin when stock is missing.\n\nThe autonomous service unit advances the order through repair and verification. The production lockout remains until a restart request reaches the central simulation tick, maintenance reduces wear, and the far-side machine state confirms readiness.\n\nThe audit trail records every phase transition. This prevents a progress bar from claiming recovery while the production model still considers the machine critical.`,
    relatedEntries: ['scada-alarm-lifecycle', 'autonomous-evidence'],
    seeInAction: ['Predictive maintenance', 'SCADA maintenance provenance'],
    unlockCondition: always,
  },
  {
    id: 'batch-quality',
    title: 'Batch Quality and Recall',
    category: 'case-studies',
    icon: 'scale',
    tooltip: 'Quality disposition follows exact batches and source lots.',
    brief:
      'QC records connect a test to the batch, source-lot scope, measurements, action, and recall state.',
    article: `## Bounded Quality Decisions\n\nA quality test names the batch, source lots, equipment, test type, measurements, and control source. A hold prevents dispatch while preserving the rest of the line. A conforming retest can release the investigated scope. A recall isolates only the affected material.\n\nThis bounded approach is more informative than reducing one global quality score. The score remains useful for trend display, while the genealogy and disposition records carry the evidence needed for action.`,
    relatedEntries: ['autonomous-material-flow', 'scada-alarm-lifecycle'],
    seeInAction: ['Overview batch genealogy', 'SCADA quality provenance'],
    unlockCondition: always,
  },
  {
    id: 'autonomous-logistics',
    title: 'Autonomous Logistics Choreography',
    category: 'case-studies',
    icon: 'refresh-cw',
    tooltip: 'Forklifts, dock doors, trailers, and manifests move as one system.',
    brief:
      'Mobile equipment uses explicit routes, conflict holds, dock state, cargo state, and signal phases.',
    article: `## Legible Yard Motion\n\nForklifts publish position, heading, and stop intent into a shared route registry. Conflict prediction checks nearby autonomous vehicles and static obstacles before motion resumes. Fork height, mast tilt, steering, brake lamps, and cargo state reinforce what the control state is doing.\n\nTruck motion follows approach, alignment, dock, loading, and departure phases. Dock plates, doors, lamps, manifests, and dispatch mass agree with those phases. Decorative animation may reduce with graphics quality or reduced-motion preference, while process-critical state changes remain visible.`,
    relatedEntries: ['autonomous-material-flow', 'unified-digital-twin'],
    seeInAction: ['Shipping yard', 'Forklift telemetry'],
    unlockCondition: always,
  },
  {
    id: 'environment-cycle',
    title: 'Environment and Celestial Cycle',
    category: 'pioneers',
    icon: 'sparkles',
    tooltip: 'Sky, sun, moon, mountains, windows, lamps, and water share time.',
    brief:
      'The environment derives its palette, lighting, reflections, and visibility from the same simulated clock and weather state.',
    article: `## A Coherent Backdrop\n\nThe sky gradient, haze, cloud cover, sun path, moon path, stars, mountain values, window emission, yard lighting, and water response are coordinated rather than animated independently.\n\nDistant ridges use low-frequency geometry and palette transitions to hold silhouette without competing with the factory. The sun supplies the principal shadow direction. The moon and stars become visible as daylight falls. Weather modifies cloud cover, light contrast, and water character without replacing the world.\n\nStable shader cache keys and bounded per-frame updates keep the cycle continuous without forcing recompilation or allocation churn.`,
    relatedEntries: ['unified-digital-twin', 'depth-and-material-policy'],
    seeInAction: ['Sky and mountains', 'Stream and culvert'],
    unlockCondition: always,
  },
  {
    id: 'depth-and-material-policy',
    title: 'Depth and Material Policy',
    category: 'principles',
    icon: 'sliders',
    tooltip: 'Shared layers and explicit colour spaces prevent visual instability.',
    brief:
      'Floor overlays, exterior surfaces, decals, indicators, and procedural textures follow explicit depth and colour-space contracts.',
    article: `## Stable Surfaces\n\nExterior ground surfaces share a common elevation and use polygon offset to establish ordering. Floor markings and translucent overlays disable depth writes where appropriate. Decals use bounded surface offsets. Camera near and far planes preserve depth precision across the site.\n\nProcedural albedo textures declare sRGB colour space. Normal, roughness, metalness, height, and mask textures stay linear. Roughness occupies the channel consumed by the shader, and normal perturbation remains signed.\n\nThese contracts prevent flicker, washed-out albedo, mirror-like roughness failures, and seams caused by arbitrary vertical separation.`,
    relatedEntries: ['environment-cycle', 'autonomous-evidence'],
    seeInAction: ['Factory floor', 'Roads and stream banks'],
    unlockCondition: always,
  },
  {
    id: 'autonomous-evidence',
    title: 'Autonomous Evidence and Replay',
    category: 'principles',
    icon: 'brain',
    tooltip: 'Every decision carries observations, assumptions, alternatives, and expected effect.',
    brief:
      'The control layer records why it acted, what equipment was affected, and which telemetry supported the action.',
    article: `## Legible Autonomy\n\nAutonomy is trustworthy when its evidence is inspectable. Each decision captures telemetry, timestamp, source, assumptions, alternatives, expected effect, and the equipment within scope.\n\nThe replay ledger samples machine state, alerts, and mobile-equipment positions without credentials or personal data. Control commands are stored separately from frames so a review can distinguish what happened from what requested it.\n\nConfidence is presented with reasoning rather than as an unexplained percentage. Uncertainty remains visible, and safe fallback actions preserve the current state when evidence does not justify intervention.`,
    relatedEntries: ['scada-alarm-lifecycle', 'predictive-maintenance'],
    seeInAction: ['AI Command Centre', 'Decision replay'],
    unlockCondition: always,
  },
];

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set, get) => ({
      unlockedEntries: new Set(KNOWLEDGE_ENTRIES.map((entry) => entry.id)),
      readEntries: new Set(),
      newEntries: new Set(),
      showTooltips: true,
      showLoadingQuotes: true,
      showAINarration: true,
      showUnlockNotifications: true,
      unlockEntry: (entryId) =>
        set((state) => ({
          unlockedEntries: new Set([...state.unlockedEntries, entryId]),
          newEntries: state.unlockedEntries.has(entryId)
            ? state.newEntries
            : new Set([...state.newEntries, entryId]),
        })),
      markAsRead: (entryId) =>
        set((state) => ({ readEntries: new Set([...state.readEntries, entryId]) })),
      clearNewBadge: (entryId) =>
        set((state) => {
          const next = new Set(state.newEntries);
          next.delete(entryId);
          return { newEntries: next };
        }),
      checkUnlockConditions: () => undefined,
      setShowTooltips: (show) => set({ showTooltips: show }),
      setShowLoadingQuotes: (show) => set({ showLoadingQuotes: show }),
      setShowAINarration: (show) => set({ showAINarration: show }),
      setShowUnlockNotifications: (show) => set({ showUnlockNotifications: show }),
      getEntry: (id) => KNOWLEDGE_ENTRIES.find((entry) => entry.id === id),
      getEntriesByCategory: (category) =>
        KNOWLEDGE_ENTRIES.filter((entry) => entry.category === category),
      isUnlocked: (id) => get().unlockedEntries.has(id),
      isNew: (id) => get().newEntries.has(id),
      getUnlockedCount: () => KNOWLEDGE_ENTRIES.length,
      getTotalCount: () => KNOWLEDGE_ENTRIES.length,
    }),
    {
      name: 'millos-autonomous-datalinks',
      storage: safeJSONStorage,
      version: 2,
      migrate: (persisted) => sanitizeKnowledgeState(persisted) as unknown as KnowledgeState,
      partialize: (state) => ({
        unlockedEntries: [...state.unlockedEntries],
        readEntries: [...state.readEntries],
        showTooltips: state.showTooltips,
        showLoadingQuotes: state.showLoadingQuotes,
        showAINarration: state.showAINarration,
        showUnlockNotifications: state.showUnlockNotifications,
      }),
      merge: (persisted, current) => {
        const state = sanitizeKnowledgeState(persisted);
        return {
          ...current,
          unlockedEntries: new Set(KNOWLEDGE_ENTRIES.map((entry) => entry.id)),
          readEntries: new Set(state.readEntries ?? []),
          newEntries: new Set<string>(),
          showTooltips: state.showTooltips ?? true,
          showLoadingQuotes: state.showLoadingQuotes ?? true,
          showAINarration: state.showAINarration ?? true,
          showUnlockNotifications: state.showUnlockNotifications ?? true,
        };
      },
    }
  )
);

export function getRandomLoadingQuote(): KnowledgeQuote {
  return LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
}

export function getCategoryIcon(category: KnowledgeCategory): KnowledgeIcon {
  if (category === 'principles') return 'sprout';
  if (category === 'pioneers') return 'sparkles';
  if (category === 'systems') return 'cog';
  return 'library';
}

export function getCategoryLabel(category: KnowledgeCategory): string {
  if (category === 'principles') return 'Operating Principles';
  if (category === 'pioneers') return 'World and Process Lineage';
  if (category === 'systems') return 'Control Systems';
  return 'Operational Cases';
}
