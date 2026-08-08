import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

import Fireflies from './effects/Fireflies';
import { HeartParticle } from './effects/HeartParticle';
import { playCritterSound } from '../utils/critterAudio';
import { Cat } from './scenery/Cat';
import {
  InstancedTreeField,
  InstancedGrassClutter,
  InstancedMulch,
  useVegetationDensity,
  type TreeInstance,
  type ClutterSpec,
} from './scenery/InstancedFoliage';
import { WindDriver, applyWindShader } from './scenery/WindDriver';
import { DrainageCulvert } from './scenery/Tunnel';
import { PROCEDURAL_TEXTURES, OUTDOOR_MATERIALS } from '../utils/sharedMaterials';
import { RENDER_ORDER } from '../constants/renderLayers';
import { SITE_LAYOUT } from '../constants/siteLayout';
import { generateCobblestoneRoughness } from '../textures';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { createAtmosphereState, sampleAtmosphere } from '../simulation/atmosphere';
import {
  createAnimalWanderPlan,
  getAnimalActivityMultiplier,
  getWindmillAngularSpeed,
  type WanderBounds,
} from '../simulation/ambientWorld';

/** Hoisted so the barnyard material does not allocate a Vector2 per render. */
const FARM_COBBLE_NORMAL_SCALE = new THREE.Vector2(0.4, 0.4);

/**
 * Every lathe profile in this file was designed and previewed in Blender before
 * it was written down - `scripts/blender/specs/gen_farm_windmill.py` generates
 * the points and probes them against the parts they have to sit against, and
 * `scripts/blender/machine_part_preview.py --spec scripts/blender/specs/
 * farm-windmill.json` renders each one at its real instance scale and viewing
 * distance. The numbers below are transcribed from that spec unchanged; if a
 * profile needs to move, change it there, look at the render, and copy back.
 */
const lathe = (points: [number, number][], segments: number) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );

/**
 * Barnyard wallow with an authored, asymmetric shoreline. The old circle only
 * became a smoother circle when its segment count doubled. This keeps the same
 * four-metre maximum footprint while turning the budget into a muddy outline
 * shaped by hoof traffic and drainage.
 */
