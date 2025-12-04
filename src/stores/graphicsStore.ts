import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  // LOD (Level of Detail) settings
  workerLodDistance: number; // Distance at which workers switch to low-poly (0 = always high detail)
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
    workerLodDistance: 15, // Low quality: aggressive LOD
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
    workerLodDistance: 60, // Medium quality: fairly long LOD distance for detailed workers
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
    workerLodDistance: 45, // High quality: moderate LOD distance
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
  resetGraphicsToPreset: (quality: GraphicsQuality) => void;
}

export const useGraphicsStore = create<GraphicsStore>()(
  persist(
    (set) => ({
      // Graphics settings - default to low for stability, users can increase if system handles it
      graphics: GRAPHICS_PRESETS.low,

      setGraphicsQuality: (quality) => set({ graphics: { ...GRAPHICS_PRESETS[quality] } }),

      setGraphicsSetting: (key, value) =>
        set((state) => ({
          graphics: {
            ...state.graphics,
            [key]: value,
            quality: 'high' as GraphicsQuality, // Mark as custom
          },
        })),

      resetGraphicsToPreset: (quality) => set({ graphics: { ...GRAPHICS_PRESETS[quality] } }),
    }),
    {
      name: 'millos-graphics',
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
        }
      },
    }
  )
);

// Export presets for use in UI
export { GRAPHICS_PRESETS };
