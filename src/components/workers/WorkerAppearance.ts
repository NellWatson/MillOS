/**
 * Compatibility surface for the canonical personnel appearance contract.
 *
 * Older imports referenced this module directly. Keeping the wrapper prevents a
 * parallel appearance implementation from drifting away from the active LOD
 * renderers.
 */

export {
  getWorkerAppearance,
  getPersonnelProfileIds,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
} from './workerTypes';

export type {
  HairStyle,
  ToolType,
  WorkerAppearance as WorkerAppearanceConfig,
  WorkerWorkAction,
} from './workerTypes';
