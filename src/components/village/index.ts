/**
 * Village Components - Optimized for GPU efficiency
 *
 * This module provides instanced rendering for village elements.
 * Use these components instead of the individual mesh-based ones
 * when you need to render multiple instances.
 *
 * Trees are NOT here. Vegetation has a single owner:
 * `components/scenery/InstancedFoliage.tsx`.
 */

export {
  InstancedLamps,
  InstancedBenches,
  InstancedMarketStalls,
  // Shared geometries
  lampPostGeometry,
  lampHousingGeometry,
  benchSeatGeometry,
  // Shared materials
  blackMetalMaterial,
  timberMaterial,
  whiteMaterial,
  smokeMaterial,
} from './InstancedVillageComponents';
