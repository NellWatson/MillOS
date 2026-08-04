/**
 * Normal Map Generator
 *
 * Procedural normal maps for surface detail.
 * Converts height data to tangent-space normals.
 */

import * as THREE from 'three';
import { getTexture, createLinearDataTexture } from '../utils/textureGenerator';

/**
 * Fast deterministic value noise for normal maps.
 *
 * Normal generation was the largest measured main-thread startup cost. The
 * shared texture noise uses a sine hash, which is useful when a texture's
 * authored identity depends on it, but a 512 px normal map called that hash
 * millions of times. Normal maps only need stable, smooth, unbiased relief,
 * so this local integer hash preserves the visual contract without paying for
 * trigonometry in every octave and texel.
 */
const normalHash = (x: number, y: number): number => {
  let value = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 0xffffffff;
};

const fastSmoothNoise = (x: number, y: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = normalHash(ix, iy);
  const n10 = normalHash(ix + 1, iy);
  const n01 = normalHash(ix, iy + 1);
  const n11 = normalHash(ix + 1, iy + 1);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
};

const fastFbmNoise = (x: number, y: number, octaves: number): number => {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let weight = 0;
  for (let octave = 0; octave < octaves; octave++) {
    value += fastSmoothNoise(x * frequency, y * frequency) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / weight;
};

/**
 * Generate normal map from procedural height data.
 * Uses FBM noise for organic surface bumps.
 */
export const generateProceduralNormal = (
  size: number = 256,
  bumpScale: number = 1.0,
  noiseScale: number = 10
): THREE.DataTexture => {
  return getTexture(`procedural-normal-v2-${size}-${bumpScale}-${noiseScale}`, () => {
    const data = new Uint8Array(size * size * 4);

    // First pass: generate height map
    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        const ny = y / size;
        heights[y * size + x] = fastFbmNoise(nx * noiseScale, ny * noiseScale, 4);
      }
    }

    // Second pass: compute normals from height differences
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        // Sample neighboring heights (with wrapping)
        const left = heights[y * size + ((x - 1 + size) % size)];
        const right = heights[y * size + ((x + 1) % size)];
        const up = heights[((y - 1 + size) % size) * size + x];
        const down = heights[((y + 1) % size) * size + x];

        // Compute gradient
        const dx = (right - left) * bumpScale;
        const dy = (down - up) * bumpScale;

        // Normal vector (pointing up with perturbation)
        const nx = -dx;
        const ny = -dy;
        const nz = 1.0;

        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const nnx = nx / len;
        const nny = ny / len;
        const nnz = nz / len;

        // Encode to 0-255 range (normal maps use 128 as zero)
        data[i] = Math.floor((nnx * 0.5 + 0.5) * 255); // R = X
        data[i + 1] = Math.floor((nny * 0.5 + 0.5) * 255); // G = Y
        data[i + 2] = Math.floor((nnz * 0.5 + 0.5) * 255); // B = Z
        data[i + 3] = 255;
      }
    }

    return createLinearDataTexture(data, size, size);
  });
};

/**
 * Generate panel/grid normal map for industrial surfaces.
 * Creates beveled edges between rectangular panels.
 */
