/**
 * Runtime model loader with DRACO support and procedural fallbacks.
 *
 * Only autonomous equipment is eligible for the current v0.40 delivery.
 * Canonical source assets remain under assets/source/models, while this module
 * exposes only the derivatives that may be mounted by the live simulation.
 */

import { useEffect, useState } from 'react';
import { disposeDracoLoader, getDracoLoader, preloadDracoModel, useDracoGLTF } from './dracoLoader';

export { disposeDracoLoader, getDracoLoader, preloadDracoModel, useDracoGLTF };

const BASE = import.meta.env.BASE_URL;

export const MODEL_PATHS = {
  forklift: `${BASE}models/forklift/forklift.glb`,
  silo: `${BASE}models/machines/silo.glb`,
  rollerMill: `${BASE}models/machines/mill.glb`,
  plansifter: `${BASE}models/machines/plansifter.glb`,
  packer: `${BASE}models/machines/packer.glb`,
} as const;

export type ModelType = keyof typeof MODEL_PATHS;

// Required by public/models/asset-manifest.json and validated before delivery.
const BUNDLED_MODELS: ReadonlySet<ModelType> = new Set(['forklift']);

export function isBundledModel(modelType: ModelType): boolean {
  return BUNDLED_MODELS.has(modelType);
}

// The factory machines use authored procedural and instanced models. Their old
// third-party GLBs are intentionally disabled so deployment does not probe for
// absent or quarantined files.
const DISABLED_MODELS: readonly ModelType[] = ['silo', 'rollerMill', 'plansifter', 'packer'];

const modelAvailability: Record<string, boolean | null> = {};
const modelAvailabilityChecks = new Map<string, Promise<boolean>>();

/** Check an optional model without accepting an HTML SPA fallback as a model. */
export async function checkModelExists(path: string): Promise<boolean> {
  if (modelAvailability[path] !== undefined && modelAvailability[path] !== null) {
    return modelAvailability[path] as boolean;
  }

  const activeCheck = modelAvailabilityChecks.get(path);
  if (activeCheck) return activeCheck;

  const check = (async (): Promise<boolean> => {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (!response.ok || (response.headers.get('Content-Type') ?? '').includes('text/html')) {
        modelAvailability[path] = false;
        return false;
      }
      modelAvailability[path] = true;
      return true;
    } catch {
      modelAvailability[path] = false;
      return false;
    } finally {
      modelAvailabilityChecks.delete(path);
    }
  })();

  modelAvailabilityChecks.set(path, check);
  return check;
}

export function useModelAvailable(modelType: ModelType): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(() =>
    isBundledModel(modelType) ? true : null
  );
  const path = MODEL_PATHS[modelType];

  useEffect(() => {
    if (DISABLED_MODELS.includes(modelType)) {
      setAvailable(false);
      return;
    }
    if (isBundledModel(modelType)) {
      setAvailable(true);
      return;
    }
    void checkModelExists(path).then(setAvailable);
  }, [modelType, path]);

  return available;
}

/** Warm only delivery-approved autonomous equipment. */
export async function preloadAvailableModels(): Promise<void> {
  getDracoLoader();

  await Promise.all(
    Object.entries(MODEL_PATHS).map(async ([key, path]) => {
      const modelType = key as ModelType;
      if (DISABLED_MODELS.includes(modelType)) return;
      if (isBundledModel(modelType)) {
        preloadDracoModel(path);
        return;
      }
      if (await checkModelExists(path)) {
        try {
          preloadDracoModel(path);
        } catch {
          // Preloading is opportunistic. The mounted component retains its fallback.
        }
      }
    })
  );
}

export function getModelStatus(): Record<string, boolean | null> {
  return { ...modelAvailability };
}