function createMudPuddleGeometry(): THREE.ShapeGeometry {
  const outline: ReadonlyArray<readonly [number, number]> = [
    [2, 0],
    [1.78, 0.62],
    [1.45, 1.18],
    [0.83, 1.63],
    [0, 1.82],
    [-0.68, 1.67],
    [-1.43, 1.26],
    [-1.92, 0.58],
    [-2, 0],
    [-1.86, -0.72],
    [-1.34, -1.4],
    [-0.55, -1.82],
    [0, -2],
    [0.73, -1.72],
    [1.4, -1.35],
    [1.82, -0.68],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/**
 * Windmill tower - replaces `CylinderGeometry(0.8, 1.2, 6, 20)`, a straight
 * truncated cone. Drawn once at scale 1.5, so 3.6 m across the base and 9 m
 * tall: the tallest thing in the farm and read against open sky.
 *
 * A tower mill is not a cone. Four features carry at 30 m and all four are in
 * this profile:
 *  - a splayed base course, giving a crisp ground line instead of a cut edge;
 *  - a BATTERED wall - the taper is concave, steeper at the foot and near
 *    vertical at the curb, which is what separates masonry from sheet pipe;
 *  - a corbelled reefing gallery at world y 1.86-2.06, the one horizontal break
 *    in the taper (a parapet ring above it was built and rejected on the render:
 *    shelf plus ring reads as a pipe coupling, one shelf reads as a balcony);
 *  - a curb band at world y 5.32-5.68, the ring the cap turns on and the collar
 *    the windshaft emerges from.
 *
 * The batter is load-bearing, not decoration. The blade arms sweep down to
 * world y 2.499 with their inner face at z = 0.975, and the straight cone this
 * replaces is 1.033 wide there - the sails have been passing through the
 * masonry. The battered wall is 0.901 at that height, so they now clear it by
 * 0.074 (0.11 m in world). Nothing between world y 2.5 and 6.0 exceeds 0.862.
 *
 * Envelope is identical to the cone: max radius 1.2, y in [-3, +3]. The top
 * radius is free (0.8 -> 0.64) because it is not on the envelope and is hidden
 * under the cap's underside disc; the narrower top is what turns the cap from a
 * lid into an overhanging crown.
 *
 * 34 profile points at the SAME 20 segments as before - 34 x 21 = 714 vertices
 * (LatheGeometry duplicates the seam ring, so it is points x (segments + 1);
 * the Blender harness prints points x segments and reads 34 low). Drawn once
 * for the single windmill, and it carries no pointer handlers, so it needs no
 * picking proxy.
 */
function createWindmillTowerGeometry(): THREE.LatheGeometry {
  return lathe(
    [
      [0.0, -3.0], // underside cap centre
      [1.2, -3.0], // ground line - envelope max radius
      [1.198, -2.93], // base course, near vertical
      [1.17, -2.88], // chamfer off the base course; the batter springs here
      [1.147, -2.687], // battered wall: concave, sampled every 0.193
      [1.125, -2.493],
      [1.102, -2.3],
      [1.08, -2.107],
      [1.057, -1.913],
      [1.036, -1.72],
      [1.014, -1.527],
      [0.992, -1.333],
      [0.971, -1.14],
      [1.036, -1.108], // gallery corbel springs off the wall
      [1.118, -1.066],
      [1.15, -1.03], // deck edge - the gallery's widest point
      [1.15, -0.986], // deck fascia
      [1.128, -0.962], // kerb chamfer
      [0.986, -0.938], // deck top - the flat that reads as a shadow line
      [0.948, -0.93], // wall resumes
      [0.904, -0.529], // battered wall continues, sampled every 0.401
      [0.862, -0.128],
      [0.821, 0.274],
      [0.782, 0.675],
      [0.744, 1.076],
      [0.708, 1.477],
      [0.674, 1.879],
      [0.646, 2.28],
      [0.8, 2.316], // curb band, corbelled sharply out
      [0.8, 2.68],
      [0.728, 2.72], // chamfer back to the wall
      [0.64, 2.78],
      [0.64, 3.0], // top - hidden under the cap
      [0.0, 3.0],
    ],
    20
  );
}

/**
 * Windmill cap - replaces `ConeGeometry(1, 1.5, 20)`, a plain spike. Drawn at
 * scale 1.5: 3 m across and 2.25 m tall, sitting on a 1.92 m tower top.
 *
 * An ogee ("boat") cap, the English tower-mill form: a boarded fascia with a
 * drip lip at the eave, a near-vertical skirt for the bottom third, a knuckle
 * where the flank turns over into the swell, then a neck, a finial ball and a
 * point. A first pass with the knuckle low read as a plain hemisphere at 9 m;
 * holding the skirt at ~0.93 until y = -0.23 is what makes the ogee legible.
 *
 * Envelope identical to the cone: max radius 1.0, y in [-0.75, +0.75]. That is
 * not a formality - the blade arms sweep vertically through the eave plane at
 * radius 0.975-1.025, so the eave rim holds 1.0 for a single ring at the bottom
 * and tucks in and up immediately, reaching 0.975 at y = -0.707 against the
 * cone's -0.7125. The pre-existing 25 mm graze is unchanged, not deepened.
 *
 * 28 points at the tower's 20 segments so their facet boundaries line up at the
 * eave. 588 vertices, drawn once.
 *
 * Known limit: LatheGeometry averages normals across adjacent profile segments,
 * so the drip lip is a shaded ring rather than a crease. At 9 m the cap reads as
 * dome-plus-eave; the ogee knuckle is the softest feature here. Duplicating the
 * lip's two points would harden it if that ever matters.
 */
function createWindmillCapGeometry(): THREE.LatheGeometry {
  return lathe(
    [
      [0.0, -0.75], // underside centre - envelope min y
      [0.965, -0.75], // underside, flat to just inside the rim
      [1.0, -0.744], // eave rim - envelope max radius
      [0.986, -0.716], // drip lip tucks in and up
      [0.948, -0.686], // head of the boarded fascia
      [0.936, -0.61], // skirt: the boarded flank runs near vertical
      [0.932, -0.48],
      [0.926, -0.35],
      [0.914, -0.232],
      [0.892, -0.128], // knuckle - the ogee turns over here
      [0.852, -0.032],
      [0.788, 0.07],
      [0.7, 0.17],
      [0.596, 0.262],
      [0.478, 0.344],
      [0.352, 0.414],
      [0.238, 0.462],
      [0.14, 0.5],
      [0.08, 0.52],
      [0.058, 0.538], // neck
      [0.052, 0.566],
      [0.136, 0.598], // finial ball
      [0.158, 0.64],
      [0.134, 0.684],
      [0.08, 0.712],
      [0.04, 0.73], // point
      [0.014, 0.75], // envelope max y
      [0.0, 0.75],
    ],
    20
  );
}

/**
 * Windshaft boss - replaces `CylinderGeometry(0.2, 0.2, 0.3, 12)`.
 *
 * The old hub was a plain drum lathed about Y and drawn with no rotation, so it
 * stood as a vertical peg while the sails turned about Z: the one part of the
 * windmill whose axis pointed the wrong way. This profile is lathed about the
 * same axis and the MESH is rotated a quarter turn about X so that axis lies
 * along Z. Rotating swaps which axes the half-extents fall on but not their
 * values or the centre, and the mesh is the only user of the geometry.
 *
 * The shape is a cast-iron poll end: a tail flange that stays buried in the
 * tower's curb band, a waisted barrel, a socket collar wide enough to span the
 * blade-arm plane (boss-local 0.075-0.125, where the arms actually cross), and
 * a domed nose that caps the crossing. The nose is deliberately shallow - the
 * envelope only leaves 0.034 of length past the collar.
 *
 * Envelope unchanged: max radius 0.2, axial half-length 0.15. 16 points at the
 * same 12 segments - 208 vertices, drawn once.
 */
function createWindmillHubGeometry(): THREE.LatheGeometry {
  return lathe(
    [
      [0.0, -0.15], // inboard face centre - envelope min axial
      [0.12, -0.15],
      [0.15, -0.138],
      [0.17, -0.12], // tail flange, buried in the tower curb
      [0.17, -0.094],
      [0.15, -0.08],
      [0.134, -0.03], // waisted barrel
      [0.138, 0.014],
      [0.184, 0.042], // sail-socket collar shoulder
      [0.2, 0.062], // collar - envelope max radius
      [0.2, 0.116], // collar band spans the blade-arm plane
      [0.186, 0.126],
      [0.15, 0.136], // nose cap
      [0.096, 0.146],
      [0.04, 0.15],
      [0.0, 0.15], // nose centre - envelope max axial
    ],
    12
  );
}

/**
 * Scarecrow's straw hat - replaces `ConeGeometry(0.6, 0.4, 8)`.
 *
 * A cone is a party hat. This is a brimmed sun hat: a drooping brim that dips
 * to its lowest at the rim, a crease where the brim breaks upward, a hat band,
 * and a domed crown. 1.2 m across at head height on a scarecrow you walk past,
 * so the brim break and the crown dome both carry.
 *
 * Envelope unchanged: max radius 0.6, y in [-0.2, +0.2]. Two things sit against
 * it and both were probed: the pumpkin head (sphere r 0.35 at hat-local -0.25)
 * stays fully inside the crown at every height, and the crow perches at radius
 * 0.2, where this crown's surface is at local y 0.168 rather than the cone's
 * 0.067 - see the re-seat at the Crow call site.
 *
 * 17 points at 16 segments (the cone had 8 - see the note at the `strawHat`
 * declaration for why the brim needs the extra ring) - 289 vertices, drawn once.
 */
function createStrawHatGeometry(): THREE.LatheGeometry {
  return lathe(
    [
      [0.0, -0.148], // underside centre - a shallow dome under the crown
      [0.21, -0.156],
      [0.39, -0.176],
      [0.522, -0.192],
      [0.6, -0.2], // brim edge - envelope max radius and min y
      [0.545, -0.163], // brim upper face sweeps back up
      [0.438, -0.122],
      [0.356, -0.084],
      [0.326, -0.058], // brim break into the crown
      [0.322, 0.006], // hat band
      [0.31, 0.058],
      [0.292, 0.098], // crown shoulder rounds over
      [0.252, 0.14],
      [0.192, 0.172],
      [0.116, 0.193],
      [0.052, 0.2],
      [0.0, 0.2], // crown top - envelope max y
    ],
    16
  );
}

/**
 * Round hay bale - replaces `CylinderGeometry(0.5, 0.5, 0.8, 16)`.
 *
 * The smallest of these redesigns and the one closest to being left alone: the
 * cylinder's proportions were already right. What it lacked was corners. A
 * machine-rolled bale has no square edge anywhere - the ends roll over into the
 * barrel - and a hard 90 degree rim is what made it read as an oil drum at the
 * 4 m the farm path passes it. The rolled shoulder is the whole of the change
 * and the only part that carries; the wall between the shoulders is straight to
 * within 3 mm, which is honest to a net-wrapped bale and is not a barrel.
 *
 * Envelope unchanged: max radius 0.5 (now at mid-height rather than along the
 * whole wall), axial half-length 0.4. The end face is held flat out to r 0.44 so
 * the twine ring still lies on it; the ring's outer radius comes in to match.
 *
 * 15 points at the same 16 segments - 255 vertices, shared across four bales
 * (four draw calls, one one-off vertex cost).
 */
function createHayBaleGeometry(): THREE.LatheGeometry {
  return lathe(
    [
      [0.0, -0.4],
      [0.23, -0.4],
      [0.44, -0.4], // end face stays flat out to 0.44 for the twine ring
      [0.47, -0.39],
      [0.489, -0.366], // shoulder rolls over
      [0.497, -0.33],
      [0.4995, -0.255],
      [0.5, 0.0], // barrel bulge - envelope max radius
      [0.4995, 0.255],
      [0.497, 0.33],
      [0.489, 0.366],
      [0.47, 0.39],
      [0.44, 0.4],
      [0.23, 0.4],
      [0.0, 0.4],
    ],
    16
  );
}

// Create farm-specific cobble textures with proper world-scale repeat
// Barnyard is 20x15 units, path is 3x14 units - tile every 10 units
const farmBarnyardCobbleColor = PROCEDURAL_TEXTURES.cobblestoneColor.clone();
const farmBarnyardCobbleNormal = PROCEDURAL_TEXTURES.cobblestoneNormal.clone();
// 256/7 matches the cell count of the 512/14 albedo, so polished crowns sit on
// the stones rather than drifting across them.
const farmBarnyardCobbleRoughness = generateCobblestoneRoughness(256, 7).clone();
farmBarnyardCobbleColor.wrapS = farmBarnyardCobbleColor.wrapT = THREE.RepeatWrapping;
farmBarnyardCobbleNormal.wrapS = farmBarnyardCobbleNormal.wrapT = THREE.RepeatWrapping;
farmBarnyardCobbleRoughness.wrapS = farmBarnyardCobbleRoughness.wrapT = THREE.RepeatWrapping;
farmBarnyardCobbleColor.repeat.set(2, 1.5); // 20/10, 15/10
farmBarnyardCobbleNormal.repeat.set(2, 1.5);
farmBarnyardCobbleRoughness.repeat.set(2, 1.5);
farmBarnyardCobbleColor.needsUpdate = true;
farmBarnyardCobbleNormal.needsUpdate = true;
farmBarnyardCobbleRoughness.needsUpdate = true;

const farmPathCobbleColor = PROCEDURAL_TEXTURES.cobblestoneColor.clone();
const farmPathCobbleNormal = PROCEDURAL_TEXTURES.cobblestoneNormal.clone();
farmPathCobbleColor.wrapS = farmPathCobbleColor.wrapT = THREE.RepeatWrapping;
farmPathCobbleNormal.wrapS = farmPathCobbleNormal.wrapT = THREE.RepeatWrapping;
farmPathCobbleColor.repeat.set(0.3, 1.4); // 3/10, 14/10
farmPathCobbleNormal.repeat.set(0.3, 1.4);
farmPathCobbleColor.needsUpdate = true;
farmPathCobbleNormal.needsUpdate = true;

// Module-level reusable temp to avoid per-animal Vector3 allocation in useFrame (GC pressure)
const _animDir = new THREE.Vector3();

// ============================================================
// CUTE FARM AREA - North-West Corner (OPTIMIZED)
// Position: Center at [75, 0, 120] - by the lake
// A charming farm that "supplies the mill" with grain
//
// PERFORMANCE OPTIMIZATIONS:
// - Shared geometries/materials via module-level constants
// - Single useFrame for all animations (throttled to 15 FPS)
// - React.memo on static components
// - Animation throttling: windmill 30 FPS, animals 15 FPS
// ============================================================

// Shared Geometries - created once at module load
const SG = {
  fencePost: new THREE.CylinderGeometry(0.08, 0.1, 1, 6),
  hayBale: createHayBaleGeometry(),
  // 0.43 outer, not 0.48: the bale's end face is now flat only out to r 0.44
  // before the shoulder rolls away, and the old rim floated 44 mm off the hay.
  hayRing: new THREE.RingGeometry(0.2, 0.43, 16),
  troughBody: new THREE.BoxGeometry(1.5, 0.5, 0.6),
  troughWater: new THREE.BoxGeometry(1.3, 0.05, 0.45),
  troughLeg: new THREE.BoxGeometry(0.15, 0.2, 0.5),
  treeTrunk: new THREE.CylinderGeometry(0.4, 0.5, 4, 6),
  treeFoliage: new THREE.ConeGeometry(2.5, 6, 6),
  treeFoliageTop: new THREE.ConeGeometry(1.8, 4, 6),
  gardenFrame: new THREE.BoxGeometry(3, 0.3, 2),
  gardenSoil: new THREE.BoxGeometry(2.8, 0.15, 1.8),
  carrotTop: new THREE.ConeGeometry(0.08, 0.15, 6),
  carrotLeaf: new THREE.ConeGeometry(0.1, 0.2, 4),
  cabbage: new THREE.SphereGeometry(0.2, 8, 8),
  farmGround: new THREE.PlaneGeometry(45, 45),
  mudPuddle: createMudPuddleGeometry(),
  chickenBody: new THREE.SphereGeometry(0.2, 8, 8),
  chickenHead: new THREE.SphereGeometry(0.12, 8, 8),
  chickenBeak: new THREE.ConeGeometry(0.03, 0.08, 4),
  chickenComb: new THREE.BoxGeometry(0.08, 0.1, 0.02),
  chickenWattle: new THREE.SphereGeometry(0.03, 6, 6),
  chickenTail: new THREE.BoxGeometry(0.15, 0.02, 0.1),
  chickenLeg: new THREE.CylinderGeometry(0.015, 0.015, 0.15, 4),
  pigBody: new THREE.SphereGeometry(0.4, 12, 12),
  pigHead: new THREE.SphereGeometry(0.25, 10, 10),
  pigSnout: new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8),
  pigNostril: new THREE.SphereGeometry(0.02, 6, 6),
  pigEar: new THREE.ConeGeometry(0.08, 0.15, 4),
  pigEye: new THREE.SphereGeometry(0.03, 6, 6),
  pigLeg: new THREE.CylinderGeometry(0.06, 0.05, 0.2, 6),
  pigTail: new THREE.TorusGeometry(0.06, 0.02, 8, 12, Math.PI * 1.5),
  cowBody: new THREE.SphereGeometry(0.5, 12, 12),
  cowSpot: new THREE.SphereGeometry(0.18, 8, 8),
  cowSpotSmall: new THREE.SphereGeometry(0.15, 8, 8),
  cowHead: new THREE.BoxGeometry(0.35, 0.3, 0.28),
  cowMuzzle: new THREE.BoxGeometry(0.15, 0.18, 0.22),
  cowNostril: new THREE.SphereGeometry(0.025, 6, 6),
  cowEye: new THREE.SphereGeometry(0.04, 6, 6),
  cowEar: new THREE.BoxGeometry(0.12, 0.06, 0.08),
  cowHorn: new THREE.ConeGeometry(0.03, 0.15, 6),
  cowLeg: new THREE.CylinderGeometry(0.06, 0.05, 0.4, 6),
  cowUdder: new THREE.SphereGeometry(0.12, 8, 8),
  cowTail: new THREE.CylinderGeometry(0.02, 0.015, 0.5, 6),
  cowTailTuft: new THREE.SphereGeometry(0.05, 6, 6),
  sheepBody: new THREE.SphereGeometry(0.45, 12, 12),
  sheepFluff: new THREE.SphereGeometry(0.15, 8, 8),
  sheepHead: new THREE.SphereGeometry(0.18, 10, 10),
  sheepEar: new THREE.BoxGeometry(0.1, 0.05, 0.08),
  sheepEye: new THREE.SphereGeometry(0.025, 6, 6),
  sheepLeg: new THREE.CylinderGeometry(0.04, 0.035, 0.25, 6),
  // The windmill is a 6 m landmark read against open sky. Segment counts here
  // are unchanged (20 for the tower and cap so their facets line up at the
  // eave, 12 for the hub); what changed is the shape - see the profile
  // factories above.
  //
  // Deliberately NOT applied to the trees below: their faceting reads as the
  // site's stylization rather than as a defect, and a smooth cone is no more
  // tree-like than a hexagonal one.
  windmillTower: createWindmillTowerGeometry(),
  windmillCap: createWindmillCapGeometry(),
  windmillHub: createWindmillHubGeometry(),
  windmillBladeArm: new THREE.BoxGeometry(0.15, 3, 0.05),
  windmillBladeSail: new THREE.BoxGeometry(0.5, 2.5, 0.02),
  // 0.18 deep, not 0.1: the battered wall drops from r 1.181 to 0.988 across
  // the door's height, so a 0.1 panel that sat flush at the sill floated 65 mm
  // off the wall at the head. Deeper and tilted (see the call site) it stays
  // 60-70 mm proud along its whole height instead.
  windmillDoor: new THREE.BoxGeometry(0.6, 1.6, 0.18),
  // Grain Field
  cornStalk: new THREE.CylinderGeometry(0.05, 0.08, 1.8, 4),
  cornLeaf: new THREE.ConeGeometry(0.1, 0.8, 3),
  // Scarecrow
  scarecrowPole: new THREE.CylinderGeometry(0.08, 0.08, 2.5, 5),
  scarecrowArm: new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5),
  pumpkinHead: new THREE.SphereGeometry(0.35, 10, 10),
  // 1.2 m brim - the only part of the scarecrow big enough for its shape to
  // read, and a woven hat is a made round thing rather than foliage, so it gets
  // the windmill's treatment and not the tree's. The cone became a brimmed hat
  // (see `createStrawHatGeometry`); segments went 8 -> 16 with it, because at 8
  // the brim's facet chord is 0.46 m on a 1.2 m disc and the rim reads as an
  // octagonal plate from above. The windmill's counts are genuinely unchanged -
  // this one is not, and 289 verts on a singleton is what it costs.
  strawHat: createStrawHatGeometry(),
  crowBody: new THREE.ConeGeometry(0.1, 0.3, 4),
  crowHead: new THREE.SphereGeometry(0.08, 4, 4),
};

