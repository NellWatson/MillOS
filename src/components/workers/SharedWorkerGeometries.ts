import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Shared personnel geometry keeps the ten named workers inexpensive while
// giving both visible LODs the same rounded, adult human silhouette.
const nose = new THREE.ConeGeometry(0.022, 0.052, 10);
nose.rotateX(Math.PI / 2);

const mouth = new THREE.TorusGeometry(0.04, 0.005, 6, 16, Math.PI);
mouth.rotateZ(Math.PI);

/**
 * Body geometry: chest, abdomen, vest, and their medium-distance counterparts.
 *
 * These were five truncated cylinders with near-identical taper. A human torso
 * has shoulders, a chest swell and a waist pinch, and a hi-vis vest is a
 * garment hanging over that - not a slightly larger cylinder - so all five are
 * designed lathe profiles now.
 *
 * Each was designed against the call site that draws it (`DetailedWorker` for
 * the close trio, `SimplifiedWorker` for the medium pair) at that call site's
 * real instance scale, and previewed in Blender before being transcribed here:
 * `scripts/blender/specs/worker-body.json` through
 * `scripts/blender/machine_part_preview.py` for the isolated forms and the
 * envelope check, plus a full-figure assembly render, because the vest's shape
 * is a RELATIONSHIP to the chest's and neither can be judged alone.
 *
 * Every profile keeps the EXACT unit envelope of the cylinder it replaces -
 * same maximum radius, same y range - so no position or scale in
 * `DetailedWorker.tsx` or `SimplifiedWorker.tsx` needs retuning. The harness
 * reports 0.00 mm drift on all five.
 *
 * Cost. The close trio goes from 240 to 1240 triangles per worker. These are
 * shared geometries but plain meshes drawn once per worker, so that multiplies
 * across the roster, and the worker group in `WorkerSystemNew` carries
 * onClick/onPointerOver - r3f raycasts interactive objects recursively, so
 * every added triangle is also hit-tested on pointer moves over a near worker.
 * No picking proxy (the `raycastSiloShell` swap in
 * `machines/CompactMachines.tsx`) is added, and none is warranted. The rest of
 * the always-drawn close model is already 12,536 triangles - 540 in the head
 * sphere alone, 308 in the jaw - so +1000 is a 7.8% rise on one worker's mesh
 * group. That is a different kind of measurement from the case the proxy
 * exists for over there, which was a 10,368-triangle geometry raycast across
 * many instances at once. The close model is also only the Suspense fallback
 * while the authored worker GLBs stream. The medium pair - the LOD actually on
 * screen most of the time - goes from 64 to 288 triangles total.
 */

/**
 * Close-model chest. Drawn 0.52 m across and 0.47 m tall: scale [1, 1, 0.5]
 * inside `DetailedWorker`'s 0.9 root, so the section is an ellipse twice as
 * wide as it is deep.
 *
 * `CylinderGeometry(0.29, 0.215, 0.52, 20)` was one straight taper - no waist,
 * no chest, and a flat 0.58 m top plate that overhung the deltoid spheres as a
 * hard flange. Four features carry a torso at the distance this is seen: a
 * pinch at the natural waist (0.212), a rib flare above it, a pectoral shelf,
 * and a trapezius slope that runs the shoulder line down into a neck root
 * instead of ending in a disc.
 *
 * The maximum radius sits at y 0.230 - higher than the armpit line where
 * anatomy would put it. That is deliberate and load-bearing. The vest's top
 * edge is at torso-frame y 0.4175 (torso-local 0.2175) and the vest is capped
 * at radius 0.300, so wherever the two overlap the chest must stay far enough
 * inside for the vest to clear it; see `createWorkerVestGeometry` for the 6 mm
 * arithmetic. Moving this maximum down to the armpit pushes the chest out
 * through the BACK of the vest.
 *
 * The 0.226 hem is wider than the abdomen's 0.208 top rim on purpose, so the
 * junction reads as a shirt hem rather than a bulge.
 *
 * Envelope preserved exactly: max radius 0.290, y in [-0.26, 0.26].
 * `personnelGeometry.test.ts` also asserts a shoulder-led taper - the widest
 * ring above y 0.2 is 0.290 against 0.226 below y -0.2, a ratio of 1.28.
 */
function createWorkerTorsoGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, -0.26), // bottom cap centre
      new THREE.Vector2(0.226, -0.26), // hem over the iliac crest
      new THREE.Vector2(0.212, -0.196), // natural waist - narrowest
      new THREE.Vector2(0.232, -0.115),
      new THREE.Vector2(0.248, -0.02), // lower ribs
      new THREE.Vector2(0.262, 0.075),
      new THREE.Vector2(0.272, 0.145), // pectoral shelf
      new THREE.Vector2(0.281, 0.196),
      new THREE.Vector2(0.29, 0.23), // shoulder line - envelope max radius
      new THREE.Vector2(0.256, 0.249), // trapezius slope
      new THREE.Vector2(0.188, 0.2585), // neck root
      new THREE.Vector2(0.0, 0.26), // top cap centre - envelope max y
    ],
    20
  );
}

/**
 * Close-model abdomen, 0.45 m across as drawn (scale [1, 1, 0.52]), between the
 * shirt hem above and the belt below.
 *
 * `CylinderGeometry(0.215, 0.225, 0.27, 20)` was a near-straight tube that got
 * WIDER downwards, so its widest ring was the rim butting the belt and the
 * silhouette flared into it. Same 0.225 maximum, but it becomes a hip crown at
 * mid-height and both rims tuck in: the top rim (0.208) slides inside the shirt
 * hem (0.226), and the bottom rim (0.212) draws back in over the belt.
 *
 * Segment count matches the chest and the vest - the three are stacked and
 * sleeved, so their facets have to coincide rather than beat against each
 * other.
 *
 * Envelope preserved exactly: max radius 0.225, y in [-0.135, 0.135].
 */
function createWorkerWaistGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, -0.135),
      new THREE.Vector2(0.212, -0.135), // hem drawn in over the belt
      new THREE.Vector2(0.222, -0.104),
      new THREE.Vector2(0.225, -0.045), // hip crown - envelope max radius
      new THREE.Vector2(0.221, 0.03),
      new THREE.Vector2(0.213, 0.09),
      new THREE.Vector2(0.208, 0.135), // top rim - tucks inside the shirt hem
      new THREE.Vector2(0.0, 0.135),
    ],
    20
  );
}

/**
 * Hi-vis vest, 0.54 m across as drawn, sleeved over the chest at position
 * [0, 0.15, 0.006] with scale [1, 1, 0.5].
 *
 * `CylinderGeometry(0.3, 0.225, 0.535, 20)` tapered in lockstep with the chest
 * beneath it, which is exactly why it read as a slightly larger cylinder rather
 * than a garment. Four features change that:
 *
 *  - a bound hem band at 0.244, held vertical for 25 mm, with a binding groove
 *    behind it, so the bottom edge reads as an edge and not a cut;
 *  - a skirt that swells back out to the body wall above the groove;
 *  - a constant armhole band at 0.269 from y -0.165 to 0.045. The vest
 *    deliberately does NOT follow the chest's waist pinch here; the resulting
 *    16-20 mm radial standoff over the abdomen is what reads as drape;
 *  - a rolled shoulder yoke: out to the 0.300 maximum, a vertical yoke band,
 *    then the edge rolls over and dives to 0.246 - inside the chest radius
 *    (~0.288) at that height, so the vest's top cap is buried and only the
 *    rolled edge shows against the shirt.
 *
 * Two constraints on this profile live outside this file and are invisible
 * from here:
 *
 * 1. The mesh is offset +0.006 in z, so the standoff at the BACK is
 *    0.5 * (rVest - rTorso) - 0.006. The cylinder this replaces cleared the old
 *    chest by only 2.1 mm back there. This profile holds >= 2 mm across the
 *    whole chest, which is the reason the chest's maximum radius had to move
 *    above the vest's top edge. Fatten the chest or slim the vest and the shirt
 *    pokes out through the vest's back - it did, in an earlier draft, and only
 *    the assembly render showed it.
 * 2. `DetailedWorker` places the lower `vestStripe` at torso-frame y 0.06
 *    (vest-local -0.09): a flat 0.535-wide bar at z 0.153. The old vest was
 *    only 0.2499 there, so the bar overhung the vest's silhouette by 17.6 mm a
 *    side and floated 16 mm off the front. The constant armhole band contains
 *    it (bar half-width 0.2675 against radius 0.269) and cuts the float to
 *    6.8 mm. Taper through that band and the fault comes back.
 *
 * Radius through the armhole band is capped from the other side by the
 * upper-arm capsule, whose inner face is at x 0.273 in the neutral pose: 0.269
 * keeps 4 mm, the same order of clearance as the cylinder it replaces.
 *
 * Envelope preserved exactly: max radius 0.300, y in [-0.2675, 0.2675].
 */
function createWorkerVestGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, -0.2675),
      new THREE.Vector2(0.244, -0.2675), // hem edge
      new THREE.Vector2(0.244, -0.242), // bound hem band
      new THREE.Vector2(0.233, -0.233), // binding groove
      new THREE.Vector2(0.259, -0.195), // skirt swells back to the body wall
      new THREE.Vector2(0.268, -0.165),
      new THREE.Vector2(0.269, 0.045), // armhole band - the sleeve clears this
      new THREE.Vector2(0.281, 0.115),
      new THREE.Vector2(0.297, 0.215),
      new THREE.Vector2(0.3, 0.246), // shoulder yoke - envelope max radius
      new THREE.Vector2(0.3, 0.257), // yoke band
      new THREE.Vector2(0.286, 0.265), // rolled top edge
      new THREE.Vector2(0.246, 0.2675), // tucks under the shirt; cap is buried
      new THREE.Vector2(0.0, 0.2675),
    ],
    20
  );
}

/**
 * Medium-distance body. Drawn 0.50 m across and 0.59 m tall: scale [1, 1, 0.56]
 * inside `SimplifiedWorker`'s 0.92 root.
 *
 * This is the body geometry a viewer actually spends time looking at.
 * `DetailedWorker` is only the Suspense fallback while the authored worker GLBs
 * stream; `SimplifiedWorker` is the permanent representation from roughly 20 m
 * out to the billboard handover. It is also the medium-LOD VEST - the material
 * swaps to hi-vis orange for workers wearing one - so this single profile has
 * to work as both shirt and garment.
 *
 * `CylinderGeometry(0.27, 0.205, 0.64, 8)` was a monotonic wedge whose widest
 * ring was its own top rim: a plant pot, with the head floating above it. This
 * profile gives it a shoulder line at 0.270 with a trapezius slope above, a
 * chest, a waist pinch and a hip, so the silhouette carries two bulges and a
 * narrowing between them instead of one straight edge. The slope also closes
 * most of the visual distance to the head, which sits 64 mm above the rim.
 *
 * The segment count deliberately stays at 8. Rendered A/B at the true 24 m
 * viewing distance the figure is ~25 px wide and 8 versus 12 is
 * indistinguishable; 8 also keeps the facets coincident with `mediumWaist`
 * across their shared rim. The shape was the defect here, not the facet count.
 *
 * Envelope preserved exactly: max radius 0.270, y in [-0.32, 0.32]. Both cap
 * centres are on the envelope, and `personnelGeometry.test.ts` asserts this
 * geometry's height against the close chest's - do not drop them.
 */
function createMediumTorsoGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, -0.32),
      new THREE.Vector2(0.205, -0.32), // hem - meets the mediumWaist top rim
      new THREE.Vector2(0.232, -0.245),
      new THREE.Vector2(0.238, -0.18), // hip
      new THREE.Vector2(0.228, -0.06),
      new THREE.Vector2(0.222, 0.01), // natural waist - narrowest
      new THREE.Vector2(0.238, 0.1),
      new THREE.Vector2(0.252, 0.18), // chest
      new THREE.Vector2(0.265, 0.245),
      new THREE.Vector2(0.27, 0.283), // shoulder line - envelope max radius
      new THREE.Vector2(0.236, 0.306), // trapezius
      new THREE.Vector2(0.166, 0.32), // neck root
      new THREE.Vector2(0.0, 0.32),
    ],
    8
  );
}

