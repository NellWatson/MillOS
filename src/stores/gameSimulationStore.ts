import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from './storage';

export type CelebrationType = 'milestone' | 'zero_incident' | 'target_met' | 'shift_complete';

export interface CelebrationEvent {
  type: CelebrationType;
  value?: number;
  timestamp: number;
  position?: [number, number, number];
  message?: string;
}

export interface ShiftIncident {
  type: 'machine_failure' | 'safety_alert' | 'quality_issue' | 'efficiency_drop';
  machineId?: string;
  description: string;
  timestamp: number;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ShiftData {
  currentShift: 'morning' | 'afternoon' | 'night';
  shiftStartTime: number;
  previousShiftNotes: string[];
  shiftIncidents: ShiftIncident[];
  shiftProduction: {
    target: number;
    actual: number;
    efficiency: number; // percentage
  };
  outgoingSupervisor: string;
  incomingSupervisor: string;
  handoverPhase: 'idle' | 'briefing' | 'handover' | 'summary';
  priorities: string[];
  workerAssignments: Array<{
    workerId: string;
    workerName: string;
    assignment: string;
  }>;
}

// Crisis types
export type CrisisType = 'fire' | 'power_outage' | 'supply_emergency' | 'inspection' | 'weather';
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CrisisState {
  active: boolean;
  type: CrisisType | null;
  severity: CrisisSeverity;
  startTime: number;
  affectedMachineId?: string;
  metadata?: Record<string, unknown>;
}

interface GameSimulationStore {
  // Tab visibility - PERFORMANCE: animations should check this and skip when false
  isTabVisible: boolean;
  setTabVisible: (visible: boolean) => void;

  // Game Time (24-hour cycle)
  gameTime: number; // 0-24 representing hour of day
  gameSpeed: number; // 0 = paused, 60 = 1 real sec = 1 game min, 600 = 1 real sec = 10 game mins
  setGameTime: (time: number) => void;
  setGameSpeed: (speed: number) => void;
  tickGameTime: (deltaSeconds: number) => void; // deltaSeconds = real time elapsed
  resetGameState: () => void; // Reset time to 6am, speed to 60x

  // Weather system
  weather: 'clear' | 'cloudy' | 'rain' | 'storm';
  setWeather: (weather: 'clear' | 'cloudy' | 'rain' | 'storm') => void;

  // Shift management (legacy - kept for backward compatibility)
  currentShift: 'morning' | 'afternoon' | 'night';
  shiftStartTime: number;
  shiftChangeActive: boolean;
  shiftChangePhase: 'idle' | 'leaving' | 'entering';
  setShift: (shift: 'morning' | 'afternoon' | 'night') => void;
  triggerShiftChange: () => void;
  completeShiftChange: () => void;

  // Enhanced shift data
  shiftData: ShiftData;
  startShiftBriefing: () => void;
  completeShiftBriefing: () => void;
  startShiftHandover: () => void;
  completeShiftHandover: () => void;
  showShiftSummary: () => void;
  closeShiftSummary: () => void;
  addShiftNote: (note: string) => void;
  addShiftIncident: (incident: Omit<ShiftIncident, 'timestamp'>) => void;
  resolveShiftIncident: (index: number) => void;
  updateShiftProduction: (actual: number) => void;
  addShiftPriority: (priority: string) => void;

  // Emergency state
  emergencyActive: boolean;
  emergencyMachineId: string | null;
  emergencyDrillMode: boolean;
  triggerEmergency: (machineId: string) => void;
  resolveEmergency: () => void;
  startEmergencyDrill: () => void;
  endEmergencyDrill: () => void;

  // Crisis system
  crisisState: CrisisState;
  triggerCrisis: (
    type: CrisisType,
    severity: CrisisSeverity,
    metadata?: Record<string, unknown>
  ) => void;
  resolveCrisis: () => void;

