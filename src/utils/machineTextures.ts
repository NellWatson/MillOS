/**
 * Machine Textures Utility
 *
 * Provides PBR texture maps for machine materials with quality-based resolution.
 * Supports both KTX2 compressed textures and JPG fallbacks.
 *
 * Texture Structure:
 * public/textures/compressed/ - KTX2 compressed (preferred, ~75% smaller)
 * public/textures/machines/
 *   256/  - Standard resolution - for high quality (JPG fallback)
 *   512/  - Higher resolution - for ultra quality (JPG fallback)
 *
 * Naming convention: {model}_roughness.ktx2/jpg, {model}_normal.ktx2/jpg, {model}_ao.ktx2/jpg
 *
 * Supported models: silo, roller_mill, packer, plansifter, conveyor, pallet, grass, concrete, brick, water
 *
 * Source: ambientCG.com (CC0 Public Domain)
 */

import {
  TextureLoader,
  Texture,
  RepeatWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  MeshStandardMaterial,
  type ColorSpace,
} from 'three';
import { useGraphicsStore, GraphicsQuality } from '../stores/graphicsStore';
import {
  isCompressionAvailable,
  loadCompressedTexture,
  resolveAnisotropy,
} from './textureCompression';

// Texture base paths - use BASE_URL for correct path at any deployment location
const TEXTURE_BASE_PATH = `${import.meta.env.BASE_URL}textures/machines`;
const COMPRESSED_PATH = `${import.meta.env.BASE_URL}textures/compressed`;

// Resolution by quality level
const RESOLUTION_BY_QUALITY: Record<GraphicsQuality, string> = {
  low: '256', // Not used (textures disabled on low)
  medium: '256', // Not used (textures disabled on medium)
  high: '256', // 256px for high
  ultra: '512', // 512px for ultra (1024 available but overkill)
};

export type ModelType =
  | 'silo'
  | 'roller_mill'
  | 'packer'
  | 'plansifter'
  | 'conveyor'
  | 'pallet'
  // Environment textures
  | 'grass'
  | 'concrete' // Also used for factory floor
  | 'brick'
  | 'water';

export interface MachineTextures {
  roughness: Texture | null;
  normal: Texture | null;
  ao: Texture | null;
  color?: Texture | null; // Some models have color maps
}

/**
 * WHICH MAPS ACTUALLY EXIST ON DISK.
 *
 * Mirrors `public/textures/machines/{256,512}/` and
 * `public/textures/compressed/`. Every model ships `_roughness` and `_normal`;
 * only `_ao` and `_color` vary, so only the exceptions are listed.
 *
 * Requesting a map that is not there is not free and not silent: each miss
 * costs a `.ktx2` request AND its `.jpg` fallback, both 404, on every mount of
 * every consumer - and the failing `Texture` object has already been handed to
 * the caller by the time the error callback nulls the cache slot.
 *
 * Verified against the three directories; keep in sync if assets are added.
 */
const MODELS_WITHOUT_AO: ReadonlySet<ModelType> = new Set(['conveyor', 'pallet', 'water']);

/** Models whose `_color` map exists and is safe to bind as `material.map`. */
const MODELS_WITH_COLOR: ReadonlySet<ModelType> = new Set([
  'conveyor',
  'pallet',
  'grass',
  'concrete',
  'brick',
  'water',
]);

// Cache for loaded textures to prevent reloading
const textureCache = new Map<string, Texture | null>();

// Track pending KTX2 loads to avoid duplicate requests
const pendingKtx2Loads = new Map<string, Promise<Texture | null>>();

/**
 * Safely load a texture with KTX2 priority
 * Tries KTX2 from compressed folder first, falls back to JPG
 *
 * `colorSpace` must be supplied for albedo. `KTX2Loader` reads the transfer
 * function out of the file's DFD and sets `SRGBColorSpace` itself, but
 * `THREE.TextureLoader` sets nothing at all (three r182 `TextureLoader.load`
 * only assigns `image` and `needsUpdate`), so a `Texture` from the JPG path
 * keeps the constructor default of `NoColorSpace`. Left alone, the same
 * logical albedo decodes differently depending on which loader won the race
 * here - and the JPG branch renders washed out, because its sRGB bytes are
 * consumed as if they were already linear.
 */
