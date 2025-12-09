import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  MachineData,
  WorkerData,
  AIDecision,
  ProductionTarget,
  Achievement,
  PAnnouncement,
  IncidentReplayFrame,
} from '../types';

// Performance-optimized indices for O(1) lookups
interface ProductionIndices {
  // AI decision indices for fast lookup
  aiDecisionsByMachine: Map<string, AIDecision[]>;
  aiDecisionsByWorker: Map<string, AIDecision[]>;
  // Heat map indices for O(1) position lookup
  heatMapIndex: Map<string, { x: number; z: number; intensity: number }>;
  // Entity indices for fast lookup
  machinesById: Map<string, MachineData>;
  workersById: Map<string, WorkerData>;
}

// Helper functions for index management
function createEmptyProductionIndices(): ProductionIndices {
  return {
    aiDecisionsByMachine: new Map(),
    aiDecisionsByWorker: new Map(),
    heatMapIndex: new Map(),
    machinesById: new Map(),
    workersById: new Map(),
  };
}

function rebuildAIDecisionIndices(
  decisions: AIDecision[]
): Pick<ProductionIndices, 'aiDecisionsByMachine' | 'aiDecisionsByWorker'> {
  const byMachine = new Map<string, AIDecision[]>();
  const byWorker = new Map<string, AIDecision[]>();

  decisions.forEach((decision) => {
    const isActive = decision.status === 'pending' || decision.status === 'in_progress';
    if (!isActive) return;

    if (decision.machineId) {
      const existing = byMachine.get(decision.machineId) || [];
      byMachine.set(decision.machineId, [...existing, decision]);
    }
    if (decision.workerId) {
      const existing = byWorker.get(decision.workerId) || [];
      byWorker.set(decision.workerId, [...existing, decision]);
    }
  });

  return { aiDecisionsByMachine: byMachine, aiDecisionsByWorker: byWorker };
}

function rebuildMachineIndex(machines: MachineData[]): Map<string, MachineData> {
  const index = new Map<string, MachineData>();
  machines.forEach((machine) => index.set(machine.id, machine));
  return index;
}

function rebuildWorkerIndex(workers: WorkerData[]): Map<string, WorkerData> {
  const index = new Map<string, WorkerData>();
  workers.forEach((worker) => index.set(worker.id, worker));
  return index;
}

function getGridKey(x: number, z: number, threshold: number): string {
  return `${Math.round(x / threshold)}_${Math.round(z / threshold)}`;
}

interface ProductionStore {
  // Performance indices (internal, not directly accessed)
  _indices: ProductionIndices;

  // Production
  productionSpeed: number;
  setProductionSpeed: (speed: number) => void;

  // Workers
  workers: WorkerData[];
  selectedWorker: WorkerData | null;
  setSelectedWorker: (worker: WorkerData | null) => void;
  setWorkers: (workers: WorkerData[]) => void;
  updateWorkerTask: (workerId: string, task: string, targetMachine?: string) => void;

  // Machines
  machines: MachineData[];
  selectedMachine: MachineData | null;
  setSelectedMachine: (machine: MachineData | null) => void;
  updateMachineStatus: (
    machineId: string,
    status: 'running' | 'idle' | 'warning' | 'critical'
  ) => void;

  // AI Decisions
  aiDecisions: AIDecision[];
  addAIDecision: (decision: AIDecision) => void;
  updateDecisionStatus: (
    decisionId: string,
    status: AIDecision['status'],
    outcome?: string
  ) => void;
  getActiveDecisionsForMachine: (machineId: string) => AIDecision[];
  getActiveDecisionsForWorker: (workerId: string) => AIDecision[];

  // Machine management
  setMachines: (machines: MachineData[]) => void;
  updateMachineMetrics: (machineId: string, metrics: Partial<MachineData['metrics']>) => void;

  // Memoized selector utilities for performance
  getMachineById: (machineId: string) => MachineData | undefined;
  getWorkerById: (workerId: string) => WorkerData | undefined;

  // Metrics
  metrics: {
    throughput: number;
    efficiency: number;
    uptime: number;
    quality: number;
  };
  updateMetrics: (metrics: Partial<ProductionStore['metrics']>) => void;

  // Heat map data (worker position history)
  heatMapData: Array<{ x: number; z: number; intensity: number }>;
  recordHeatMapPoint: (x: number, z: number) => void;
  clearHeatMap: () => void;
  showHeatMap: boolean;
  setShowHeatMap: (show: boolean) => void;