  // Celebrations system
  celebrations: {
    lastMilestone: number;
    milestoneQueue: CelebrationEvent[];
    zeroIncidentStreak: number;
    celebrationActive: boolean;
    packerBellEnabled: boolean;
  };
  triggerCelebration: (type: CelebrationType, data?: Partial<CelebrationEvent>) => void;
  clearCelebration: () => void;
  updateZeroIncidentStreak: (days: number) => void;
  setPackerBellEnabled: (enabled: boolean) => void;
}

// Supervisor names pool for rotation
const SUPERVISORS = [
  'Sarah Mitchell',
  'Marcus Chen',
  'James Rodriguez',
  'Emily Thompson',
  'David Park',
  'Lisa Anderson',
];

// Get shift-appropriate supervisor (deterministic based on shift)
const getSupervisorForShift = (shift: 'morning' | 'afternoon' | 'night', offset = 0): string => {
  const shiftIndex = shift === 'morning' ? 0 : shift === 'afternoon' ? 1 : 2;
  return SUPERVISORS[(shiftIndex + offset) % SUPERVISORS.length];
};

// Get shift-specific challenges/priorities
const getShiftPriorities = (shift: 'morning' | 'afternoon' | 'night'): string[] => {
  switch (shift) {
    case 'morning':
      return [
        'Equipment warmup procedures',
        'Safety briefing complete',
        'Quality checks on overnight production',
      ];
    case 'afternoon':
      return [
        'Peak production targets',
        'Maintenance window preparation',
        'Evening shift handover documentation',
      ];
    case 'night':
      return [
        'Reduced staffing protocols',
        'Scheduled maintenance activities',
        'Emergency response readiness',
      ];
  }
};

// Calculate expected shift based on game hour (handles midnight crossover correctly)
const getShiftForHour = (hour: number): 'morning' | 'afternoon' | 'night' => {
  // Normalize hour to 0-24 range
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (normalizedHour >= 6 && normalizedHour < 14) return 'morning';
  if (normalizedHour >= 14 && normalizedHour < 22) return 'afternoon';
  return 'night'; // 22:00-05:59
};

// Default initial shift data
const createDefaultShiftData = (): ShiftData => ({
  currentShift: 'morning',
  shiftStartTime: Date.now(),
  previousShiftNotes: [],
  shiftIncidents: [],
  shiftProduction: {
    target: 1200,
    actual: 0,
    efficiency: 0,
  },
  outgoingSupervisor: '',
  incomingSupervisor: getSupervisorForShift('morning'),
  handoverPhase: 'idle',
  priorities: getShiftPriorities('morning'),
  workerAssignments: [],
});

// Default crisis state
const createDefaultCrisisState = (): CrisisState => ({
  active: false,
  type: null,
  severity: 'medium',
  startTime: 0,
  metadata: {},
});

// Throttling for tickGameTime - update every 100ms instead of every frame
let lastTickTime = 0;
let accumulatedDelta = 0;
const TICK_INTERVAL = 100; // Update every 100ms

export const useGameSimulationStore = create<GameSimulationStore>()(
  persist(
    (set, get) => ({
      // Tab visibility - PERFORMANCE: animations check this to skip when tab hidden
      isTabVisible: true,
      setTabVisible: (visible) => set({ isTabVisible: visible }),

      // Game time starts at 6am (Day shift start)
      // gameSpeed: seconds of game time per real second (60 = 1 min/sec, 600 = 10 min/sec)
      gameTime: 6,
      gameSpeed: 60, // Default: 1 real second = 1 game minute

      setGameTime: (time) => set({ gameTime: ((time % 24) + 24) % 24 }), // Handle negative wrap

      setGameSpeed: (speed) => set({ gameSpeed: speed }),

      tickGameTime: (deltaSeconds) => {
        // Throttle updates to every 100ms to reduce re-renders
        const now = Date.now();
        if (now - lastTickTime < TICK_INTERVAL) {
          // Accumulate delta for accuracy
          accumulatedDelta += deltaSeconds;
          return;
        }

        // Add accumulated delta to current delta
        const totalDelta = deltaSeconds + accumulatedDelta;
        accumulatedDelta = 0;
        lastTickTime = now;

        set((state) => {
          if (state.gameSpeed === 0) return {}; // Paused
          // Convert: deltaSeconds * gameSpeed = game seconds elapsed
          // Then convert to hours: / 3600
          const hoursElapsed = (totalDelta * state.gameSpeed) / 3600;
          const newTime = (state.gameTime + hoursElapsed) % 24;

          // Calculate expected shift based on new time (handles midnight crossover correctly)
          const expectedShift = getShiftForHour(newTime);

          // Trigger shift handover if shift should change and not already in handover
          if (expectedShift !== state.currentShift && !state.shiftChangeActive) {
            // Start shift handover automatically
            get().startShiftHandover();
          }

          return { gameTime: newTime };
        });
      },

      resetGameState: () =>
        set({
          gameTime: 6,
          gameSpeed: 60,
          shiftData: createDefaultShiftData(),
          currentShift: 'morning',
          shiftStartTime: Date.now(),
          crisisState: createDefaultCrisisState(),
        }),

      // Weather system
      weather: 'clear' as const,
      setWeather: (weather) => set({ weather }),

      // Shift management (legacy)
      currentShift: 'morning' as const,
      shiftStartTime: Date.now(),
      shiftChangeActive: false,
      shiftChangePhase: 'idle' as const,

      setShift: (shift) =>
        set((state) => ({
          currentShift: shift,
          shiftStartTime: Date.now(),
          shiftData: {
            ...state.shiftData,
            currentShift: shift,
            shiftStartTime: Date.now(),
            incomingSupervisor: getSupervisorForShift(shift),
            priorities: getShiftPriorities(shift),
          },
        })),

      triggerShiftChange: () =>
        set({
          shiftChangeActive: true,
          shiftChangePhase: 'leaving',
        }),

      completeShiftChange: () =>
        set((state) => {
          // Calculate next shift based on current game time (handles time jumps correctly)
          const nextShift = getShiftForHour(state.gameTime);
          return {
            shiftChangeActive: false,
            shiftChangePhase: 'idle' as const,
            currentShift: nextShift,
            shiftStartTime: Date.now(),
            shiftData: {
              ...state.shiftData,
              currentShift: nextShift,
              shiftStartTime: Date.now(),
              outgoingSupervisor: state.shiftData.incomingSupervisor,
              incomingSupervisor: getSupervisorForShift(nextShift),
              priorities: getShiftPriorities(nextShift),
              handoverPhase: 'idle' as const,
            },
          };
        }),

      // Enhanced shift data
      shiftData: createDefaultShiftData(),

      startShiftBriefing: () =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            handoverPhase: 'briefing',
          },
        })),