function safeLoadTexture(jpgPath: string, colorSpace?: ColorSpace): Texture | null {
  // Check cache first
  if (textureCache.has(jpgPath)) {
    return textureCache.get(jpgPath) ?? null;
  }

  // Extract texture name for KTX2 lookup
  // e.g., "/textures/machines/256/brick_color.jpg" -> "brick_color"
  const pathParts = jpgPath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const textureName = filename.replace('.jpg', '');
  const ktx2Path = `${COMPRESSED_PATH}/${textureName}.ktx2`;

  // If KTX2 compression is available, try to load KTX2 async
  if (isCompressionAvailable()) {
    // Start async KTX2 load if not already pending
    if (!pendingKtx2Loads.has(ktx2Path)) {
      const loadPromise = loadCompressedTexture(
        ktx2Path,
        jpgPath,
        `machine-${textureName}`,
        colorSpace
      )
        .then((tex) => {
          // Dispose the immediate JPG fallback if it raced into the cache first,
          // otherwise replacing the slot with the KTX2 texture leaks the JPG's
          // GPU memory for the lifetime of the session.
          const prev = textureCache.get(jpgPath);
          if (prev && prev !== tex) prev.dispose();
          textureCache.set(jpgPath, tex);
          pendingKtx2Loads.delete(ktx2Path);
          return tex;
        })
        .catch(() => {
          pendingKtx2Loads.delete(ktx2Path);
          // Fall back to JPG via standard loader
          return loadJpgTexture(jpgPath, colorSpace);
        });
      pendingKtx2Loads.set(ktx2Path, loadPromise);
    }

    // Return placeholder or cached texture while async load completes
    // The texture will update in place when the async load finishes
    const cached = textureCache.get(jpgPath);
    if (cached) return cached;

    // Start JPG load as immediate fallback (will be replaced by KTX2 when ready)
    return loadJpgTexture(jpgPath, colorSpace);
  }

  // No KTX2 support - load JPG directly
  return loadJpgTexture(jpgPath, colorSpace);
}

/**
 * Load JPG texture (fallback when KTX2 not available)
 *
 * SAMPLER STATE IS THE WHOLE POINT OF THIS FUNCTION.
 *
 * This used to set `magFilter = NearestFilter` with `generateMipmaps = false`,
 * commented "perf optimization". It is the opposite of one. Point sampling with
 * no mip chain means every minified texel is a single unfiltered sample, so any
 * surface in motion or at a grazing angle aliases: the 55 m conveyor belt runs
 * its texture past the camera continuously and would crawl and sparkle the
 * entire time. Mip generation is a one-off ~33% memory cost at load; the
 * shimmer it removes is per-frame and unmissable.
 *
 * Note that all three values below are simply three's own `Texture`
 * constructor defaults (r182: `magFilter = LinearFilter`,
 * `minFilter = LinearMipmapLinearFilter`, `generateMipmaps = true`) - the old
 * code was actively downgrading them. They are written out explicitly anyway so
 * the intent survives the next person who reads this callback.
 *
 * Mutating in `onLoad` is safe: `TextureLoader` assigns `image` and
 * `needsUpdate` and then calls `onLoad` synchronously in the same
 * `ImageLoader` callback, so no render - and therefore no GPU upload, which is
 * where sampler state is actually read - can interleave.
 */
