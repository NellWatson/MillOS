export const DISTANT_FACTORY_INTERIOR_LOD = {
  hideDistance: 200,
  showDistance: 190,
  sampleEveryFrames: 12,
} as const;

/**
 * Resolve distant factory-detail visibility with a ten-metre hysteresis band.
 * Distances use the factory-centred world X/Z plane because camera height does
 * not affect whether the shell occludes interior process detail.
 */
export function resolveFactoryInteriorDetailVisibility(
  currentlyVisible: boolean,
  cameraX: number,
  cameraZ: number
): boolean {
  const threshold = currentlyVisible
    ? DISTANT_FACTORY_INTERIOR_LOD.hideDistance
    : DISTANT_FACTORY_INTERIOR_LOD.showDistance;

  return cameraX ** 2 + cameraZ ** 2 < threshold ** 2;
}