      completeShiftBriefing: () =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            handoverPhase: 'idle',
          },
        })),

      startShiftHandover: () =>
        set((state) => {
          // Calculate next shift based on current game time (handles time jumps correctly)
          const nextShift = getShiftForHour(state.gameTime);

          return {
            shiftChangeActive: true,
            shiftChangePhase: 'leaving',
            shiftData: {
              ...state.shiftData,
              handoverPhase: 'handover',
              outgoingSupervisor: state.shiftData.incomingSupervisor,
              incomingSupervisor: getSupervisorForShift(nextShift),
            },
          };
        }),

      completeShiftHandover: () =>
        set((state) => {
          // Calculate next shift based on current game time (handles time jumps correctly)
          const nextShift = getShiftForHour(state.gameTime);

          // Archive previous shift notes and incidents as historical record
          const archiveNotes = [
            `Shift ${state.currentShift} completed at ${new Date().toLocaleTimeString()}`,
            `Production: ${state.shiftData.shiftProduction.actual}/${state.shiftData.shiftProduction.target} bags (${state.shiftData.shiftProduction.efficiency.toFixed(1)}%)`,
            ...state.shiftData.shiftIncidents
              .filter((inc) => !inc.resolved)
              .map((inc) => `UNRESOLVED: ${inc.description}`),
          ];

          return {
            shiftChangeActive: false,
            shiftChangePhase: 'idle',
            currentShift: nextShift,
            shiftStartTime: Date.now(),
            shiftData: {
              currentShift: nextShift,
              shiftStartTime: Date.now(),
              previousShiftNotes: archiveNotes,
              shiftIncidents: [], // Reset for new shift
              shiftProduction: {
                target: 1200,
                actual: 0,
                efficiency: 0,
              },
              outgoingSupervisor: state.shiftData.incomingSupervisor,
              incomingSupervisor: getSupervisorForShift(nextShift),
              handoverPhase: 'idle',
              priorities: getShiftPriorities(nextShift),
              workerAssignments: [], // Reset for new shift
            },
          };
        }),

      showShiftSummary: () =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            handoverPhase: 'summary',
          },
        })),

      closeShiftSummary: () =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            handoverPhase: 'idle',
          },
        })),

      addShiftNote: (note) =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            previousShiftNotes: [...state.shiftData.previousShiftNotes, note],
          },
        })),

      addShiftIncident: (incident) =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            shiftIncidents: [
              ...state.shiftData.shiftIncidents,
              {
                ...incident,
                timestamp: Date.now(),
              },
            ],
          },
        })),

      resolveShiftIncident: (index) =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            shiftIncidents: state.shiftData.shiftIncidents.map((inc, i) =>
              i === index ? { ...inc, resolved: true } : inc
            ),
          },
        })),

      updateShiftProduction: (actual) =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            shiftProduction: {
              ...state.shiftData.shiftProduction,
              actual,
              efficiency: (actual / state.shiftData.shiftProduction.target) * 100,
            },
          },
        })),

      addShiftPriority: (priority) =>
        set((state) => ({
          shiftData: {
            ...state.shiftData,
            priorities: [...state.shiftData.priorities, priority],
          },
        })),

      // Emergency state
      emergencyActive: false,
      emergencyMachineId: null,
      emergencyDrillMode: false,

      triggerEmergency: (machineId) =>
        set({ emergencyActive: true, emergencyMachineId: machineId }),

      resolveEmergency: () =>
        set({
          emergencyActive: false,
          emergencyMachineId: null,
          emergencyDrillMode: false,
        }),

      startEmergencyDrill: () =>
        set({
          emergencyActive: true,
          emergencyMachineId: 'DRILL',
          emergencyDrillMode: true,
        }),

      endEmergencyDrill: () =>
        set({
          emergencyActive: false,
          emergencyMachineId: null,
          emergencyDrillMode: false,
        }),

      // Crisis system
      crisisState: createDefaultCrisisState(),

      triggerCrisis: (type, severity, metadata = {}) =>
        set((state) => {
          // Only allow one crisis at a time
          if (state.crisisState.active) return {};

          return {
            crisisState: {
              active: true,
              type,
              severity,
              startTime: Date.now(),
              affectedMachineId: metadata.affectedMachineId as string | undefined,
              metadata,
            },
          };
        }),

      resolveCrisis: () =>
        set((state) => ({
          crisisState: {
            ...state.crisisState,
            active: false,
          },
        })),

      // Celebrations system
      celebrations: {
        lastMilestone: 0,
        milestoneQueue: [],
        zeroIncidentStreak: 0,
        celebrationActive: false,
        packerBellEnabled: true,
      },

      triggerCelebration: (type, data = {}) =>
        set((state) => {
          const celebration: CelebrationEvent = {
            type,
            timestamp: Date.now(),
            value: data.value,
            position: data.position,
            message: data.message,
          };

          // Update milestone tracking for production milestones
          const lastMilestone =
            type === 'milestone' && data.value ? data.value : state.celebrations.lastMilestone;

          return {
            celebrations: {
              ...state.celebrations,
              lastMilestone,
              milestoneQueue: [...state.celebrations.milestoneQueue, celebration].slice(-5),
              celebrationActive: true,
            },
          };
        }),

      clearCelebration: () =>
        set((state) => ({
          celebrations: {
            ...state.celebrations,
            celebrationActive: false,
          },
        })),

      updateZeroIncidentStreak: (days) =>
        set((state) => ({
          celebrations: {
            ...state.celebrations,
            zeroIncidentStreak: days,
          },
        })),

      setPackerBellEnabled: (enabled) =>
        set((state) => ({
          celebrations: {
            ...state.celebrations,
            packerBellEnabled: enabled,
          },
        })),
    }),
    {
      name: 'millos-game-simulation',
      storage: safeJSONStorage,
      partialize: (state) => ({
        gameTime: state.gameTime,
        gameSpeed: state.gameSpeed,
        weather: state.weather,
        currentShift: state.currentShift, // Persist current shift for resume
        shiftData: state.shiftData, // Persist shift data
        celebrations: {
          packerBellEnabled: state.celebrations.packerBellEnabled,
          zeroIncidentStreak: state.celebrations.zeroIncidentStreak,
        },
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate game simulation state:', error);
          return;
        }

        // Validate weather
        if (state && state.weather) {
          const validWeather = ['clear', 'cloudy', 'rain', 'storm'];
          if (!validWeather.includes(state.weather)) {
            console.warn('Invalid weather detected, resetting to clear');
            state.weather = 'clear' as const;
          }
        }

        // Sync currentShift with gameTime on resume
        // This ensures the shift matches the restored game time
        if (state && typeof state.gameTime === 'number') {
          const expectedShift = getShiftForHour(state.gameTime);

          // If shift doesn't match game time, sync it
          if (state.currentShift !== expectedShift) {
            console.log(
              `[GameSimulation] Syncing shift: ${state.currentShift} -> ${expectedShift} (gameTime: ${state.gameTime.toFixed(1)})`
            );
            state.currentShift = expectedShift;

            // Also sync shiftData.currentShift if it exists
            if (state.shiftData) {
              state.shiftData.currentShift = expectedShift;
              state.shiftData.incomingSupervisor = getSupervisorForShift(expectedShift);
              state.shiftData.priorities = getShiftPriorities(expectedShift);
            }
          }
        }

        // Initialize celebrations if missing
        if (state && !state.celebrations) {
          state.celebrations = {
            lastMilestone: 0,
            milestoneQueue: [],
            zeroIncidentStreak: 0,
            celebrationActive: false,
            packerBellEnabled: true,
          };
        }

        // Initialize shift data if missing
        if (state && !state.shiftData) {
          state.shiftData = createDefaultShiftData();
        }

        // Initialize crisis state if missing
        if (state && !state.crisisState) {
          state.crisisState = createDefaultCrisisState();
        }
      },
    }
  )
);