function loadJpgTexture(path: string, colorSpace?: ColorSpace): Texture | null {
  if (textureCache.has(path)) {
    return textureCache.get(path) ?? null;
  }

  try {
    const loader = new TextureLoader();
    const texture = loader.load(
      path,
      // On success
      (tex) => {
        tex.wrapS = tex.wrapT = RepeatWrapping;
        tex.minFilter = LinearMipmapLinearFilter;
        tex.magFilter = LinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = resolveAnisotropy();
        textureCache.set(path, tex);
      },
      // On progress (unused)
      undefined,
      // On error - cache null to prevent retries
      () => {
        textureCache.set(path, null);
      }
    );
    // Set synchronously, NOT in the callback above, unlike the sampler state.
    // `TextureLoader.load` returns its `Texture` immediately and only fills in
    // `image` later, so this object reaches the consumer - and can be bound to
    // a material - before `onLoad` ever runs. Filtering and mip settings are
    // safe to defer because three reads them at upload, which cannot precede
    // the image; `colorSpace` is read there too (`WebGLTextures.uploadTexture`
    // passes it to `getInternalFormat`, which picks `SRGB8_ALPHA8` over
    // `RGBA8`), but it is also part of `getTextureCacheKey` and is the one
    // property a consumer might reasonably read off the texture itself. Doing
    // it here costs nothing and removes the ordering question entirely.
    if (colorSpace) texture.colorSpace = colorSpace;
    textureCache.set(path, texture);
    return texture;
  } catch {
    textureCache.set(path, null);
    return null;
  }
}

/**
 * Get texture set for a model type at a specific resolution.
 * Returns null textures if textures disabled or not found.
 */
export function getModelTextures(
  modelType: ModelType,
  resolution: '256' | '512' = '256'
): MachineTextures {
  const enableTextures = useGraphicsStore.getState().graphics.enableMachineTextures;

  if (!enableTextures) {
    return { roughness: null, normal: null, ao: null };
  }

  const base = `${TEXTURE_BASE_PATH}/${resolution}/${modelType}`;

  return {
    // Roughness and normal ship for every model type.
    roughness: safeLoadTexture(`${base}_roughness.jpg`),
    normal: safeLoadTexture(`${base}_normal.jpg`),
    // AO and colour are requested only where the file exists (see the tables
    // above). Consumers already treat every field as nullable.
    ao: MODELS_WITHOUT_AO.has(modelType) ? null : safeLoadTexture(`${base}_ao.jpg`),
    // Albedo is the only sRGB-encoded map here; roughness/normal/AO are data
    // and must stay on three's default (no colour space).
    color: MODELS_WITH_COLOR.has(modelType)
      ? safeLoadTexture(`${base}_color.jpg`, SRGBColorSpace)
      : null,
  };
}

/**
 * React hook version for use in components.
 * Automatically selects resolution based on quality setting.
 * Only attempts to load textures on high/ultra quality.
 */
export function useModelTextures(modelType: ModelType): MachineTextures {
  const enableTextures = useGraphicsStore((state) => state.graphics.enableMachineTextures);
  const quality = useGraphicsStore((state) => state.graphics.quality);

  // Early return for low/medium quality
  if (!enableTextures || quality === 'low' || quality === 'medium') {
    return { roughness: null, normal: null, ao: null };
  }

  const resolution = RESOLUTION_BY_QUALITY[quality];
  return getModelTextures(modelType, resolution as '256' | '512');
}

// Legacy alias for backward compatibility
export const getMachineTextures = getModelTextures;
export const useMachineTextures = useModelTextures;
export type MachineType = ModelType;

/**
 * Dispose all cached textures (call on app unmount if needed)
 */
export function disposeMachineTextures(): void {
  textureCache.forEach((texture) => {
    if (texture) {
      texture.dispose();
    }
  });
  textureCache.clear();
}

/**
 * Apply textures to a Three.js MeshStandardMaterial if textures are available.
 * Mutates the material in-place.
 */
export function applyTexturesToMaterial(
  material: MeshStandardMaterial,
  textures: MachineTextures
): void {
  if (textures.roughness) {
    material.roughnessMap = textures.roughness;
  }
  if (textures.normal) {
    material.normalMap = textures.normal;
    material.normalScale?.set(0.5, 0.5); // Subtle normal mapping
  }
  if (textures.ao) {
    material.aoMap = textures.ao;
    material.aoMapIntensity = 0.5;
  }

  // Need to update if any texture was applied
  if (textures.roughness || textures.normal || textures.ao) {
    material.needsUpdate = true;
  }
}
