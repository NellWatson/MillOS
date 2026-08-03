/**
 * Procedural Texture Generators
 *
 * All textures are generated algorithmically at runtime.
 * No external image files - "agent-built, all the way down."
 */

export { generateBrushedMetal, generateMachineORM, type ScratchDirection } from './brushedMetal';
export { generatePaintedMetal } from './paintedMetal';
export { generateConcrete, generateConcreteRoughness } from './concrete';
export {
  generateGrainPattern,
  generateGrainNormal,
  generateGrainRoughness,
  buildGrainHeightField,
  getFlourSackMaps,
  type GrainColor,
  type GrainMapSet,
} from './grain';
export { generateRustPattern, type StreakDirection } from './rust';
export { generateSafetyStripe, type StripeColors } from './safetyStripe';
export {
  generateProceduralNormal,
  generatePanelNormal,
  generateMachinePanelNormal,
} from './normalGenerator';
export { generateBark, generateBarkNormal, generateBarkRoughness, type BarkType } from './bark';
export {
  generateCobblestone,
  generateCobblestoneNormal,
  generateCobblestoneRoughness,
  type CobblestoneOptions,
} from './cobblestone';
export { generateGrass, generateGrassRoughness, type GrassOptions } from './grass';
export {
  generateTarmac,
  generateTarmacRoughness,
  generateRoadMarkings,
  type TarmacOptions,
} from './tarmac';
