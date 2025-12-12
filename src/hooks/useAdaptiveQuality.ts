/**
 * useAdaptiveQuality - React hook for adaptive quality system
 *
 * Integrates adaptive quality management with React Three Fiber's useFrame.
 * Automatically monitors FPS and adjusts quality settings.
 *
 * Usage:
 *   function Scene() {
 *     useAdaptiveQuality(); // Add to any component inside Canvas
 *     return <mesh>...</mesh>;
 *   }
 */

import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { adaptiveQualityManager } from '../utils/adaptiveQuality';
import { useGraphicsStore } from '../stores/graphicsStore';

/**
 * Hook that monitors FPS and automatically adjusts quality
 * Place this in a component that's always rendered inside the Canvas
 */
export function useAdaptiveQuality(enabled: boolean = true): void {
  // Initialize on mount
  useEffect(() => {
    if (enabled) {
      adaptiveQualityManager.initialize();
      adaptiveQualityManager.setEnabled(true);
    }

    return () => {
      adaptiveQualityManager.setEnabled(false);
    };
  }, [enabled]);

  // Update every frame
  useFrame((_, delta) => {
    if (enabled) {
      adaptiveQualityManager.update(delta);
    }
  });
}

/**
 * Hook to get current adaptive quality stats (for debug display)
 */
export function useAdaptiveQualityStats() {
  const quality = useGraphicsStore((state) => state.graphics.quality);

  // Note: This doesn't cause re-renders on FPS changes (intentionally)
  // Use getStats() in a useFrame or interval if you need live updates
  return {
    quality,
    getStats: () => adaptiveQualityManager.getStats(),
    isEnabled: () => adaptiveQualityManager.isEnabled(),
  };
}

/**
 * Configure adaptive quality thresholds
 */
export function configureAdaptiveQuality(config: {
  targetFps?: number;
  downgradeThreshold?: number;
  upgradeThreshold?: number;
  cooldownMs?: number;
  minQuality?: 'low' | 'medium' | 'high' | 'ultra';
  maxQuality?: 'low' | 'medium' | 'high' | 'ultra';
}): void {
  adaptiveQualityManager.configure(config);
}
