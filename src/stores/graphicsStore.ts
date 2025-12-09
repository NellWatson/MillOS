import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from './storage';

// Graphics quality presets
export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

// Performance debug toggles - disable systems for A/B testing
export interface PerfDebugSettings {
  disableWorkerMoods: boolean; // Disable useMoodSimulation hook
  disableTruckBay: boolean; // Disable TruckBay (28+ useFrame hooks)
  disableWorkerSystem: boolean; // Disable WorkerSystem (3+ useFrame hooks per worker)
  disableForkliftSystem: boolean; // Disable ForkliftSystem
  disableConveyorSystem: boolean; // Disable ConveyorSystem
  disableMachines: boolean; // Disable Machines (9 useFrame hooks)
  disableEnvironment: boolean; // Disable FactoryEnvironment
  disableAllAnimations: boolean; // Master toggle - disable all useFrame hooks
  showPerfOverlay: boolean; // Show performance metrics overlay
}

export interface GraphicsSettings {
  quality: GraphicsQuality;
  // SCADA system toggle - OFF by default for performance
  enableSCADA: boolean;
  // Performance debug settings
  perfDebug: PerfDebugSettings;
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
  // LOD (Level of Detail) settings
  workerLodDistance: number; // Distance at which workers switch to low-poly (0 = always high detail)
}

// Default perf debug settings (all systems enabled)
const DEFAULT_PERF_DEBUG: PerfDebugSettings = {
  disableWorkerMoods: false,
  disableTruckBay: false,
  disableWorkerSystem: false,
  disableForkliftSystem: false,
  disableConveyorSystem: false,
  disableMachines: false,
  disableEnvironment: false,
  disableAllAnimations: false,
  showPerfOverlay: false,
};

// Quality presets
const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsSettings> = {
  low: {
    quality: 'low',
    enableSCADA: false, // SCADA disabled by default for performance
    perfDebug: { ...DEFAULT_PERF_DEBUG },
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
    workerLodDistance: 15, // Low quality: aggressive LOD
  },
  medium: {
    quality: 'medium',
    enableSCADA: false, // SCADA disabled by default for performance
    perfDebug: { ...DEFAULT_PERF_DEBUG },
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
    enableAtmosphericHaze: false,
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
    dustParticleCount: 40,
    shadowMapSize: 2048,
    ssaoSamples: 12,
    workerLodDistance: 60, // Medium quality: fairly long LOD distance for detailed workers
  },
  high: {
    quality: 'high',
    enableSCADA: true, // SCADA enabled on higher presets for full telemetry
    perfDebug: { ...DEFAULT_PERF_DEBUG },
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
    workerLodDistance: 45, // High quality: moderate LOD distance
  },
  ultra: {
    quality: 'ultra',
    enableSCADA: true, // SCADA enabled on ultra for maximum fidelity
    perfDebug: { ...DEFAULT_PERF_DEBUG },
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
    workerLodDistance: 100, // Ultra: very long LOD distance, full detail at most distances
  },
};

interface GraphicsStore {
  graphics: GraphicsSettings;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setGraphicsSetting: <K extends keyof GraphicsSettings>(
    key: K,
    value: GraphicsSettings[K]
  ) => void;
  setSCADAEnabled: (enabled: boolean) => void;
  resetGraphicsToPreset: (quality: GraphicsQuality) => void;
  // Performance debug actions
  setPerfDebug: <K extends keyof PerfDebugSettings>(key: K, value: PerfDebugSettings[K]) => void;
  resetPerfDebug: () => void;
}

export const useGraphicsStore = create<GraphicsStore>()(
  persist(
    (set) => ({
      // Graphics settings - default to medium for better visuals
      graphics: GRAPHICS_PRESETS.medium,

      setGraphicsQuality: (quality) => set({ graphics: { ...GRAPHICS_PRESETS[quality] } }),

      setGraphicsSetting: (key, value) =>
        set((state) => ({
          graphics: {
            ...state.graphics,
            [key]: value,
          },
        })),
      setSCADAEnabled: (enabled) =>
        set((state) => ({
          graphics: {
            ...state.graphics,
            enableSCADA: enabled,
          },
        })),

      resetGraphicsToPreset: (quality) => set({ graphics: { ...GRAPHICS_PRESETS[quality] } }),

      // Performance debug actions
      setPerfDebug: (key, value) =>
        set((state) => ({
          graphics: {
            ...state.graphics,
            perfDebug: {
              ...state.graphics.perfDebug,
              [key]: value,
            },
          },
        })),

      resetPerfDebug: () =>
        set((state) => ({
          graphics: {
            ...state.graphics,
            perfDebug: { ...DEFAULT_PERF_DEBUG },
          },
        })),
    }),
    {
      name: 'millos-graphics',
      storage: safeJSONStorage,
      partialize: (state) => ({
        graphics: state.graphics,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate graphics state:', error);
          return;
        }

        // Validate rehydrated graphics settings
        if (state) {
          if (state.graphics && typeof state.graphics.quality === 'string') {
            const validQualities = ['low', 'medium', 'high', 'ultra'];
            if (!validQualities.includes(state.graphics.quality)) {
              console.warn('Invalid graphics quality detected, resetting to low');
              state.graphics = GRAPHICS_PRESETS.low;
            }
          }
          // Ensure perfDebug exists (for backwards compatibility)
          if (state.graphics && !state.graphics.perfDebug) {
            state.graphics.perfDebug = { ...DEFAULT_PERF_DEBUG };
          }
        }
      },
    }
  )
);

// Export presets for use in UI
export { GRAPHICS_PRESETS, DEFAULT_PERF_DEBUG };