export const generatePanelNormal = (
  size: number = 256,
  panelCount: number = 4,
  bevelWidth: number = 0.02
): THREE.DataTexture => {
  return getTexture(`panel-normal-${size}-${panelCount}-${bevelWidth}`, () => {
    const data = new Uint8Array(size * size * 4);
    const panelSize = 1.0 / panelCount;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = x / size;
        const ny = y / size;

        // Position within panel
        const px = (nx % panelSize) / panelSize;
        const py = (ny % panelSize) / panelSize;

        // Default: flat normal (pointing up)
        let normalX = 0;
        let normalY = 0;
        const normalZ = 1;

        // Bevel at edges
        if (px < bevelWidth) {
          normalX = (-(bevelWidth - px) / bevelWidth) * 0.5;
        } else if (px > 1 - bevelWidth) {
          normalX = ((px - (1 - bevelWidth)) / bevelWidth) * 0.5;
        }

        if (py < bevelWidth) {
          normalY = (-(bevelWidth - py) / bevelWidth) * 0.5;
        } else if (py > 1 - bevelWidth) {
          normalY = ((py - (1 - bevelWidth)) / bevelWidth) * 0.5;
        }

        // Normalize
        const len = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);

        data[i] = Math.floor(((normalX / len) * 0.5 + 0.5) * 255);
        data[i + 1] = Math.floor(((normalY / len) * 0.5 + 0.5) * 255);
        data[i + 2] = Math.floor(((normalZ / len) * 0.5 + 0.5) * 255);
        data[i + 3] = 255;
      }
    }

    return createLinearDataTexture(data, size, size);
  });
};

/**
 * Generate a panel/grid normal map with a bevel specified in PIXELS.
 *
 * `generatePanelNormal(256, 8, 0.02)` produces a bevel 0.02 x (1/8) = 0.0025
 * UV wide, which is 0.64 px at 256 - narrower than one texel, so the mipmap
 * chain erases it outright and the map is a no-op. Specifying the bevel in
 * pixels makes that failure impossible to author by accident.
 *
 * Intended normalScale for machines is 0.6-0.9, not 0.06.
 */
export const generateMachinePanelNormal = (
  size: number = 512,
  panelCount: number = 4,
  bevelPixels: number = 6
): THREE.DataTexture => {
  const safeSize = Math.max(8, Math.floor(size));
  const safePanels = Math.max(1, Math.floor(panelCount));
  const panelPx = safeSize / safePanels;
  // Clamp so the bevel can never exceed the panel or fall below the mip floor.
  const bevelPx = Math.max(4, Math.min(panelPx * 0.4, bevelPixels));

  return getTexture(`machine-panel-normal-v2-${safeSize}-${safePanels}-${bevelPx}`, () => {
    const data = new Uint8Array(safeSize * safeSize * 4);

    for (let y = 0; y < safeSize; y++) {
      for (let x = 0; x < safeSize; x++) {
        const i = (y * safeSize + x) * 4;

        const px = x % panelPx;
        const py = y % panelPx;

        let normalX = 0;
        let normalY = 0;
        const normalZ = 1;

        // Smooth (cosine) bevel rather than a linear ramp - a linear ramp
        // shades as a flat chamfer facet, a cosine reads as rolled sheet.
        if (px < bevelPx) {
          normalX = -Math.cos((px / bevelPx) * Math.PI * 0.5) * 0.65;
        } else if (px > panelPx - bevelPx) {
          normalX = Math.cos(((panelPx - px) / bevelPx) * Math.PI * 0.5) * 0.65;
        }

        if (py < bevelPx) {
          normalY = -Math.cos((py / bevelPx) * Math.PI * 0.5) * 0.65;
        } else if (py > panelPx - bevelPx) {
          normalY = Math.cos(((panelPx - py) / bevelPx) * Math.PI * 0.5) * 0.65;
        }

        // Panel-face micro relief so a flat sheet still catches the sun.
        const nx = x / safeSize;
        const ny = y / safeSize;
        normalX += (fastFbmNoise(nx * 90, ny * 90, 2) - 0.5) * 0.08;
        normalY += (fastFbmNoise(nx * 90 + 37, ny * 90 + 71, 2) - 0.5) * 0.08;

        const len = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);

        data[i] = Math.floor(((normalX / len) * 0.5 + 0.5) * 255);
        data[i + 1] = Math.floor(((normalY / len) * 0.5 + 0.5) * 255);
        data[i + 2] = Math.floor(((normalZ / len) * 0.5 + 0.5) * 255);
        data[i + 3] = 255;
      }
    }

    return createLinearDataTexture(data, safeSize, safeSize);
  });
};
