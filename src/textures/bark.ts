/**
 * Tree Bark Texture Generator
 *
 * For tree trunks and branches.
 * Includes vertical striations and natural bark patterns.
 */

import * as THREE from 'three';
import {
  getTexture,
  fbmNoise,
  fbmNoiseSigned,
  hash,
  createColorDataTexture,
  createLinearDataTexture,
} from '../utils/textureGenerator';

export type BarkType = 'oak' | 'birch' | 'pine';

interface BarkColors {
  base: { r: number; g: number; b: number };
  dark: { r: number; g: number; b: number };
  light: { r: number; g: number; b: number };
}

const BARK_PALETTES: Record<BarkType, BarkColors> = {
  oak: {
    base: { r: 0.35, g: 0.25, b: 0.15 },
    dark: { r: 0.2, g: 0.12, b: 0.08 },
    light: { r: 0.45, g: 0.35, b: 0.25 },
  },
  birch: {
    base: { r: 0.85, g: 0.82, b: 0.78 },
    dark: { r: 0.15, g: 0.12, b: 0.1 },
    light: { r: 0.95, g: 0.93, b: 0.9 },
  },
  pine: {
    base: { r: 0.4, g: 0.28, b: 0.18 },
    dark: { r: 0.25, g: 0.15, b: 0.1 },
    light: { r: 0.5, g: 0.38, b: 0.28 },
  },
};

/**
 * Generates tree bark color texture.
 */
export const generateBark = (size: number = 256, barkType: BarkType = 'oak'): THREE.DataTexture => {
  return getTexture(`bark-${size}-${barkType}`, () => {
    const data = new Uint8Array(size * size * 4);
    const colors = BARK_PALETTES[barkType];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = x / size;
        const ny = y / size;

        // Vertical grain pattern (stretched noise)
        const grainX = nx * 8;
        const grainY = ny * 40; // Very tall/narrow for vertical streaks
        const grain = fbmNoise(grainX, grainY, 4);

        // Horizontal cracks (occasional)
        const crackNoise = fbmNoise(nx * 3, ny * 20, 2);
        const hasCrack = crackNoise > 0.7 && Math.abs((ny % 0.1) - 0.05) < 0.01;

        // Large-scale variation
        const largeScale = fbmNoise(nx * 2, ny * 2, 2) * 0.3;

        // Determine color blend
        let blend = grain * 0.5 + 0.5 + largeScale;

        // Birch has dark horizontal marks
        if (barkType === 'birch') {
          const barkMark = fbmNoise(nx * 3, ny * 15, 2);
          if (barkMark > 0.7) {
            blend = -0.5; // Use dark color
          }
        }

        let r: number, g: number, b: number;

        if (hasCrack || blend < 0.3) {
          // Dark crevice
          r = colors.dark.r;
          g = colors.dark.g;
          b = colors.dark.b;
        } else if (blend > 0.7) {
          // Lighter ridge
          r = colors.light.r;
          g = colors.light.g;
          b = colors.light.b;
        } else {
          // Base color with variation
          const t = (blend - 0.3) / 0.4;
          r = colors.base.r + (colors.light.r - colors.base.r) * t * 0.3;
          g = colors.base.g + (colors.light.g - colors.base.g) * t * 0.3;
          b = colors.base.b + (colors.light.b - colors.base.b) * t * 0.3;
        }

        // Add micro detail
        const detail = (hash(x, y) - 0.5) * 0.04;
        // Fine vertical fissure detail so the trunk still has structure when
        // the camera is close (bark is the most-approached surface in the
        // village and the base grain is only 4 octaves).
        const fissure = fbmNoiseSigned(nx * 30, ny * 150, 2) * 0.05;

        data[i] = Math.floor(Math.max(0, Math.min(1, r + detail + fissure)) * 255);
        data[i + 1] = Math.floor(Math.max(0, Math.min(1, g + detail + fissure * 0.9)) * 255);
        data[i + 2] = Math.floor(Math.max(0, Math.min(1, b + detail + fissure * 0.8)) * 255);
        data[i + 3] = 255;
      }
    }

    return createColorDataTexture(data, size, size);
  });
};

/**
 * Generates tree bark normal map.
 *
 * The perturbation is SIGNED. The previous `0.5 + ridge * 0.3` with an
 * unsigned [0,1] ridge never dropped below 0.5, so every ridge was lit as if
 * it faced the same way - the relief cancelled and trunks read as smooth
 * cylinders. Bark fissures run vertically, so X carries the detail.
 */
export const generateBarkNormal = (size: number = 256): THREE.DataTexture => {
  return getTexture(`bark-normal-v2-${size}`, () => {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = x / size;
        const ny = y / size;

        // Vertical ridges (coarse)
        const ridge = fbmNoiseSigned(nx * 15, ny * 60, 3);
        // Second, higher-frequency fissure octave - X only.
        const fissure = fbmNoiseSigned(nx * 45, ny * 180, 2);

        const normalX = 0.5 + ridge * 0.6 + fissure * 0.3;
        const normalY = 0.5 + fbmNoiseSigned(nx * 20, ny * 20, 2) * 0.25;

        data[i] = Math.floor(Math.max(0, Math.min(1, normalX)) * 255);
        data[i + 1] = Math.floor(Math.max(0, Math.min(1, normalY)) * 255);
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }

    return createLinearDataTexture(data, size, size);
  });
};

/**
 * Generates a tree bark roughness map.
 *
 * Keyed off the same vertical `grain` term the colour generator uses, so
 * roughness stays registered with the ridge/crevice pattern: exposed ridges
 * are worn smoother (0.75), crevices hold dust and moss (0.98).
 *
 * Written to R, G and B - three samples `roughnessMap.g`.
 */
export const generateBarkRoughness = (
  size: number = 256,
  barkType: BarkType = 'oak'
): THREE.DataTexture => {
  return getTexture(`bark-roughness-${size}-${barkType}`, () => {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = x / size;
        const ny = y / size;

        // Same grain term as generateBark, so colour and roughness register.
        const grain = fbmNoise(nx * 8, ny * 40, 4);
        const largeScale = fbmNoise(nx * 2, ny * 2, 2) * 0.3;
        const blend = grain * 0.5 + 0.5 + largeScale;

        // blend high = ridge (worn smooth), blend low = crevice (rough).
        const ridgeAmount = Math.max(0, Math.min(1, (blend - 0.3) / 0.5));
        let roughness = 0.98 - ridgeAmount * 0.23;

        // Birch bark is papery and noticeably smoother than oak/pine.
        if (barkType === 'birch') roughness -= 0.12;

        roughness += fbmNoiseSigned(nx * 60, ny * 60, 2) * 0.06;

        const val = Math.floor(Math.max(0.55, Math.min(1, roughness)) * 255);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
    }

    return createLinearDataTexture(data, size, size);
  });
};
