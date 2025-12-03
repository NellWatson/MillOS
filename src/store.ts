import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { MachineData, WorkerData, AlertData, AIDecision, ProductionTarget, Achievement, PAnnouncement, IncidentReplayFrame } from './types';

// Graphics quality presets
export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsSettings {
  quality: GraphicsQuality;
  // Individual toggles for fine-grained control
  enableSSAO: boolean;
  enableBloom: boolean;
  enableVignette: boolean;
  enableChromaticAberration: boolean;
  enableFilmGrain: boolean;
  enableDepthOfField: boolean;
  enableMachineVibration: boolean;
  enableProceduralTextures: boolean;
  enableWeathering: boolean;
  enableDustParticles: boolean;
  enableGrainFlow: boolean;
  enableAtmosphericHaze: boolean;
  enableLightShafts: boolean;
  enableContactShadows: boolean;
  enableHighResShadows: boolean;
  enableFloorPuddles: boolean;
  enableWornPaths: boolean;
  enableCableConduits: boolean;
  enableVolumetricFog: boolean;
  enableControlPanels: boolean;
  enableWarehouseClutter: boolean;
  enableSignage: boolean;
  enableVentilationDucts: boolean;
  enableAnisotropicReflections: boolean;
  // Performance sliders
  dustParticleCount: number;
  shadowMapSize: 1024 | 2048 | 4096;
  ssaoSamples: number;
}

// Quality presets
const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsSettings> = {
  low: {
    quality: 'low',
    enableSSAO: false,
    enableBloom: false,
    enableVignette: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
    enableDepthOfField: false,
    enableMachineVibration: false,
    enableProceduralTextures: false,
    enableWeathering: false,
    enableDustParticles: false,
    enableGrainFlow: false,
    enableAtmosphericHaze: false,
    enableLightShafts: false,
    enableContactShadows: false,
    enableHighResShadows: false,
    enableFloorPuddles: false,
    enableWornPaths: false,
    enableCableConduits: false,
    enableVolumetricFog: false,
    enableControlPanels: false,
    enableWarehouseClutter: false,
    enableSignage: false,
    enableVentilationDucts: false,
    enableAnisotropicReflections: false,
    dustParticleCount: 0,
    shadowMapSize: 1024,
    ssaoSamples: 8,
  },
  medium: {
    quality: 'medium',
    enableSSAO: false,
    enableBloom: false,
    enableVignette: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
    enableDepthOfField: false,
    enableMachineVibration: true,
    enableProceduralTextures: false,
    enableWeathering: false,
    enableDustParticles: true,
    enableGrainFlow: false,
    enableAtmosphericHaze: true,
    enableLightShafts: false,
    enableContactShadows: true,
    enableHighResShadows: false,
    enableFloorPuddles: false,
    enableWornPaths: true,
    enableCableConduits: false,
    enableVolumetricFog: false,
    enableControlPanels: false,
    enableWarehouseClutter: false,
    enableSignage: false,
    enableVentilationDucts: false,
    enableAnisotropicReflections: false,
    dustParticleCount: 200,
    shadowMapSize: 2048,
    ssaoSamples: 12,
  },
  high: {
    quality: 'high',
    enableSSAO: true,
    enableBloom: true,
    enableVignette: true,
    enableChromaticAberration: true,
    enableFilmGrain: true,
    enableDepthOfField: false,
    enableMachineVibration: true,
    enableProceduralTextures: true,
    enableWeathering: true,
    enableDustParticles: true,
    enableGrainFlow: true,
    enableAtmosphericHaze: true,
    enableLightShafts: true,
    enableContactShadows: true,
    enableHighResShadows: false,
    enableFloorPuddles: true,
    enableWornPaths: true,
    enableCableConduits: true,
    enableVolumetricFog: true,
    enableControlPanels: true,
    enableWarehouseClutter: true,
    enableSignage: true,
    enableVentilationDucts: true,
    enableAnisotropicReflections: true,
    dustParticleCount: 400,
    shadowMapSize: 2048,
    ssaoSamples: 16,
  },
  ultra: {
    quality: 'ultra',
    enableSSAO: true,
    enableBloom: true,
    enableVignette: true,
    enableChromaticAberration: true,
    enableFilmGrain: true,
    enableDepthOfField: false,
    enableMachineVibration: true,
    enableProceduralTextures: true,
    enableWeathering: true,
    enableDustParticles: true,
    enableGrainFlow: true,
    enableAtmosphericHaze: true,
    enableLightShafts: true,
    enableContactShadows: true,
    enableHighResShadows: true,
    enableFloorPuddles: true,
    enableWornPaths: true,
    enableCableConduits: true,
    enableVolumetricFog: true,
    enableControlPanels: true,
    enableWarehouseClutter: true,
    enableSignage: true,
    enableVentilationDucts: true,
    enableAnisotropicReflections: true,
    dustParticleCount: 500,
    shadowMapSize: 4096,
    ssaoSamples: 21,
  },
};

