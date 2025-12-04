/**
 * Hooks Barrel Export
 *
 * Central export point for all custom React hooks in the MillOS application.
 * Includes hooks for disposable resources, textures, and keyboard shortcuts.
 */

// === Disposable Resource Hooks ===
export { useDisposable, useDisposableArray } from './useDisposable';

// === Keyboard Shortcuts Hook ===
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

// === Procedural Texture Hooks ===
export {
  useProceduralMetalTexture,
  useWallTexture,
  useWallRoughnessMap,
  useConcreteTexture,
  useConcreteBumpMap,
  useHazardStripeTexture,
} from './useProceduralTextures';