// Shared Materials - with procedural textures
const SM = {
  // Painted board siding. `PROCEDURAL_TEXTURES.panelNormal` is dropped here and
  // on every wood/stone/plaster material below rather than replaced: its bevel
  // is 0.64 px at 256, below one texel, so the mip chain erases it and at
  // normalScale 0.1-0.2 it was contributing nothing. The correct replacement
  // (`machinePanelNormal`) is a sheet-metal panel bevel and has no business on
  // barn boards - so the honest fix is no map and one less texture fetch.
  barnRed: new THREE.MeshStandardMaterial({
    color: '#8B2323',
    roughness: 0.8,
  }),
  // Sheet-metal barn roof - the one surface here a panel bevel actually fits.
  // The old `brushedMetal` binding decoded a roughness/metalness/AO pack as a
  // tangent normal, which is a near-constant tilt of about (-0.37, +0.90) over
  // the whole cone: a uniform lighting bias, not relief.
  barnRoof: new THREE.MeshStandardMaterial({
    color: '#4a4a4a',
    roughness: 0.7,
    normalMap: PROCEDURAL_TEXTURES.machinePanelNormal,
    normalScale: new THREE.Vector2(0.6, 0.6),
  }),
  whiteTrim: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.6 }),
  barnDoor: new THREE.MeshStandardMaterial({
    color: '#5d4037',
    roughness: 0.8,
  }),
  barnWindow: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
  // Weathervane finial. F0 0.56 - a genuine CONDUCTOR at metalness 1 (0.7 was
  // the invalid half-metal band). The `roughnessMap` is dropped rather than
  // swapped for the ORM: the cone is 0.3 m, so a 512 map tiled once over it is
  // sub-pixel at any viewing distance and mips to its 0.582 mean. That mean is
  // folded into the authored roughness instead.
  gold: new THREE.MeshStandardMaterial({
    color: '#ffd700',
    roughness: 0.35,
    metalness: 1,
  }),
  // Weathervane spindle: a 0.1 m rod. F0 0.05 - painted iron, DIELECTRIC. Same
  // mis-decoded normal map as `barnRoof` had, dropped outright here because
  // nothing tiled onto a 0.1 m member survives the mip chain.
  darkMetal: new THREE.MeshStandardMaterial({
    color: '#424242',
    roughness: 0.55,
    metalness: 0,
  }),
  chickenFeather: new THREE.MeshStandardMaterial({ color: '#f5f5dc', roughness: 0.9 }),
  chickenBeak: new THREE.MeshStandardMaterial({ color: '#ff9800', roughness: 0.7 }),
  chickenComb: new THREE.MeshStandardMaterial({ color: '#d32f2f', roughness: 0.7 }),
  chickenTail: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.8 }),
  pigPink: new THREE.MeshStandardMaterial({ color: '#ffb6c1', roughness: 0.8 }),
  pigSnout: new THREE.MeshStandardMaterial({ color: '#ff9999', roughness: 0.7 }),
  pigNostril: new THREE.MeshStandardMaterial({ color: '#cc6666', roughness: 0.8 }),
  black: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.5 }),
  cowWhite: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.85 }),
  cowBlack: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.85 }),
  cowMuzzle: new THREE.MeshStandardMaterial({ color: '#ffcccc', roughness: 0.8 }),
  cowNostril: new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.8 }),
  cowHorn: new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.6 }),
  sheepWool: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 1 }),
  sheepFace: new THREE.MeshStandardMaterial({ color: '#2d2d2d', roughness: 0.8 }),
  sheepEye: new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.5 }),
  woodBrown: new THREE.MeshStandardMaterial({
    color: '#5d4037',
    roughness: 0.9,
  }),
  woodLight: new THREE.MeshStandardMaterial({
    color: '#8d6e63',
    roughness: 0.85,
  }),
  woodTan: new THREE.MeshStandardMaterial({
    color: '#a1887f',
    roughness: 0.8,
  }),
  grass: OUTDOOR_MATERIALS.grass, // Use shared grass material for seamless matching
  mud: new THREE.MeshStandardMaterial({
    color: '#ffffff', // Let texture provide color
    roughness: 0.9,
    map: PROCEDURAL_TEXTURES.mudColor,
    roughnessMap: PROCEDURAL_TEXTURES.mudRoughness,
  }),
  soil: new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({
    color: '#d7ccc8',
    roughness: 0.8,
  }),
  // Water is a DIELECTRIC - metalness 0.1 was tinting the specular with the
  // pond's own blue and leaving it chalky now that there is an environment.
  water: new THREE.MeshStandardMaterial({
    color: '#64b5f6',
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: 0.8,
    // Transparent overlay surface: writing depth made the water occlude
    // ground/objects behind it inconsistently by camera angle (sort flicker)
    depthWrite: false,
  }),
  treeTrunk: new THREE.MeshStandardMaterial({
    color: '#5d4037',
    roughness: 0.9,
  }),
  treeLeafDark: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.8 }),
  treeLeafLight: new THREE.MeshStandardMaterial({ color: '#388e3c', roughness: 0.8 }),
  hay: new THREE.MeshStandardMaterial({
    color: '#d4a574',
    roughness: 0.95,
    normalMap: PROCEDURAL_TEXTURES.rubberNormal,
    normalScale: new THREE.Vector2(0.2, 0.2),
  }),
  hayDark: new THREE.MeshStandardMaterial({ color: '#c4956a', roughness: 0.95 }),
  carrotOrange: new THREE.MeshStandardMaterial({ color: '#ff7043', roughness: 0.8 }),
  vegetableGreen: new THREE.MeshStandardMaterial({ color: '#4caf50', roughness: 0.8 }),
  cabbageGreen: new THREE.MeshStandardMaterial({ color: '#81c784', roughness: 0.85 }),
  houseWall: new THREE.MeshStandardMaterial({
    color: '#f5f5dc',
    roughness: 0.75,
  }),
  roofBrown: new THREE.MeshStandardMaterial({
    color: '#8B4513',
    roughness: 0.8,
  }),
  chimneyRed: new THREE.MeshStandardMaterial({ color: '#8B0000', roughness: 0.8 }),
  // Window glass: dielectric.
  windowBlue: new THREE.MeshStandardMaterial({ color: '#87ceeb', roughness: 0.2, metalness: 0 }),
  shutterGreen: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.7 }),
  coopBrown: new THREE.MeshStandardMaterial({
    color: '#8B4513',
    roughness: 0.85,
  }),
  coopDark: new THREE.MeshStandardMaterial({ color: '#6d4c41', roughness: 0.85 }),
  coopRoof: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.7 }),
  windmillSail: new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.7,
    side: THREE.DoubleSide,
  }),
  // Grain Field & Scarecrow. White base: the old flat '#8bc34a' is now
  // supplied per stalk through `instanceColor` (see InstancedGrainField), so
  // keeping the tint here would multiply the crop colour twice.
  cornGreen: new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.9,
    side: THREE.DoubleSide,
  }),
  pumpkinOrange: new THREE.MeshStandardMaterial({ color: '#ff6f00', roughness: 0.8 }),
  strawHat: new THREE.MeshStandardMaterial({ color: '#e6c229', roughness: 1 }),
  denimBlue: new THREE.MeshStandardMaterial({ color: '#1565c0', roughness: 0.9 }),
  plaidRed: new THREE.MeshStandardMaterial({ color: '#b71c1c', roughness: 0.9 }),
  crowBlack: new THREE.MeshStandardMaterial({ color: '#212121', roughness: 0.6 }),
};

// The crop sways. `SM.cornGreen` is consumed ONLY by the three InstancedMeshes
// inside `InstancedGrainField` (grep), and InstancedMesh is already excluded
// from StaticMeshBatch merging, so the `onBeforeCompile` this adds costs no
// batching. Do NOT do this to a building material.
applyWindShader(SM.cornGreen, {
  heightRef: 1.8,
  strengthScale: 1.4,
  cacheKey: 'millos_corn_v1',
});

/** Matching depth material so the crop's shadow sways with the crop. */
const cornDepthMaterial = new THREE.MeshDepthMaterial({
  depthPacking: THREE.RGBADepthPacking,
  side: THREE.DoubleSide,
});
applyWindShader(cornDepthMaterial, {
  heightRef: 1.8,
  strengthScale: 1.4,
  cacheKey: 'millos_corn_v1_depth',
});

