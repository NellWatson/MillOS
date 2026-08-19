import * as THREE from 'three';
import { getModelTextures, type MachineTextures } from '../../utils/machineTextures';
import { loadCompressedTexture } from '../../utils/textureCompression';
import { useGraphicsStore } from '../../stores/graphicsStore';
import { applyWorldSurface, type WorldSurfaceProfileName } from '../../utils/worldSurface';

/**
 * Shared materials for worker body parts to reduce memory overhead
 * and enable easy texture addition. Materials are cached by color value
 * to maintain worker-to-worker variation while avoiding duplicate instances.
 *
 * Textures are automatically applied on high/ultra quality settings.
 */

// =============================================================================
// TEXTURE MANAGEMENT
// =============================================================================

let workerTextures: MachineTextures | null = null;
let texturesInitialized = false;
let lastQuality: string | null = null;

/**
 * Initialize worker textures based on current quality settings.
 * Called lazily when materials are first requested.
 */
function initializeTextures(): void {
  const { quality, enableMachineTextures } = useGraphicsStore.getState().graphics;

  // Skip if already initialized for this quality level
  if (texturesInitialized && lastQuality === quality) {
    return;
  }

  // Only load textures on high/ultra with textures enabled
  if (enableMachineTextures && (quality === 'high' || quality === 'ultra')) {
    const resolution = quality === 'ultra' ? '512' : '256';
    workerTextures = getModelTextures('worker', resolution as '256' | '512');
  } else {
    workerTextures = null;
  }

  texturesInitialized = true;
  lastQuality = quality;
}

/**
 * Apply worker textures to a material if available.
 */
function applyWorkerTextures(material: THREE.MeshStandardMaterial): void {
  initializeTextures();

  if (!workerTextures) return;

  if (workerTextures.roughness) {
    material.roughnessMap = workerTextures.roughness;
  }
  if (workerTextures.normal) {
    material.normalMap = workerTextures.normal;
    material.normalScale.set(0.3, 0.3); // Subtle for workers
  }
  if (workerTextures.ao) {
    material.aoMap = workerTextures.ao;
    material.aoMapIntensity = 0.4;
  }

  material.needsUpdate = true;
}

// =============================================================================
// CHARACTER DETAIL MAPS (authored GLB path)
// =============================================================================

/**
 * Tiling surface detail for the authored skinned workers.
 *
 * public/textures/compressed/worker_normal.ktx2 and worker_roughness.ktx2 are
 * full 1024x1024, 11-level mip chains that reached no worker at any quality
 * tier: `getModelTextures` short-circuits on `graphics.enableMachineTextures`,
 * which is `false` on all four presets, and WorkerModel never imported this
 * module at all. These are loaded directly through the KTX2 path instead so the
 * dead flag is not in the way, and so the JPG fallback in machineTextures.ts —
 * which applies NearestFilter with `generateMipmaps = false` and would shimmer
 * badly on a moving character — is never used.
 *
 * HARD CONSTRAINT: worker_color.ktx2 must NEVER be bound as `material.map`.
 * The GLB UV unwrap spans roughly U/V [-1.0, 1.5] with no atlas intent, so an
 * albedo map smears unrelated colour across the body. That same arbitrary
 * unwrap is exactly why RepeatWrapping normal/roughness detail works here.
 */
export interface WorkerDetailMaps {
  normal: THREE.Texture;
  roughness: THREE.Texture;
}

const COMPRESSED_TEXTURE_PATH = `${import.meta.env.BASE_URL}textures/compressed`;
const DETAIL_JPG_FALLBACK_PATH = `${import.meta.env.BASE_URL}textures/machines/256`;

let detailMapsPromise: Promise<WorkerDetailMaps | null> | null = null;
let resolvedDetailMaps: WorkerDetailMaps | null = null;
const detailVariantCache = new Map<string, THREE.Texture>();

/**
 * Kick off (or join) the one-time load of the shared worker detail maps.
 * Resolves to null if neither the KTX2 nor the JPG fallback is reachable.
 */
