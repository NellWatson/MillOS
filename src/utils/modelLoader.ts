/**
 * Model Loader Utility
 *
 * Handles loading GLTF models with fallback to procedural primitives.
 * Supports DRACO-compressed models for ~70-90% smaller file sizes.
 *
 * DRACO COMPRESSION:
 * To compress your models with DRACO, use gltf-pipeline:
 *   npm install -g gltf-pipeline
 *   gltf-pipeline -i model.glb -o model-draco.glb -d
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

import { useState, useEffect } from 'react';
import { getDracoLoader, preloadDracoModel, useDracoGLTF, disposeDracoLoader } from './dracoLoader';

// Re-export DRACO utilities for convenience
export { getDracoLoader, preloadDracoModel, useDracoGLTF, disposeDracoLoader };

// Model paths configuration - use BASE_URL for correct path at any deployment location
const BASE = import.meta.env.BASE_URL;
export const WORKER_ASSET_PATHS = {
  compatibility: `${BASE}models/worker/worker.glb`,
  masculine: `${BASE}models/worker/worker-masculine.glb`,
  feminine: `${BASE}models/worker/worker-feminine.glb`,
  skin: `${BASE}models/worker/worker-skin.png`,
} as const;

/**
 * Generated farm and village assets: nine rigged creatures and twenty-one
 * static structures and props, all validated against
 * `public/models/asset-manifest.json` before delivery.
 *
 * Kept out of `MODEL_PATHS` for the same reason the two authored worker bodies
 * are: `ModelType` drives the availability probe and the disabled list, and
 * these are delivery-validated bundled assets that need neither.
 *
 * None of them is **preloaded**. `preloadAvailableModels` still has no caller,
 * and unlike the worker bodies every one of these has a real fallback to stream
 * in behind: each call site keeps the primitive it replaced, rendered under both
 * a Suspense boundary and an error boundary, so a slow download shows the old
 * geometry for a moment and a missing file shows it permanently - rather than
 * an empty paddock or a torn-down subtree. If the preloader is ever wired to
 * app init, these belong beside the two worker paths.
 */
export const CREATURE_ASSET_PATHS = {
  cow: `${BASE}models/farm/cow.glb`,
  sheep: `${BASE}models/farm/sheep.glb`,
  pig: `${BASE}models/farm/pig.glb`,
  horse: `${BASE}models/farm/horse.glb`,
  chicken: `${BASE}models/farm/chicken.glb`,
  crow: `${BASE}models/farm/crow.glb`,
  duck: `${BASE}models/farm/duck.glb`,
  scarecrow: `${BASE}models/farm/scarecrow.glb`,
  cat: `${BASE}models/village/cat.glb`,
} as const;

export type CreatureId = keyof typeof CREATURE_ASSET_PATHS;

export const GENERATED_ASSET_PATHS = {
  barn: `${BASE}models/farm/barn.glb`,
  coop: `${BASE}models/farm/coop.glb`,
  farmhouse: `${BASE}models/farm/farmhouse.glb`,
  windmill: `${BASE}models/farm/windmill.glb`,
  haybale: `${BASE}models/farm/haybale.glb`,
  watertrough: `${BASE}models/farm/watertrough.glb`,
  gardenbed: `${BASE}models/farm/gardenbed.glb`,
  fence: `${BASE}models/farm/fence.glb`,
  cottage: `${BASE}models/village/cottage.glb`,
  shop: `${BASE}models/village/shop.glb`,
  church: `${BASE}models/village/church.glb`,
  townhall: `${BASE}models/village/townhall.glb`,
  pub: `${BASE}models/village/pub.glb`,
  school: `${BASE}models/village/school.glb`,
  forge: `${BASE}models/village/forge.glb`,
  wishingwell: `${BASE}models/village/wishingwell.glb`,
  marketstall: `${BASE}models/village/marketstall.glb`,
  postbox: `${BASE}models/village/postbox.glb`,
  fountain: `${BASE}models/village/fountain.glb`,
  duckpond: `${BASE}models/village/duckpond.glb`,
  castle: `${BASE}models/village/castle.glb`,
} as const;

export type GeneratedAssetId = keyof typeof GENERATED_ASSET_PATHS;

export const MODEL_PATHS = {
  forklift: `${BASE}models/forklift/forklift.glb`,
  worker: WORKER_ASSET_PATHS.compatibility,
  silo: `${BASE}models/machines/silo.glb`,
  rollerMill: `${BASE}models/machines/mill.glb`,
  plansifter: `${BASE}models/machines/plansifter.glb`,
  packer: `${BASE}models/machines/packer.glb`,
} as const;

// Worker character variants - Kenney Blocky Characters pack (CC0)
// Download more from: https://kenney.nl/assets/blocky-characters
export const WORKER_VARIANTS = {
  default: `${BASE}models/worker/worker.glb`,
  character2: `${BASE}models/worker/character2.glb`,
  character3: `${BASE}models/worker/character3.glb`,
  character4: `${BASE}models/worker/character4.glb`,
  character5: `${BASE}models/worker/character5.glb`,
} as const;

export type WorkerVariant = keyof typeof WORKER_VARIANTS;

export type ModelType = keyof typeof MODEL_PATHS;

