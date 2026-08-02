/**
 * Spouting route topology.
 *
 * WHY THIS MODULE EXISTS: the pipe curves used to be built inside
 * `SpoutingSystem`'s `useMemo` and thrown away as soon as `TubeGeometry` had
 * consumed them. `GrainFlow` therefore had no idea where the pipes were and
 * dropped its particles down a hardcoded slab of empty air beside them. Both
 * consumers now read the same curves from here:
 *
 *   - `SpoutingSystem` extrudes them into tube geometry (and owns disposal of
 *     that geometry - this module never creates or holds GPU resources).
 *   - `GrainFlow` samples `curve.getPointAt(t)` to keep product inside the bore.
 *
 * The result is cached on the same machine key `SpoutingSystem` already used,
 * so a machine STATUS change (which ticks constantly) does not rebuild curves
 * or thrash `mergeGeometries`.
 */

import * as THREE from 'three';
import { MachineData, MachineType } from '../../types';

/** Outer radius of a spouting run, in world units. */
export const SPOUT_PIPE_RADIUS = 0.17;

export type PipeRouteFamily = 'intake' | 'pneumatic' | 'finished';

export interface SpoutRoute {
  readonly family: PipeRouteFamily;
  readonly curve: THREE.CatmullRomCurve3;
  /** Arc length in world units (cached; `getLength()` re-integrates). */
  readonly length: number;
}

/**
 * Stable identity for a machine layout: ids, positions and sizes only.
 * Deliberately excludes `status` - status changes every simulation tick and
 * would rebuild every curve and merged geometry with it.
 */
export const spoutMachineKey = (machines: readonly MachineData[]): string =>
  machines
    .filter((m) =>
      [
        MachineType.SILO,
        MachineType.ROLLER_MILL,
        MachineType.PLANSIFTER,
        MachineType.PACKER,
      ].includes(m.type)
    )
    .map((m) => `${m.id}:${m.position.join(',')}:${m.size.join(',')}`)
    .join('|');

const createRoute = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  family: PipeRouteFamily
): SpoutRoute => {
  // Rise to a shared service level, run the horizontal leg down the service
  // lane, then drop - i.e. a routed process line, not a point-to-point tube.
  const routeY = Math.min(17, Math.max(start.y, end.y) + 2.4);
  const startRiser = new THREE.Vector3(start.x, routeY, start.z);
  const endDrop = new THREE.Vector3(end.x, routeY, end.z);
  const serviceLaneZ = THREE.MathUtils.lerp(start.z, end.z, 0.5);
  const curve = new THREE.CatmullRomCurve3(
    [
      start,
      startRiser,
      new THREE.Vector3(start.x, routeY, serviceLaneZ),
      new THREE.Vector3(end.x, routeY, serviceLaneZ),
      endDrop,
      end,
    ],
    false,
    'centripetal',
    0.35
  );

  return { family, curve, length: curve.getLength() };
};

// Single-entry cache. Both consumers pass the same machine list on the same
// tick, so a one-slot cache serves them both without holding stale layouts.
let cachedKey: string | null = null;
let cachedRoutes: readonly SpoutRoute[] = [];

/**
 * Build (or return the cached) spouting routes for a machine layout.
 *
 * Pairing mirrors `ProductionFlowVisualization`: mill[i] is fed by
 * silo[i % silos], lifts to sifter[i % sifters]; packer[i] is fed by
 * sifter[i % sifters].
 */
export const buildSpoutRoutes = (machines: readonly MachineData[]): readonly SpoutRoute[] => {
  const key = spoutMachineKey(machines);
  if (key === cachedKey) return cachedRoutes;

  const silos = machines.filter((m) => m.type === MachineType.SILO);
  const mills = machines.filter((m) => m.type === MachineType.ROLLER_MILL);
  const sifters = machines.filter((m) => m.type === MachineType.PLANSIFTER);
  const packers = machines.filter((m) => m.type === MachineType.PACKER);

  const routes: SpoutRoute[] = [];

  // Silos to Mills (gravity intake)
  mills.forEach((mill, i) => {
    const silo = silos[i % silos.length];
    if (!silo) return;
    routes.push(
      createRoute(
        new THREE.Vector3(silo.position[0], 3, silo.position[2]),
        new THREE.Vector3(
          mill.position[0],
          mill.position[1] + mill.size[1] + 1.5,
          mill.position[2]
        ),
        'intake'
      )
    );
  });

  // Mills to Sifters (pneumatic lift)
  mills.forEach((mill, i) => {
    const sifter = sifters[i % sifters.length];
    if (!sifter) return;
    // Deterministic lane offset (a random one made pipes jump on re-render).
    const offsetX = ((i % 3) - 1) * 1.5;
    routes.push(
      createRoute(
        new THREE.Vector3(mill.position[0], mill.position[1] + mill.size[1], mill.position[2]),
        new THREE.Vector3(
          sifter.position[0] + offsetX,
          sifter.position[1] + sifter.size[1] / 2,
          sifter.position[2]
        ),
        'pneumatic'
      )
    );
  });

  // Sifters to Packers (finished product)
  packers.forEach((packer, i) => {
    const sifter = sifters[i % sifters.length];
    if (!sifter) return;
    routes.push(
      createRoute(
        new THREE.Vector3(sifter.position[0], sifter.position[1] - 2, sifter.position[2]),
        new THREE.Vector3(
          packer.position[0],
          packer.position[1] + packer.size[1] + 1,
          packer.position[2]
        ),
        'finished'
      )
    );
  });

  cachedKey = key;
  cachedRoutes = routes;
  return routes;
};
