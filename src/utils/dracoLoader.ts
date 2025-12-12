/**
 * DRACO Compression Support
 *
 * DRACO is a compression library for 3D meshes that can reduce file sizes by ~70-90%.
 * This module sets up DRACO support for Three.js/React Three Fiber applications.
 *
 * Usage:
 *   import { useDracoGLTF, preloadDracoModel } from './dracoLoader';
 *
 *   // In component:
 *   const { scene, nodes, materials } = useDracoGLTF('/model.glb');
 *
 *   // To preload:
 *   preloadDracoModel('/model.glb');
 *
 * Note: The DRACO decoder files are loaded from the CDN automatically.
 * For offline support, copy the decoder files to public/draco/ and update DECODER_PATH.
 */

import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

// CDN path for DRACO decoder files
// For offline support, download and place in public/draco/
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// Local fallback path (copy decoder files here for offline use)
// const DRACO_DECODER_PATH = '/draco/';

// Singleton DRACO loader instance
let dracoLoaderInstance: DRACOLoader | null = null;

/**
 * Get or create the DRACO loader instance
 */
export function getDracoLoader(): DRACOLoader {
  if (!dracoLoaderInstance) {
    dracoLoaderInstance = new DRACOLoader();
    dracoLoaderInstance.setDecoderPath(DRACO_DECODER_PATH);
    dracoLoaderInstance.setDecoderConfig({ type: 'js' }); // Use JS decoder (works everywhere)
    dracoLoaderInstance.preload(); // Start loading decoder in background
  }
  return dracoLoaderInstance;
}

/**
 * Create a GLTF loader with DRACO support
 */
export function createDracoGLTFLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  return loader;
}

/**
 * Hook to load GLTF models with DRACO support
 * Wrapper around useGLTF that configures DRACO decoding
 */
export function useDracoGLTF(path: string, useDraco: boolean = true): GLTF {
  // Configure drei's useGLTF to use DRACO
  // Note: useGLTF from drei automatically uses DRACO when the decoder is set up
  if (useDraco) {
    // Ensure DRACO loader is initialized
    getDracoLoader();
  }

  return useGLTF(path, useDraco);
}

/**
 * Preload a DRACO-compressed model
 */
export function preloadDracoModel(path: string | string[]): void {
  // Ensure DRACO loader is set up
  getDracoLoader();

  // Use drei's preload which handles caching
  useGLTF.preload(path);
}

/**
 * Load a DRACO-compressed model manually (for use outside React components)
 * Returns a promise that resolves with the GLTF object
 */
export async function loadDracoModel(path: string): Promise<GLTF> {
  const loader = createDracoGLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => resolve(gltf),
      undefined, // onProgress
      (error) => reject(error)
    );
  });
}

/**
 * Dispose of the DRACO loader when no longer needed
 * Call this when unmounting the app or switching contexts
 */
export function disposeDracoLoader(): void {
  if (dracoLoaderInstance) {
    dracoLoaderInstance.dispose();
    dracoLoaderInstance = null;
  }
}

/**
 * Estimated compression ratios for different geometry types
 * These are approximate and depend on mesh complexity
 */
export const DRACO_COMPRESSION_RATIOS = {
  simple: 0.7, // Simple meshes (boxes, spheres) - ~70% size reduction
  moderate: 0.8, // Moderate complexity - ~80% size reduction
  complex: 0.9, // High detail meshes - ~90% size reduction
} as const;

/**
 * Calculate estimated original size from compressed size
 */
export function estimateOriginalSize(compressedBytes: number, complexity: keyof typeof DRACO_COMPRESSION_RATIOS = 'moderate'): number {
  const ratio = DRACO_COMPRESSION_RATIOS[complexity];
  return Math.round(compressedBytes / (1 - ratio));
}