interface MillStore {
  // Game Time (24-hour cycle in ~10 real minutes)
  gameTime: number; // 0-24 representing hour of day
  setGameTime: (time: number) => void;
  tickGameTime: () => void;

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
  updateDecisionStatus: (decisionId: string, status: AIDecision['status'], outcome?: string) => void;
  getActiveDecisionsForMachine: (machineId: string) => AIDecision[];
  getActiveDecisionsForWorker: (workerId: string) => AIDecision[];

  // Machine management
  setMachines: (machines: MachineData[]) => void;
  updateMachineMetrics: (machineId: string, metrics: Partial<MachineData['metrics']>) => void;

  // Metrics
  metrics: {
    throughput: number;
    efficiency: number;
    uptime: number;
    quality: number;
  };
  updateMetrics: (metrics: Partial<MillStore['metrics']>) => void;

  // Safety metrics
  safetyMetrics: {
    nearMisses: number;
    safetyStops: number;
    workerEvasions: number;
    lastIncidentTime: number | null;
    daysSinceIncident: number;
  };
  recordSafetyStop: () => void;
  recordWorkerEvasion: () => void;

  // Safety incident history
  safetyIncidents: Array<{
    id: string;
    type: 'stop' | 'evasion' | 'near_miss' | 'emergency';
    timestamp: number;
    description: string;
    location?: { x: number; z: number };
    forkliftId?: string;
    workerId?: string;
  }>;
  addSafetyIncident: (incident: Omit<MillStore['safetyIncidents'][0], 'id' | 'timestamp'>) => void;
  clearSafetyIncidents: () => void;

  // Forklift emergency stop
  forkliftEmergencyStop: boolean;
  setForkliftEmergencyStop: (stopped: boolean) => void;

  // Forklift efficiency tracking
  forkliftMetrics: {
    [forkliftId: string]: {
      totalMovingTime: number;
      totalStoppedTime: number;
      lastUpdateTime: number;
      isMoving: boolean;
    };
  };
  updateForkliftMetrics: (forkliftId: string, isMoving: boolean) => void;
  resetForkliftMetrics: () => void;

  // Incident heat map data (separate from worker heat map)
  incidentHeatMap: Array<{ x: number; z: number; intensity: number; type: string }>;
  recordIncidentLocation: (x: number, z: number, type: string) => void;
  clearIncidentHeatMap: () => void;
  showIncidentHeatMap: boolean;
  setShowIncidentHeatMap: (show: boolean) => void;

  // Worker satisfaction metrics
  workerSatisfaction: {
    overallScore: number; // 0-100
    breakCount: number; // Total breaks taken
    conversationCount: number; // Social interactions
    averageEnergy: number; // Average energy (0=exhausted, 100=fully rested)
    productivityBonus: number; // % bonus from satisfied workers
  };
  updateWorkerSatisfaction: (updates: Partial<MillStore['workerSatisfaction']>) => void;
  recordConversation: () => void;
  recordBreakTaken: () => void;

