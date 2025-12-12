/**
 * PlayerInterpolation - Smooth position interpolation for remote players
 *
 * Uses a buffer-based approach to handle network jitter and provide
 * smooth movement even with variable latency.
 */

import * as THREE from 'three';

// Configuration
const BUFFER_TIME_MS = 100; // Hold positions 100ms in the past
const MAX_BUFFER_SIZE = 20; // Keep last 20 position samples
const EXTRAPOLATION_LIMIT_MS = 200; // Max time to extrapolate if packets late

interface PositionSample {
  position: THREE.Vector3;
  rotation: number;
  velocity: THREE.Vector3;
  timestamp: number;
}

/**
 * Interpolation buffer for a single remote player
 */
export class PlayerInterpolationBuffer {
  private samples: PositionSample[] = [];
  private readonly maxSize = MAX_BUFFER_SIZE;

  /**
   * Add a new position sample from network update
   */
  addSample(
    position: [number, number, number],
    rotation: number,
    velocity: [number, number, number],
    timestamp: number
  ): void {
    const sample: PositionSample = {
      position: new THREE.Vector3(...position),
      rotation,
      velocity: new THREE.Vector3(...velocity),
      timestamp,
    };

    // Insert in timestamp order (usually at end)
    let inserted = false;
    for (let i = this.samples.length - 1; i >= 0; i--) {
      if (this.samples[i].timestamp < timestamp) {
        this.samples.splice(i + 1, 0, sample);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.samples.unshift(sample);
    }

    // Trim old samples
    while (this.samples.length > this.maxSize) {
      this.samples.shift();
    }
  }

  /**
   * Get interpolated position for the current render time
   */
  getInterpolatedState(renderTime: number): {
    position: THREE.Vector3;
    rotation: number;
  } | null {
    if (this.samples.length === 0) {
      return null;
    }

    // We want to render positions from BUFFER_TIME_MS in the past
    const targetTime = renderTime - BUFFER_TIME_MS;

    // Find the two samples to interpolate between
    let before: PositionSample | null = null;
    let after: PositionSample | null = null;

    for (let i = 0; i < this.samples.length; i++) {
      if (this.samples[i].timestamp <= targetTime) {
        before = this.samples[i];
      } else {
        after = this.samples[i];
        break;
      }
    }

    // Case 1: We have samples on both sides - interpolate
    if (before && after) {
      const t = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
      const clampedT = Math.max(0, Math.min(1, t));

      return {
        position: new THREE.Vector3().lerpVectors(before.position, after.position, clampedT),
        rotation: THREE.MathUtils.lerp(before.rotation, after.rotation, clampedT),
      };
    }

    // Case 2: All samples are in the future - use oldest sample
    if (!before && after) {
      return {
        position: after.position.clone(),
        rotation: after.rotation,
      };
    }

    // Case 3: All samples are in the past - extrapolate from latest
    if (before && !after) {
      const timeSinceLast = targetTime - before.timestamp;

      // Only extrapolate for a limited time
      if (timeSinceLast > EXTRAPOLATION_LIMIT_MS) {
        return {
          position: before.position.clone(),
          rotation: before.rotation,
        };
      }

      // Extrapolate based on velocity
      const extrapolatedPosition = before.position
        .clone()
        .addScaledVector(before.velocity, timeSinceLast / 1000);

      return {
        position: extrapolatedPosition,
        rotation: before.rotation,
      };
    }

    // Fallback - shouldn't reach here
    return null;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Get buffer statistics for debugging
   */
  getStats(): { sampleCount: number; oldestMs: number; newestMs: number } {
    if (this.samples.length === 0) {
      return { sampleCount: 0, oldestMs: 0, newestMs: 0 };
    }

    const now = Date.now();
    return {
      sampleCount: this.samples.length,
      oldestMs: now - this.samples[0].timestamp,
      newestMs: now - this.samples[this.samples.length - 1].timestamp,
    };
  }
}

/**
 * Manager for all player interpolation buffers
 */
export class InterpolationManager {
  private buffers: Map<string, PlayerInterpolationBuffer> = new Map();

  /**
   * Get or create buffer for a player
   */
  getBuffer(playerId: string): PlayerInterpolationBuffer {
    let buffer = this.buffers.get(playerId);
    if (!buffer) {
      buffer = new PlayerInterpolationBuffer();
      this.buffers.set(playerId, buffer);
    }
    return buffer;
  }

  /**
   * Remove buffer for a player (on disconnect)
   */
  removeBuffer(playerId: string): void {
    this.buffers.delete(playerId);
  }

  /**
   * Clear all buffers
   */
  clear(): void {
    this.buffers.clear();
  }
}

// Singleton instance
export const interpolationManager = new InterpolationManager();