interface StaticPartTransform {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

const SHEEP_FLUFF_PARTS: readonly StaticPartTransform[] = [
  { position: [0.2, 0.7, 0.2] },
  { position: [-0.2, 0.75, 0.15] },
  { position: [0, 0.8, -0.2] },
  { position: [0.15, 0.65, -0.25] },
];
const SHEEP_EAR_PARTS: readonly StaticPartTransform[] = [
  { position: [0.35, 0.65, 0.15], rotation: [0, 0.5, 0.5] },
  { position: [0.35, 0.65, -0.15], rotation: [0, -0.5, -0.5] },
];
const SHEEP_EYE_PARTS: readonly StaticPartTransform[] = [
  { position: [0.52, 0.6, 0.08] },
  { position: [0.52, 0.6, -0.08] },
];
const SHEEP_LEG_PARTS: readonly StaticPartTransform[] = [
  { position: [0.2, 0.12, 0.18] },
  { position: [0.2, 0.12, -0.18] },
  { position: [-0.2, 0.12, 0.18] },
  { position: [-0.2, 0.12, -0.18] },
];
const CHICKEN_LEG_PARTS: readonly StaticPartTransform[] = [
  { position: [0.05, 0.08, 0.05] },
  { position: [0.05, 0.08, -0.05] },
];
const PIG_NOSTRIL_PARTS: readonly StaticPartTransform[] = [
  { position: [0.61, 0.37, 0.04] },
  { position: [0.61, 0.37, -0.04] },
];
const PIG_EAR_PARTS: readonly StaticPartTransform[] = [
  { position: [0.25, 0.6, 0.15], rotation: [0.5, 0.3, 0] },
  { position: [0.25, 0.6, -0.15], rotation: [0.5, -0.3, 0] },
];
const PIG_EYE_PARTS: readonly StaticPartTransform[] = [
  { position: [0.5, 0.48, 0.12] },
  { position: [0.5, 0.48, -0.12] },
];
const PIG_LEG_PARTS: readonly StaticPartTransform[] = [
  { position: [0.15, 0.1, 0.2] },
  { position: [0.15, 0.1, -0.2] },
  { position: [-0.15, 0.1, 0.2] },
  { position: [-0.15, 0.1, -0.2] },
];
const COW_NOSTRIL_PARTS: readonly StaticPartTransform[] = [
  { position: [0.88, 0.62, 0.05] },
  { position: [0.88, 0.62, -0.05] },
];
const COW_EYE_PARTS: readonly StaticPartTransform[] = [
  { position: [0.7, 0.78, 0.12] },
  { position: [0.7, 0.78, -0.12] },
];
const COW_EAR_PARTS: readonly StaticPartTransform[] = [
  { position: [0.5, 0.82, 0.18], rotation: [0, 0.5, 0.3] },
  { position: [0.5, 0.82, -0.18], rotation: [0, -0.5, -0.3] },
];
const COW_HORN_PARTS: readonly StaticPartTransform[] = [
  { position: [0.45, 0.92, 0.1], rotation: [0, 0, 0.3] },
  { position: [0.45, 0.92, -0.1], rotation: [0, 0, -0.3] },
];
const COW_LEG_PARTS: readonly StaticPartTransform[] = [
  { position: [0.3, 0.2, 0.25] },
  { position: [0.3, 0.2, -0.25] },
  { position: [-0.35, 0.2, 0.25] },
  { position: [-0.35, 0.2, -0.25] },
];

const InstancedAnimalParts = React.memo<{
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  transforms: readonly StaticPartTransform[];
  castShadow?: boolean;
}>(({ geometry, material, transforms, castShadow = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    transforms.forEach((transform, index) => {
      object.position.fromArray(transform.position);
      object.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      object.scale.fromArray(transform.scale ?? [1, 1, 1]);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [object, transforms]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
      dispose={null}
    />
  );
});
InstancedAnimalParts.displayName = 'InstancedAnimalParts';

// Static components with React.memo
export const Barn = React.memo<{ position: [number, number, number] }>(({ position }) => (
  <group position={position}>
    <mesh position={[0, 3, 0]} castShadow receiveShadow>
      <boxGeometry args={[10, 6, 8]} />
      <primitive object={SM.barnRed} attach="material" />
    </mesh>
    <mesh position={[0, 11, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <cylinderGeometry args={[0, 6.5, 10, 4]} />
      <primitive object={SM.barnRoof} attach="material" />
    </mesh>
    <mesh position={[0, 0.15, 4.01]}>
      <boxGeometry args={[10.2, 0.3, 0.1]} />
      <primitive object={SM.whiteTrim} attach="material" />
    </mesh>
    <mesh position={[5.01, 3, 0]}>
      <boxGeometry args={[0.1, 6.2, 8.2]} />
      <primitive object={SM.whiteTrim} attach="material" />
    </mesh>
    <mesh position={[-5.01, 3, 0]}>
      <boxGeometry args={[0.1, 6.2, 8.2]} />
      <primitive object={SM.whiteTrim} attach="material" />
    </mesh>
    <mesh position={[-1.5, 2, 4.05]}>
      <boxGeometry args={[2.5, 4, 0.1]} />
      <primitive object={SM.barnDoor} attach="material" />
    </mesh>
    <mesh position={[1.5, 2, 4.05]}>
      <boxGeometry args={[2.5, 4, 0.1]} />
      <primitive object={SM.barnDoor} attach="material" />
    </mesh>
    {[-1.5, 1.5].map((x) => (
      <React.Fragment key={x}>
        <mesh position={[x, 2, 4.1]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 5, 0.05]} />
          <primitive object={SM.whiteTrim} attach="material" />
        </mesh>
        <mesh position={[x, 2, 4.1]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.15, 5, 0.05]} />
          <primitive object={SM.whiteTrim} attach="material" />
        </mesh>
      </React.Fragment>
    ))}
    {/* Gable louvre: a 1.6 m near-black disc face-on against red siding, so its
        OUTLINE is the whole read and a 16-gon showed its corners (0.312 m facet
        chord). 32 halves that for 16 vertices on a mesh drawn once, and stays a
        multiple of 4 so the disc still reaches exactly +-0.8. */}
    <mesh position={[0, 5, 4.05]}>
      <circleGeometry args={[0.8, 32]} />
      <primitive object={SM.barnWindow} attach="material" />
    </mesh>
    <mesh position={[0, 16.75, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
      <primitive object={SM.darkMetal} attach="material" />
    </mesh>
    <mesh position={[0.3, 17.25, 0]} castShadow>
      <coneGeometry args={[0.15, 0.6, 4]} />
      <primitive object={SM.gold} attach="material" />
    </mesh>
  </group>
));
Barn.displayName = 'Barn';

const ChickenCoop = React.memo<{ position: [number, number, number] }>(({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
      <boxGeometry args={[3, 1.6, 2.5]} />
      <primitive object={SM.coopBrown} attach="material" />
    </mesh>
    {/* A-Frame Roof */}
    <mesh position={[0, 2.3, 0.75]} rotation={[Math.PI / 4, 0, 0]} castShadow>
      <boxGeometry args={[3.5, 0.15, 2]} />
      <primitive object={SM.coopRoof} attach="material" />
    </mesh>
    <mesh position={[0, 2.3, -0.75]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
      <boxGeometry args={[3.5, 0.15, 2]} />
      <primitive object={SM.coopRoof} attach="material" />
    </mesh>
    {/* Raised Door */}
    <mesh position={[1.51, 0.68, 0]}>
      <boxGeometry args={[0.1, 0.6, 0.5]} />
      <primitive object={SM.black} attach="material" />
    </mesh>
    {/* Ramp - Reversed slope */}
    <mesh position={[2.2, 0.2, 0]} rotation={[0, 0, -0.4]} castShadow>
      <boxGeometry args={[1.5, 0.08, 0.4]} />
      <primitive object={SM.woodTan} attach="material" />
    </mesh>
    <mesh position={[-1.6, 0.6, 0]} castShadow>
      <boxGeometry args={[0.5, 0.8, 2]} />
      <primitive object={SM.coopDark} attach="material" />
    </mesh>
  </group>
));
ChickenCoop.displayName = 'ChickenCoop';

const FenceSection = React.memo<{
  position: [number, number, number];
  rotation?: number;
  length?: number;
}>(({ position, rotation = 0, length = 4 }) => {
  const railGeom = useMemo(() => new THREE.BoxGeometry(length, 0.08, 0.06), [length]);
  // Dispose the per-instance rail geometry on unmount / length change
  // (matches the Machines.tsx convention; previously leaked on remount).
  useEffect(() => () => railGeom.dispose(), [railGeom]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[-length / 2, 0.5, 0]} castShadow>
        <primitive object={SG.fencePost} attach="geometry" />
        <primitive object={SM.woodBrown} attach="material" />
      </mesh>
      <mesh position={[length / 2, 0.5, 0]} castShadow>
        <primitive object={SG.fencePost} attach="geometry" />
        <primitive object={SM.woodBrown} attach="material" />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <primitive object={railGeom} attach="geometry" />
        <primitive object={SM.woodLight} attach="material" />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <primitive object={railGeom} attach="geometry" />
        <primitive object={SM.woodLight} attach="material" />
      </mesh>
    </group>
  );
});
FenceSection.displayName = 'FenceSection';

const HayBale = React.memo<{ position: [number, number, number]; rotation?: number }>(
  ({ position, rotation = 0 }) => (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <primitive object={SG.hayBale} attach="geometry" />
        <primitive object={SM.hay} attach="material" />
      </mesh>
      <mesh position={[0, 0.4, 0.41]}>
        <primitive object={SG.hayRing} attach="geometry" />
        <primitive object={SM.hayDark} attach="material" />
      </mesh>
    </group>
  )
);
HayBale.displayName = 'HayBale';

const WaterTrough = React.memo<{ position: [number, number, number]; rotation?: number }>(
  ({ position, rotation = 0 }) => (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <primitive object={SG.troughBody} attach="geometry" />
        <primitive object={SM.woodBrown} attach="material" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <primitive object={SG.troughWater} attach="geometry" />
        <primitive object={SM.water} attach="material" />
      </mesh>
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.1, 0]} castShadow>
          <primitive object={SG.troughLeg} attach="geometry" />
          <primitive object={SM.woodBrown} attach="material" />
        </mesh>
      ))}
    </group>
  )
);
WaterTrough.displayName = 'WaterTrough';

const GardenBed = React.memo<{ position: [number, number, number] }>(({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.15, 0]} receiveShadow>
      <primitive object={SG.gardenFrame} attach="geometry" />
      <primitive object={SM.woodBrown} attach="material" />
    </mesh>
    <mesh position={[0, 0.25, 0]} receiveShadow>
      <primitive object={SG.gardenSoil} attach="geometry" />
      <primitive object={SM.soil} attach="material" />
    </mesh>
    {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
      <group key={`carrot-${i}`} position={[x, 0.35, -0.5]}>
        <mesh castShadow>
          <primitive object={SG.carrotTop} attach="geometry" />
          <primitive object={SM.carrotOrange} attach="material" />
        </mesh>
        <mesh position={[0, 0.12, 0]} castShadow>
          <primitive object={SG.carrotLeaf} attach="geometry" />
          <primitive object={SM.vegetableGreen} attach="material" />
        </mesh>
      </group>
    ))}
    {[-0.6, 0, 0.6].map((x, i) => (
      <mesh key={`cabbage-${i}`} position={[x, 0.4, 0.4]} castShadow>
        <primitive object={SG.cabbage} attach="geometry" />
        <primitive object={SM.cabbageGreen} attach="material" />
      </mesh>
    ))}
  </group>
));
GardenBed.displayName = 'GardenBed';

export const Farmhouse = React.memo<{ position: [number, number, number] }>(({ position }) => (
  <group position={position}>
    <mesh position={[0, 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[6, 4, 5]} />
      <primitive object={SM.houseWall} attach="material" />
    </mesh>
    <mesh position={[0, 7.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <cylinderGeometry args={[0, 4, 6.5, 4]} />
      <primitive object={SM.roofBrown} attach="material" />
    </mesh>
    <mesh position={[2, 5.5, 0]} castShadow>
      <boxGeometry args={[0.8, 2, 0.8]} />
      <primitive object={SM.chimneyRed} attach="material" />
    </mesh>
    <mesh position={[0, 1.2, 2.51]}>
      <boxGeometry args={[1.2, 2.2, 0.1]} />
      <primitive object={SM.barnDoor} attach="material" />
    </mesh>
    {[
      [-1.8, 2.5, 2.51],
      [1.8, 2.5, 2.51],
    ].map((pos, i) => (
      <group key={i} position={pos as [number, number, number]}>
        <mesh>
          <boxGeometry args={[1, 1.2, 0.1]} />
          <primitive object={SM.windowBlue} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[1.1, 0.08, 0.05]} />
          <primitive object={SM.whiteTrim} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.08, 1.3, 0.05]} />
          <primitive object={SM.whiteTrim} attach="material" />
        </mesh>
      </group>
    ))}
    {[-2.4, -1.2, 1.2, 2.4].map((x, i) => (
      <mesh key={`shutter-${i}`} position={[x, 2.5, 2.51]}>
        <boxGeometry args={[0.3, 1.2, 0.08]} />
        <primitive object={SM.shutterGreen} attach="material" />
      </mesh>
    ))}
    <mesh position={[0, 0.15, 3.2]} receiveShadow>
      <boxGeometry args={[4, 0.3, 1.5]} />
      <primitive object={SM.woodLight} attach="material" />
    </mesh>
    {[-1.5, 1.5].map((x, i) => (
      <mesh key={i} position={[x, 1.2, 3.8]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2.1, 8]} />
        <primitive object={SM.whiteTrim} attach="material" />
      </mesh>
    ))}
    <mesh position={[0, 2.3, 3.5]} rotation={[0.2, 0, 0]} castShadow>
      <boxGeometry args={[4.5, 0.15, 2]} />
      <primitive object={SM.roofBrown} attach="material" />
    </mesh>
  </group>
));
Farmhouse.displayName = 'Farmhouse';

const Sheep = React.memo<{
  position: [number, number, number];
  rotation?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  groupRef?: React.RefObject<THREE.Group | null>;
}>(({ position, rotation = 0, onClick, groupRef }) => (
  <group
    ref={groupRef}
    position={position}
    rotation={[0, rotation, 0]}
    onClick={(e) => {
      if (onClick) {
        e.stopPropagation();
        onClick(e);
      }
    }}
  >
    <mesh position={[0, 0.5, 0]} castShadow>
      <primitive object={SG.sheepBody} attach="geometry" />
      <primitive object={SM.sheepWool} attach="material" />
    </mesh>
    <InstancedAnimalParts
      geometry={SG.sheepFluff}
      material={SM.sheepWool}
      transforms={SHEEP_FLUFF_PARTS}
      castShadow
    />
    <mesh position={[0.4, 0.55, 0]} castShadow>
      <primitive object={SG.sheepHead} attach="geometry" />
      <primitive object={SM.sheepFace} attach="material" />
    </mesh>
    <InstancedAnimalParts
      geometry={SG.sheepEar}
      material={SM.sheepFace}
      transforms={SHEEP_EAR_PARTS}
      castShadow
    />
    <InstancedAnimalParts
      geometry={SG.sheepEye}
      material={SM.sheepEye}
      transforms={SHEEP_EYE_PARTS}
    />
    <InstancedAnimalParts
      geometry={SG.sheepLeg}
      material={SM.sheepFace}
      transforms={SHEEP_LEG_PARTS}
      castShadow
    />
  </group>
));
Sheep.displayName = 'Sheep';

