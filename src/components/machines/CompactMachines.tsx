import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MachineData, MachineType } from '../../types';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useProductionStore } from '../../stores/productionStore';
import { useMaterialFlowStore } from '../../stores/materialFlowStore';
import { getMachineStatusColor } from '../../utils/statusColors';
import { useShallow } from 'zustand/react/shallow';
import { getMachineOperationalState } from '../../simulation/machineMotion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { isPostProcessingActive, useGraphicsStore } from '../../stores/graphicsStore';
import {
  MACHINE_MATERIALS as MATERIALS,
  machineInstanceTint,
  setMachineScreenGlow,
} from './machineSurfaces';
import {
  MACHINE_DECAL_GEOMETRY,
  MACHINE_DECAL_MATERIAL,
  planMachineDecals,
  writeDecalUvRects,
} from './machineDecals';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const ROUNDED_BOX = new RoundedBoxGeometry(1, 1, 1, 3, 0.08);
/**
 * Thin plates, panels and plinths.
 *
 * `ROUNDED_BOX`'s 0.08 fillet is a UNIT radius, so the non-uniform instance
 * scale stretches it with the part: on the mill panel ([3.5, 0.46, 0.12]) it
 * becomes 0.28 m across X and 0.0096 m across Z, a 29x anisotropy that reads as
 * a soft lozenge on one axis and a hard card on the other. That mismatch is
 * most of the "toy blocks" silhouette. Every plate-shaped part uses this 0.02
 * radius instead, which lands between 0.002 and 0.16 m - a plausible pressed
 * edge at every scale it is used at. `ROUNDED_BOX` is now down to the packer's
 * fill head and its sacks, which are small and near-cubic enough that the soft
 * fillet is right for both; the three machine bodies that used to share it are
 * designed housings, further down.
 */
const THIN_PLATE = new RoundedBoxGeometry(1, 1, 1, 1, 0.02);
const SILO_BODY = new THREE.CylinderGeometry(1, 1, 1, 16);

/**
 * Corrugated shell for the silo drums.
 *
 * The drums are the tallest things in the mill - a unit geometry scaled to
 * [2.25, 12.5, 2.25] - so a 16-sided smooth tube reads as a plastic pipe and
 * shows its facets along the silhouette at any approach distance. Bolted grain
 * bins are horizontally corrugated, and that banding is most of what makes them
 * legible as storage rather than pipework.
 *
 * The profile is a lathe whose radius never exceeds 1.0, so the separately
 * instanced stiffener rings (`SILO_RING`, radius 1.03) still stand proud of the
 * wall instead of being swallowed by a ridge. Ridge depth is in unit space, so
 * the runtime scale turns 0.012 into a ~27 mm corrugation on a 4.5 m drum.
 *
 * Cost is one shared geometry across every silo instance, so this trades a
 * one-off ~5.4k vertices for the whole bank rather than per drum. The grain
 * column keeps the cheap `SILO_BODY` cylinder: it is fully enclosed by this
 * shell, so its silhouette is never seen.
 */
function createSiloShellGeometry(): THREE.LatheGeometry {
  const RIDGES = 40;
  const STEPS_PER_RIDGE = 4;
  const RIDGE_DEPTH = 0.012;
  const RADIAL_SEGMENTS = 32;

  // Bottom cap centre, then the wall bottom-to-top, then the top cap centre.
  // The wall's first and last samples already sit at radius 1, so no cap-edge
  // point is repeated and the lathe stays free of degenerate rings.
  const profile: THREE.Vector2[] = [new THREE.Vector2(0, -0.5)];
  const steps = RIDGES * STEPS_PER_RIDGE;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const radius = 1 - (RIDGE_DEPTH * (1 - Math.cos(2 * Math.PI * RIDGES * t))) / 2;
    profile.push(new THREE.Vector2(radius, -0.5 + t));
  }
  profile.push(new THREE.Vector2(0, 0.5));

  return new THREE.LatheGeometry(profile, RADIAL_SEGMENTS);
}

const SILO_SHELL = createSiloShellGeometry();

/**
 * Picking proxy for the corrugated shell.
 *
 * The silo instances carry hover handlers, so R3F raycasts them on every
 * pointer move. `SILO_SHELL` is 10,368 triangles where the smooth drum was 64,
 * and measured against the real instance transforms that took a
 * cursor-over-a-silo raycast from 43 us to 6.6 ms - 40% of a 60 fps frame
 * budget, on targets that fill much of the screen.
 *
 * The corrugation is only 1.2% of the radius, so picking against the smooth
 * unit envelope (`SILO_BODY`, the same geometry the grain column uses) is
 * indistinguishable to a user and ~150x cheaper. Swapping the geometry for the
 * duration of the call keeps one draw call and needs no second set of instance
 * matrices.
 */
function raycastSiloShell(
  this: THREE.InstancedMesh,
  raycaster: THREE.Raycaster,
  intersects: THREE.Intersection[]
) {
  const rendered = this.geometry;
  this.geometry = SILO_BODY;
  try {
    THREE.InstancedMesh.prototype.raycast.call(this, raycaster, intersects);
  } finally {
    this.geometry = rendered;
  }
}

/**
 * Bin roof for the silo drums.
 *
 * The roof is instanced at [2.35, 1.65, 2.35] - 4.7 m across - and the previous
 * `ConeGeometry(1, 1, 16)` was a bare 16-sided spike sitting on the 32-sided
 * corrugated shell: too steep to read as a bin, and faceted on a silhouette
 * that is visible from anywhere on the site. A real bin roof has three features
 * that carry at distance, and all three are in this profile: a rolled eave lip
 * at the rim, a shallower pitch, and a fill collar at the peak.
 *
 * The envelope is deliberately identical to the cone it replaces - radius 1.0
 * at the base, y in [-0.5, 0.5] - so the roof keeps overhanging the 2.25 m
 * shell by exactly the same 0.1 m and no instance matrix needs retuning.
 *
 * Segment count matches the shell's 32 so the eave and the drum wall share
 * facet boundaries instead of beating against each other.
 *
 * Radial rib seams were built and previewed too (scripts/blender/
 * machine_part_preview.py, `ribbed` variant) and rejected on the evidence:
 * at the real viewing distance they were indistinguishable from this profile
 * for double the vertices.
 */
function createSiloRoofGeometry(): THREE.LatheGeometry {
  const profile = [
    new THREE.Vector2(0.0, -0.5), // underside cap centre
    new THREE.Vector2(1.0, -0.5), // eave rim - envelope max radius
    new THREE.Vector2(0.985, -0.425), // rolled drip lip
    new THREE.Vector2(0.115, 0.33), // slope up to the collar
    new THREE.Vector2(0.105, 0.395), // collar shoulder
    new THREE.Vector2(0.105, 0.5), // collar top - envelope max y
    new THREE.Vector2(0.0, 0.5),
  ];
  return new THREE.LatheGeometry(profile, 32);
}

const SILO_ROOF = createSiloRoofGeometry();

/**
 * Segment counts below are set from the diameter each part is actually
 * instanced at, not from a uniform default. Every one of these is a single
 * shared geometry drawn across the whole machine bank, so the added vertices
 * are a one-off scene cost (measured: 629 -> 1385 across every part here,
 * +756 for the entire machine bank at any instance count) rather than a
 * per-instance one, and none of these meshes carries pointer handlers - the
 * four `InteractiveInstances` use `SILO_SHELL` and the three machine housings
 * below - so none of them needs a picking proxy the way those do.
 */