export function requestWorkerDetailMaps(): Promise<WorkerDetailMaps | null> {
  if (resolvedDetailMaps) return Promise.resolve(resolvedDetailMaps);
  if (detailMapsPromise) return detailMapsPromise;

  detailMapsPromise = Promise.all([
    loadCompressedTexture(
      `${COMPRESSED_TEXTURE_PATH}/worker_normal.ktx2`,
      `${DETAIL_JPG_FALLBACK_PATH}/worker_normal.jpg`,
      'worker-detail-normal'
    ),
    loadCompressedTexture(
      `${COMPRESSED_TEXTURE_PATH}/worker_roughness.ktx2`,
      `${DETAIL_JPG_FALLBACK_PATH}/worker_roughness.jpg`,
      'worker-detail-roughness'
    ),
  ])
    .then(([normal, roughness]) => {
      if (!normal || !roughness) return null;
      // Neither map is colour data, so both are FORCED to NoColorSpace rather
      // than left on "the three.js default".
      //
      // That distinction is not pedantry, it was measured. `KTX2Loader` reads
      // the transfer function out of the file's data format descriptor and
      // assigns `texture.colorSpace` from it, so the default is whatever the
      // encoder wrote - and `worker_roughness.ktx2` was encoded sRGB.
      // `inspectObjects` reported the bound slot as `roughnessMap:srgb` the
      // first frame these maps reached a worker, which is precisely the defect
      // `audit-scene-models.mjs` classes as a blocker: a data map decoded
      // through the sRGB transfer is consumed as roughness values that were
      // never written. Nothing caught it earlier because the maps were gated to
      // `high` and every audit runs the shipping `medium` preset.
      //
      // Anisotropy has to be set on the base texture: sampler state is applied
      // during upload and every repeat-variant clone shares one GL texture.
      for (const texture of [normal, roughness]) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = Math.max(texture.anisotropy, 4);
        texture.colorSpace = THREE.NoColorSpace;
        texture.needsUpdate = true;
      }
      resolvedDetailMaps = { normal, roughness };
      return resolvedDetailMaps;
    })
    .catch(() => null);

  return detailMapsPromise;
}

/**
 * Return a repeat-specific view of one detail map, or null before the load
 * resolves. Clones share `Texture.source` (and therefore one GPU upload) while
 * carrying their own UV transform, so mutating a repeat here cannot leak into
 * any other consumer of the same file.
 */
export function getWorkerDetailMapVariant(
  channel: 'normal' | 'roughness',
  repeat: number
): THREE.Texture | null {
  if (!resolvedDetailMaps) return null;
  const key = `${channel}:${repeat}`;
  const cached = detailVariantCache.get(key);
  if (cached) return cached;

  const variant = resolvedDetailMaps[channel].clone();
  variant.wrapS = THREE.RepeatWrapping;
  variant.wrapT = THREE.RepeatWrapping;
  variant.repeat.set(repeat, repeat);
  detailVariantCache.set(key, variant);
  return variant;
}

// =============================================================================
// STATIC SHARED MATERIALS (identical across all workers)
// =============================================================================

export const SHARED_WORKER_MATERIALS = {
  // Face features
  eyeWhite: new THREE.MeshStandardMaterial({ color: '#fefefe', roughness: 0.2 }),
  iris: new THREE.MeshStandardMaterial({ color: '#4a3728', roughness: 0.3 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#0a0a0a' }),
  lips: new THREE.MeshStandardMaterial({ color: '#a0524a', roughness: 0.7 }),

  // Generic colors
  black: new THREE.MeshStandardMaterial({ color: '#0a0a0a' }),
  darkGray: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.3 }),
  mediumGray: new THREE.MeshStandardMaterial({ color: '#333333' }),
  white: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
  offWhite: new THREE.MeshStandardMaterial({ color: '#e5e5e5', roughness: 0.7 }),
  reflective: new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    emissive: '#ffffff',
    emissiveIntensity: 0.22,
    metalness: 0.3,
    roughness: 0.2,
  }),
  boot: new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.78 }),
  glove: new THREE.MeshStandardMaterial({ color: '#1e40af', roughness: 0.62 }),
  safetyLens: new THREE.MeshStandardMaterial({
    color: '#c9edff',
    transparent: true,
    opacity: 0.48,
    roughness: 0.08,
    metalness: 0.05,
    depthWrite: false,
  }),
  sampleGlass: new THREE.MeshStandardMaterial({
    color: '#dbeafe',
    transparent: true,
    opacity: 0.62,
    roughness: 0.12,
    depthWrite: false,
  }),
  sampleCap: new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.55 }),
  badgeWhite: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 }),

  // Metallic
  chrome: new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    metalness: 0.8,
    roughness: 0.2,
  }),
  chromeShiny: new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    metalness: 0.9,
    roughness: 0.3,
  }),

  // Safety equipment
  vestOrange: new THREE.MeshStandardMaterial({
    color: '#f97316',
    emissive: '#7c2d12',
    emissiveIntensity: 0.035,
    roughness: 0.6,
  }),
  safetyGreen: new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: '#22c55e',
    emissiveIntensity: 0.5,
  }),
  safetyGreenBright: new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: '#22c55e',
    emissiveIntensity: 2,
  }),

  // Equipment
  screenBlue: new THREE.MeshStandardMaterial({
    color: '#1e40af',
    emissive: '#1e40af',
    emissiveIntensity: 0.3,
  }),
  clipboardBrown: new THREE.MeshStandardMaterial({ color: '#8b4513', roughness: 0.7 }),
  lensBlue: new THREE.MeshStandardMaterial({
    color: '#a0d8ef',
    transparent: true,
    opacity: 0.4,
  }),
  handleRed: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.8 }),
};

