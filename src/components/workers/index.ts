/**
 * Worker Model Components
 *
 * 3-tier LOD system for worker rendering:
 * - DetailedWorker: ~50 meshes for close-up (< 25 units)
 * - SimplifiedWorker: ~9 meshes for medium distance (25-55 units)
 * - WorkerBillboard: ~3 meshes for distant (55+ units)
 */

export { DetailedWorker } from './DetailedWorker';
export type { DetailedWorkerProps } from './DetailedWorker';

export { SimplifiedWorker } from './SimplifiedWorker';
export type { SimplifiedWorkerProps } from './SimplifiedWorker';

export { WorkerBillboard } from './WorkerBillboard';
export type { WorkerBillboardProps } from './WorkerBillboard';

export type {
  WorkerAppearance,
  WorkerPoseRefs,
  SimplifiedPoseRefs,
  HairStyle,
  ToolType,
} from './workerTypes';

export { getWorkerAppearance, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from './workerTypes';

export {
  TOOL_GEOMETRIES,
  BODY_GEOMETRIES,
  HAIR_GEOMETRIES,
  SIMPLIFIED_GEOMETRIES,
  BILLBOARD_GEOMETRIES,
} from './sharedGeometries';