const SILO_OUTLET = new THREE.CylinderGeometry(0.42, 1, 1, 24); // 4.1 m across
const SILO_RING = new THREE.CylinderGeometry(1.03, 1.03, 0.08, 32); // matches shell
const HOPPER = new THREE.CylinderGeometry(0.45, 1, 1, 24); // 3.7 m across
const ROLLER = new THREE.CylinderGeometry(1, 1, 1, 20);
const INLET = new THREE.CylinderGeometry(1, 1, 1, 20);
const BEACON = new THREE.SphereGeometry(1, 12, 8);
/**
 * Instanced at [0.78, 0.52, 0.09]: an ellipse pressed flat against the mill
 * body, so the ring OUTLINE is what reads and the tube is nearly invisible.
 * The segments go to `tubularSegments` accordingly. Raising `radialSegments`
 * from 6 to 8 rounds the tube to its true circular section, which grows the
 * part by 1.2 mm on the squashed Z axis - the axis buried in the body panel.
 */
const FAN_GRILLE = new THREE.TorusGeometry(1, 0.1, 8, 32);

// ===========================================================================
// MACHINE HOUSINGS
// ===========================================================================

/** `[sx, sz, y]`: the half-extents 0.5 scaled independently per axis. */
type HousingProfilePoint = readonly [number, number, number];

/**
 * Plan fillet, in UNIT space, shared by all three housings.
 *
 * `ROUNDED_BOX`'s 0.08 became a 0.38 m radius on the mill and read as a soft
 * plastic block; 0.032 lands between 0.11 and 0.21 m across the three bodies -
 * a folded-plate edge rather than a moulding. Two arc segments is deliberate:
 * the normals are analytic, so the fillet SHADES as a continuous sweep while
 * the silhouette stays a crisp two-facet chamfer. Rendered against 0.045 over
 * three segments (scripts/blender/specs/machine-bodies.json,
 * `mill_body_softcorner`) and chosen on the frames.
 *
 * It must also stay small: the `electricalWarning` placard on the mill reaches
 * unit |x| 0.477 and the flat face only runs to 0.5 - corner. At 0.08 that
 * placard's outer edge hung 106 mm off the curve; at 0.032 it is 20 mm.
 */
const MACHINE_HOUSING_CORNER = 0.032;
const MACHINE_HOUSING_ARC = 2;

/**
 * One ring of the housing loft: a rounded rectangle in XZ with its exact
 * outward normals.
 *
 * The corner arcs run BETWEEN the flats, so the arc end points are the tangent
 * points and no flat needs points of its own. That is what lets a single ring
 * carry a dead-flat wall and a smoothly swept fillet at once: the analytic
 * normal at an arc end is already the adjacent flat's normal, so there is no
 * seam to hide and no averaging to bow the flat.
 */
function machineHousingRing(
  halfX: number,
  halfZ: number,
  corner: number,
  arc: number
): { readonly points: number[]; readonly normals: number[] } {
  const radius = Math.min(corner, halfX * 0.98, halfZ * 0.98);
  const insetX = halfX - radius;
  const insetZ = halfZ - radius;
  const centres = [
    [insetX, insetZ],
    [-insetX, insetZ],
    [-insetX, -insetZ],
    [insetX, -insetZ],
  ] as const;
  const points: number[] = [];
  const normals: number[] = [];
  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    const [centreX, centreZ] = centres[quadrant];
    for (let step = 0; step <= arc; step += 1) {
      const angle = (quadrant * Math.PI) / 2 + ((Math.PI / 2) * step) / arc;
      const normalX = Math.cos(angle);
      const normalZ = Math.sin(angle);
      points.push(centreX + radius * normalX, centreZ + radius * normalZ);
      normals.push(normalX, normalZ);
    }
  }
  return { points, normals };
}

/**
 * Moulded cast housing for a box machine: a rounded rectangle lofted up a
 * designed vertical profile.
 *
 * The mill, sifter and packer bodies were one `RoundedBoxGeometry(1,1,1,3,0.08)`
 * shared between them - a 0.38 m fillet on a 4.8 m block, which reads as a
 * rounded plastic crate from anywhere on the site. They are also the four
 * objects a user clicks, so they are the machines whose shape has to carry.
 *
 * A LATHE cannot replace them, and that is the whole design constraint here.
 * Every panel, recess, screen, accent strip and placard on these machines is a
 * flat quad glued to a flat face at a hand-tuned world Z, and three of those
 * placards are positioned in `machineDecals.ts`. Revolving the mill body moves
 * its front face back by 0.63 m at the ends of the 3.5 m control strip and
 * leaves every one of those quads hanging in the air.
 *
 * A loft can. `sx` and `sz` scale the half-extents INDEPENDENTLY, so the front
 * face stays pinned at sz = 1.0 across the whole band where the trim lives
 * while the side walls batter, step and chamfer freely. Every profile in this
 * file was designed and previewed that way
 * (scripts/blender/machine_body_preview.py, spec `specs/machine-bodies.json`).
 *
 * ENVELOPE. Unit half-extents are exactly 0.5 on all three axes - the same as
 * the `RoundedBoxGeometry` replaced - so no instance matrix moves. Every
 * profile therefore has to reach sx = 1.0 somewhere, sz = 1.0 somewhere, and
 * span y -0.5 to 0.5. Nothing in the repo pins this the way
 * `machinePartGeometry.test.ts` pins the silo parts: that test's expectation
 * table is keyed on `MACHINE_PART_GEOMETRY`, so adding these three would make
 * the table's type incomplete in a file this change may not edit. Treat the
 * 0.5 / 0.5 / 0.5 contract stated here as the pin.
 *
 * COST. 192-264 triangles each against the rounded box's 588, and 208-286
 * vertices against its 1764 - the box spent most of its budget subdividing
 * flat faces that needed two triangles. Three shared module-level geometries
 * across the whole machine bank, so this is a one-off scene cost at any
 * instance count.
 *
 * NORMALS are written analytically rather than left to `computeVertexNormals`.
 * `machineSurfaces.ts` injects an edge-wear term, `pow(1 - abs(dot(viewDir,
 * normal)), 4)`, that paints bare metal along silhouette edges - the shading
 * normal is a visible surface feature on these materials, not just lighting.
 * Averaged normals would bow every flat wall and band that term across the
 * corner facets. Vertices are not shared between courses either: every
 * transition in a profile is a deliberate crease.
 *
 * UVs put one unit of u on each of the four faces and run v from 0 at the base
 * to 1 at the top, which is what `BoxGeometry` does - so the existing
 * `band(HOUSING_ORM, ...)` and `band(PANEL_NORMAL, ...)` tuning still lands one
 * panel grid per face. The u distribution is measured ONCE off the widest ring
 * and reused on every course; measuring per ring would shear the panel grid
 * across each battered section, because a narrower ring has a shorter
 * perimeter and the same vertical corner would land at a different u.
 */