// Animated components with refs for centralized animation
// Movement interface
interface AnimalState {
  target: THREE.Vector3;
  isIdle: boolean;
  idleTime: number;
  seed: number;
  sequenceStep: number;
}

const CHICKEN_WANDER_BOUNDS: WanderBounds = { minX: 9, maxX: 15, minZ: -8, maxZ: -2 };
const PIG_WANDER_BOUNDS: WanderBounds = { minX: -14, maxX: -10, minZ: -7, maxZ: -3 };
const COW_WANDER_BOUNDS: WanderBounds = { minX: -5, maxX: 15, minZ: 10, maxZ: 20 };

const createAnimalState = (seed: number, bounds: WanderBounds): AnimalState => {
  const plan = createAnimalWanderPlan(seed, 0, bounds);
  return {
    target: new THREE.Vector3(plan.x, 0, plan.z),
    isIdle: false,
    idleTime: 0,
    seed,
    sequenceStep: 1,
  };
};

const _farmAtmosphere = createAtmosphereState();

const Chicken: React.FC<{
  position: [number, number, number];
  rotation?: number;
  groupRef: React.RefObject<THREE.Group | null>;
  animRef: React.RefObject<THREE.Group | null>;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}> = ({ position, rotation = 0, groupRef, animRef, onClick }) => (
  <group
    ref={groupRef}
    position={position}
    rotation={[0, rotation, 0]}
    onClick={(e) => {
      if (onClick) {
        e.stopPropagation();
        onClick(e);
      }
    }}
  >
    <group ref={animRef}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <primitive object={SG.chickenBody} attach="geometry" />
        <primitive object={SM.chickenFeather} attach="material" />
      </mesh>
      <mesh position={[0.15, 0.4, 0]} castShadow>
        <primitive object={SG.chickenHead} attach="geometry" />
        <primitive object={SM.chickenFeather} attach="material" />
      </mesh>
      <mesh position={[0.28, 0.38, 0]} rotation={[0, 0, -0.3]} castShadow>
        <primitive object={SG.chickenBeak} attach="geometry" />
        <primitive object={SM.chickenBeak} attach="material" />
      </mesh>
      <mesh position={[0.15, 0.52, 0]} castShadow>
        <primitive object={SG.chickenComb} attach="geometry" />
        <primitive object={SM.chickenComb} attach="material" />
      </mesh>
      <mesh position={[0.2, 0.32, 0]} castShadow>
        <primitive object={SG.chickenWattle} attach="geometry" />
        <primitive object={SM.chickenComb} attach="material" />
      </mesh>
      <mesh position={[-0.2, 0.35, 0]} rotation={[0, 0, 0.8]} castShadow>
        <primitive object={SG.chickenTail} attach="geometry" />
        <primitive object={SM.chickenTail} attach="material" />
      </mesh>
    </group>
    <InstancedAnimalParts
      geometry={SG.chickenLeg}
      material={SM.chickenBeak}
      transforms={CHICKEN_LEG_PARTS}
      castShadow
    />
  </group>
);

