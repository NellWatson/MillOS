import { create } from 'zustand';
import { MachineData, WorkerData, AlertData, AIDecision } from './types';

interface MillStore {
  // Production
  productionSpeed: number;
  setProductionSpeed: (speed: number) => void;

  // Workers
  workers: WorkerData[];
  selectedWorker: WorkerData | null;
  setSelectedWorker: (worker: WorkerData | null) => void;
  updateWorkerTask: (workerId: string, task: string, targetMachine?: string) => void;

  // Machines
  machines: MachineData[];
  selectedMachine: MachineData | null;
  setSelectedMachine: (machine: MachineData | null) => void;
  updateMachineStatus: (machineId: string, status: 'running' | 'idle' | 'warning' | 'critical') => void;

  // Alerts
  alerts: AlertData[];
  addAlert: (alert: AlertData) => void;
  dismissAlert: (alertId: string) => void;

  // AI Decisions
  aiDecisions: AIDecision[];
  addAIDecision: (decision: AIDecision) => void;

  // Metrics
  metrics: {
    throughput: number;
    efficiency: number;
    uptime: number;
    quality: number;
  };
  updateMetrics: (metrics: Partial<MillStore['metrics']>) => void;

  // UI
  showZones: boolean;
  setShowZones: (show: boolean) => void;
  showAIPanel: boolean;
  setShowAIPanel: (show: boolean) => void;
}

export const useMillStore = create<MillStore>((set) => ({
  productionSpeed: 0.8,
  setProductionSpeed: (speed) => set({ productionSpeed: speed }),

  workers: [],
  selectedWorker: null,
  setSelectedWorker: (worker) => set({ selectedWorker: worker }),
  updateWorkerTask: (workerId, task, targetMachine) => set((state) => ({
    workers: state.workers.map(w =>
      w.id === workerId ? { ...w, currentTask: task, targetMachine } : w
    )
  })),

  machines: [],
  selectedMachine: null,
  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
  updateMachineStatus: (machineId, status) => set((state) => ({
    machines: state.machines.map(m =>
      m.id === machineId ? { ...m, status } : m
    )
  })),

  alerts: [],
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 10)
  })),
  dismissAlert: (alertId) => set((state) => ({
    alerts: state.alerts.filter(a => a.id !== alertId)
  })),

  aiDecisions: [],
  addAIDecision: (decision) => set((state) => ({
    aiDecisions: [decision, ...state.aiDecisions].slice(0, 20)
  })),

  metrics: {
    throughput: 1240,
    efficiency: 98.2,
    uptime: 99.7,
    quality: 99.9
  },
  updateMetrics: (metrics) => set((state) => ({
    metrics: { ...state.metrics, ...metrics }
  })),

  showZones: true,
  setShowZones: (show) => set({ showZones: show }),
  showAIPanel: true,
  setShowAIPanel: (show) => set({ showAIPanel: show })
}));