function createMachineHousingGeometry(
  profile: readonly HousingProfilePoint[],
  corner = MACHINE_HOUSING_CORNER,
  arc = MACHINE_HOUSING_ARC
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let widest = profile[0];
  for (const point of profile) {
    if (point[0] * point[1] > widest[0] * widest[1]) widest = point;
  }
  const reference = machineHousingRing(0.5 * widest[0], 0.5 * widest[1], corner, arc);
  const ringCount = reference.points.length / 2;
  const along = [0];
  for (let index = 0; index < ringCount; index += 1) {
    const next = (index + 1) % ringCount;
    along.push(
      along[index] +
        Math.hypot(
          reference.points[next * 2] - reference.points[index * 2],
          reference.points[next * 2 + 1] - reference.points[index * 2 + 1]
        )
    );
  }
  const perimeter = along[ringCount];
  const u = along.map((length) => (4 * length) / perimeter);

  for (let course = 0; course < profile.length - 1; course += 1) {
    const [lowerX, lowerZ, lowerY] = profile[course];
    const [upperX, upperZ, upperY] = profile[course + 1];
    const lower = machineHousingRing(0.5 * lowerX, 0.5 * lowerZ, corner, arc);
    const upper = machineHousingRing(0.5 * upperX, 0.5 * upperZ, corner, arc);
    const base = positions.length / 3;
    for (let step = 0; step <= ringCount; step += 1) {
      // The last sample repeats the first position so u can reach 4 and wrap
      // without a texture seam mid-face.
      const ring = step % ringCount;
      const ax = lower.points[ring * 2];
      const az = lower.points[ring * 2 + 1];
      const bx = upper.points[ring * 2];
      const bz = upper.points[ring * 2 + 1];
      // Profile tangent crossed into the ring tangent is the surface normal.
      //
      // The ring tangent comes from the ANALYTIC plan normal, not from a
      // difference of neighbouring ring points: on a flat face the previous
      // sample is round a corner arc and the next is the far end of the flat,
      // so a central difference is not parallel to the flat and tilts the
      // wall's normal by half a degree. Under a fourth-power fresnel that is a
      // faint barrel gradient down a 4.8 m panel. Perpendicular to the plan
      // normal is exact on flats and on arcs alike.
      const tangentX = bx - ax;
      const tangentY = upperY - lowerY;
      const tangentZ = bz - az;
      const ringX = -lower.normals[ring * 2 + 1];
      const ringZ = lower.normals[ring * 2];
      let normalX = tangentY * ringZ;
      let normalY = tangentZ * ringX - tangentX * ringZ;
      let normalZ = -tangentY * ringX;
      const length = Math.hypot(normalX, normalY, normalZ);
      if (length < 1e-9) {
        // A course of zero height: fall back to the ring's own plan normal.
        normalX = lower.normals[ring * 2];
        normalY = 0;
        normalZ = lower.normals[ring * 2 + 1];
      } else {
        normalX /= length;
        normalY /= length;
        normalZ /= length;
        if (normalX * lower.normals[ring * 2] + normalZ * lower.normals[ring * 2 + 1] < 0) {
          normalX = -normalX;
          normalY = -normalY;
          normalZ = -normalZ;
        }
      }
      positions.push(ax, lowerY, az, bx, upperY, bz);
      normals.push(normalX, normalY, normalZ, normalX, normalY, normalZ);
      uvs.push(u[step], lowerY + 0.5, u[step], upperY + 0.5);
    }
    for (let step = 0; step < ringCount; step += 1) {
      // lower[j], upper[j], upper[j+1], lower[j+1] - the winding that puts the
      // face normal on the same side as the analytic vertex normals above.
      const quad = base + step * 2;
      indices.push(quad, quad + 1, quad + 3, quad, quad + 3, quad + 2);
    }
  }

  // Caps. Never seen - a base plate swallows the bottom of every one of these
  // and a hopper cone sits on the top - but an open shell reads as a hole the
  // moment the camera clips inside a machine.
  for (const [sample, sign] of [
    [profile[0], -1],
    [profile[profile.length - 1], 1],
  ] as const) {
    const [scaleX, scaleZ, y] = sample;
    const ring = machineHousingRing(0.5 * scaleX, 0.5 * scaleZ, corner, arc);
    const centre = positions.length / 3;
    positions.push(0, y, 0);
    normals.push(0, sign, 0);
    uvs.push(0.5, 0.5);
    for (let step = 0; step < ringCount; step += 1) {
      positions.push(ring.points[step * 2], y, ring.points[step * 2 + 1]);
      normals.push(0, sign, 0);
      uvs.push(ring.points[step * 2] + 0.5, ring.points[step * 2 + 1] + 0.5);
    }
    for (let step = 0; step < ringCount; step += 1) {
      const first = centre + 1 + step;
      const second = centre + 1 + ((step + 1) % ringCount);
      if (sign < 0) indices.push(centre, first, second);
      else indices.push(centre, second, first);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Roller mill housing, drawn at [4.8, 4.7, 3.8] - 4.8 m across, 4.7 m tall.
 *
 * A roller mill is a heavy roll chamber with a lighter feed section bolted on
 * top, and that two-part mass is the silhouette worth having: a splayed foot
 * where the casing meets its plinth, a parallel full-section roll chamber, a
 * bolted split line at 62% height, then a battered feeder deck narrowing 0.5 m
 * per side into a chamfered top deck. The deck bevel is the highest-value
 * feature of the three - the site camera looks DOWN on the machine floor, and a
 * square top edge is most of what made these read as cardboard.
 *
 * sz is pinned at 1.0 from the plinth to y 0.462 because the whole front face
 * is occupied: the control strip, the inspection recess, the HMI screen, the
 * accent bar and the `electricalWarning` placard from `machineDecals.ts` all
 * sit against z = 1.9 m. The batter is spent on x, where only the vent bank and
 * the drive motor touch the wall and both sit below the split line.
 *
 * An entasis belly was designed, rendered and rejected: at 20 m it is
 * indistinguishable from a straight wall and it costs an extra profile course.
 * The study is `mill_body_straight` against `mill_body_belly` in
 * scripts/blender/specs/machine-bodies.json - the belly holds the same unit
 * envelope, so the two frames differ on silhouette alone. It also loses
 * something: swelling to the envelope mid-wall means the wall no longer
 * arrives at the split line at full section, and the ledge shallows out.
 */
const MILL_HOUSING_PROFILE: readonly HousingProfilePoint[] = [
  [0.9, 0.9, -0.5], // foot underside, buried in the 5.2 x 4.4 m base plate
  [0.945, 0.945, -0.44], // top of the base plate: the casing becomes visible
  [1.0, 1.0, -0.398], // splayed foot lands on the full roll-chamber section
  [1.0, 1.0, 0.2], // roll chamber, parallel and at full envelope
  [0.962, 1.0, 0.228], // split line: the feeder deck bolts on inset
  [0.918, 1.0, 0.345], // battered feeder deck
  [0.88, 1.0, 0.462], // deck top, clear of the accent bar (which ends at 0.460)
  [0.792, 0.944, 0.5], // chamfered top deck; the hopper flange seats on it
];

/**
 * Plansifter casing, drawn at [6.5, 3.35, 5.65] - 6.5 m across, 3.35 m tall.
 *
 * A plansifter is a stack of sieve frames clamped together and hung from canes,
 * not a cast box, so this profile is built as four frame courses stepping
 * inward above each of the four tray flanges. The trays already stand 0.15 m
 * proud of the casing, so each step turns a tray into a read flange with a
 * shadow line under it - the banding does the work the smooth block could not.
 *
 * The underframe chamfers in below the lowest course: the casing is suspended
 * and deliberately does not touch its platform, and a tucked base says that
 * where a flat-bottomed box said the opposite.
 *
 * The hood lands on 0.8615 x 0.8496, which is exactly the 5.6 x 4.8 m lid
 * instanced above it - the lid now sits flush on the casing instead of floating
 * as a smaller plate on a bigger box.
 *
 * sz is pinned at 1.0 to y 0.400: the service panel, HMI screen, accent bar and
 * the `hazardChevron` band from `machineDecals.ts` are all on the front face.
 * All four keep the clearances they had, so this reshape needed no trim moved.
 */
const SIFTER_HOUSING_PROFILE: readonly HousingProfilePoint[] = [
  [0.88, 0.88, -0.5], // underframe base - the casing hangs clear of its deck
  [0.958, 0.958, -0.44], // underframe chamfer top
  [1.0, 1.0, -0.405], // course 1; the hazard band starts at -0.403
  [1.0, 1.0, -0.33],
  [0.984, 1.0, -0.31], // step above tray 1
  [0.984, 1.0, -0.095],
  [0.966, 1.0, -0.075], // step above tray 2
  [0.966, 1.0, 0.15],
  [0.946, 1.0, 0.17], // step above tray 3
  [0.946, 1.0, 0.4], // course 4, up to the hood
  [0.8615, 0.8496, 0.5], // hood, landing exactly on the 5.6 x 4.8 m lid
];

/**
 * Bagging cabinet, drawn at [3.7, 4.75, 3.45] - 3.7 m across, 4.75 m tall.
 *
 * A bagger is a weigh cabinet oversailing an open frame, with the sack hanging
 * in the bay underneath. This profile builds that: a splayed foot, a support
 * frame drawn in 0.19 m per side and 0.27 m front and back, a steep lip where
 * the cabinet oversails it, then the full instrument face, a split line and a
 * chamfered hood.
 *
 * The bay is not decoration - the fill head, the two bag guides, the guards and
 * the sack are already instanced in front of it, and they now stand in a recess
 * instead of against a flat wall. Round 2 set the front back but kept the
 * section nearly full width and it read as a second box stacked under the
 * first; narrowing both axes is what made it read as a frame.
 *
 * Its lower section was free to move because every placard on this body sits
 * HIGH, not because there are none: `namePlate` and `lockoutRoundel` from
 * `machineDecals.ts` bottom out at unit y -0.042, clear above the oversail lip
 * at -0.095, and the `hazardChevron` is glued to the base plate rather than to
 * the casing. So nothing below -0.095 is spoken for - which is not true of the
 * mill or the sifter. Above the lip, sz is pinned at 1.0 to y 0.470 for the
 * control panel, the screen and the accent bar.
 */
const PACKER_HOUSING_PROFILE: readonly HousingProfilePoint[] = [
  [0.88, 0.86, -0.5], // foot underside, buried in the 4.5 x 4.25 m base plate
  [0.925, 0.885, -0.44], // top of the base plate: splayed foot
  [0.9, 0.845, -0.395], // support frame - the sack bay
  [0.9, 0.845, -0.15],
  [1.0, 1.0, -0.095], // the cabinet oversails the frame on a steep lip
  [1.0, 1.0, 0.3], // instrument face, full envelope
  [0.976, 1.0, 0.332], // split line under the hood
  [0.93, 1.0, 0.47], // battered hood
  // Chamfered top deck. Unlike the mill's, this deck is narrower than the cone
  // that lands on it: `packerHopper` is 1.7 m in radius against a 1.55 m
  // half-width here, so the flange oversails the deck by up to 0.12 m in x.
  // That reads as a hopper skirt, which is what it would be - but it is an
  // overhang, not a seat, and shrinking the chamfer is what would remove it.
  [0.836, 0.95, 0.5],
];

const MILL_BODY = createMachineHousingGeometry(MILL_HOUSING_PROFILE);
const SIFTER_BODY = createMachineHousingGeometry(SIFTER_HOUSING_PROFILE);
const PACKER_BODY = createMachineHousingGeometry(PACKER_HOUSING_PROFILE);

/**
 * Picking proxy for the three housings, same trick as `raycastSiloShell`.
 *
 * These are the meshes a user clicks, so R3F raycasts them on every pointer
 * move, against 3 to 4 instances each. The housings hold the same unit envelope
 * as the rounded box they replace, so `UNIT_BOX` - 12 triangles - is that
 * envelope exactly: hit testing against it is 16 to 22 times cheaper than
 * against the drawn geometry, and roughly 49 times cheaper than the 588-triangle
 * rounded box was testing against ITSELF before this change. The only
 * difference a user could ever notice is a hit registering inside a corner
 * chamfer, at most 0.11 m of a 3.7 m machine.
 */
function raycastMachineHousing(
  this: THREE.InstancedMesh,
  raycaster: THREE.Raycaster,
  intersects: THREE.Intersection[]
) {
  const rendered = this.geometry;
  this.geometry = UNIT_BOX;
  try {
    THREE.InstancedMesh.prototype.raycast.call(this, raycaster, intersects);
  } finally {
    this.geometry = rendered;
  }
}

/**
 * The shared machine part geometry, exposed so the unit-envelope contract can
 * be asserted against the geometry the app actually draws.
 *
 * Each of these is instanced with a hand-tuned non-uniform scale and sits
 * against its neighbours - the stiffener rings standing proud of the shell at
 * radius 1.03, the roof eave overhanging it by 0.1 m. Reshaping a part is only
 * safe while its unit half-extents stay put, so that is what the test pins.
 * Previews and design work live in scripts/blender/machine_part_preview.py.
 */
export const MACHINE_PART_GEOMETRY = {
  siloShell: SILO_SHELL,
  siloRoof: SILO_ROOF,
  siloOutlet: SILO_OUTLET,
  siloRing: SILO_RING,
  hopper: HOPPER,
  roller: ROLLER,
  inlet: INLET,
  beacon: BEACON,
  fanGrille: FAN_GRILLE,
} as const;
const STATUS_COLOUR = new THREE.Color();
const STARVED_COLOUR = new THREE.Color('#d9a441');
const BLOCKED_COLOUR = new THREE.Color('#d86735');

/** Scratch colour for per-instance tinting. Never allocate inside a layout pass. */
const INSTANCE_TINT = new THREE.Color();

type MachineSubset = {
  readonly silos: MachineData[];
  readonly mills: MachineData[];
  readonly sifters: MachineData[];
  readonly packers: MachineData[];
};

const setInstanceMatrix = (
  mesh: THREE.InstancedMesh | null,
  index: number,
  object: THREE.Object3D,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0]
) => {
  if (!mesh) return;
  object.position.set(...position);
  object.scale.set(...scale);
  object.rotation.set(...rotation);
  object.updateMatrix();
  mesh.setMatrixAt(index, object.matrix);
};

const finishMatrixUpdate = (mesh: THREE.InstancedMesh | null, bounds = false) => {
  if (!mesh) return;
  mesh.instanceMatrix.needsUpdate = true;
  if (bounds) mesh.computeBoundingSphere();
};

function InteractiveInstances({
  meshRef,
  geometry,
  material,
  count,
  machines,
  onSelect,
  castShadow = true,
  receiveShadow = true,
  raycast,
}: {
  readonly meshRef: React.RefObject<THREE.InstancedMesh | null>;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly count: number;
  readonly machines: readonly MachineData[];
  readonly onSelect: (machine: MachineData) => void;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  /** Cheaper stand-in for hit testing when the drawn geometry is dense. */
  readonly raycast?: THREE.Object3D['raycast'];
}) {
  const selectInstance = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      const machine = event.instanceId === undefined ? undefined : machines[event.instanceId];
      if (machine) onSelect(machine);
    },
    [machines, onSelect]
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      {...(raycast ? { raycast } : {})}
      onPointerDown={selectInstance}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    />
  );
}