  // Shift management
  currentShift: 'morning' | 'afternoon' | 'night';
  shiftStartTime: number;
  shiftChangeActive: boolean;
  shiftChangePhase: 'idle' | 'leaving' | 'entering';
  setShift: (shift: 'morning' | 'afternoon' | 'night') => void;
  triggerShiftChange: () => void;
  completeShiftChange: () => void;

  // Emergency state
  emergencyActive: boolean;
  emergencyMachineId: string | null;
  emergencyDrillMode: boolean;
  triggerEmergency: (machineId: string) => void;
  resolveEmergency: () => void;
  startEmergencyDrill: () => void;
  endEmergencyDrill: () => void;

  // Weather system
  weather: 'clear' | 'cloudy' | 'rain' | 'storm';
  setWeather: (weather: 'clear' | 'cloudy' | 'rain' | 'storm') => void;

  // Heat map data (worker position history)
  heatMapData: Array<{ x: number; z: number; intensity: number }>;
  recordHeatMapPoint: (x: number, z: number) => void;
  clearHeatMap: () => void;
  showHeatMap: boolean;
  setShowHeatMap: (show: boolean) => void;

  // Safety configuration
  safetyConfig: {
    workerDetectionRadius: number;
    forkliftSafetyRadius: number;
    pathCheckDistance: number;
    speedZoneSlowdown: number; // 0-1, how much to slow down in speed zones
  };
  setSafetyConfig: (config: Partial<MillStore['safetyConfig']>) => void;

  // Speed zones (customizable)
  speedZones: Array<{ id: string; x: number; z: number; radius: number; name: string }>;
  addSpeedZone: (zone: { x: number; z: number; radius: number; name: string }) => void;
  removeSpeedZone: (id: string) => void;
  updateSpeedZone: (id: string, updates: Partial<{ x: number; z: number; radius: number; name: string }>) => void;

  // UI
  showZones: boolean;
  setShowZones: (show: boolean) => void;
  showAIPanel: boolean;
  setShowAIPanel: (show: boolean) => void;

  // Panel collapse state
  panelMinimized: boolean;
  setPanelMinimized: (minimized: boolean) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Keyboard shortcuts modal
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;

  // Legend position (for draggable legend)
  legendPosition: { x: number; y: number };
  setLegendPosition: (pos: { x: number; y: number }) => void;
  resetLegendPosition: () => void;

  // Graphics settings
  graphics: GraphicsSettings;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setGraphicsSetting: <K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) => void;
  resetGraphicsToPreset: (quality: GraphicsQuality) => void;

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
  workerLeaderboard: Array<{ workerId: string; name: string; score: number; tasksCompleted: number }>;
  updateWorkerScore: (workerId: string, name: string, score: number, tasksCompleted: number) => void;

  // Gamification bar visibility
  showGamificationBar: boolean;
  setShowGamificationBar: (show: boolean) => void;

  // Mini-map visibility
  showMiniMap: boolean;
  setShowMiniMap: (show: boolean) => void;

  // Security cameras
  showSecurityCameras: boolean;
  setShowSecurityCameras: (show: boolean) => void;
  activeCameraId: string | null;
  setActiveCameraId: (id: string | null) => void;

  // Camera container refs for View component tracking
  cameraContainers: Map<string, HTMLDivElement>;
  registerCameraContainer: (id: string, element: HTMLDivElement) => void;
  unregisterCameraContainer: (id: string) => void;
}