// =============================================================================
// SURFACE FINISH
// =============================================================================

/**
 * Analytic surface finish for every worker material, in OBJECT REST SPACE.
 *
 * WHY THIS FILE NEEDED IT TOO. `WorkerModel.tsx` finishes the surfaces that come
 * out of the authored GLB - skin, hi-vis, shirt, denim, boots, hair - and that
 * alone left `world-personnel` at 81% flat by mesh count on the
 * `personnel-close` audit, because most of the meshes in that branch are not the
 * body. They are the accessories and the procedural worker: helmets, glasses,
 * badges, ear defenders, gloves, tools, clipboards, lockers of small parts, and
 * the cached per-worker skin/uniform/pants/hat/accent materials this module
 * hands out. A body finished next to unfinished accessories reads worse than
 * neither being finished, because the mismatch is what the eye picks up.
 *
 * REST SPACE EVERYWHERE. Workers walk. A world-space field would make the detail
 * swim across a moving body; `worldSurface` samples the `position` attribute, so
 * every profile named here is welded to the bind pose. See the coordinate-space
 * table in `utils/worldSurface.ts`.
 *
 * COST. `StaticMeshBatch` excludes `SkinnedMesh` and `InstancedMesh` outright,
 * and every profile shares one `customProgramCacheKey`, so this adds no draw
 * calls and no shader permutations.
 *
 * WHAT IS DELIBERATELY ABSENT:
 *   eyeWhite, iris, pupil   An eye is a wet sphere. Dust, grime, worn edges and
 *                           tonal drift are all diseases on it.
 *   safetyLens, sampleGlass,
 *   lensBlue                Transparent - `resolveSurfaceProfile` declines these
 *                           anyway, and they are correctly flat by construction.
 *   reflective, safetyGreen,
 *   safetyGreenBright,
 *   screenBlue              Emissive. These represent EMITTED light (retro-
 *                           reflective banding under a lamp, a status LED, a lit
 *                           screen), and weathering an emitter does nothing
 *                           visible while making no physical sense.
 */
const WORKER_SURFACE_PROFILES: Partial<
  Record<keyof typeof SHARED_WORKER_MATERIALS, WorldSurfaceProfileName>
> = {
  lips: 'skin',
  black: 'vehicle',
  darkGray: 'vehicle',
  mediumGray: 'vehicle',
  white: 'fabric',
  offWhite: 'fabric',
  boot: 'fabric',
  glove: 'fabric',
  sampleCap: 'vehicle',
  badgeWhite: 'signage',
  chrome: 'metal',
  chromeShiny: 'metal',
  vestOrange: 'signage',
  clipboardBrown: 'vehicle',
  handleRed: 'vehicle',
};

Object.entries(WORKER_SURFACE_PROFILES).forEach(([name, profile]) => {
  const material = SHARED_WORKER_MATERIALS[name as keyof typeof SHARED_WORKER_MATERIALS];
  if (material && profile) applyWorldSurface(material, profile);
});

// =============================================================================
// CACHED DYNAMIC MATERIALS (vary per-worker but shared across same values)
// =============================================================================

// Cache maps for dynamic colors
const skinMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const skinSoftMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const hairMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const uniformMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const pantsMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const hatMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const accentMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

// Track which materials have had textures applied
const texturedMaterials = new WeakSet<THREE.MeshStandardMaterial>();

/**
 * Get or create a skin material for the given skin tone.
 * Cached to share materials between workers with the same skin tone.
 * Textures are automatically applied on high/ultra quality.
 */
export const getSkinMaterial = (skinTone: string): THREE.MeshStandardMaterial => {
  if (!skinMaterialCache.has(skinTone)) {
    const material = applyWorldSurface(
      new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.6 }),
      'skin'
    );
    skinMaterialCache.set(skinTone, material);
  }

  const material = skinMaterialCache.get(skinTone)!;

  // Apply textures if not already done
  if (!texturedMaterials.has(material)) {
    applyWorkerTextures(material);
    texturedMaterials.add(material);
  }

  return material;
};

/**
 * Get skin material with softer roughness (for face/head details).
 * Textures are automatically applied on high/ultra quality.
 */
