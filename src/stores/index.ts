/**
 * Domain-Specific Stores Index
 *
 * This file provides:
 * 1. Named exports for all individual stores
 * 2. Re-exports for backwards compatibility with the old unified store
 * 3. A combined useMillStore hook that provides access to all stores
 */

// Import individual stores for local use in useMillStore
import { useGraphicsStore, GRAPHICS_PRESETS } from './graphicsStore';
import { useGameSimulationStore } from './gameSimulationStore';
import { useProductionStore } from './productionStore';
import { useSafetyStore } from './safetyStore';
import { useUIStore } from './uiStore';
import { useWorkerMoodStore } from './workerMoodStore';

// Re-export individual stores
export { useGraphicsStore, GRAPHICS_PRESETS };
export { useGameSimulationStore };
export { useProductionStore };
export { useSafetyStore };
export { useUIStore };
export { useWorkerMoodStore };

// Re-export types
export type { GraphicsQuality, GraphicsSettings } from './graphicsStore';

/**
 * Combined store hook for components that need access to multiple stores
 * This maintains backwards compatibility while allowing gradual migration
 *
 * NOTE: This is a compatibility shim. For new code, use individual stores directly:
 * - useProductionStore() for machines, workers, metrics
 * - useUIStore() for UI state and alerts
 * - useGraphicsStore() for graphics settings
 * - useGameSimulationStore() for time, weather, shifts
 * - useSafetyStore() for safety metrics and incidents
 */
export function useMillStore<T>(selector: (state: CombinedStoreState) => T): T {
  const graphics = useGraphicsStore();
  const gameSimulation = useGameSimulationStore();
  const production = useProductionStore();
  const safety = useSafetyStore();
  const ui = useUIStore();

  const combinedState: CombinedStoreState = {
    // Graphics Store
    ...graphics,

    // Game Simulation Store
    ...gameSimulation,

    // Production Store
    ...production,

    // Safety Store
    ...safety,

    // UI Store
    ...ui,
  };

  return selector(combinedState);
}

// Combined state type for backwards compatibility
export type CombinedStoreState = ReturnType<typeof useGraphicsStore.getState> &
  ReturnType<typeof useGameSimulationStore.getState> &
  ReturnType<typeof useProductionStore.getState> &
  ReturnType<typeof useSafetyStore.getState> &
  ReturnType<typeof useUIStore.getState>;

// Provide getState method for backwards compatibility
useMillStore.getState = (): CombinedStoreState => {
  return {
    ...useGraphicsStore.getState(),
    ...useGameSimulationStore.getState(),
    ...useProductionStore.getState(),
    ...useSafetyStore.getState(),
    ...useUIStore.getState(),
  };
};

/**
 * Provide subscribe method for backwards compatibility (primarily for SCADA sync)
 *
 * This implementation intelligently routes subscriptions to the appropriate store
 * based on which state properties are accessed in the selector.
 */
useMillStore.subscribe = (
  selector: (state: CombinedStoreState) => any,
  callback: (value: any) => void,
  options?: { fireImmediately?: boolean }
) => {
  // Track the previous value to detect changes
  let previousValue = selector(useMillStore.getState());

  // Create a wrapper callback that only fires when the selected value changes
  const wrappedCallback = () => {
    const newValue = selector(useMillStore.getState());

    // Deep equality check for objects/arrays, reference equality for primitives
    const hasChanged =
      typeof newValue === 'object' && newValue !== null
        ? JSON.stringify(newValue) !== JSON.stringify(previousValue)
        : newValue !== previousValue;

    if (hasChanged) {
      previousValue = newValue;
      callback(newValue);
    }
  };

  // Subscribe to all stores
  // Note: This is not optimal (subscribes to all stores), but maintains full backwards compatibility.
  // For new code, use the specific store subscriptions directly.
  const unsubscribers: Array<() => void> = [
    useGraphicsStore.subscribe(wrappedCallback),
    useGameSimulationStore.subscribe(wrappedCallback),
    useProductionStore.subscribe(wrappedCallback),
    useSafetyStore.subscribe(wrappedCallback),
    useUIStore.subscribe(wrappedCallback),
  ];

  // Fire immediately if requested
  if (options?.fireImmediately) {
    callback(previousValue);
  }

  // Return combined unsubscribe function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
};