export const useMillStore = create<MillStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
  // Game time starts at 8am, full day cycles in ~10 minutes (600 seconds)
  // Each tick (called every 100ms) advances by 24/6000 = 0.004 hours
  gameTime: 8,
  setGameTime: (time) => set({ gameTime: time % 24 }),
  tickGameTime: () => set((state) => ({ gameTime: (state.gameTime + 0.004) % 24 })),

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
    aiDecisions: [decision, ...state.aiDecisions].slice(0, 50)
  })),
  updateDecisionStatus: (decisionId, status, outcome) => set((state) => ({
    aiDecisions: state.aiDecisions.map(d =>
      d.id === decisionId ? { ...d, status, outcome: outcome ?? d.outcome } : d
    )
  })),
  getActiveDecisionsForMachine: (machineId) => {
    const state = useMillStore.getState();
    return state.aiDecisions.filter(d =>
      d.machineId === machineId && (d.status === 'pending' || d.status === 'in_progress')
    );
  },
  getActiveDecisionsForWorker: (workerId) => {
    const state = useMillStore.getState();
    return state.aiDecisions.filter(d =>
      d.workerId === workerId && (d.status === 'pending' || d.status === 'in_progress')
    );
  },

  // Machine management
  setMachines: (machines) => set({ machines }),
  updateMachineMetrics: (machineId, metrics) => set((state) => ({
    machines: state.machines.map(m =>
      m.id === machineId ? { ...m, metrics: { ...m.metrics, ...metrics } } : m
    )
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

  safetyMetrics: {
    nearMisses: 0,
    safetyStops: 0,
    workerEvasions: 0,
    lastIncidentTime: null,
    daysSinceIncident: 127
  },
  recordSafetyStop: () => set((state) => ({
    safetyMetrics: {
      ...state.safetyMetrics,
      safetyStops: state.safetyMetrics.safetyStops + 1,
      nearMisses: state.safetyMetrics.nearMisses + 1,
      lastIncidentTime: Date.now(),
      daysSinceIncident: 0
    }
  })),
  recordWorkerEvasion: () => set((state) => ({
    safetyMetrics: {
      ...state.safetyMetrics,
      workerEvasions: state.safetyMetrics.workerEvasions + 1
    }
  })),

  // Safety incident history
  safetyIncidents: [],
  addSafetyIncident: (incident) => set((state) => ({
    safetyIncidents: [
      {
        ...incident,
        id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now()
      },
      ...state.safetyIncidents
    ].slice(0, 50) // Keep last 50 incidents
  })),
  clearSafetyIncidents: () => set({ safetyIncidents: [] }),

  // Forklift emergency stop
  forkliftEmergencyStop: false,
  setForkliftEmergencyStop: (stopped) => set({ forkliftEmergencyStop: stopped }),

  // Forklift efficiency tracking
  forkliftMetrics: {},
  updateForkliftMetrics: (forkliftId, isMoving) => set((state) => {
    const now = Date.now();
    const existing = state.forkliftMetrics[forkliftId] || {
      totalMovingTime: 0,
      totalStoppedTime: 0,
      lastUpdateTime: now,
      isMoving: true
    };

    const timeDelta = (now - existing.lastUpdateTime) / 1000; // Convert to seconds

    return {
      forkliftMetrics: {
        ...state.forkliftMetrics,
        [forkliftId]: {
          totalMovingTime: existing.totalMovingTime + (existing.isMoving ? timeDelta : 0),
          totalStoppedTime: existing.totalStoppedTime + (!existing.isMoving ? timeDelta : 0),
          lastUpdateTime: now,
          isMoving
        }
      }
    };
  }),
  resetForkliftMetrics: () => set({ forkliftMetrics: {} }),

  // Incident heat map data
  incidentHeatMap: [],
  recordIncidentLocation: (x, z, type) => set((state) => {
    // Find existing point nearby or create new one
    const threshold = 3;
    const existing = state.incidentHeatMap.find(p =>
      Math.abs(p.x - x) < threshold && Math.abs(p.z - z) < threshold
    );
    if (existing) {
      return {
        incidentHeatMap: state.incidentHeatMap.map(p =>
          p === existing ? { ...p, intensity: Math.min(p.intensity + 1, 10) } : p
        )
      };
    }
    return { incidentHeatMap: [...state.incidentHeatMap, { x, z, intensity: 1, type }].slice(-100) };
  }),
  clearIncidentHeatMap: () => set({ incidentHeatMap: [] }),
  showIncidentHeatMap: false,
  setShowIncidentHeatMap: (show) => set({ showIncidentHeatMap: show }),

  // Worker satisfaction
  workerSatisfaction: {
    overallScore: 85,
    breakCount: 0,
    conversationCount: 0,
    averageEnergy: 100,
    productivityBonus: 5
  },
  updateWorkerSatisfaction: (updates) => set((state) => {
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
  recordConversation: () => set((state) => ({
    workerSatisfaction: {
      ...state.workerSatisfaction,
      conversationCount: state.workerSatisfaction.conversationCount + 1
    }
  })),
  recordBreakTaken: () => set((state) => ({
    workerSatisfaction: {
      ...state.workerSatisfaction,
      breakCount: state.workerSatisfaction.breakCount + 1
    }
  })),

  // Shift management
  currentShift: 'morning',
  shiftStartTime: Date.now(),
  shiftChangeActive: false,
  shiftChangePhase: 'idle' as const,
  setShift: (shift) => set({ currentShift: shift, shiftStartTime: Date.now() }),
  triggerShiftChange: () => set({
    shiftChangeActive: true,
    shiftChangePhase: 'leaving'
  }),
  completeShiftChange: () => set((state) => {
    // Cycle to next shift
    const shifts: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night'];
    const currentIndex = shifts.indexOf(state.currentShift);
    const nextShift = shifts[(currentIndex + 1) % shifts.length];
    return {
      shiftChangeActive: false,
      shiftChangePhase: 'idle' as const,
      currentShift: nextShift,
      shiftStartTime: Date.now()
    };
  }),

  // Emergency state
  emergencyActive: false,
  emergencyMachineId: null,
  emergencyDrillMode: false,
  triggerEmergency: (machineId) => set({ emergencyActive: true, emergencyMachineId: machineId }),
  resolveEmergency: () => set({ emergencyActive: false, emergencyMachineId: null, emergencyDrillMode: false }),
  startEmergencyDrill: () => set({ emergencyActive: true, emergencyMachineId: 'DRILL', emergencyDrillMode: true }),
  endEmergencyDrill: () => set({ emergencyActive: false, emergencyMachineId: null, emergencyDrillMode: false }),

  // Weather system
  weather: 'clear' as const,
  setWeather: (weather) => set({ weather }),

  // Heat map data
  heatMapData: [],
  recordHeatMapPoint: (x, z) => set((state) => {
    // Find existing point nearby or create new one
    const threshold = 2;
    const existing = state.heatMapData.find(p =>
      Math.abs(p.x - x) < threshold && Math.abs(p.z - z) < threshold
    );
    if (existing) {
      return {
        heatMapData: state.heatMapData.map(p =>
          p === existing ? { ...p, intensity: Math.min(p.intensity + 0.1, 10) } : p
        )
      };
    }
    return { heatMapData: [...state.heatMapData, { x, z, intensity: 1 }].slice(-500) };
  }),
  clearHeatMap: () => set({ heatMapData: [] }),
  showHeatMap: false,
  setShowHeatMap: (show) => set({ showHeatMap: show }),

  safetyConfig: {
    workerDetectionRadius: 1.8, // Reduced from 2.5 - less aggressive stopping
    forkliftSafetyRadius: 3,    // Reduced from 4 - forklifts can pass closer
    pathCheckDistance: 4,       // Reduced from 5 - shorter lookahead
    speedZoneSlowdown: 0.5      // Increased from 0.4 - less slowdown (50% speed)
  },
  setSafetyConfig: (config) => set((state) => ({
    safetyConfig: { ...state.safetyConfig, ...config }
  })),

  // Speed zones updated to match new forklift perimeter paths
  speedZones: [
    { id: 'zone-1', x: 0, z: 0, radius: 5, name: 'Central Area' },
    { id: 'zone-2', x: 0, z: 28, radius: 4, name: 'North Loading' },
    { id: 'zone-3', x: 0, z: -28, radius: 4, name: 'South Loading' },
    { id: 'zone-4', x: -28, z: 0, radius: 3, name: 'West Corridor' },
    { id: 'zone-5', x: 28, z: 0, radius: 3, name: 'East Corridor' },
    { id: 'zone-6', x: 0, z: 18, radius: 4, name: 'Packing Zone' },
  ],
  addSpeedZone: (zone) => set((state) => ({
    speedZones: [...state.speedZones, { ...zone, id: `zone-${Date.now()}` }]
  })),
  removeSpeedZone: (id) => set((state) => ({
    speedZones: state.speedZones.filter(z => z.id !== id)
  })),
  updateSpeedZone: (id, updates) => set((state) => ({
    speedZones: state.speedZones.map(z => z.id === id ? { ...z, ...updates } : z)
  })),

  showZones: true,
  setShowZones: (show) => set({ showZones: show }),
  showAIPanel: true,
  setShowAIPanel: (show) => set({ showAIPanel: show }),

  // Panel collapse state
  panelMinimized: false,
  setPanelMinimized: (minimized) => set({ panelMinimized: minimized }),

  // Theme
  theme: 'dark' as const,
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  // Keyboard shortcuts modal
  showShortcuts: false,
  setShowShortcuts: (show) => set({ showShortcuts: show }),

  // Legend position
  legendPosition: { x: -1, y: -1 }, // -1 means use default position
  setLegendPosition: (pos) => set({ legendPosition: pos }),
  resetLegendPosition: () => set({ legendPosition: { x: -1, y: -1 } }),

  // Graphics settings - default to medium for better performance
  graphics: GRAPHICS_PRESETS.medium,
  setGraphicsQuality: (quality) => set({ graphics: { ...GRAPHICS_PRESETS[quality] } }),
  setGraphicsSetting: (key, value) => set((state) => ({
    graphics: { ...state.graphics, [key]: value, quality: 'high' as GraphicsQuality } // Mark as custom
  })),
  resetGraphicsToPreset: (quality) => set({ graphics: { ...GRAPHICS_PRESETS[quality] } }),

  // Production targets
  productionTarget: {
    id: 'daily-target-1',
    date: new Date().toISOString().split('T')[0],
    targetBags: 5000,
    producedBags: 0,
    targetThroughput: 50,
    actualThroughput: 0,
    status: 'in_progress'
  },
  setProductionTarget: (target) => set({ productionTarget: target }),
  updateProductionProgress: (bagsProduced) => set((state) => ({
    productionTarget: state.productionTarget ? {
      ...state.productionTarget,
      producedBags: bagsProduced,
      status: bagsProduced >= state.productionTarget.targetBags ? 'completed' : 'in_progress'
    } : null
  })),
  totalBagsProduced: 0,
  incrementBagsProduced: (count = 1) => set((state) => {
    const newTotal = state.totalBagsProduced + count;
    return {
      totalBagsProduced: newTotal,
      productionTarget: state.productionTarget ? {
        ...state.productionTarget,
        producedBags: state.productionTarget.producedBags + count,
        status: state.productionTarget.producedBags + count >= state.productionTarget.targetBags ? 'completed' : 'in_progress'
      } : null
    };
  }),

  // Achievements - with initial progress for demo
  achievements: [
    { id: 'safety-100', name: 'Safety Champion', description: '100 days without incident', icon: 'Shield', category: 'safety', requirement: 100, currentValue: 73, progress: 73 },
    { id: 'bags-1m', name: 'Million Bags', description: 'Pack 1 million bags', icon: 'Package', category: 'production', requirement: 1000000, currentValue: 847293, progress: 84.7 },
    { id: 'quality-99', name: 'Quality Master', description: 'Maintain 99% quality for a week', icon: 'Award', category: 'quality', requirement: 7, currentValue: 5, progress: 71.4 },
    { id: 'team-player', name: 'Team Player', description: '50 worker collaborations', icon: 'Users', category: 'teamwork', requirement: 50, currentValue: 50, progress: 100, unlockedAt: '2024-11-15T10:30:00Z' },
    { id: 'efficiency-expert', name: 'Efficiency Expert', description: 'Reach 99% uptime', icon: 'TrendingUp', category: 'production', requirement: 99, currentValue: 97.2, progress: 98.2 },
  ] as Achievement[],
  unlockAchievement: (achievementId) => set((state) => ({
    achievements: state.achievements.map(a =>
      a.id === achievementId ? { ...a, unlockedAt: new Date().toISOString(), progress: 100 } : a
    )
  })),
  updateAchievementProgress: (achievementId, progress) => set((state) => ({
    achievements: state.achievements.map(a =>
      a.id === achievementId ? { ...a, currentValue: progress, progress: Math.min(100, (progress / a.requirement) * 100) } : a
    )
  })),

  // PA Announcements
  announcements: [],
  addAnnouncement: (announcement) => set((state) => ({
    announcements: [
      {
        ...announcement,
        id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now()
      },
      ...state.announcements
    ].slice(0, 10)
  })),
  dismissAnnouncement: (id) => set((state) => ({
    announcements: state.announcements.filter(a => a.id !== id)
  })),
  clearOldAnnouncements: () => set((state) => {
    const now = Date.now();
    const filtered = state.announcements.filter(a => now - a.timestamp < a.duration * 1000);
    // Only update if something actually changed
    if (filtered.length === state.announcements.length) return state;
    return { announcements: filtered };
  }),

  // Incident replay
  replayMode: false,
  replayFrames: [],
  currentReplayIndex: 0,
  setReplayMode: (enabled) => set({ replayMode: enabled }),
  recordReplayFrame: (frame) => set((state) => ({
    replayFrames: [...state.replayFrames, frame].slice(-600) // Keep last 10 minutes at 1fps
  })),
  setReplayIndex: (index) => set({ currentReplayIndex: index }),
  clearReplayFrames: () => set({ replayFrames: [], currentReplayIndex: 0 }),

  // Worker leaderboard
  workerLeaderboard: [],
  updateWorkerScore: (workerId, name, score, tasksCompleted) => set((state) => {
    const existing = state.workerLeaderboard.findIndex(w => w.workerId === workerId);
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

  // Gamification bar visibility
  showGamificationBar: true,
  setShowGamificationBar: (show) => set({ showGamificationBar: show }),

  // Mini-map visibility
  showMiniMap: false,
  setShowMiniMap: (show) => set({ showMiniMap: show }),

  // Security cameras
  showSecurityCameras: false,
  setShowSecurityCameras: (show) => set({ showSecurityCameras: show }),
  activeCameraId: null,
  setActiveCameraId: (id) => set({ activeCameraId: id }),

  // Camera container refs for View component tracking
  cameraContainers: new Map(),
  registerCameraContainer: (id, element) => set((state) => {
    const newContainers = new Map(state.cameraContainers);
    newContainers.set(id, element);
    return { cameraContainers: newContainers };
  }),
  unregisterCameraContainer: (id) => set((state) => {
    const newContainers = new Map(state.cameraContainers);
    newContainers.delete(id);
    return { cameraContainers: newContainers };
  })
    }),
    {
      name: 'millos-settings',
      partialize: (state) => ({
        // Only persist user preferences and settings
        productionSpeed: state.productionSpeed,
        showZones: state.showZones,
        showAIPanel: state.showAIPanel,
        showHeatMap: state.showHeatMap,
        graphics: state.graphics,
        safetyConfig: state.safetyConfig,
        speedZones: state.speedZones,
        weather: state.weather,
        panelMinimized: state.panelMinimized,
        theme: state.theme,
        legendPosition: state.legendPosition,
        // New features
        showMiniMap: state.showMiniMap,
        showSecurityCameras: state.showSecurityCameras,
        achievements: state.achievements,
        totalBagsProduced: state.totalBagsProduced,
      }),
    }
    )
  )
);

// Export presets for use in UI
export { GRAPHICS_PRESETS };
