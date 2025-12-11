/**
 * Worker Mood & Chaos Store
 *
 * Theme Hospital-inspired worker mood system with visible chaos events.
 * Workers grumble and complain, but they're fundamentally content souls
 * who never actually storm out - they just enjoy a good moan.
 */

import { create } from 'zustand';
import {
  WorkerMood,
  MoodState,
  ChaosEvent,
  ChaosEventType,
  FactoryEnvironment,
  MaintenanceTask,
  FactoryPlant,
  GRUMBLE_PHRASES,
  CHAOS_EVENT_CONFIG,
  PLANT_NAMES,
  WORKER_ROSTER,
} from '../types';

// Helper to get random item from array
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Throttling for mood simulation (similar to gameSimulationStore)
let lastMoodTickTime = 0;
let accumulatedDeltaMinutes = 0;

// Timeout tracking for cleanup
const activeTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Store a timeout ID for later cleanup
 */
const storeTimeout = (key: string, timeoutId: NodeJS.Timeout): void => {
  // Clear any existing timeout for this key
  const existing = activeTimeouts.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  activeTimeouts.set(key, timeoutId);
};

/**
 * Clear and remove a stored timeout
 */
const clearStoredTimeout = (key: string): void => {
  const timeoutId = activeTimeouts.get(key);
  if (timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(key);
  }
};

/**
 * Clear all stored timeouts (for cleanup on unmount)
 */
export const clearAllWorkerTimeouts = (): void => {
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts.clear();
};

// Worker reaction types for chaos events
export type WorkerReaction = 'none' | 'slipping' | 'coughing' | 'startled';

export interface WorkerReactionState {
  reaction: WorkerReaction;
  startTime: number;
  duration: number;
}

// Generate initial moods for all workers - they're a jolly bunch!
const generateInitialMoods = (): Record<string, WorkerMood> => {
  const moods: Record<string, WorkerMood> = {};
  WORKER_ROSTER.forEach((worker) => {
    moods[worker.id] = {
      workerId: worker.id,
      energy: 85 + Math.random() * 15, // Start with HIGH energy (85-100)
      satisfaction: 80 + Math.random() * 20, // Start happy (80-100)
      patience: 85 + Math.random() * 15, // Start patient (85-100)
      state: 'content',
      lastBreak: 6, // Assume shift just started at 6am
      grumbleQueue: [],
      isSpeaking: false,
    };
  });
  return moods;
};

// Generate initial factory plants
const generateInitialPlants = (): FactoryPlant[] => {
  const plantPositions: [number, number, number][] = [
    [-25, 0, 15], // Near break room area
    [25, 0, 15],
    [-20, 0, -15],
    [20, 0, -15],
    [0, 0, 30], // Near packing area
    [-12, 0, 0], // Central area
    [12, 0, 0],
  ];

  return plantPositions.map((pos, i) => ({
    id: `plant-${i}`,
    position: pos,
    type: (['potted_fern', 'desk_succulent', 'tall_palm', 'hanging_ivy'] as const)[i % 4],
    health: 70 + Math.random() * 30,
    lastWatered: 6,
    name: PLANT_NAMES[i % PLANT_NAMES.length],
  }));
};

interface WorkerMoodStore {
  // Worker moods
  workerMoods: Record<string, WorkerMood>;
  updateWorkerMood: (workerId: string, updates: Partial<WorkerMood>) => void;
  setWorkerSpeaking: (workerId: string, phrase: string) => void;
  clearWorkerSpeech: (workerId: string) => void;
  triggerRandomGrumble: (workerId: string) => void;

  // Worker reactions (slip, cough, etc.)
  workerReactions: Record<string, WorkerReactionState>;
  triggerWorkerReaction: (workerId: string, reaction: WorkerReaction, duration?: number) => void;
  clearWorkerReaction: (workerId: string) => void;

  // Chaos events
  chaosEvents: ChaosEvent[];
  addChaosEvent: (event: Omit<ChaosEvent, 'id'>) => void;
  resolveChaosEvent: (eventId: string) => void;
  triggerRandomChaos: () => void;

  // Factory environment
  factoryEnvironment: FactoryEnvironment;
  updateEnvironment: (updates: Partial<FactoryEnvironment>) => void;
  waterPlant: (plantId: string) => void;
  addDust: (amount: number) => void;
  cleanDust: (amount: number) => void;