const Pig: React.FC<{
  position: [number, number, number];
  rotation?: number;
  groupRef: React.RefObject<THREE.Group | null>;
  tailRef: React.RefObject<THREE.Mesh | null>;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}> = ({ position, rotation = 0, groupRef, tailRef, onClick }) => (
  <group
    ref={groupRef}
    position={position}
    rotation={[0, rotation, 0]}
    onClick={(e) => {
      if (onClick) {
        e.stopPropagation();
        onClick(e);
      }
    }}
  >
    <mesh position={[0, 0.35, 0]} castShadow>
      <primitive object={SG.pigBody} attach="geometry" />
      <primitive object={SM.pigPink} attach="material" />
    </mesh>
    <mesh position={[0.35, 0.4, 0]} castShadow>
      <primitive object={SG.pigHead} attach="geometry" />
      <primitive object={SM.pigPink} attach="material" />
    </mesh>
    <mesh position={[0.55, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <primitive object={SG.pigSnout} attach="geometry" />
      <primitive object={SM.pigSnout} attach="material" />
    </mesh>
    <InstancedAnimalParts
      geometry={SG.pigNostril}
      material={SM.pigNostril}
      transforms={PIG_NOSTRIL_PARTS}
    />
    <InstancedAnimalParts
      geometry={SG.pigEar}
      material={SM.pigPink}
      transforms={PIG_EAR_PARTS}
      castShadow
    />
    <InstancedAnimalParts geometry={SG.pigEye} material={SM.black} transforms={PIG_EYE_PARTS} />
    <InstancedAnimalParts
      geometry={SG.pigLeg}
      material={SM.pigPink}
      transforms={PIG_LEG_PARTS}
      castShadow
    />
    <mesh ref={tailRef} position={[-0.4, 0.45, 0]} rotation={[0, 0, 0.5]} castShadow>
      <primitive object={SG.pigTail} attach="geometry" />
      <primitive object={SM.pigPink} attach="material" />
    </mesh>
  </group>
);

const Cow: React.FC<{
  position: [number, number, number];
  rotation?: number;
  groupRef: React.RefObject<THREE.Group | null>;
  headRef: React.RefObject<THREE.Group | null>;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}> = ({ position, rotation = 0, groupRef, headRef, onClick }) => (
  <group
    ref={groupRef}
    position={position}
    rotation={[0, rotation, 0]}
    onClick={(e) => {
      if (onClick) {
        e.stopPropagation();
        onClick(e);
      }
    }}
  >
    <mesh position={[0, 0.6, 0]} scale={[1.3, 1, 1]} castShadow>
      <primitive object={SG.cowBody} attach="geometry" />
      <primitive object={SM.cowWhite} attach="material" />
    </mesh>
    <mesh position={[0.2, 0.8, 0.3]} castShadow>
      <primitive object={SG.cowSpot} attach="geometry" />
      <primitive object={SM.cowBlack} attach="material" />
    </mesh>
    <mesh position={[-0.3, 0.5, -0.25]} castShadow>
      <primitive object={SG.cowSpotSmall} attach="geometry" />
      <primitive object={SM.cowBlack} attach="material" />
    </mesh>
    <group ref={headRef}>
      <mesh position={[0.6, 0.7, 0]} castShadow>
        <primitive object={SG.cowHead} attach="geometry" />
        <primitive object={SM.cowWhite} attach="material" />
      </mesh>
      <mesh position={[0.8, 0.6, 0]} castShadow>
        <primitive object={SG.cowMuzzle} attach="geometry" />
        <primitive object={SM.cowMuzzle} attach="material" />
      </mesh>
      <InstancedAnimalParts
        geometry={SG.cowNostril}
        material={SM.cowNostril}
        transforms={COW_NOSTRIL_PARTS}
      />
      <InstancedAnimalParts geometry={SG.cowEye} material={SM.black} transforms={COW_EYE_PARTS} />
      <InstancedAnimalParts
        geometry={SG.cowEar}
        material={SM.cowWhite}
        transforms={COW_EAR_PARTS}
        castShadow
      />
      <InstancedAnimalParts
        geometry={SG.cowHorn}
        material={SM.cowHorn}
        transforms={COW_HORN_PARTS}
        castShadow
      />
    </group>
    <InstancedAnimalParts
      geometry={SG.cowLeg}
      material={SM.cowWhite}
      transforms={COW_LEG_PARTS}
      castShadow
    />
    <mesh position={[-0.15, 0.25, 0]} castShadow>
      <primitive object={SG.cowUdder} attach="geometry" />
      <primitive object={SM.cowMuzzle} attach="material" />
    </mesh>
    <mesh position={[-0.65, 0.7, 0]} rotation={[0, 0, 0.8]} castShadow>
      <primitive object={SG.cowTail} attach="geometry" />
      <primitive object={SM.cowWhite} attach="material" />
    </mesh>
    <mesh position={[-0.85, 0.45, 0]} castShadow>
      <primitive object={SG.cowTailTuft} attach="geometry" />
      <primitive object={SM.cowBlack} attach="material" />
    </mesh>
  </group>
);

export const WindmillComp: React.FC<{
  position: [number, number, number];
  scale?: number;
  bladesRef: React.RefObject<THREE.Group | null>;
}> = ({ position, scale = 1, bladesRef }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 3, 0]} castShadow>
      <primitive object={SG.windmillTower} attach="geometry" />
      <primitive object={SM.stone} attach="material" />
    </mesh>
    <mesh position={[0, 6.5, 0]} castShadow>
      <primitive object={SG.windmillCap} attach="geometry" />
      <primitive object={SM.woodBrown} attach="material" />
    </mesh>
    {/* Quarter turn about X lays the boss along Z, the axis the sails turn
        about. Its tail stays buried in the tower's curb band and its collar
        spans the plane the blade arms cross in. */}
    <mesh position={[0, 5.5, 0.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <primitive object={SG.windmillHub} attach="geometry" />
      <primitive object={SM.woodBrown} attach="material" />
    </mesh>
    <group ref={bladesRef} position={[0, 5.5, 1]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <primitive object={SG.windmillBladeArm} attach="geometry" />
            <primitive object={SM.woodLight} attach="material" />
          </mesh>
          <mesh position={[0.2, 1.5, 0.02]} castShadow>
            <primitive object={SG.windmillBladeSail} attach="geometry" />
            <primitive object={SM.windmillSail} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
    {/* Re-seated for the battered wall. A flat panel cannot hug a curve, so the
        door is leaned back by the wall's own slope over its height (r 1.181 at
        the sill, 0.988 at the head: atan(0.193 / 1.6) = 6.87 deg) and centred
        on the wall radius at its mid-height. It then stands 65-72 mm proud (72
        at the sill, 69 mid, 65 at the head) instead of wedging. */}
    <mesh position={[0, 0.9, 1.059]} rotation={[-0.1199, 0, 0]}>
      <primitive object={SG.windmillDoor} attach="geometry" />
      <primitive object={SM.woodBrown} attach="material" />
    </mesh>
  </group>
);

// ===== HORSE (Adapted from VillageArea) =====
const Horse = React.memo<{
  position: [number, number, number];
  rotation?: number;
  color?: string;
  isPaint?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}>(({ position, rotation = 0, color = '#8d6e63', isPaint = false, onClick }) => (
  <group
    position={position}
    rotation={[0, rotation, 0]}
    scale={0.6}
    onClick={(e) => {
      if (onClick) {
        e.stopPropagation();
        onClick(e);
      }
    }}
  >
    {/* Main Body Group */}
    <group position={[0, 1.4, 0]}>
      {/* Torso */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 1.2, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Shoulders */}
      <mesh position={[0, 0.1, 0.7]} castShadow>
        <sphereGeometry args={[0.62, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Hindquarters */}
      <mesh position={[0, 0.15, -0.7]} castShadow>
        <sphereGeometry args={[0.65, 12, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Paint Spots (if isPaint is true) */}
      {isPaint && (
        <>
          <mesh position={[0.4, 0.2, 0.3]} rotation={[0, 1, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
          <mesh position={[-0.4, 0.1, -0.4]} rotation={[0, -1, 0]}>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
        </>
      )}
    </group>

    {/* Neck - Max upright/proud */}
    <group position={[0, 2.1, 0.9]} rotation={[0.4, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.45, 1.2, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Paint Spot on Neck */}
      {isPaint && (
        <mesh position={[0.15, 0.6, 0.1]} rotation={[0, 0, -0.2]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#f5f5f5" />
        </mesh>
      )}
      {/* Mane */}
      <mesh position={[0, 0.4, -0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.1, 1.3, 0.2]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
    </group>

    {/* Head */}
    <group position={[0, 3.1, 1.6]} rotation={[0.3, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.35, 0.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.05, 0.35]} castShadow>
        <boxGeometry args={[0.25, 0.25, 0.4]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      {/* Face Blaze (if paint) */}
      {isPaint && (
        <mesh position={[0, 0.18, 0.2]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.15, 0.02, 0.4]} />
          <meshStandardMaterial color="#f5f5f5" />
        </mesh>
      )}
      {/* Ears - Larger and more prominent */}
      {[-0.12, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.35, -0.2]} rotation={[0.2, 0, x > 0 ? -0.3 : 0.3]}>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {/* Eyes - Moved to side of head */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={i} position={[x, 0.1, 0.1]}>
          <sphereGeometry args={[0.065, 8, 8]} />
          <meshStandardMaterial color="black" />
        </mesh>
      ))}
      {/* Forelock */}
      <mesh position={[0, 0.2, 0.2]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.05, 0.2, 0.3]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
    </group>

    {/* Legs */}
    {/* Front Left */}
    <group position={[-0.35, 1.4, 0.7]}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.1, 0.11, 0.7, 8]} />
        <meshStandardMaterial color={isPaint ? '#f5f5f5' : color} />
      </mesh>{' '}
      {/* White sock */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshStandardMaterial color="#1a1110" />
      </mesh>
    </group>
    {/* Front Right */}
    <group position={[0.35, 1.4, 0.7]}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.1, 0.11, 0.7, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshStandardMaterial color="#1a1110" />
      </mesh>
    </group>
    {/* Back Left */}
    <group position={[-0.35, 1.4, -0.7]}>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshStandardMaterial color="#1a1110" />
      </mesh>
    </group>
    {/* Back Right */}
    <group position={[0.35, 1.4, -0.7]}>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.8, 8]} />
        <meshStandardMaterial color={isPaint ? '#f5f5f5' : color} />
      </mesh>{' '}
      {/* White sock */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 8]} />
        <meshStandardMaterial color="#1a1110" />
      </mesh>
    </group>

    {/* Tail */}
    <group position={[0, 1.7, -1.0]} rotation={[0.2, 0, 0]}>
      <mesh position={[0, -0.4, -0.2]} rotation={[-0.2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.15, 1.2, 8]} />
        <meshStandardMaterial color={isPaint ? '#f5f5f5' : '#3e2723'} />{' '}
        {/* White tail tip option or mixed */}
      </mesh>
    </group>
  </group>
));
Horse.displayName = 'Horse';

const Crow = React.memo<{ position: [number, number, number]; rotation?: number }>(
  ({ position, rotation = 0 }) => {
    const [isExcited, setIsExcited] = useState(false);
    const [hearts, setHearts] = useState<{ id: number; pos: [number, number, number] }[]>([]);
    const nextHeartId = useRef(0);

    const handlePet = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setIsExcited(true);
      playCritterSound('crow');
      const id = nextHeartId.current++;
      setHearts((prev) => [...prev, { id, pos: [0, 1.0, 0] }]);
    };

    const removeHeart = (id: number) => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    };

    useEffect(() => {
      if (isExcited) {
        const t = setTimeout(() => setIsExcited(false), 500);
        return () => clearTimeout(t);
      }
    }, [isExcited]);

    return (
      <group position={position} rotation={[0, rotation, 0]} scale={0.6} onClick={handlePet}>
        <group rotation={[isExcited ? 0.5 : 0, 0, 0]} position={[0, isExcited ? 0.2 : 0, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <primitive object={SG.crowBody} attach="geometry" />
            <primitive object={SM.crowBlack} attach="material" />
          </mesh>
          <mesh position={[0, 0.35, 0.1]}>
            <primitive object={SG.crowHead} attach="geometry" />
            <primitive object={SM.crowBlack} attach="material" />
          </mesh>
          {/* Beak */}
          <mesh position={[0, 0.35, 0.18]} rotation={[1.5, 0, 0]}>
            <coneGeometry args={[0.03, 0.1, 4]} />
            <meshStandardMaterial color="#fb8c00" />
          </mesh>
          {/* Wings */}
          <mesh position={[0.12, 0.2, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.05, 0.25, 0.15]} />
            <primitive object={SM.crowBlack} attach="material" />
          </mesh>
          <mesh position={[-0.12, 0.2, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.05, 0.25, 0.15]} />
            <primitive object={SM.crowBlack} attach="material" />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.1, -0.15]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.1, 0.2, 0.02]} />
            <primitive object={SM.crowBlack} attach="material" />
          </mesh>
        </group>
        {hearts.map((h) => (
          <HeartParticle key={h.id} position={h.pos} onComplete={() => removeHeart(h.id)} />
        ))}
      </group>
    );
  }
);
Crow.displayName = 'Crow';

const Scarecrow = React.memo<{ position: [number, number, number]; rotation?: number }>(
  ({ position, rotation = 0 }) => (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Pole */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <primitive object={SG.scarecrowPole} attach="geometry" />
        <primitive object={SM.woodBrown} attach="material" />
      </mesh>
      {/* Arms */}
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, 1.57]} castShadow>
        <primitive object={SG.scarecrowArm} attach="geometry" />
        <primitive object={SM.woodBrown} attach="material" />
      </mesh>
      {/* Shirt */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.55, 0.9, 0.3]} />
        <primitive object={SM.plaidRed} attach="material" />
      </mesh>
      {/* Straw hands */}
      <mesh position={[0.9, 1.8, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <primitive object={SM.hay} attach="material" />
      </mesh>
      <mesh position={[-0.9, 1.8, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <primitive object={SM.hay} attach="material" />
      </mesh>
      {/* Jeans */}
      <group position={[0, 1.0, 0]}>
        <mesh position={[-0.15, 0, 0]}>
          <boxGeometry args={[0.18, 0.9, 0.22]} />
          <primitive object={SM.denimBlue} attach="material" />
        </mesh>
        <mesh position={[0.15, 0, 0]}>
          <boxGeometry args={[0.18, 0.9, 0.22]} />
          <primitive object={SM.denimBlue} attach="material" />
        </mesh>
      </group>
      {/* Scarf */}
      <mesh position={[0, 2.25, 0]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[0.2, 0.08, 8, 16]} />
        <meshStandardMaterial color="#d32f2f" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <primitive object={SG.pumpkinHead} attach="geometry" />
        <primitive object={SM.pumpkinOrange} attach="material" />
      </mesh>
      {/* Eyes/Mouth */}
      <mesh position={[0.12, 2.55, 0.28]} rotation={[0.2, 0.2, 0]}>
        <coneGeometry args={[0.06, 0.05, 3]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      <mesh position={[-0.12, 2.55, 0.28]} rotation={[0.2, -0.2, 0]}>
        <coneGeometry args={[0.06, 0.05, 3]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      <mesh position={[0, 2.45, 0.3]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.08, 0.02, 3, 8, 3]} /> {/* Smile */}
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      {/* Hat */}
      <mesh position={[0, 2.85, 0]} castShadow>
        <primitive object={SG.strawHat} attach="geometry" />
        <primitive object={SM.strawHat} attach="material" />
      </mesh>
      {/* Crow on Hat. Seated on the crown at radius 0.2, where the new profile's
          surface sits at hat-local y 0.168. It was at 3.05, the cone's apex
          height, and so had been perching 0.13 m above the cone's actual
          surface at that radius. */}
      <Crow position={[0.2, 3.018, 0]} rotation={0.5} />
    </group>
  )
);
Scarecrow.displayName = 'Scarecrow';

const InstancedGrainField = React.memo(() => {
  const stalksRef = useRef<THREE.InstancedMesh>(null);
  const leaves1Ref = useRef<THREE.InstancedMesh>(null);
  const leaves2Ref = useRef<THREE.InstancedMesh>(null);
  const count = 15 * 20;

  // The custom depth material carries the same wind injection, or the crop's
  // shadow stays rigid while the crop itself sways - which reads as a bug in
  // the lighting rather than as weather.
  useEffect(() => {
    [stalksRef.current, leaves1Ref.current, leaves2Ref.current].forEach((mesh) => {
      if (mesh) mesh.customDepthMaterial = cornDepthMaterial;
    });
  }, []);

  useEffect(() => {
    if (!stalksRef.current || !leaves1Ref.current || !leaves2Ref.current) return;

    // Temp objects for matrix calculations
    const parent = new THREE.Object3D();
    const leaf = new THREE.Object3D();
    const tint = new THREE.Color();
    let idx = 0;

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 20; c++) {
        // Stable randomness based on grid position
        const rnd = Math.sin(r * 20 + c) * 1000;
        const rndScale = 0.8 + (Math.abs(rnd) % 0.4);
        const rndRot = Math.abs(rnd) % Math.PI;
        const rndOffsetX = Math.sin(rnd) * 0.5;
        const rndOffsetZ = Math.cos(rnd) * 0.5;

        const x = (c - 10) * 1.5 + rndOffsetX;
        const z = (r - 7) * 1.5 + rndOffsetZ;

        // Set parent transform (Stalk base)
        parent.position.set(x, 0, z);
        parent.rotation.set(0, rndRot, 0);
        parent.scale.set(rndScale, rndScale, rndScale);
        parent.updateMatrix();

        // Stalk mesh (offset locally by 0.9y)
        leaf.position.set(0, 0.9, 0);
        leaf.rotation.set(0, 0, 0);
        leaf.scale.set(1, 1, 1);
        leaf.updateMatrix();
        leaf.matrix.premultiply(parent.matrix);
        stalksRef.current.setMatrixAt(idx, leaf.matrix);

        // Leaf 1
        leaf.position.set(0, 1.2, 0.2);
        leaf.rotation.set(0.5, 0, 0);
        leaf.scale.set(1, 1, 1);
        leaf.updateMatrix();
        leaf.matrix.premultiply(parent.matrix);
        leaves1Ref.current.setMatrixAt(idx, leaf.matrix);

        // Leaf 2
        leaf.position.set(0, 1.0, -0.2);
        leaf.rotation.set(-0.5, 0, 0);
        leaf.scale.set(1, 1, 1);
        leaf.updateMatrix();
        leaf.matrix.premultiply(parent.matrix);
        leaves2Ref.current.setMatrixAt(idx, leaf.matrix);

        // Per-stalk tint: a 300-stalk field on one flat green reads as a
        // printed texture. Rides `instanceColor`, NOT `vertexColors` - the
        // geometry has no `color` attribute and USE_COLOR in the vertex stage
        // would multiply by an absent attribute (0,0,0,1) and blacken the crop.
        // Brackets the old flat '#8bc34a' (HSL ~0.244/0.50/0.53): green where
        // the crop is still young, golden where it has ripened.
        const ripeness = Math.abs(Math.sin(r * 3.7 + c * 1.9)) % 1;
        tint.setHSL(0.26 - ripeness * 0.11, 0.46 + ripeness * 0.16, 0.46 + ripeness * 0.12);
        stalksRef.current.setColorAt(idx, tint);
        leaves1Ref.current.setColorAt(idx, tint);
        leaves2Ref.current.setColorAt(idx, tint);

        idx++;
      }
    }

    stalksRef.current.instanceMatrix.needsUpdate = true;
    leaves1Ref.current.instanceMatrix.needsUpdate = true;
    leaves2Ref.current.instanceMatrix.needsUpdate = true;
    if (stalksRef.current.instanceColor) stalksRef.current.instanceColor.needsUpdate = true;
    if (leaves1Ref.current.instanceColor) leaves1Ref.current.instanceColor.needsUpdate = true;
    if (leaves2Ref.current.instanceColor) leaves2Ref.current.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <instancedMesh ref={stalksRef} args={[undefined, undefined, count]} castShadow>
        <primitive object={SG.cornStalk} attach="geometry" />
        <primitive object={SM.cornGreen} attach="material" />
      </instancedMesh>
      <instancedMesh ref={leaves1Ref} args={[undefined, undefined, count]} castShadow>
        <primitive object={SG.cornLeaf} attach="geometry" />
        <primitive object={SM.cornGreen} attach="material" />
      </instancedMesh>
      <instancedMesh ref={leaves2Ref} args={[undefined, undefined, count]} castShadow>
        <primitive object={SG.cornLeaf} attach="geometry" />
        <primitive object={SM.cornGreen} attach="material" />
      </instancedMesh>
    </group>
  );
});
InstancedGrainField.displayName = 'InstancedGrainField';

// ============================================================
// VEGETATION LAYOUT (farm-local coordinates; group is at [75, 0, 120] and
// rotated PI about Y, so these are pre-rotation values)
// ============================================================

/** The same five conifers as before, now one instanced draw for the stand. */
const FARM_TREES: readonly TreeInstance[] = [
  { position: [-32, 0, -20], scale: 1.2, type: 'pine' },
  { position: [28, 0, -12], scale: 1.2, type: 'pine' },
  { position: [-35, 0, 25], scale: 1.2, type: 'pine' },
  { position: [32, 0, 22], scale: 1.2, type: 'pine' },
  { position: [-28, 0, -25], scale: 1.2, type: 'pine' },
];

const FARM_TREE_SPOTS: readonly (readonly [number, number])[] = FARM_TREES.map(
  (t) => [t.position[0], t.position[2]] as const
);

/** Terrain top is y=0.05 and the barnyard cobble y=0.08; the trees stand on
 *  open terrain, so the mulch only has to clear the terrain. */
const FARM_DECAL_Y = 0.075;

const FARM_BLOCKERS = [
  { x: 0, z: 0, halfX: 6, halfZ: 5 }, // barn
  { x: 12, z: -5, halfX: 2.6, halfZ: 2.4 }, // chicken coop
  { x: -10, z: 12, halfX: 5.5, halfZ: 4.5 }, // farmhouse
  { x: -15, z: 16, halfX: 2.2, halfZ: 1.6 }, // garden bed
  { x: -15, z: 19, halfX: 2.2, halfZ: 1.6 }, // garden bed
  { x: 15, z: -15, halfX: 2.6, halfZ: 2.6 }, // windmill
  { x: -12, z: -5, halfX: 3.4, halfZ: 3.4 }, // pig pen + mud puddle
  { x: 8, z: 8, halfX: 4, halfZ: 2 }, // culvert crossing
  { x: 0, z: -30, halfX: 4, halfZ: 2 }, // culvert crossing
  { x: 6.3, z: -1, halfX: 1.8, halfZ: 2.6 }, // hay bale stack
] as const;

/** Swept yard and ploughed crop rows: no wild grass in either. */
const FARM_OPEN_BLOCKERS = [
  { x: 0, z: 0, halfX: 11, halfZ: 9 }, // barnyard cobble
  { x: 0, z: -42, halfX: 18, halfZ: 14 }, // grain field
] as const;

const FARM_ATTRACTORS: readonly (readonly [number, number])[] = [
  // barn walls
  [-5.3, -4.3],
  [5.3, -4.3],
  [-5.3, 4.3],
  [5.3, 4.3],
  [0, -4.4],
  [-5.4, 0],
  [5.4, 0],
  // chicken coop
  [10.2, -5],
  [13.8, -5],
  [12, -6.6],
  [12, -3.4],
  // farmhouse
  [-14.4, 12],
  [-5.6, 12],
  [-10, 8.4],
  [-10, 15.6],
  // pig-pen fence runs
  [-12, -8.2],
  [-14, -8.2],
  [-10, -8.2],
  [-12, -1.8],
  [-14, -1.8],
  [-10, -1.8],
  [-15.2, -5],
  [-15.2, -7],
  [-15.2, -3],
  [-8.8, -5],
  [-8.8, -7],
  [-8.8, -3],
  // garden beds, trough, windmill base
  [-17.4, 16],
  [-17.4, 19],
  [-12.6, 17.5],
  [0, -5.6],
  [15, -17.8],
  [15, -12.2],
  // hay bales
  [6, -3.4],
  [7.8, 0],
  [-7.4, 3],
  // tree bases
  [-32, -20],
  [28, -12],
  [-35, 25],
  [32, 22],
  [-28, -25],
];

const FARM_CLUTTER: ClutterSpec = {
  count: 700,
  bounds: { minX: -38, maxX: 36, minZ: -30, maxZ: 32 },
  exclude: FARM_BLOCKERS,
  openExclude: FARM_OPEN_BLOCKERS,
  attractors: FARM_ATTRACTORS,
  // 5 mm under the terrain top: sinking a card base is invisible, floating
  // one is not.
  y: 0.045,
  cullDistance: 120,
};

// Main component with single useFrame for all animations
export const FarmArea: React.FC = () => {
  // --- Chicken Refs & State ---
  const chickenRefs = useMemo(
    () => Array.from({ length: 5 }, () => React.createRef<THREE.Group>()),
    []
  );
  const chickenAnimRefs = useMemo(
    () => Array.from({ length: 5 }, () => React.createRef<THREE.Group>()),
    []
  );
  const chickenStates = useRef<AnimalState[]>(
    Array.from({ length: 5 }, (_, index) => createAnimalState(100 + index, CHICKEN_WANDER_BOUNDS))
  );

  // --- Pig Refs & State ---
  const pigRefs = useMemo(
    () => Array.from({ length: 3 }, () => React.createRef<THREE.Group>()),
    []
  );
  const pigTailRefs = useMemo(
    () => Array.from({ length: 3 }, () => React.createRef<THREE.Mesh>()),
    []
  );
  const pigStates = useRef<AnimalState[]>(
    Array.from({ length: 3 }, (_, index) => createAnimalState(200 + index, PIG_WANDER_BOUNDS))
  );

  // --- Cow Refs & State ---
  const cowRefs = useMemo(
    () => Array.from({ length: 3 }, () => React.createRef<THREE.Group>()),
    []
  );
  const cowHeadRefs = useMemo(
    () => Array.from({ length: 3 }, () => React.createRef<THREE.Group>()),
    []
  );
  const cowStates = useRef<AnimalState[]>(
    Array.from({ length: 3 }, (_, index) => createAnimalState(300 + index, COW_WANDER_BOUNDS))
  );

  const sheepRefs = useMemo(
    () => Array.from({ length: 4 }, () => React.createRef<THREE.Group>()),
    []
  );

  const windmillBladesRef = useRef<THREE.Group>(null);
  const windmillAngleRef = useRef(0);
  const frameCountRef = useRef(0);

  // Petting interaction state
  const [hearts, setHearts] = React.useState<
    { id: number; pos: [number, number, number]; startTime: number }[]
  >([]);
  const nextHeartId = useRef(0);

  // Refs for jumping animation intensity (0 to 1)
  const chickenJumpStates = useRef<number[]>(new Array(5).fill(0));
  const pigJumpStates = useRef<number[]>(new Array(3).fill(0));
  const cowJumpStates = useRef<number[]>(new Array(3).fill(0));
  const sheepJumpStates = useRef<number[]>(new Array(4).fill(0)); // 4 sheep

  const handlePet = React.useCallback(
    (
      pos: [number, number, number],
      type: 'chicken' | 'pig' | 'cow' | 'sheep' | 'horse',
      index: number
    ) => {
      // Spawn heart
      setHearts((prev) => [
        ...prev,
        {
          id: nextHeartId.current++,
          pos: [pos[0], pos[1] + 2, pos[2]],
          startTime: Date.now(),
        },
      ]);

      // Trigger jump animation
      if (type === 'chicken') chickenJumpStates.current[index] = 1.0;
      if (type === 'pig') pigJumpStates.current[index] = 1.0;
      // Cows are too heavy to jump, maybe just wiggle?
      if (type === 'cow') cowJumpStates.current[index] = 1.0;
      if (type === 'sheep') sheepJumpStates.current[index] = 1.0;

      playCritterSound(type);
    },
    []
  );

  const removeHeart = React.useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // Animation offsets
  const chickenOffsets = useMemo(() => [0, 1.2, 2.4, 3.6, 4.8], []);
  const pigOffsets = useMemo(() => [0, 1.5, 3], []);
  const cowOffsets = useMemo(() => [0, 2, 4], []);

  // Movement Helpers
  const updateAnimalMovement = (
    ref: THREE.Group | null,
    state: AnimalState,
    delta: number,
    speed: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    yOffset: number = 0
  ) => {
    if (!ref) return;

    if (state.isIdle) {
      state.idleTime -= delta;
      if (state.idleTime <= 0) {
        state.isIdle = false;
      }
    } else {
      // Move towards target
      const currentPos = ref.position;
      const direction = _animDir.subVectors(state.target, currentPos);
      const dist = direction.length();

      if (dist < 0.1) {
        state.isIdle = true;
        const nextPlan = createAnimalWanderPlan(state.seed, state.sequenceStep, bounds);
        state.sequenceStep += 1;
        state.target.set(nextPlan.x, yOffset, nextPlan.z);
        state.idleTime = nextPlan.idleSeconds;
      } else {
        direction.normalize();

        // Smooth rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        ref.rotation.y = THREE.MathUtils.lerp(ref.rotation.y, targetRotation, delta * 5);

        // Move
        currentPos.add(direction.multiplyScalar(speed * delta));
      }
    }
  };

  // SINGLE useFrame - THROTTLED/BATCHED
  useFrame((state, delta) => {
    const { gameDay, gameTime, gameSpeed, weather, isTabVisible } =
      useGameSimulationStore.getState();
    if (!isTabVisible || gameSpeed <= 0) return;

    // Cap delta for tab-switch recovery (prevents large jumps after tab is inactive)
    const cappedDelta = Math.min(delta, 0.1);
    frameCountRef.current++;
    const time = state.clock.elapsedTime;
    const atmosphere = sampleAtmosphere(gameDay, gameTime, weather, _farmAtmosphere);
    const animalActivity = getAnimalActivityMultiplier(weather, gameTime);

    // Windmill: every 2nd frame (30 FPS)
    if (frameCountRef.current % 2 === 0 && windmillBladesRef.current) {
      windmillAngleRef.current += cappedDelta * 2 * getWindmillAngularSpeed(atmosphere.wind);
      windmillBladesRef.current.rotation.z = windmillAngleRef.current;
    }

    // Animals: every 2nd frame for smooth movement (30 FPS)
    // We update movement slightly more often than the body animations (pecking/wagging)
    if (frameCountRef.current % 2 === 0) {
      const adjustDelta = cappedDelta * 2 * animalActivity; // Compensate for skipped frames

      // Chickens
      chickenRefs.forEach((ref, i) => {
        updateAnimalMovement(
          ref.current,
          chickenStates.current[i],
          adjustDelta,
          1.5, // Speed
          CHICKEN_WANDER_BOUNDS
        );
      });

      // Pigs
      pigRefs.forEach((ref, i) => {
        updateAnimalMovement(
          ref.current,
          pigStates.current[i],
          adjustDelta,
          0.8, // Speed
          PIG_WANDER_BOUNDS
        );
      });

      // Cows
      cowRefs.forEach((ref, i) => {
        updateAnimalMovement(
          ref.current,
          cowStates.current[i],
          adjustDelta,
          0.5, // Speed
          COW_WANDER_BOUNDS
        );
      });
    }

    // Jump/Wiggle Animations for Petting (Every 2nd frame)
    if (frameCountRef.current % 2 === 0) {
      chickenJumpStates.current.forEach((val, i) => {
        if (val > 0 && chickenRefs[i].current) {
          chickenRefs[i].current.position.y = Math.sin(val * Math.PI) * 0.5;
          chickenJumpStates.current[i] = Math.max(0, val - cappedDelta * 3);
          if (chickenJumpStates.current[i] === 0) chickenRefs[i].current.position.y = 0;
        }
      });

      pigJumpStates.current.forEach((val, i) => {
        if (val > 0 && pigRefs[i].current) {
          // Pigs wiggle
          pigRefs[i].current.rotation.z = Math.sin(val * 20) * 0.1;
          pigJumpStates.current[i] = Math.max(0, val - cappedDelta * 2);
          if (pigJumpStates.current[i] === 0) pigRefs[i].current.rotation.z = 0;
        }
      });

      // Cows just shake head vigorously?
      cowJumpStates.current.forEach((val, i) => {
        if (val > 0 && cowHeadRefs[i].current) {
          cowHeadRefs[i].current.rotation.z = Math.sin(val * 15) * 0.2;
          cowJumpStates.current[i] = Math.max(0, val - cappedDelta * 2);
          if (cowJumpStates.current[i] === 0) cowHeadRefs[i].current.rotation.z = 0;
        }
      });

      // Sheep Jump
      sheepJumpStates.current.forEach((val, i) => {
        if (val > 0 && sheepRefs[i].current) {
          sheepRefs[i].current.position.y = Math.sin(val * Math.PI) * 0.5;
          sheepJumpStates.current[i] = Math.max(0, val - cappedDelta * 3);
          if (sheepJumpStates.current[i] === 0) sheepRefs[i].current.position.y = 0;
        }
      });
    }

    // Body animations (Pecking, Wagging, Grazing)
    // Throttle to every 4th frame (15 FPS)
    if (frameCountRef.current % 4 !== 0) return;

    chickenAnimRefs.forEach((ref, i) => {
      // Pecking motion only when idle
      if (ref.current && chickenStates.current[i].isIdle) {
        ref.current.rotation.x = Math.sin(time * 10 + chickenOffsets[i]) * 0.2 + 0.2;
      } else if (ref.current) {
        // Reset when moving
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.1);
      }
    });

    pigTailRefs.forEach((ref, i) => {
      if (ref.current) ref.current.rotation.z = Math.sin(time * 5 + pigOffsets[i]) * 0.3;
    });

    cowHeadRefs.forEach((ref, i) => {
      // Grazing motion only when idle
      if (ref.current && cowStates.current[i].isIdle) {
        ref.current.rotation.x = Math.sin(time * 0.5 + cowOffsets[i]) * 0.15 + 0.3; // Head down
      } else if (ref.current) {
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 0.1); // Head up
      }
    });
  });

  const chickenData = useMemo(
    () => [
      { pos: [13, 0, -3] as [number, number, number], rot: 0.5 },
      { pos: [14, 0, -4] as [number, number, number], rot: -0.3 },
      { pos: [11, 0, -2.5] as [number, number, number], rot: 1.2 },
      { pos: [13.5, 0, -6] as [number, number, number], rot: 2.1 },
      { pos: [10.5, 0, -4.5] as [number, number, number], rot: -1.5 },
    ],
    []
  );
  const pigData = useMemo(
    () => [
      { pos: [-12, 0, -5] as [number, number, number], rot: 0.8 },
      { pos: [-11, 0, -6] as [number, number, number], rot: -0.5 },
      { pos: [-13, 0, -4] as [number, number, number], rot: 1.5 },
    ],
    []
  );
  const cowData = useMemo(
    () => [
      { pos: [0, 0, 15] as [number, number, number], rot: 0.3 },
      { pos: [5, 0, 18] as [number, number, number], rot: -0.8 },
      { pos: [8, 0, 13] as [number, number, number], rot: 1.5 },
    ],
    []
  );

  // Alpha-cut clutter is fill-rate work, so the tier drops it rather than
  // shrinking it: 0 / 0.35 / 1 / 1 for low / medium / high / ultra.
  const density = useVegetationDensity();
  const clutterSpec = useMemo<ClutterSpec>(() => ({ ...FARM_CLUTTER, density }), [density]);

  return (
    <group
      name="authored-farm-site"
      position={SITE_LAYOUT.landmarks.farm.position}
      rotation={SITE_LAYOUT.landmarks.farm.rotation}
      scale={SITE_LAYOUT.landmarks.farm.scale}
    >
      {/* Barnyard cobblestone ground */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 15]} />
        {/* Untinted: the cobble albedo now decodes as sRGB, so the old
            '#9a9a9a' compensator would darken the yard twice. */}
        <meshStandardMaterial
          color="#ffffff"
          map={farmBarnyardCobbleColor}
          normalMap={farmBarnyardCobbleNormal}
          normalScale={FARM_COBBLE_NORMAL_SCALE}
          roughnessMap={farmBarnyardCobbleRoughness}
          roughness={1.0}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <Barn position={[0, 0, 0]} />
      <ChickenCoop position={[12, 0, -5]} />
      <Farmhouse position={[-10, 0, 12]} />
      <GardenBed position={[-15, 0, 16]} />
      <GardenBed position={[-15, 0, 19]} />

      {/* Drainage culvert under the farm road - provides water drainage from fields */}
      <DrainageCulvert position={[8, -0.3, 8]} rotation={Math.PI / 2} length={6} radius={0.6} />
      {chickenData.map((c, i) => (
        <Chicken
          key={`chicken-${i}`}
          position={c.pos}
          rotation={c.rot}
          groupRef={chickenRefs[i]}
          animRef={chickenAnimRefs[i]}
          onClick={() => handlePet(c.pos, 'chicken', i)}
        />
      ))}
      <group position={[-12, 0, -5]}>
        <FenceSection position={[0, 0, -3]} length={6} />
        <FenceSection position={[0, 0, 3]} length={6} />
        <FenceSection position={[-3, 0, 0]} rotation={Math.PI / 2} length={6} />
        <FenceSection position={[3, 0, 0]} rotation={Math.PI / 2} length={6} />
        {/* Mud puddle - raised above TerrainGround (y=0.05) to prevent z-fighting */}
        <mesh
          position={[0, 0.08, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={RENDER_ORDER.floorEffects}
        >
          <primitive object={SG.mudPuddle} attach="geometry" />
          <meshStandardMaterial
            color="#5c4d3d"
            map={PROCEDURAL_TEXTURES.mudColor}
            roughnessMap={PROCEDURAL_TEXTURES.mudRoughness}
            roughness={0.9}
            transparent
            opacity={0.95}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
        {/** Pigs are now positioned at top level relative to FarmArea, not inside this group, 
             so that they can move freely within the fence bounds defined in world/farm space.
             Wait, if I move them out of this group, I need to adjust their initial coordinates 
             and bounds to be relative to the FarmArea origin. 
             Result: I will render them at the FarmArea level but use coordinates that place them here.
             The fence is at [-12, 0, -5].
        */}
      </group>
      {pigData.map((p, i) => (
        <Pig
          key={`pig-${i}`}
          position={p.pos}
          rotation={p.rot}
          groupRef={pigRefs[i]}
          tailRef={pigTailRefs[i]}
          onClick={() => handlePet(p.pos, 'pig', i)}
        />
      ))}

      <group position={[5, 0, 15]}>
        {[-8, -3, 2, 7].map((x) => (
          <React.Fragment key={`fence-h-${x}`}>
            <FenceSection position={[x, 0, -6]} length={5} />
            <FenceSection position={[x, 0, 6]} length={5} />
          </React.Fragment>
        ))}
        <FenceSection position={[-10, 0, 0]} rotation={Math.PI / 2} length={5} />
        <FenceSection position={[-10, 0, -4]} rotation={Math.PI / 2} length={5} />
        <FenceSection position={[10, 0, 0]} rotation={Math.PI / 2} length={5} />
        <FenceSection position={[10, 0, -4]} rotation={Math.PI / 2} length={5} />
      </group>
      {cowData.map((c, i) => (
        <Cow
          key={`cow-${i}`}
          position={c.pos}
          rotation={c.rot}
          groupRef={cowRefs[i]}
          headRef={cowHeadRefs[i]}
          onClick={() => handlePet(c.pos, 'cow', i)}
        />
      ))}

      <WindmillComp position={[15, 0, -15]} scale={1.5} bladesRef={windmillBladesRef} />
      <Sheep
        position={[6, 0, -2]}
        rotation={0.6}
        groupRef={sheepRefs[0]}
        onClick={() => handlePet([6, 0, -2], 'sheep', 0)}
      />
      <Sheep
        position={[7, 0, 1]}
        rotation={-0.4}
        groupRef={sheepRefs[1]}
        onClick={() => handlePet([7, 0, 1], 'sheep', 1)}
      />
      <Sheep
        position={[8, 0, 5]}
        rotation={1.8}
        groupRef={sheepRefs[2]}
        onClick={() => handlePet([8, 0, 5], 'sheep', 2)}
      />
      <Sheep
        position={[-8, 0, 5]}
        rotation={2.5}
        groupRef={sheepRefs[3]}
        onClick={() => handlePet([-8, 0, 5], 'sheep', 3)}
      />
      <WaterTrough position={[0, 0, -4]} />
      <HayBale position={[6, 0, -2]} rotation={0.3} />
      <HayBale position={[6.5, 0, 0]} rotation={-0.2} />
      <HayBale position={[6.2, 0.8, -1]} rotation={0.5} />
      {/* Sleeping Orange Cat between hay bales */}
      <Cat position={[6.25, 0, -1]} rotation={0.5} color="#f97316" pose="sleeping" />
      <HayBale position={[-6, 0, 3]} rotation={1.2} />
      {/* Shelter belt: two instanced draws for the whole stand */}
      <InstancedTreeField trees={FARM_TREES} />
      <InstancedMulch spots={FARM_TREE_SPOTS} y={FARM_DECAL_Y} radius={2.3} />

      {/* Ground clutter around fence lines, wall bases and trunks */}
      <InstancedGrassClutter spec={clutterSpec} />

      {/* Shared wind clock (idempotent - the village mounts one too) */}
      <WindDriver />

      {/* Drainage Culvert under the farm path */}
      <DrainageCulvert position={[0, -0.3, -30]} rotation={Math.PI / 2} length={6} radius={0.6} />

      {/* Grain Field Background */}
      <group position={[0, 0, -42]}>
        {/* Simple Grain Field - Instanced Loops */}
        {/* Simple Grain Field - Instanced Loops */}
        <InstancedGrainField />

        {/* Cute Scarecrow in the middle */}
        <Scarecrow position={[0, 0, 0]} rotation={0.2} />
      </group>

      {/* Paint Horse next to hay bales */}
      <Horse
        position={[8, 0, -1]}
        rotation={-Math.PI / 2}
        color="#8d6e63"
        isPaint={true}
        onClick={() => handlePet([8, 0, -1], 'horse', 0)}
      />

      {/* Render Active Hearts */}
      {hearts.map((h) => (
        <HeartParticle key={h.id} position={h.pos} onComplete={() => removeHeart(h.id)} />
      ))}

      {/* Magical Nighttime Fireflies */}
      <Fireflies
        count={60}
        bounds={{ minX: -20, maxX: 20, minY: 0.5, maxY: 4, minZ: -20, maxZ: 20 }}
        color="#ccff66"
      />
    </group>
  );
};