// These two runtime assets are required by public/models/asset-manifest.json,
// validated before delivery, and copied into every Vite build. Treating them as
// optional would issue redundant HEAD requests before the real model download.
const BUNDLED_MODELS: ReadonlySet<ModelType> = new Set(['forklift', 'worker']);

export function isBundledModel(modelType: ModelType): boolean {
  return BUNDLED_MODELS.has(modelType);
}

// Models with known issues or not yet available
// All models disabled - using procedural fallback geometry instead
// This prevents 404 floods on GitHub Pages where models aren't deployed
const DISABLED_MODELS: ModelType[] = [
  'silo', // Quarantined: source was a broken 0.42 m detail tank, not a production silo
  'rollerMill', // Using procedural fallback
  'plansifter', // Using procedural fallback
  'packer', // Using procedural fallback
];

// Track which models are available
const modelAvailability: Record<string, boolean | null> = {};
const modelAvailabilityChecks = new Map<string, Promise<boolean>>();

/**
 * Check if a model file exists
 * Uses HEAD request and verifies Content-Type to avoid SPA fallback false positives
 */
export async function checkModelExists(path: string): Promise<boolean> {
  if (modelAvailability[path] !== undefined && modelAvailability[path] !== null) {
    return modelAvailability[path] as boolean;
  }

  const activeCheck = modelAvailabilityChecks.get(path);
  if (activeCheck) return activeCheck;

  const check = (async (): Promise<boolean> => {
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
    } finally {
      modelAvailabilityChecks.delete(path);
    }
  })();

  modelAvailabilityChecks.set(path, check);
  return check;
}

/**
 * Hook to check if a model is available
 */
export function useModelAvailable(modelType: ModelType): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(() =>
    isBundledModel(modelType) ? true : null
  );
  const path = MODEL_PATHS[modelType];

  useEffect(() => {
    // Check if model is in the disabled list first
    if (DISABLED_MODELS.includes(modelType)) {
      setAvailable(false);
      return;
    }
    if (isBundledModel(modelType)) {
      setAvailable(true);
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
 * Preload models that exist (with DRACO support)
 *
 * PRELOAD THE ASSETS THAT ACTUALLY RENDER.
 *
 * This used to walk `MODEL_PATHS` alone, which meant the only character it
 * warmed was `MODEL_PATHS.worker` - the 61 KB `worker.glb`, whose manifest
 * role is literally "compatibility-character" and which no component ever
 * renders. The two assets personnel are actually built from,
 * `WORKER_ASSET_PATHS.masculine` (1.34 MB) and `.feminine` (1.43 MB), were
 * never preloaded at all, so they streamed in on first close approach behind a
 * visibly different Suspense fallback. `WorkerModel` is the only consumer and
 * picks between exactly these two by `appearance.bodyType`.
 *
 * `worker.glb` stays in `MODEL_PATHS`, in `BUNDLED_MODELS`, and in
 * `asset-manifest.json` - `isBundledModel('worker')` is asserted by
 * `__tests__/modelLoader.test.ts` and still answers availability without a
 * network probe. It is only removed from the *preload* set, since downloading
 * a model nothing mounts is pure waste.
 *
 * Preload/consume share one cache entry: `useGLTF.preload` and `useGLTF` both
 * bottom out in `useLoader`, whose suspense key is `[loader, ...paths]` - the
 * extension callback is not part of it. So warming these here is picked up by
 * `WorkerModel`'s `useDracoGLTF(path, false)` rather than duplicating the
 * download. (Neither character GLB is DRACO-compressed today; attaching the
 * decoder is a no-op for them. Compressing them is an asset-pipeline job, not
 * a loader change - 2.8 MB of position/skin data is the single largest
 * runtime download in the project and would compress well.)
 *
 * Eager rather than deferred, deliberately: this function currently has no
 * caller anywhere in `src/`, so there is no first frame for it to compete
 * with. If it is wired to app init later, timing belongs at the call site
 * (behind the loading screen, or after first paint) where the trade-off is
 * visible - not buried in a preload helper.
 */
export async function preloadAvailableModels(): Promise<void> {
  // Initialize DRACO loader for better model loading performance
  getDracoLoader();

  const checks = Object.entries(MODEL_PATHS).map(async ([key, path]) => {
    // Skip disabled models
    if (DISABLED_MODELS.includes(key as ModelType)) {
      return;
    }
    // Skip the compatibility character - bundled and available, but unrendered.
    if ((key as ModelType) === 'worker') {
      return;
    }
    if (isBundledModel(key as ModelType)) {
      preloadDracoModel(path);
      return;
    }
    const exists = await checkModelExists(path);
    if (exists) {
      try {
        // Use DRACO-aware preloading
        preloadDracoModel(path);
      } catch {
        // Preload failed, ignore
      }
    }
  });

  // The real personnel characters. Both are delivery-validated bundled assets
  // (asset-manifest.json), so they need no availability probe.
  try {
    preloadDracoModel([WORKER_ASSET_PATHS.masculine, WORKER_ASSET_PATHS.feminine]);
  } catch {
    // Preload failed, ignore - WorkerModel still loads them on demand.
  }

  await Promise.all(checks);
}

/**
 * Get model info for debugging
 */
export function getModelStatus(): Record<string, boolean | null> {
  return { ...modelAvailability };
}