  // Worker satisfaction metrics
  workerSatisfaction: {
    overallScore: number; // 0-100
    breakCount: number; // Total breaks taken
    conversationCount: number; // Social interactions
    averageEnergy: number; // Average energy (0=exhausted, 100=fully rested)
    productivityBonus: number; // % bonus from satisfied workers
  };
  updateWorkerSatisfaction: (updates: Partial<ProductionStore['workerSatisfaction']>) => void;
  recordConversation: () => void;
  recordBreakTaken: () => void;

  // Production targets
  productionTarget: ProductionTarget | null;
  setProductionTarget: (target: ProductionTarget) => void;
  updateProductionProgress: (bagsProduced: number) => void;
  totalBagsProduced: number;
  incrementBagsProduced: (count?: number) => void;

  // Achievements
  achievements: Achievement[];
  unlockAchievement: (achievementId: string) => void;
  updateAchievementProgress: (achievementId: string, progress: number) => void;

  // PA Announcements
  announcements: PAnnouncement[];
  addAnnouncement: (announcement: Omit<PAnnouncement, 'id' | 'timestamp'>) => void;
  dismissAnnouncement: (id: string) => void;
  clearOldAnnouncements: () => void;

  // Incident replay
  replayMode: boolean;
  replayFrames: IncidentReplayFrame[];
  currentReplayIndex: number;
  setReplayMode: (enabled: boolean) => void;
  recordReplayFrame: (frame: IncidentReplayFrame) => void;
  setReplayIndex: (index: number) => void;
  clearReplayFrames: () => void;

  // Worker leaderboard
  workerLeaderboard: Array<{
    workerId: string;
    name: string;
    score: number;
    tasksCompleted: number;
  }>;
  updateWorkerScore: (
    workerId: string,
    name: string,
    score: number,
    tasksCompleted: number
  ) => void;

  // Dock status for receiving and shipping bays
  dockStatus: {
    receiving: { status: 'arriving' | 'loading' | 'departing' | 'clear'; etaMinutes: number };
    shipping: { status: 'arriving' | 'loading' | 'departing' | 'clear'; etaMinutes: number };
  };
  updateDockStatus: (
    dock: 'receiving' | 'shipping',
    status: { status: 'arriving' | 'loading' | 'departing' | 'clear'; etaMinutes: number }
  ) => void;

  // SCADA integration state
  scadaLive: boolean;
  setScadaLive: (live: boolean) => void;
}