/**
 * Medium-distance hips and thigh mass, in pants colour, 0.40 m across as drawn.
 *
 * `CylinderGeometry(0.205, 0.22, 0.24, 8)` flared DOWNWARD into a hard rim with
 * two leg capsules poking out below it, which reads as a flared skirt. This
 * reverses that: the 0.22 maximum becomes a hip crown near the top and the form
 * converges to a 0.203 thigh mass, so the legs emerge from under the hips
 * rather than from under a hem. Only where the maximum SITS changes - the
 * maximum itself and the y range are untouched.
 *
 * Envelope preserved exactly: max radius 0.220, y in [-0.12, 0.12].
 */
function createMediumWaistGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, -0.12),
      new THREE.Vector2(0.203, -0.12), // thigh mass; the legs emerge below
      new THREE.Vector2(0.213, -0.07),
      new THREE.Vector2(0.22, -0.01), // hip crown - envelope max radius
      new THREE.Vector2(0.216, 0.06),
      new THREE.Vector2(0.201, 0.12), // top rim - tucks inside the shirt hem
      new THREE.Vector2(0.0, 0.12),
    ],
    8
  );
}

export const SHARED_WORKER_GEOMETRY = {
  // General primitives
  box_small: new THREE.BoxGeometry(1, 1, 1),
  sphere_low: new THREE.SphereGeometry(1, 8, 8),
  sphere_med: new THREE.SphereGeometry(1, 12, 10),
  sphere_high: new THREE.SphereGeometry(1, 18, 14),
  cylinder_low: new THREE.CylinderGeometry(1, 1, 1, 8),
  cylinder_med: new THREE.CylinderGeometry(1, 1, 1, 12),
  capsule_med: new THREE.CapsuleGeometry(1, 1, 4, 8),

  // Close-range anatomy and clothing.
  // The chest, abdomen and vest are designed lathe profiles - see the block
  // above `createWorkerTorsoGeometry`. Everything else here (head, hard hat,
  // limbs, face, boots) is already under a 0.06 m chord as drawn and is
  // deliberately left as a primitive.
  torso: createWorkerTorsoGeometry(), // 0.52 m across
  waist: createWorkerWaistGeometry(),
  shoulder: new THREE.SphereGeometry(0.09, 12, 10),
  neck: new THREE.CylinderGeometry(0.075, 0.085, 0.105, 12),
  head: new THREE.SphereGeometry(0.165, 18, 16),
  jaw: new THREE.SphereGeometry(0.095, 14, 12),
  nose,
  noseTip: new THREE.SphereGeometry(0.018, 8, 6),
  eye: new THREE.SphereGeometry(0.014, 12, 8),
  iris: new THREE.SphereGeometry(0.009, 10, 8),
  pupil: new THREE.SphereGeometry(0.005, 8, 6),
  ear: new THREE.SphereGeometry(0.036, 10, 8),
  eyelid: new RoundedBoxGeometry(0.037, 0.014, 0.008, 2, 0.004),
  eyebrow: new RoundedBoxGeometry(0.047, 0.01, 0.01, 2, 0.004),
  mouth,
  hardHatDome: new THREE.SphereGeometry(0.18, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  hardHatBrim: new THREE.CylinderGeometry(0.205, 0.205, 0.022, 20),
  hardHatRidge: new THREE.CapsuleGeometry(0.014, 0.29, 3, 8),
  // 0.54 m across, sleeved over the chest - same segment count as `torso` and
  // `waist` so the three share facet boundaries.
  vest: createWorkerVestGeometry(),
  vestStripe: new RoundedBoxGeometry(0.535, 0.034, 0.012, 2, 0.005),
  vestShoulderStripe: new RoundedBoxGeometry(0.046, 0.36, 0.012, 2, 0.005),
  collar: new RoundedBoxGeometry(0.14, 0.08, 0.035, 2, 0.008),
  placket: new RoundedBoxGeometry(0.018, 0.31, 0.012, 2, 0.004),
  chestPocket: new RoundedBoxGeometry(0.13, 0.11, 0.014, 2, 0.008),
  upperArm: new THREE.CapsuleGeometry(0.072, 0.21, 5, 10),
  elbow: new THREE.SphereGeometry(0.066, 10, 8),
  forearm: new THREE.CapsuleGeometry(0.06, 0.19, 5, 10),
  cuff: new THREE.CylinderGeometry(0.066, 0.061, 0.045, 10),
  hand: new THREE.CapsuleGeometry(0.039, 0.028, 4, 8),
  fingers: new THREE.CapsuleGeometry(0.028, 0.018, 3, 8),
  hips: new RoundedBoxGeometry(0.43, 0.175, 0.24, 4, 0.05),
  belt: new RoundedBoxGeometry(0.43, 0.045, 0.245, 2, 0.012),
  buckle: new RoundedBoxGeometry(0.052, 0.038, 0.012, 2, 0.005),
  thigh: new THREE.CapsuleGeometry(0.095, 0.25, 5, 10),
  knee: new THREE.SphereGeometry(0.078, 10, 8),
  calf: new THREE.CapsuleGeometry(0.078, 0.24, 5, 10),
  limb_capsule: new THREE.CapsuleGeometry(0.08, 0.27, 4, 8),
  boot: new RoundedBoxGeometry(0.125, 0.12, 0.19, 3, 0.025),
  bootSole: new RoundedBoxGeometry(0.135, 0.025, 0.205, 2, 0.008),
  bootToe: new RoundedBoxGeometry(0.11, 0.065, 0.055, 2, 0.014),
  glassesLens: new RoundedBoxGeometry(0.073, 0.042, 0.01, 2, 0.008),
  glassesBridge: new THREE.CapsuleGeometry(0.005, 0.024, 2, 6),
  earmuffCup: new THREE.CylinderGeometry(0.052, 0.052, 0.035, 12),
  earmuffBand: new THREE.TorusGeometry(0.18, 0.012, 6, 18, Math.PI),
  radioBody: new RoundedBoxGeometry(0.052, 0.112, 0.032, 2, 0.008),
  radioAntenna: new THREE.CylinderGeometry(0.004, 0.003, 0.07, 8),
  coatPanel: new RoundedBoxGeometry(0.245, 0.69, 0.14, 3, 0.035),
  coatCollar: new RoundedBoxGeometry(0.13, 0.12, 0.035, 2, 0.008),
  toolPouch: new RoundedBoxGeometry(0.105, 0.14, 0.065, 2, 0.012),
  badge: new RoundedBoxGeometry(0.1, 0.065, 0.008, 2, 0.004),

  // Medium-distance anatomy. These keep a readable silhouette without the
  // facial and garment mesh count of the close model.
  mediumTorso: createMediumTorsoGeometry(),
  mediumWaist: createMediumWaistGeometry(),
  mediumHead: new THREE.SphereGeometry(0.17, 12, 10),
  mediumNose: nose.clone(),
  mediumArm: new THREE.CapsuleGeometry(0.065, 0.4, 4, 8),
  mediumHand: new THREE.SphereGeometry(0.055, 8, 6),
  mediumLeg: new THREE.CapsuleGeometry(0.088, 0.47, 4, 8),
  mediumBoot: new RoundedBoxGeometry(0.13, 0.13, 0.2, 2, 0.025),
  mediumHat: new THREE.SphereGeometry(0.19, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  mediumHatBrim: new THREE.CylinderGeometry(0.21, 0.21, 0.025, 12),
  mediumStripe: new RoundedBoxGeometry(0.48, 0.042, 0.012, 2, 0.005),

  // Billboard / far LOD parts
  billboard_body: new RoundedBoxGeometry(0.4, 1.9, 0.25, 2, 0.04),
  billboard_head: new THREE.SphereGeometry(0.15, 8, 8),
  billboard_hat: new THREE.SphereGeometry(0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  billboard_stripe: new THREE.BoxGeometry(0.41, 0.055, 0.012),
};