export const getSkinSoftMaterial = (skinTone: string): THREE.MeshStandardMaterial => {
  if (!skinSoftMaterialCache.has(skinTone)) {
    const material = applyWorldSurface(
      new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.55 }),
      'skin'
    );
    skinSoftMaterialCache.set(skinTone, material);
  }

  const material = skinSoftMaterialCache.get(skinTone)!;

  if (!texturedMaterials.has(material)) {
    applyWorkerTextures(material);
    texturedMaterials.add(material);
  }

  return material;
};

/**
 * Get or create a hair material for the given hair color.
 */
export const getHairMaterial = (hairColor: string): THREE.MeshStandardMaterial => {
  if (!hairMaterialCache.has(hairColor)) {
    hairMaterialCache.set(
      hairColor,
      // `skin`, not `fabric`: at 5.5 cm the weave period would be four blotches
      // on a head rather than a surface.
      applyWorldSurface(
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 }),
        'skin'
      )
    );
  }
  return hairMaterialCache.get(hairColor)!;
};

/**
 * Get or create a uniform/shirt material.
 * Textures are automatically applied on high/ultra quality.
 */
export const getUniformMaterial = (color: string): THREE.MeshStandardMaterial => {
  if (!uniformMaterialCache.has(color)) {
    const material = applyWorldSurface(
      new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.025,
        roughness: 0.7,
      }),
      'fabric'
    );
    uniformMaterialCache.set(color, material);
  }

  const material = uniformMaterialCache.get(color)!;

  if (!texturedMaterials.has(material)) {
    applyWorkerTextures(material);
    texturedMaterials.add(material);
  }

  return material;
};

/**
 * Get or create a pants material.
 * Textures are automatically applied on high/ultra quality.
 */
export const getPantsMaterial = (color: string): THREE.MeshStandardMaterial => {
  if (!pantsMaterialCache.has(color)) {
    const material = applyWorldSurface(
      new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.015,
        roughness: 0.8,
      }),
      'fabric'
    );
    pantsMaterialCache.set(color, material);
  }

  const material = pantsMaterialCache.get(color)!;

  if (!texturedMaterials.has(material)) {
    applyWorkerTextures(material);
    texturedMaterials.add(material);
  }

  return material;
};

/**
 * Get or create a hat material.
 */
export const getHatMaterial = (color: string): THREE.MeshStandardMaterial => {
  if (!hatMaterialCache.has(color)) {
    hatMaterialCache.set(
      color,
      // A hard hat is moulded HDPE in a safety colour: `signage` is the lightest
      // profile, because hi-vis weathered into the background has been broken.
      applyWorldSurface(new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 }), 'signage')
    );
  }
  return hatMaterialCache.get(color)!;
};

export const getAccentMaterial = (color: string): THREE.MeshStandardMaterial => {
  if (!accentMaterialCache.has(color)) {
    accentMaterialCache.set(
      color,
      applyWorldSurface(
        new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.12 }),
        'signage'
      )
    );
  }
  return accentMaterialCache.get(color)!;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Force texture re-initialization (call when quality settings change).
 */
export const refreshWorkerTextures = (): void => {
  texturesInitialized = false;
  lastQuality = null;

  // Re-apply textures to all cached materials
  const allCaches = [
    skinMaterialCache,
    skinSoftMaterialCache,
    uniformMaterialCache,
    pantsMaterialCache,
  ];

  for (const cache of allCaches) {
    for (const material of cache.values()) {
      // Clear existing texture maps
      material.roughnessMap = null;
      material.normalMap = null;
      material.aoMap = null;
      // Evict from the textured tracking set so the getters re-run
      // applyWorkerTextures on next access (WeakSet has no clear()).
      texturedMaterials.delete(material);
      material.needsUpdate = true;
    }
  }
};

/**
 * Clear all material caches (useful for memory cleanup or hot reloading).
 */
export const clearMaterialCaches = (): void => {
  // Dispose all cached materials
  const caches = [
    skinMaterialCache,
    skinSoftMaterialCache,
    hairMaterialCache,
    uniformMaterialCache,
    pantsMaterialCache,
    hatMaterialCache,
    accentMaterialCache,
  ];

  for (const cache of caches) {
    for (const material of cache.values()) {
      material.dispose();
    }
    cache.clear();
  }

  // Reset texture state
  texturesInitialized = false;
  lastQuality = null;
  workerTextures = null;
};

/**
 * Get cache statistics for debugging.
 */
export const getMaterialCacheStats = () => ({
  skin: skinMaterialCache.size,
  skinSoft: skinSoftMaterialCache.size,
  hair: hairMaterialCache.size,
  uniform: uniformMaterialCache.size,
  pants: pantsMaterialCache.size,
  hat: hatMaterialCache.size,
  accent: accentMaterialCache.size,
  staticMaterials: Object.keys(SHARED_WORKER_MATERIALS).length,
  texturesEnabled: workerTextures !== null,
  quality: lastQuality,
});
