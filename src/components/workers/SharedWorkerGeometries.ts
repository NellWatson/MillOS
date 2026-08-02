import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Shared personnel geometry keeps the ten named workers inexpensive while
// giving both visible LODs the same rounded, adult human silhouette.
const nose = new THREE.ConeGeometry(0.022, 0.052, 10);
nose.rotateX(Math.PI / 2);

const mouth = new THREE.TorusGeometry(0.04, 0.005, 6, 16, Math.PI);
mouth.rotateZ(Math.PI);

export const SHARED_WORKER_GEOMETRY = {
  // General primitives
  box_small: new THREE.BoxGeometry(1, 1, 1),
  sphere_low: new THREE.SphereGeometry(1, 8, 8),
  sphere_med: new THREE.SphereGeometry(1, 12, 10),
  sphere_high: new THREE.SphereGeometry(1, 18, 14),
  cylinder_low: new THREE.CylinderGeometry(1, 1, 1, 8),
  cylinder_med: new THREE.CylinderGeometry(1, 1, 1, 12),
  capsule_med: new THREE.CapsuleGeometry(1, 1, 4, 8),

  // Close-range anatomy and clothing
  torso: new THREE.CylinderGeometry(0.29, 0.215, 0.52, 10),
  waist: new THREE.CylinderGeometry(0.215, 0.225, 0.27, 10),
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
  vest: new THREE.CylinderGeometry(0.3, 0.225, 0.535, 10),
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
  mediumTorso: new THREE.CylinderGeometry(0.27, 0.205, 0.64, 8),
  mediumWaist: new THREE.CylinderGeometry(0.205, 0.22, 0.24, 8),
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