export const useProductionStore = create<ProductionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initialize performance indices
    _indices: createEmptyProductionIndices(),

    productionSpeed: 0.8,
    setProductionSpeed: (speed) => set({ productionSpeed: speed }),

    workers: [],
    selectedWorker: null,
    setSelectedWorker: (worker) => set({ selectedWorker: worker }),
    setWorkers: (workers) =>
      set((state) => ({
        workers,
        _indices: {
          ...state._indices,
          workersById: rebuildWorkerIndex(workers),
        },
      })),
    updateWorkerTask: (workerId, task, targetMachine) =>
      set((state) => {
        const updatedWorkers = state.workers.map((w) =>
          w.id === workerId ? { ...w, currentTask: task, targetMachine } : w
        );
        // PERFORMANCE FIX: Incremental update instead of full rebuild O(n) -> O(1)
        const newWorkersById = new Map(state._indices.workersById);
        const updatedWorker = updatedWorkers.find((w) => w.id === workerId);
        if (updatedWorker) {
          newWorkersById.set(workerId, updatedWorker);
        }
        return {
          workers: updatedWorkers,
          _indices: {
            ...state._indices,
            workersById: newWorkersById,
          },
        };
      }),

    machines: [],
    selectedMachine: null,
    setSelectedMachine: (machine) => set({ selectedMachine: machine }),
    updateMachineStatus: (machineId, status) =>
      set((state) => {
        const updatedMachines = state.machines.map((m) =>
          m.id === machineId ? { ...m, status } : m
        );
        // PERFORMANCE FIX: Incremental update instead of full rebuild O(n) -> O(1)
        const newMachinesById = new Map(state._indices.machinesById);
        const updatedMachine = updatedMachines.find((m) => m.id === machineId);
        if (updatedMachine) {
          newMachinesById.set(machineId, updatedMachine);
        }
        return {
          machines: updatedMachines,
          _indices: {
            ...state._indices,
            machinesById: newMachinesById,
          },
        };
      }),

    aiDecisions: [],
    addAIDecision: (decision) =>
      set((state) => {
        const updatedDecisions = [decision, ...state.aiDecisions].slice(0, 50);
        const { aiDecisionsByMachine, aiDecisionsByWorker } =
          rebuildAIDecisionIndices(updatedDecisions);
        return {
          aiDecisions: updatedDecisions,
          _indices: {
            ...state._indices,
            aiDecisionsByMachine,
            aiDecisionsByWorker,
          },
        };
      }),
    updateDecisionStatus: (decisionId, status, outcome) =>
      set((state) => {
        const updatedDecisions = state.aiDecisions.map((d) =>
          d.id === decisionId ? { ...d, status, outcome: outcome ?? d.outcome } : d
        );
        const { aiDecisionsByMachine, aiDecisionsByWorker } =
          rebuildAIDecisionIndices(updatedDecisions);
        return {
          aiDecisions: updatedDecisions,
          _indices: {
            ...state._indices,
            aiDecisionsByMachine,
            aiDecisionsByWorker,
          },
        };
      }),
    getActiveDecisionsForMachine: (machineId: string): AIDecision[] => {
      const state = get();
      return state._indices.aiDecisionsByMachine.get(machineId) || [];
    },
    getActiveDecisionsForWorker: (workerId: string): AIDecision[] => {
      const state = get();
      return state._indices.aiDecisionsByWorker.get(workerId) || [];
    },

    // Machine management
    setMachines: (machines: MachineData[]) =>
      set((state) => ({
        machines,
        _indices: {
          ...state._indices,
          machinesById: rebuildMachineIndex(machines),
        },
      })),
    updateMachineMetrics: (machineId: string, metrics: Partial<MachineData['metrics']>) =>
      set((state) => {
        const updatedMachines = state.machines.map((m) =>
          m.id === machineId ? { ...m, metrics: { ...m.metrics, ...metrics } } : m
        );
        // PERFORMANCE FIX: Incremental update instead of full rebuild O(n) -> O(1)
        const newMachinesById = new Map(state._indices.machinesById);
        const updatedMachine = updatedMachines.find((m) => m.id === machineId);
        if (updatedMachine) {
          newMachinesById.set(machineId, updatedMachine);
        }
        return {
          machines: updatedMachines,
          _indices: {
            ...state._indices,
            machinesById: newMachinesById,
          },
        };
      }),

    // Memoized selector utilities
    getMachineById: (machineId: string): MachineData | undefined => {
      const state = get();
      return state._indices.machinesById.get(machineId);
    },
    getWorkerById: (workerId: string): WorkerData | undefined => {
      const state = get();
      return state._indices.workersById.get(workerId);
    },

    metrics: {
      throughput: 1240,
      efficiency: 98.2,
      uptime: 99.7,
      quality: 99.9,
    },
    updateMetrics: (metrics: Partial<ProductionStore['metrics']>) =>
      set((state) => ({
        metrics: { ...state.metrics, ...metrics },
      })),

    // Heat map data
    heatMapData: [],
    recordHeatMapPoint: (x: number, z: number) =>
      set((state) => {
        const threshold = 2;
        const gridKey = getGridKey(x, z, threshold);
        const newIndex = new Map(state._indices.heatMapIndex);

        const existing = newIndex.get(gridKey);
        if (existing) {
          // Update existing point
          const updated = { ...existing, intensity: Math.min(existing.intensity + 0.1, 10) };
          newIndex.set(gridKey, updated);
          return {
            heatMapData: Array.from(newIndex.values()),
            _indices: {
              ...state._indices,
              heatMapIndex: newIndex,
            },
          };
        }

        // Add new point with size limiting
        const newPoint = { x, z, intensity: 1 };
        newIndex.set(gridKey, newPoint);

        // Limit size to 500 points (remove oldest by deleting first entry)
        if (newIndex.size > 500) {
          const firstKey = newIndex.keys().next().value;
          if (firstKey !== undefined) {
            newIndex.delete(firstKey);
          }
        }

        return {
          heatMapData: Array.from(newIndex.values()),
          _indices: {
            ...state._indices,
            heatMapIndex: newIndex,
          },
        };
      }),
    clearHeatMap: () =>
      set((state) => ({
        heatMapData: [],
        _indices: {
          ...state._indices,
          heatMapIndex: new Map(),
        },
      })),
    showHeatMap: false,
    setShowHeatMap: (show: boolean) => set({ showHeatMap: show }),

    // Worker satisfaction
    workerSatisfaction: {
      overallScore: 85,
      breakCount: 0,
      conversationCount: 0,
      averageEnergy: 100,
      productivityBonus: 5,
    },
    updateWorkerSatisfaction: (updates: Partial<ProductionStore['workerSatisfaction']>) =>
      set((state) => {
        const newSatisfaction = { ...state.workerSatisfaction, ...updates };
        // Calculate overall score based on components
        const energyScore = newSatisfaction.averageEnergy * 0.4;
        const socialScore = Math.min(100, newSatisfaction.conversationCount * 2) * 0.3;
        const breakScore = Math.min(100, newSatisfaction.breakCount * 5) * 0.3;
        newSatisfaction.overallScore = Math.round(energyScore + socialScore + breakScore);
        // Productivity bonus scales with satisfaction
        newSatisfaction.productivityBonus = Math.round((newSatisfaction.overallScore - 50) / 5);
        return { workerSatisfaction: newSatisfaction };
      }),
    recordConversation: () =>
      set((state) => {
        // Atomically update conversation count and recalculate derived values
        const newSatisfaction = {
          ...state.workerSatisfaction,
          conversationCount: state.workerSatisfaction.conversationCount + 1,
        };
        // Recalculate derived values
        const energyScore = newSatisfaction.averageEnergy * 0.4;
        const socialScore = Math.min(100, newSatisfaction.conversationCount * 2) * 0.3;
        const breakScore = Math.min(100, newSatisfaction.breakCount * 5) * 0.3;
        newSatisfaction.overallScore = Math.round(energyScore + socialScore + breakScore);
        newSatisfaction.productivityBonus = Math.round((newSatisfaction.overallScore - 50) / 5);
        return { workerSatisfaction: newSatisfaction };
      }),
    recordBreakTaken: () =>
      set((state) => {
        // Atomically update break count and recalculate derived values
        const newSatisfaction = {
          ...state.workerSatisfaction,
          breakCount: state.workerSatisfaction.breakCount + 1,
        };
        // Recalculate derived values
        const energyScore = newSatisfaction.averageEnergy * 0.4;
        const socialScore = Math.min(100, newSatisfaction.conversationCount * 2) * 0.3;
        const breakScore = Math.min(100, newSatisfaction.breakCount * 5) * 0.3;
        newSatisfaction.overallScore = Math.round(energyScore + socialScore + breakScore);
        newSatisfaction.productivityBonus = Math.round((newSatisfaction.overallScore - 50) / 5);
        return { workerSatisfaction: newSatisfaction };
      }),

    // Production targets
    productionTarget: {
      id: 'daily-target-1',
      date: new Date().toISOString().split('T')[0],
      targetBags: 5000,
      producedBags: 0,
      targetThroughput: 50,
      actualThroughput: 0,
      status: 'in_progress' as const,
    },
    setProductionTarget: (target: ProductionTarget) => set({ productionTarget: target }),
    updateProductionProgress: (bagsProduced: number) =>
      set((state) => ({
        productionTarget: state.productionTarget
          ? {
              ...state.productionTarget,
              producedBags: bagsProduced,
              status:
                bagsProduced >= state.productionTarget.targetBags ? 'completed' : 'in_progress',
            }
          : null,
      })),
    totalBagsProduced: 0,
    incrementBagsProduced: (count = 1) =>
      set((state) => {
        const newTotal = state.totalBagsProduced + count;
        return {
          totalBagsProduced: newTotal,
          productionTarget: state.productionTarget
            ? {
                ...state.productionTarget,
                producedBags: state.productionTarget.producedBags + count,
                status:
                  state.productionTarget.producedBags + count >= state.productionTarget.targetBags
                    ? 'completed'
                    : 'in_progress',
              }
            : null,
        };
      }),

    // Achievements - with initial progress for demo
    achievements: [
      {
        id: 'safety-100',
        name: 'Safety Champion',
        description: '100 days without incident',
        icon: 'Shield',
        category: 'safety',
        requirement: 100,
        currentValue: 73,
        progress: 73,
      },
      {
        id: 'bags-1m',
        name: 'Million Bags',
        description: 'Pack 1 million bags',
        icon: 'Package',
        category: 'production',
        requirement: 1000000,
        currentValue: 847293,
        progress: 84.7,
      },
      {
        id: 'quality-99',
        name: 'Quality Master',
        description: 'Maintain 99% quality for a week',
        icon: 'Award',
        category: 'quality',
        requirement: 7,
        currentValue: 5,
        progress: 71.4,
      },
      {
        id: 'team-player',
        name: 'Team Player',
        description: '50 worker collaborations',
        icon: 'Users',
        category: 'teamwork',
        requirement: 50,
        currentValue: 50,
        progress: 100,
        unlockedAt: '2024-11-15T10:30:00Z',
      },
      {
        id: 'efficiency-expert',
        name: 'Efficiency Expert',
        description: 'Reach 99% uptime',
        icon: 'TrendingUp',
        category: 'production',
        requirement: 99,
        currentValue: 97.2,
        progress: 98.2,
      },
    ] as Achievement[],
    unlockAchievement: (achievementId: string) =>
      set((state) => ({
        achievements: state.achievements.map((a) =>
          a.id === achievementId ? { ...a, unlockedAt: new Date().toISOString(), progress: 100 } : a
        ),
      })),
    updateAchievementProgress: (achievementId: string, progress: number) =>
      set((state) => ({
        achievements: state.achievements.map((a) =>
          a.id === achievementId
            ? {
                ...a,
                currentValue: progress,
                progress: Math.min(100, (progress / a.requirement) * 100),
              }
            : a
        ),
      })),

    // PA Announcements
    announcements: [],
    addAnnouncement: (announcement: Omit<PAnnouncement, 'id' | 'timestamp'>) =>
      set((state) => {
        // Deduplicate: don't add if same message exists within last 10 seconds
        const now = Date.now();
        const isDuplicate = state.announcements.some(
          (a) => a.message === announcement.message && now - a.timestamp < 10000
        );
        if (isDuplicate) return state;

        return {
          announcements: [
            {
              ...announcement,
              id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp: now,
            },
            ...state.announcements,
          ].slice(0, 10),
        };
      }),
    dismissAnnouncement: (id: string) =>
      set((state) => ({
        announcements: state.announcements.filter((a) => a.id !== id),
      })),
    clearOldAnnouncements: () =>
      set((state) => {
        const now = Date.now();
        const filtered = state.announcements.filter((a) => now - a.timestamp < a.duration * 1000);
        // Only update if something actually changed
        if (filtered.length === state.announcements.length) return state;
        return { announcements: filtered };
      }),

    // Incident replay
    replayMode: false,
    replayFrames: [],
    currentReplayIndex: 0,
    setReplayMode: (enabled: boolean) => set({ replayMode: enabled }),
    recordReplayFrame: (frame: IncidentReplayFrame) =>
      set((state) => ({
        replayFrames: [...state.replayFrames, frame].slice(-600), // Keep last 10 minutes at 1fps
      })),
    setReplayIndex: (index: number) => set({ currentReplayIndex: index }),
    clearReplayFrames: () => set({ replayFrames: [], currentReplayIndex: 0 }),

    // Worker leaderboard
    workerLeaderboard: [],
    updateWorkerScore: (workerId: string, name: string, score: number, tasksCompleted: number) =>
      set((state) => {
        const existing = state.workerLeaderboard.findIndex((w) => w.workerId === workerId);
        const newBoard = [...state.workerLeaderboard];
        if (existing >= 0) {
          newBoard[existing] = { workerId, name, score, tasksCompleted };
        } else {
          newBoard.push({ workerId, name, score, tasksCompleted });
        }
        // Sort by score descending
        newBoard.sort((a, b) => b.score - a.score);
        return { workerLeaderboard: newBoard.slice(0, 10) };
      }),

    // Dock status
    dockStatus: {
      receiving: { status: 'clear', etaMinutes: 12 },
      shipping: { status: 'clear', etaMinutes: 0 },
    },
    updateDockStatus: (
      dock: 'receiving' | 'shipping',
      status: { status: 'arriving' | 'loading' | 'departing' | 'clear'; etaMinutes: number }
    ) =>
      set((state) => ({
        dockStatus: {
          ...state.dockStatus,
          [dock]: status,
        },
      })),

    // SCADA integration
    scadaLive: false,
    setScadaLive: (live: boolean) => set({ scadaLive: live }),
  }))
);
