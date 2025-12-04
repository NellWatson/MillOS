/**
 * Model Loader Utility
 *
 * Handles loading GLTF models with fallback to procedural primitives.
 *
 * To add models, download GLTF/GLB files from these CC0 sources:
 *
 * CHARACTERS:
 * - Quaternius: https://quaternius.com/ (animated characters, CC0)
 * - KayKit: https://kaylousberg.itch.io/ (adventurer packs, CC0)
 * - Kenney: https://kenney.nl/assets/blocky-characters (blocky style, CC0)
 *
 * FORKLIFT (properly-scaled models):
 * - Poly.pizza: https://poly.pizza/search/forklift (CC0, ~1-2m scale)
 * - Quaternius: https://quaternius.com/ (vehicle packs, CC0)
 * - TurboSquid free: https://www.turbosquid.com/Search/3D-Models/free/forklift
 * - RigModels: https://rigmodels.com/index.php?searchkeyword=forklift (GLB available)
 *
 * INDUSTRIAL:
 * - Kenney City Kit Industrial: https://kenney.nl/assets/city-kit-industrial (CC0)
 * - Poly.pizza: https://poly.pizza/search/Industrial (CC0)
 *
 * Place downloaded .glb files in:
 * - public/models/forklift/forklift.glb (adjust FORKLIFT_MODEL_SCALE in ForkliftModel.tsx)
 * - public/models/worker/worker.glb, character2.glb, etc.
 * - public/models/machines/silo.glb, mill.glb, etc.
 */

import { useGLTF } from '@react-three/drei';
import { useState, useEffect } from 'react';

// Model paths configuration
export const MODEL_PATHS = {
  forklift: '/models/forklift/forklift.glb',
  worker: '/models/worker/worker.glb',
  silo: '/models/machines/silo.glb',
  rollerMill: '/models/machines/mill.glb',
  plansifter: '/models/machines/plansifter.glb',
  packer: '/models/machines/packer.glb',
} as const;

// Worker character variants - Kenney Blocky Characters pack (CC0)
// Download more from: https://kenney.nl/assets/blocky-characters
export const WORKER_VARIANTS = {
  default: '/models/worker/worker.glb',
  character2: '/models/worker/character2.glb',
  character3: '/models/worker/character3.glb',
  character4: '/models/worker/character4.glb',
  character5: '/models/worker/character5.glb',
} as const;

export type WorkerVariant = keyof typeof WORKER_VARIANTS;

export type ModelType = keyof typeof MODEL_PATHS;

// Models with known issues (missing textures, broken dependencies, wrong asset)
// These will be disabled until the model files are fixed
const DISABLED_MODELS: ModelType[] = [
  'forklift', // 36MB model with incorrect scale/position - using procedural fallback
  'rollerMill', // Wrong model (appears to be a building) - using procedural fallback
];

// Track which models are available
const modelAvailability: Record<string, boolean | null> = {};

/**
 * Check if a model file exists
 * Uses HEAD request and verifies Content-Type to avoid SPA fallback false positives
 */
export async function checkModelExists(path: string): Promise<boolean> {
  if (modelAvailability[path] !== undefined && modelAvailability[path] !== null) {
    return modelAvailability[path] as boolean;
  }

  try {
    const response = await fetch(path, { method: 'HEAD' });
    if (!response.ok) {
      modelAvailability[path] = false;
      return false;
    }

    // Check Content-Type - if HTML, it's a 404 fallback page
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      modelAvailability[path] = false;
      return false;
    }

    // File exists and is not HTML - consider it valid
    modelAvailability[path] = true;
    return true;
  } catch {
    modelAvailability[path] = false;
    return false;
  }
}

/**
 * Hook to check if a model is available
 */
export function useModelAvailable(modelType: ModelType): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  const path = MODEL_PATHS[modelType];

  useEffect(() => {
    // Check if model is in the disabled list first
    if (DISABLED_MODELS.includes(modelType)) {
      setAvailable(false);
      return;
    }
    checkModelExists(path).then(setAvailable);
  }, [path, modelType]);

  return available;
}

/**
 * Hook to get available worker character variants
 * Returns array of available variant keys
 */
export function useAvailableWorkerVariants(): WorkerVariant[] {
  const [variants, setVariants] = useState<WorkerVariant[]>([]);

  useEffect(() => {
    const checkVariants = async () => {
      const available: WorkerVariant[] = [];
      for (const [key, path] of Object.entries(WORKER_VARIANTS)) {
        const exists = await checkModelExists(path);
        if (exists) {
          available.push(key as WorkerVariant);
        }
      }
      setVariants(available.length > 0 ? available : ['default']);
    };
    checkVariants();
  }, []);

  return variants;
}

/**
 * Get worker variant path, with fallback to default
 */
export function getWorkerVariantPath(variant: WorkerVariant): string {
  return WORKER_VARIANTS[variant] || WORKER_VARIANTS.default;
}

/**
 * Preload models that exist
 */
export async function preloadAvailableModels(): Promise<void> {
  const checks = Object.entries(MODEL_PATHS).map(async ([key, path]) => {
    // Skip disabled models
    if (DISABLED_MODELS.includes(key as ModelType)) {
      return;
    }
    const exists = await checkModelExists(path);
    if (exists) {
      try {
        useGLTF.preload(path);
        console.log(`Preloaded model: ${key}`);
      } catch (e) {
        console.warn(`Failed to preload ${key}:`, e);
      }
    }
  });

  await Promise.all(checks);
}

/**
 * Get model info for debugging
 */
export function getModelStatus(): Record<string, boolean | null> {
  return { ...modelAvailability };
}