function CompactMachineSet({
  machines,
  onSelect,
}: {
  readonly machines: readonly MachineData[];
  readonly onSelect: (machine: MachineData) => void;
}) {
  const subsets = useMemo<MachineSubset>(() => {
    const result: MachineSubset = { silos: [], mills: [], sifters: [], packers: [] };
    machines.forEach((machine) => {
      switch (machine.type) {
        case MachineType.SILO:
          result.silos.push(machine);
          break;
        case MachineType.ROLLER_MILL:
          result.mills.push(machine);
          break;
        case MachineType.PLANSIFTER:
          result.sifters.push(machine);
          break;
        case MachineType.PACKER:
          result.packers.push(machine);
          break;
      }
    });
    return result;
  }, [machines]);

  const siloBodyRef = useRef<THREE.InstancedMesh>(null);
  const siloRoofRef = useRef<THREE.InstancedMesh>(null);
  const siloLegRef = useRef<THREE.InstancedMesh>(null);
  const siloFillRef = useRef<THREE.InstancedMesh>(null);
  const siloOutletRef = useRef<THREE.InstancedMesh>(null);
  const siloRingRef = useRef<THREE.InstancedMesh>(null);
  const siloLadderRailRef = useRef<THREE.InstancedMesh>(null);
  const siloLadderRungRef = useRef<THREE.InstancedMesh>(null);
  const siloHatchRef = useRef<THREE.InstancedMesh>(null);
  const millBodyRef = useRef<THREE.InstancedMesh>(null);
  const millHopperRef = useRef<THREE.InstancedMesh>(null);
  const millRollerRef = useRef<THREE.InstancedMesh>(null);
  const millBaseRef = useRef<THREE.InstancedMesh>(null);
  const millPanelRef = useRef<THREE.InstancedMesh>(null);
  const millRecessRef = useRef<THREE.InstancedMesh>(null);
  const millMotorRef = useRef<THREE.InstancedMesh>(null);
  const millFanRef = useRef<THREE.InstancedMesh>(null);
  const millScreenRef = useRef<THREE.InstancedMesh>(null);
  const millVentRef = useRef<THREE.InstancedMesh>(null);
  const millAccentRef = useRef<THREE.InstancedMesh>(null);
  const sifterBodyRef = useRef<THREE.InstancedMesh>(null);
  const sifterTrayRef = useRef<THREE.InstancedMesh>(null);
  const sifterPlatformRef = useRef<THREE.InstancedMesh>(null);
  const sifterCapRef = useRef<THREE.InstancedMesh>(null);
  const sifterInletRef = useRef<THREE.InstancedMesh>(null);
  const sifterDriveRef = useRef<THREE.InstancedMesh>(null);
  const sifterSuspensionRef = useRef<THREE.InstancedMesh>(null);
  const sifterScreenRef = useRef<THREE.InstancedMesh>(null);
  const sifterServicePanelRef = useRef<THREE.InstancedMesh>(null);
  const sifterAccentRef = useRef<THREE.InstancedMesh>(null);
  const packerBodyRef = useRef<THREE.InstancedMesh>(null);
  const packerHopperRef = useRef<THREE.InstancedMesh>(null);
  const packerHeadRef = useRef<THREE.InstancedMesh>(null);
  const packerBaseRef = useRef<THREE.InstancedMesh>(null);
  const packerPanelRef = useRef<THREE.InstancedMesh>(null);
  const packerScreenRef = useRef<THREE.InstancedMesh>(null);
  const packerGuideRef = useRef<THREE.InstancedMesh>(null);
  const packerGuardRef = useRef<THREE.InstancedMesh>(null);
  const packerAccentRef = useRef<THREE.InstancedMesh>(null);
  const bagRef = useRef<THREE.InstancedMesh>(null);
  const beaconRef = useRef<THREE.InstancedMesh>(null);
  const decalRef = useRef<THREE.InstancedMesh>(null);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);
  const objectRef = useRef(new THREE.Object3D());
  const flowVisualFrameRef = useRef(0);

  /**
   * `enableMachineColorVariation` is true on medium and above but had no effect
   * at all before now: it was only ever read by the dead `Instanced*.tsx` tree.
   * The live path honours it here. Amplitude 0 rather than a branch, so the
   * `USE_INSTANCING_COLOR` shader permutation is the same either way and
   * toggling quality never triggers a recompile.
   */
  const tintAmount = useGraphicsStore((state) =>
    state.graphics.enableMachineColorVariation ? 1 : 0
  );
  const composerActive = useGraphicsStore((state) => isPostProcessingActive(state.graphics));

  useEffect(() => {
    setMachineScreenGlow(composerActive);
  }, [composerActive]);

  const decals = useMemo(() => planMachineDecals(subsets), [subsets]);

  useLayoutEffect(() => {
    const object = objectRef.current;
    const tint = tintAmount;

    subsets.silos.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      const fill = THREE.MathUtils.clamp(machine.fillLevel ?? machine.metrics.load, 8, 96) / 100;
      siloBodyRef.current?.setColorAt(index, machineInstanceTint(INSTANCE_TINT, machine.id, tint));
      setInstanceMatrix(siloBodyRef.current, index, object, [x, y + 8.75, z], [2.25, 12.5, 2.25]);
      setInstanceMatrix(siloRoofRef.current, index, object, [x, y + 15.65, z], [2.35, 1.65, 2.35]);
      setInstanceMatrix(siloOutletRef.current, index, object, [x, y + 1.7, z], [2.05, 2.4, 2.05]);
      [5.25, 9.1, 12.95].forEach((ringY, ringIndex) => {
        setInstanceMatrix(
          siloRingRef.current,
          index * 3 + ringIndex,
          object,
          [x, y + ringY, z],
          [2.3, 1, 2.3]
        );
      });
      setInstanceMatrix(
        siloFillRef.current,
        index,
        object,
        [x, y + 2.55 + fill * 5.95, z],
        [2.02, fill * 11.9, 2.02]
      );
      const legOffsets = [
        [-1.65, -1.65],
        [-1.65, 1.65],
        [1.65, -1.65],
        [1.65, 1.65],
      ] as const;
      legOffsets.forEach(([dx, dz], legIndex) => {
        setInstanceMatrix(
          siloLegRef.current,
          index * 4 + legIndex,
          object,
          [x + dx, y + 1.5, z + dz],
          [0.24, 3, 0.24]
        );
      });
      [-0.34, 0.34].forEach((offsetX, railIndex) => {
        setInstanceMatrix(
          siloLadderRailRef.current,
          index * 2 + railIndex,
          object,
          [x + offsetX, y + 8.6, z + 2.29],
          [0.075, 10.2, 0.075]
        );
      });
      for (let rungIndex = 0; rungIndex < 8; rungIndex += 1) {
        setInstanceMatrix(
          siloLadderRungRef.current,
          index * 8 + rungIndex,
          object,
          [x, y + 4.25 + rungIndex * 1.18, z + 2.31],
          [0.78, 0.065, 0.075]
        );
      }
      setInstanceMatrix(
        siloHatchRef.current,
        index,
        object,
        [x, y + 7.15, z + 2.29],
        [0.95, 1.25, 0.085]
      );
    });

    subsets.mills.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      millBodyRef.current?.setColorAt(index, machineInstanceTint(INSTANCE_TINT, machine.id, tint));
      setInstanceMatrix(millBaseRef.current, index, object, [x, y + 0.32, z], [5.2, 0.64, 4.4]);
      setInstanceMatrix(millBodyRef.current, index, object, [x, y + 2.7, z], [4.8, 4.7, 3.8]);
      setInstanceMatrix(millHopperRef.current, index, object, [x, y + 5.78, z], [1.85, 1.62, 1.85]);
      setInstanceMatrix(
        millRecessRef.current,
        index,
        object,
        [x, y + 2.82, z + 1.93],
        [3.65, 2.7, 0.1]
      );
      setInstanceMatrix(
        millPanelRef.current,
        index,
        object,
        [x, y + 1.08, z + 1.99],
        [3.5, 0.46, 0.12]
      );
      for (let rollerIndex = 0; rollerIndex < 2; rollerIndex += 1) {
        setInstanceMatrix(
          millRollerRef.current,
          index * 2 + rollerIndex,
          object,
          [x, y + 2.25 + rollerIndex * 1.1, z + 2.05],
          [0.48, 3.25, 0.48],
          [0, 0, Math.PI / 2]
        );
      }
      setInstanceMatrix(
        millMotorRef.current,
        index,
        object,
        [x + 3.02, y + 1.65, z - 0.55],
        [0.68, 1.35, 0.68],
        [0, 0, Math.PI / 2]
      );
      setInstanceMatrix(
        millFanRef.current,
        index,
        object,
        [x + 3.72, y + 1.65, z - 0.55],
        [0.58, 0.58, 0.58],
        [0, Math.PI / 2, 0]
      );
      setInstanceMatrix(
        millScreenRef.current,
        index,
        object,
        [x, y + 4.27, z + 2.01],
        [0.78, 0.52, 0.09]
      );
      for (let ventIndex = 0; ventIndex < 4; ventIndex += 1) {
        setInstanceMatrix(
          millVentRef.current,
          index * 4 + ventIndex,
          object,
          [x - 2.43, y + 2.25 + ventIndex * 0.38, z - 0.5],
          [0.08, 0.13, 1.35]
        );
      }
      setInstanceMatrix(
        millAccentRef.current,
        index,
        object,
        [x, y + 4.75, z + 1.97],
        [4.15, 0.22, 0.13]
      );
    });

    subsets.sifters.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      sifterBodyRef.current?.setColorAt(
        index,
        machineInstanceTint(INSTANCE_TINT, machine.id, tint)
      );
      setInstanceMatrix(
        sifterPlatformRef.current,
        index,
        object,
        [x, y - 0.04, z],
        [7.8, 0.18, 6.8]
      );
      setInstanceMatrix(sifterBodyRef.current, index, object, [x, y + 1.82, z], [6.5, 3.35, 5.65]);
      setInstanceMatrix(sifterCapRef.current, index, object, [x, y + 3.68, z], [5.6, 0.38, 4.8]);
      setInstanceMatrix(sifterInletRef.current, index, object, [x, y + 4.45, z], [0.72, 1.3, 0.72]);
      for (let tray = 0; tray < 4; tray += 1) {
        setInstanceMatrix(
          sifterTrayRef.current,
          index * 4 + tray,
          object,
          [x, y + 0.62 + tray * 0.82, z],
          [6.8, 0.13, 5.95]
        );
      }
      // 3.85 -> 3.68: the only trim in this file the housing reshape moved. The
      // drive drum's inner face butts against the casing side wall, and the
      // sifter's frame courses batter that wall in to 3.07 m by the drum's
      // height. Left at 3.85 the drum would hang 0.20 m off the casing.
      setInstanceMatrix(
        sifterDriveRef.current,
        index,
        object,
        [x + 3.68, y + 2.2, z],
        [0.62, 1.15, 0.62],
        [0, 0, Math.PI / 2]
      );
      const suspensionOffsets = [
        [-2.9, -2.45],
        [-2.9, 2.45],
        [2.9, -2.45],
        [2.9, 2.45],
      ] as const;
      suspensionOffsets.forEach(([dx, dz], suspensionIndex) => {
        setInstanceMatrix(
          sifterSuspensionRef.current,
          index * 4 + suspensionIndex,
          object,
          [x + dx, y + 2.05, z + dz],
          [0.075, 3.4, 0.075]
        );
      });
      setInstanceMatrix(
        sifterScreenRef.current,
        index,
        object,
        [x, y + 2.2, z + 2.97],
        [0.82, 0.5, 0.08]
      );
      setInstanceMatrix(
        sifterServicePanelRef.current,
        index,
        object,
        [x, y + 1.96, z + 2.89],
        [2.45, 1.82, 0.08]
      );
      setInstanceMatrix(
        sifterAccentRef.current,
        index,
        object,
        [x, y + 2.95, z + 2.93],
        [2.75, 0.18, 0.11]
      );
    });

    subsets.packers.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      packerBodyRef.current?.setColorAt(
        index,
        machineInstanceTint(INSTANCE_TINT, machine.id, tint)
      );
      setInstanceMatrix(packerBaseRef.current, index, object, [x, y + 0.28, z], [4.5, 0.56, 4.25]);
      setInstanceMatrix(packerBodyRef.current, index, object, [x, y + 2.65, z], [3.7, 4.75, 3.45]);
      setInstanceMatrix(packerHopperRef.current, index, object, [x, y + 5.72, z], [1.7, 1.5, 1.7]);
      setInstanceMatrix(
        packerPanelRef.current,
        index,
        object,
        [x, y + 3.05, z + 1.76],
        [2.65, 1.65, 0.1]
      );
      setInstanceMatrix(
        packerHeadRef.current,
        index,
        object,
        [x, y + 1.75, z + 1.72],
        [0.68, 1.4, 0.68]
      );
      setInstanceMatrix(bagRef.current, index, object, [x, y + 0.72, z + 2.75], [1.25, 1.45, 0.72]);
      setInstanceMatrix(
        packerScreenRef.current,
        index,
        object,
        [x, y + 4.05, z + 1.78],
        [0.72, 0.5, 0.08]
      );
      [-0.92, 0.92].forEach((offsetX, guideIndex) => {
        setInstanceMatrix(
          packerGuideRef.current,
          index * 2 + guideIndex,
          object,
          [x + offsetX, y + 1.42, z + 2.55],
          [0.09, 2.5, 0.09]
        );
      });
      [-1.34, 1.34].forEach((offsetX, guardIndex) => {
        setInstanceMatrix(
          packerGuardRef.current,
          index * 2 + guardIndex,
          object,
          [x + offsetX, y + 1.05, z + 2.62],
          [0.08, 1.9, 0.08]
        );
      });
      setInstanceMatrix(
        packerAccentRef.current,
        index,
        object,
        [x, y + 4.82, z + 1.77],
        [3.05, 0.2, 0.12]
      );
    });

    const allMachines = [
      ...subsets.silos,
      ...subsets.mills,
      ...subsets.sifters,
      ...subsets.packers,
    ];
    allMachines.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      const height =
        machine.type === MachineType.SILO
          ? 16.8
          : machine.type === MachineType.PLANSIFTER
            ? 4.9
            : machine.type === MachineType.PACKER
              ? 7.5
              : 6.7;
      setInstanceMatrix(beaconRef.current, index, object, [x, y + height, z], [0.22, 0.22, 0.22]);
      beaconRef.current?.setColorAt(
        index,
        STATUS_COLOUR.set(getMachineStatusColor(machine.status))
      );
    });
    if (beaconRef.current?.instanceColor) beaconRef.current.instanceColor.needsUpdate = true;
    [siloBodyRef, millBodyRef, sifterBodyRef, packerBodyRef].forEach((ref) => {
      if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true;
    });

    // Placards. One instanced mesh for every machine class, so the whole
    // readability layer costs a single draw call.
    writeDecalUvRects(MACHINE_DECAL_GEOMETRY, decals);
    decals.forEach((decal, index) => {
      setInstanceMatrix(decalRef.current, index, object, decal.position, [
        decal.size[0],
        decal.size[1],
        1,
      ]);
    });
    finishMatrixUpdate(decalRef.current, true);

    [
      siloBodyRef,
      siloRoofRef,
      siloLegRef,
      siloFillRef,
      siloOutletRef,
      siloRingRef,
      siloLadderRailRef,
      siloLadderRungRef,
      siloHatchRef,
      millBodyRef,
      millHopperRef,
      millRollerRef,
      millBaseRef,
      millPanelRef,
      millRecessRef,
      millMotorRef,
      millFanRef,
      millScreenRef,
      millVentRef,
      millAccentRef,
      sifterBodyRef,
      sifterTrayRef,
      sifterPlatformRef,
      sifterCapRef,
      sifterInletRef,
      sifterDriveRef,
      sifterSuspensionRef,
      sifterScreenRef,
      sifterServicePanelRef,
      sifterAccentRef,
      packerBodyRef,
      packerHopperRef,
      packerHeadRef,
      packerBaseRef,
      packerPanelRef,
      packerScreenRef,
      packerGuideRef,
      packerGuardRef,
      packerAccentRef,
      bagRef,
      beaconRef,
    ].forEach((ref) => finishMatrixUpdate(ref.current, true));
  }, [subsets, decals, tintAmount]);

  useFrame(() => {
    if (!isTabVisible) return;
    const flowState = useMaterialFlowStore.getState();
    const time = flowState.simulationTime;
    const object = objectRef.current;
    const canOperate = (machine: MachineData): boolean =>
      getMachineOperationalState(machine.status, flowState.machineBuffers.get(machine.id)) ===
      'operating';

    subsets.mills.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      const active = canOperate(machine);
      const vibration = active ? Math.sin(time * 28 + index) * 0.012 : 0;
      setInstanceMatrix(
        millBodyRef.current,
        index,
        object,
        [x, y + 2.7 + vibration, z],
        [4.8, 4.7, 3.8]
      );
      for (let rollerIndex = 0; rollerIndex < 2; rollerIndex += 1) {
        setInstanceMatrix(
          millRollerRef.current,
          index * 2 + rollerIndex,
          object,
          [x, y + 2.25 + rollerIndex * 1.1, z + 2.05],
          [0.48, 3.25, 0.48],
          [0, active ? time * (rollerIndex === 0 ? 4.5 : -4.5) : 0, Math.PI / 2]
        );
      }
    });

    subsets.sifters.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      const active = canOperate(machine);
      const phase = time * 10 + index * 1.7;
      const offsetX = active ? Math.sin(phase) * 0.055 : 0;
      const offsetZ = active ? Math.cos(phase) * 0.055 : 0;
      setInstanceMatrix(
        sifterBodyRef.current,
        index,
        object,
        [x + offsetX, y + 1.82, z + offsetZ],
        [6.5, 3.35, 5.65]
      );
      for (let tray = 0; tray < 4; tray += 1) {
        setInstanceMatrix(
          sifterTrayRef.current,
          index * 4 + tray,
          object,
          [x + offsetX, y + 0.62 + tray * 0.82, z + offsetZ],
          [6.8, 0.13, 5.95]
        );
      }
    });

    subsets.packers.forEach((machine, index) => {
      const [x, y, z] = machine.position;
      const active = canOperate(machine);
      const cycle = active ? (Math.sin(time * 3.2 + index) + 1) * 0.5 : 0;
      setInstanceMatrix(
        packerHeadRef.current,
        index,
        object,
        [x, y + 1.75 - cycle * 0.38, z + 1.72],
        [0.68, 1.4, 0.68]
      );
      setInstanceMatrix(
        bagRef.current,
        index,
        object,
        [x, y + 0.72, z + 2.75 + cycle * 0.52],
        [1.25, 1.45, 0.72]
      );
    });

    flowVisualFrameRef.current += 1;
    if (flowVisualFrameRef.current % 12 === 0) {
      subsets.silos.forEach((machine, index) => {
        const [x, y, z] = machine.position;
        const buffer = flowState.machineBuffers.get(machine.id);
        const storedKg =
          buffer?.outputBuffer.reduce((sum, material) => sum + material.amount, 0) ?? 0;
        const fill = THREE.MathUtils.clamp(
          storedKg / Math.max(1, buffer?.outputCapacity ?? 50000),
          0.02,
          1
        );
        setInstanceMatrix(
          siloFillRef.current,
          index,
          object,
          [x, y + 2.55 + fill * 5.95, z],
          [2.02, fill * 11.9, 2.02]
        );
      });
      finishMatrixUpdate(siloFillRef.current);

      const allMachines = [
        ...subsets.silos,
        ...subsets.mills,
        ...subsets.sifters,
        ...subsets.packers,
      ];
      allMachines.forEach((machine, index) => {
        const buffer = flowState.machineBuffers.get(machine.id);
        const operationalState = getMachineOperationalState(machine.status, buffer);
        const colour =
          operationalState === 'blocked'
            ? BLOCKED_COLOUR
            : operationalState === 'starved'
              ? STARVED_COLOUR
              : STATUS_COLOUR.set(getMachineStatusColor(machine.status));
        beaconRef.current?.setColorAt(index, colour);
      });
      if (beaconRef.current?.instanceColor) {
        beaconRef.current.instanceColor.needsUpdate = true;
      }
    }

    [
      millBodyRef.current,
      millRollerRef.current,
      sifterBodyRef.current,
      sifterTrayRef.current,
      packerHeadRef.current,
      bagRef.current,
    ].forEach((mesh) => finishMatrixUpdate(mesh));
  });

  const allMachines = useMemo(
    () => [...subsets.silos, ...subsets.mills, ...subsets.sifters, ...subsets.packers],
    [subsets]
  );

  return (
    <group name="compact-machines" dispose={null}>
      <InteractiveInstances
        meshRef={siloBodyRef}
        geometry={SILO_SHELL}
        raycast={raycastSiloShell}
        material={MATERIALS.silo}
        count={subsets.silos.length}
        machines={subsets.silos}
        onSelect={onSelect}
      />
      <instancedMesh
        ref={siloRoofRef}
        args={[SILO_ROOF, MATERIALS.siloRoof, subsets.silos.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={siloLegRef}
        args={[UNIT_BOX, MATERIALS.siloLeg, subsets.silos.length * 4]}
        castShadow
        receiveShadow
      />
      {/* Grain column, entirely enclosed by the drum: neither casts nor receives. */}
      <instancedMesh ref={siloFillRef} args={[SILO_BODY, MATERIALS.grain, subsets.silos.length]} />
      <instancedMesh
        ref={siloOutletRef}
        args={[SILO_OUTLET, MATERIALS.siloRoof, subsets.silos.length]}
        castShadow
        receiveShadow
      />
      {/*
        Stiffener rings are one of only two meshes promoted to a caster. They
        stand 0.12 m proud of a 2.25 m drum, so each one lays a hard horizontal
        band down the silo and gives the eye the scale cue the smooth cylinder
        never had. +1 shadow-pass draw.
      */}
      <instancedMesh
        ref={siloRingRef}
        args={[SILO_RING, MATERIALS.siloRoof, subsets.silos.length * 3]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={siloLadderRailRef}
        args={[UNIT_BOX, MATERIALS.hardware, subsets.silos.length * 2]}
        receiveShadow
      />
      <instancedMesh
        ref={siloLadderRungRef}
        args={[UNIT_BOX, MATERIALS.hardware, subsets.silos.length * 8]}
        receiveShadow
      />
      <instancedMesh
        ref={siloHatchRef}
        args={[THIN_PLATE, MATERIALS.maintenancePlate, subsets.silos.length]}
        receiveShadow
      />

      <InteractiveInstances
        meshRef={millBodyRef}
        geometry={MILL_BODY}
        raycast={raycastMachineHousing}
        material={MATERIALS.mill}
        count={subsets.mills.length}
        machines={subsets.mills}
        onSelect={onSelect}
      />
      <instancedMesh
        ref={millHopperRef}
        args={[HOPPER, MATERIALS.millTrim, subsets.mills.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={millRollerRef}
        args={[ROLLER, MATERIALS.roller, subsets.mills.length * 2]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={millBaseRef}
        args={[THIN_PLATE, MATERIALS.millTrim, subsets.mills.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={millRecessRef}
        args={[THIN_PLATE, MATERIALS.recess, subsets.mills.length]}
        receiveShadow
      />
      <instancedMesh
        ref={millPanelRef}
        args={[THIN_PLATE, MATERIALS.millPanel, subsets.mills.length]}
        receiveShadow
      />
      <instancedMesh
        ref={millMotorRef}
        args={[ROLLER, MATERIALS.motor, subsets.mills.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={millFanRef}
        args={[FAN_GRILLE, MATERIALS.hardware, subsets.mills.length]}
        receiveShadow
      />
      {/* Emissive HMI: excluded from both shadow roles by design. */}
      <instancedMesh
        ref={millScreenRef}
        args={[THIN_PLATE, MATERIALS.screen, subsets.mills.length]}
      />
      <instancedMesh
        ref={millVentRef}
        args={[UNIT_BOX, MATERIALS.hardware, subsets.mills.length * 4]}
        receiveShadow
      />
      <instancedMesh
        ref={millAccentRef}
        args={[THIN_PLATE, MATERIALS.maintenancePlate, subsets.mills.length]}
        receiveShadow
      />

      <InteractiveInstances
        meshRef={sifterBodyRef}
        geometry={SIFTER_BODY}
        raycast={raycastMachineHousing}
        material={MATERIALS.sifter}
        count={subsets.sifters.length}
        machines={subsets.sifters}
        onSelect={onSelect}
      />
      <instancedMesh
        ref={sifterTrayRef}
        args={[UNIT_BOX, MATERIALS.sifterTray, subsets.sifters.length * 4]}
        receiveShadow
      />
      <instancedMesh
        ref={sifterPlatformRef}
        args={[THIN_PLATE, MATERIALS.platform, subsets.sifters.length]}
        castShadow
        receiveShadow
      />
      {/*
        The lid is the second promoted caster: it sits 0.19 m above the sifter
        body and is the only part of the sifter that can shade the stack below
        it. +1 shadow-pass draw.
      */}
      <instancedMesh
        ref={sifterCapRef}
        args={[THIN_PLATE, MATERIALS.sifterTray, subsets.sifters.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={sifterInletRef}
        args={[INLET, MATERIALS.millTrim, subsets.sifters.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={sifterDriveRef}
        args={[ROLLER, MATERIALS.motor, subsets.sifters.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={sifterSuspensionRef}
        args={[INLET, MATERIALS.hardware, subsets.sifters.length * 4]}
        receiveShadow
      />
      <instancedMesh
        ref={sifterScreenRef}
        args={[THIN_PLATE, MATERIALS.screen, subsets.sifters.length]}
      />
      <instancedMesh
        ref={sifterServicePanelRef}
        args={[THIN_PLATE, MATERIALS.recess, subsets.sifters.length]}
        receiveShadow
      />
      <instancedMesh
        ref={sifterAccentRef}
        args={[THIN_PLATE, MATERIALS.maintenancePlate, subsets.sifters.length]}
        receiveShadow
      />

      <InteractiveInstances
        meshRef={packerBodyRef}
        geometry={PACKER_BODY}
        raycast={raycastMachineHousing}
        material={MATERIALS.packer}
        count={subsets.packers.length}
        machines={subsets.packers}
        onSelect={onSelect}
      />
      <instancedMesh
        ref={packerHopperRef}
        args={[HOPPER, MATERIALS.packerTrim, subsets.packers.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={packerHeadRef}
        args={[ROUNDED_BOX, MATERIALS.packerTrim, subsets.packers.length]}
        receiveShadow
      />
      <instancedMesh
        ref={bagRef}
        args={[ROUNDED_BOX, MATERIALS.bag, subsets.packers.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={packerBaseRef}
        args={[THIN_PLATE, MATERIALS.packerTrim, subsets.packers.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={packerPanelRef}
        args={[THIN_PLATE, MATERIALS.recess, subsets.packers.length]}
        receiveShadow
      />
      <instancedMesh
        ref={packerScreenRef}
        args={[THIN_PLATE, MATERIALS.screen, subsets.packers.length]}
      />
      <instancedMesh
        ref={packerGuideRef}
        args={[UNIT_BOX, MATERIALS.hardware, subsets.packers.length * 2]}
        receiveShadow
      />
      <instancedMesh
        ref={packerGuardRef}
        args={[UNIT_BOX, MATERIALS.maintenancePlate, subsets.packers.length * 2]}
        receiveShadow
      />
      <instancedMesh
        ref={packerAccentRef}
        args={[THIN_PLATE, MATERIALS.maintenancePlate, subsets.packers.length]}
        receiveShadow
      />

      {/*
        Placards for every machine class in ONE draw call: shared plane, shared
        material, per-instance atlas cell. Alpha-tested so they stay in the
        opaque pass; no shadow role, because a 3 mm quad casting a shadow onto
        the plate it is glued to is pure acne.
      */}
      {decals.length > 0 && (
        <instancedMesh
          ref={decalRef}
          args={[MACHINE_DECAL_GEOMETRY, MACHINE_DECAL_MATERIAL, decals.length]}
          receiveShadow
        />
      )}

      <instancedMesh ref={beaconRef} args={[BEACON, MATERIALS.beacon, allMachines.length]} />
    </group>
  );
}

export function CompactMachinesContainer({
  initialMachines,
  onSelect,
}: {
  readonly initialMachines: MachineData[];
  readonly onSelect: (machine: MachineData) => void;
}) {
  // Metric telemetry changes every two seconds. The 3D branch only subscribes
  // to semantic status, preventing a full instanced-layout rebuild for numeric
  // SCADA updates.
  const statusKeys = useProductionStore(
    useShallow((state) => state.machines.map((machine) => `${machine.id}:${machine.status}`))
  );
  const machines = useMemo(() => {
    if (statusKeys.length === 0) return initialMachines;
    const statuses = new Map(
      statusKeys.map((key) => {
        const separator = key.lastIndexOf(':');
        return [key.slice(0, separator), key.slice(separator + 1)] as const;
      })
    );
    return initialMachines.map((machine) => {
      const status = statuses.get(machine.id) as MachineData['status'] | undefined;
      return status && status !== machine.status ? { ...machine, status } : machine;
    });
  }, [initialMachines, statusKeys]);
  const selectCurrentMachine = useCallback(
    (machine: MachineData) => {
      onSelect(
        useProductionStore.getState().machines.find(({ id }) => id === machine.id) ?? machine
      );
    },
    [onSelect]
  );

  return <CompactMachineSet machines={machines} onSelect={selectCurrentMachine} />;
}