  // Maintenance tasks
  maintenanceTasks: MaintenanceTask[];
  addMaintenanceTask: (task: Omit<MaintenanceTask, 'id' | 'progress'>) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
  completeTask: (taskId: string) => void;

  // Simulation tick - called every game minute
  tickMoodSimulation: (gameTime: number, deltaMinutes: number) => void;
}

export const useWorkerMoodStore = create<WorkerMoodStore>((set, get) => ({
  // Initialize worker moods
  workerMoods: generateInitialMoods(),

  updateWorkerMood: (workerId, updates) =>
    set((state) => ({
      workerMoods: {
        ...state.workerMoods,
        [workerId]: {
          ...state.workerMoods[workerId],
          ...updates,
        },
      },
    })),

  setWorkerSpeaking: (workerId, phrase) =>
    set((state) => ({
      workerMoods: {
        ...state.workerMoods,
        [workerId]: {
          ...state.workerMoods[workerId],
          isSpeaking: true,
          currentPhrase: phrase,
        },
      },
    })),

  clearWorkerSpeech: (workerId) => {
    // Clear any pending speech timeout for this worker
    clearStoredTimeout(`speech-${workerId}`);

    set((state) => ({
      workerMoods: {
        ...state.workerMoods,
        [workerId]: {
          ...state.workerMoods[workerId],
          isSpeaking: false,
          currentPhrase: undefined,
        },
      },
    }));
  },

  triggerRandomGrumble: (workerId) => {
    const mood = get().workerMoods[workerId];
    if (!mood || mood.isSpeaking) return;

    // Only grumble if actually in a bad mood - jolly workers stay quiet!
    if (mood.state === 'content' || mood.state === 'elated') {
      // Happy workers occasionally say nice things instead
      if (Math.random() < 0.3) {
        const phrases = GRUMBLE_PHRASES[mood.state];
        const phrase = randomFrom(phrases);
        get().setWorkerSpeaking(workerId, phrase);

        // Store timeout for cleanup
        const timeoutId = setTimeout(
          () => get().clearWorkerSpeech(workerId),
          2500 + Math.random() * 1500
        );
        storeTimeout(`speech-${workerId}`, timeoutId);
      }
      return;
    }

    const phrases = GRUMBLE_PHRASES[mood.state];
    const phrase = randomFrom(phrases);
    get().setWorkerSpeaking(workerId, phrase);

    // Clear speech after 3-5 seconds - store timeout for cleanup
    const timeoutId = setTimeout(
      () => {
        get().clearWorkerSpeech(workerId);
      },
      3000 + Math.random() * 2000
    );
    storeTimeout(`speech-${workerId}`, timeoutId);
  },

  // Worker reactions (slipping, coughing, etc.)
  workerReactions: {},

  triggerWorkerReaction: (workerId, reaction, duration = 2000) => {
    // Don't interrupt existing reactions
    const existing = get().workerReactions[workerId];
    if (
      existing &&
      existing.reaction !== 'none' &&
      Date.now() - existing.startTime < existing.duration
    ) {
      return;
    }

    set((state) => ({
      workerReactions: {
        ...state.workerReactions,
        [workerId]: {
          reaction,
          startTime: Date.now(),
          duration,
        },
      },
    }));

    // Add appropriate speech bubble
    const slipPhrases = ['Whoa!', 'Whoops!', 'Slippery!', 'Yikes!', 'Oof!'];
    const coughPhrases = ['*cough cough*', '*wheeze*', 'So dusty!', '*hack*', 'Need air!'];

    if (reaction === 'slipping') {
      get().setWorkerSpeaking(workerId, randomFrom(slipPhrases));
    } else if (reaction === 'coughing') {
      get().setWorkerSpeaking(workerId, randomFrom(coughPhrases));
    }

    // Clear reaction after duration - store timeout for cleanup
    const timeoutId = setTimeout(() => {
      get().clearWorkerReaction(workerId);
      get().clearWorkerSpeech(workerId);
    }, duration);
    storeTimeout(`reaction-${workerId}`, timeoutId);
  },

  clearWorkerReaction: (workerId) => {
    // Clear any pending reaction timeout for this worker
    clearStoredTimeout(`reaction-${workerId}`);

    set((state) => ({
      workerReactions: {
        ...state.workerReactions,
        [workerId]: { reaction: 'none', startTime: 0, duration: 0 },
      },
    }));
  },

  // Chaos events
  chaosEvents: [],

  addChaosEvent: (event) =>
    set((state) => ({
      chaosEvents: [
        ...state.chaosEvents,
        {
          ...event,
          id: `chaos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
      ],
    })),

  resolveChaosEvent: (eventId) =>
    set((state) => ({
      chaosEvents: state.chaosEvents.map((e) => (e.id === eventId ? { ...e, resolved: true } : e)),
    })),

  triggerRandomChaos: () => {
    const chaosTypes: ChaosEventType[] = [
      'grain_spill',
      'dust_cloud',
      'conveyor_jam',
      'rat_sighting',
      'power_flicker',
      'pigeon_incursion',
      'mysterious_puddle',
    ];

    const type = randomFrom(chaosTypes);
    const config = CHAOS_EVENT_CONFIG[type];

    // Random position in the factory
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 40,
      0,
      (Math.random() - 0.5) * 50,
    ];

    // Affect nearby workers (randomly pick 1-3)
    const workerIds = WORKER_ROSTER.map((w) => w.id);
    const affectedCount = 1 + Math.floor(Math.random() * 3);
    const affectedWorkerIds = workerIds.sort(() => Math.random() - 0.5).slice(0, affectedCount);

    get().addChaosEvent({
      type,
      position,
      startTime: Date.now(),
      duration: config.defaultDuration,
      severity: (['minor', 'moderate', 'dramatic'] as const)[Math.floor(Math.random() * 3)],
      affectedWorkerIds,
      resolved: false,
      description: config.description,
    });

    // Make affected workers react
    affectedWorkerIds.forEach((id) => {
      const reaction = randomFrom(config.workerReactions);
      get().setWorkerSpeaking(id, reaction);

      // Store timeout for cleanup
      const timeoutId = setTimeout(() => get().clearWorkerSpeech(id), 4000 + Math.random() * 2000);
      storeTimeout(`speech-${id}`, timeoutId);
    });
  },

  // Factory environment
  factoryEnvironment: {
    dustLevel: 20,
    machineOilLevels: {},
    lightBulbsWorking: {
      zone1: true,
      zone2: true,
      zone3: true,
      zone4: true,
    },
    plants: generateInitialPlants(),
    coffeeMachineStatus: 'working',
    lastCleaning: 6,
  },

  updateEnvironment: (updates) =>
    set((state) => ({
      factoryEnvironment: {
        ...state.factoryEnvironment,
        ...updates,
      },
    })),

  waterPlant: (plantId) =>
    set((state) => ({
      factoryEnvironment: {
        ...state.factoryEnvironment,
        plants: state.factoryEnvironment.plants.map((p) =>
          p.id === plantId
            ? { ...p, health: Math.min(100, p.health + 30), lastWatered: Date.now() }
            : p
        ),
      },
    })),

  addDust: (amount) =>
    set((state) => ({
      factoryEnvironment: {
        ...state.factoryEnvironment,
        dustLevel: Math.min(100, state.factoryEnvironment.dustLevel + amount),
      },
    })),

  cleanDust: (amount) =>
    set((state) => ({
      factoryEnvironment: {
        ...state.factoryEnvironment,
        dustLevel: Math.max(0, state.factoryEnvironment.dustLevel - amount),
      },
    })),

  // Maintenance tasks
  maintenanceTasks: [],

  addMaintenanceTask: (task) =>
    set((state) => ({
      maintenanceTasks: [
        ...state.maintenanceTasks,
        {
          ...task,
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          progress: 0,
        },
      ],
    })),

  updateTaskProgress: (taskId, progress) =>
    set((state) => ({
      maintenanceTasks: state.maintenanceTasks.map((t) =>
        t.id === taskId ? { ...t, progress: Math.min(100, progress) } : t
      ),
    })),

  completeTask: (taskId) =>
    set((state) => ({
      maintenanceTasks: state.maintenanceTasks.filter((t) => t.id !== taskId),
    })),

  // Simulation tick
  tickMoodSimulation: (gameTime, deltaMinutes) => {
    // Throttling: Only run every 200ms (accumulate deltaMinutes for accuracy)
    const now = Date.now();
    if (now - lastMoodTickTime < 200) {
      accumulatedDeltaMinutes += deltaMinutes;
      return;
    }

    const effectiveDelta = deltaMinutes + accumulatedDeltaMinutes;
    lastMoodTickTime = now;
    accumulatedDeltaMinutes = 0;

    const state = get();

    // Collect side effects to execute after state update
    const sideEffects: Array<() => void> = [];

    // Calculate active chaos count once
    const activeChaos = state.chaosEvents.filter((e) => !e.resolved).length;
    const hourOfDay = gameTime % 24;
    const isBreakTime =
      (hourOfDay >= 10 && hourOfDay < 10.5) || (hourOfDay >= 14 && hourOfDay < 14.5);

    // Calculate all mood updates first (batch phase)
    const updatedMoods: Record<string, WorkerMood> = {};
    Object.entries(state.workerMoods).forEach(([workerId, mood]) => {
      // Energy depletes VERY slowly - workers are hardy folk!
      const energyDrain = mood.state === 'frustrated' ? 0.08 : 0.04;
      let newEnergy = Math.max(0, mood.energy - energyDrain * effectiveDelta);

      // Patience depletes only during active chaos
      const patienceDrain = activeChaos * 0.1;
      let newPatience = Math.max(0, mood.patience - patienceDrain * effectiveDelta);

      // Satisfaction trends toward HIGH baseline (85) - they love their jobs!
      let newSatisfaction = mood.satisfaction + (85 - mood.satisfaction) * 0.02 * effectiveDelta;

      // Passive recovery even while working (they're resilient)
      newEnergy = Math.min(100, newEnergy + 0.02 * effectiveDelta);
      newPatience = Math.min(100, newPatience + 0.03 * effectiveDelta);

      // Break time recovery (workers on break between certain hours)
      if (isBreakTime) {
        newEnergy = Math.min(100, newEnergy + 3 * effectiveDelta);
        newPatience = Math.min(100, newPatience + 2 * effectiveDelta);
        newSatisfaction = Math.min(100, newSatisfaction + 1 * effectiveDelta);
      }

      // Determine mood state - LOWER thresholds for bad moods (harder to reach)
      let newState: MoodState = 'content';
      if (newEnergy < 20) {
        // Only tired when REALLY exhausted
        newState = 'tired';
      } else if (newPatience < 15) {
        // Only frustrated when patience is nearly gone
        newState = 'frustrated';
      } else if (newSatisfaction < 15) {
        // Only hangry when starving
        newState = 'hangry';
      } else if (newEnergy > 70 && newSatisfaction > 70) {
        // Elated is easier to achieve - workers are generally happy!
        newState = 'elated';
      }

      // Random chance to speak - much lower for grumbles
      const grumbleChance =
        mood.state === 'tired' || mood.state === 'frustrated' || mood.state === 'hangry'
          ? 0.015 * effectiveDelta // Grumble occasionally when unhappy
          : 0.008 * effectiveDelta; // Rarely speak when content (just enjoying work)

      if (Math.random() < grumbleChance) {
        // Queue grumble side effect for later
        sideEffects.push(() => get().triggerRandomGrumble(workerId));
      }

      // Store updated mood
      updatedMoods[workerId] = {
        ...mood,
        energy: newEnergy,
        patience: newPatience,
        satisfaction: newSatisfaction,
        state: newState,
      };
    });

    // Calculate plant health updates
    const updatedPlants = state.factoryEnvironment.plants.map((plant) => ({
      ...plant,
      health: plant.health > 0 ? Math.max(0, plant.health - 0.02 * effectiveDelta) : 0,
    }));

    // Calculate new dust level
    const newDustLevel = Math.min(100, state.factoryEnvironment.dustLevel + 0.05 * effectiveDelta);

    // Small chance for random chaos
    if (Math.random() < 0.005 * effectiveDelta) {
      sideEffects.push(() => get().triggerRandomChaos());
    }

    // Clean up resolved chaos events older than 2 minutes
    const twoMinutesAgo = Date.now() - 120000;
    const filteredChaosEvents = state.chaosEvents.filter(
      (e) => !e.resolved || e.startTime > twoMinutesAgo
    );

    // Single batched state update
    set({
      workerMoods: updatedMoods,
      factoryEnvironment: {
        ...state.factoryEnvironment,
        dustLevel: newDustLevel,
        plants: updatedPlants,
      },
      chaosEvents: filteredChaosEvents,
    });

    // Execute side effects after state update (using queueMicrotask for next tick)
    sideEffects.forEach((effect) => queueMicrotask(effect));
  },
}));
