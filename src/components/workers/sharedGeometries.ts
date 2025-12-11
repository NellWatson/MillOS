/**
 * Shared Worker Geometries
 * Module-level geometry cache to reduce memory usage
 */

import * as THREE from 'three';

// Tool geometries shared across all workers
export const TOOL_GEOMETRIES = {
  clipboard: {
    board: new THREE.BoxGeometry(0.12, 0.16, 0.015),
    clip: new THREE.BoxGeometry(0.04, 0.02, 0.02),
    paper: new THREE.BoxGeometry(0.1, 0.12, 0.002),
    line: new THREE.BoxGeometry(0.07, 0.008, 0.001),
  },
  tablet: {
    body: new THREE.BoxGeometry(0.1, 0.14, 0.01),
    screen: new THREE.BoxGeometry(0.085, 0.12, 0.002),
    indicator: new THREE.BoxGeometry(0.06, 0.002, 0.001),
  },
  radio: {
    body: new THREE.BoxGeometry(0.04, 0.1, 0.025),
    antenna: new THREE.CylinderGeometry(0.004, 0.003, 0.06, 8),
    led: new THREE.SphereGeometry(0.004, 8, 8),
  },
  wrench: {
    handle: new THREE.BoxGeometry(0.025, 0.14, 0.012),
    head: new THREE.BoxGeometry(0.05, 0.03, 0.012),
    grip: new THREE.BoxGeometry(0.027, 0.05, 0.004),
  },
  magnifier: {
    handle: new THREE.CylinderGeometry(0.012, 0.015, 0.08, 12),
    ring: new THREE.TorusGeometry(0.035, 0.006, 8, 24),
    lens: new THREE.CircleGeometry(0.032, 24),
  },
};

// Body part geometries for DetailedWorker
export const BODY_GEOMETRIES = {
  // Torso
  chest: new THREE.BoxGeometry(0.48, 0.45, 0.24),
  shoulder: new THREE.SphereGeometry(0.1, 12, 12),
  waist: new THREE.BoxGeometry(0.42, 0.3, 0.22),
  collar: new THREE.BoxGeometry(0.2, 0.08, 0.15),
  neck: new THREE.CylinderGeometry(0.075, 0.085, 0.12, 16),

  // Safety vest
  vest: new THREE.BoxGeometry(0.5, 0.52, 0.25),
  vestStripe: new THREE.BoxGeometry(0.51, 0.035, 0.01),

  // Head
  head: new THREE.SphereGeometry(0.17, 32, 32),
  jaw: new THREE.SphereGeometry(0.1, 16, 16),
  noseCone: new THREE.ConeGeometry(0.025, 0.05, 8),
  noseTip: new THREE.SphereGeometry(0.022, 8, 8),
  eyeWhite: new THREE.SphereGeometry(0.028, 16, 16),
  iris: new THREE.SphereGeometry(0.016, 12, 12),
  pupil: new THREE.SphereGeometry(0.008, 8, 8),
  eyelid: new THREE.BoxGeometry(0.04, 0.025, 0.02),
  eyebrow: new THREE.BoxGeometry(0.045, 0.012, 0.015),
  mouth: new THREE.BoxGeometry(0.06, 0.015, 0.01),
  ear: new THREE.SphereGeometry(0.035, 12, 12),

  // Hard hat
  hatDome: new THREE.SphereGeometry(0.19, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2),
  hatBrim: new THREE.CylinderGeometry(0.21, 0.21, 0.025, 32),
  hatRidge: new THREE.CapsuleGeometry(0.015, 0.3, 4, 8),

  // Arms
  upperArm: new THREE.CapsuleGeometry(0.055, 0.22, 8, 16),
  elbow: new THREE.SphereGeometry(0.055, 12, 12),
  forearm: new THREE.CapsuleGeometry(0.045, 0.2, 8, 16),
  hand: new THREE.BoxGeometry(0.06, 0.08, 0.03),
  fingers: new THREE.BoxGeometry(0.055, 0.04, 0.025),

  // Lower body
  hips: new THREE.BoxGeometry(0.38, 0.14, 0.2),
  belt: new THREE.BoxGeometry(0.4, 0.04, 0.22),
  beltBuckle: new THREE.BoxGeometry(0.05, 0.035, 0.01),

  // Legs
  thigh: new THREE.CapsuleGeometry(0.075, 0.28, 8, 16),
  knee: new THREE.SphereGeometry(0.065, 12, 12),
  shin: new THREE.CapsuleGeometry(0.055, 0.28, 8, 16),
  boot: new THREE.BoxGeometry(0.1, 0.1, 0.16),
  bootSole: new THREE.BoxGeometry(0.11, 0.02, 0.17),
  bootToeCap: new THREE.BoxGeometry(0.09, 0.06, 0.04),
};

// Hair geometries
export const HAIR_GEOMETRIES = {
  short: {
    side: new THREE.BoxGeometry(0.04, 0.08, 0.1),
    back: new THREE.BoxGeometry(0.2, 0.1, 0.04),
  },
  medium: {
    side: new THREE.BoxGeometry(0.04, 0.14, 0.12),
    back: new THREE.BoxGeometry(0.22, 0.14, 0.04),
  },
  curly: {
    curl: new THREE.SphereGeometry(0.04, 8, 8),
  },
  ponytail: {
    tail: new THREE.CapsuleGeometry(0.03, 0.12, 6, 12),
    band: new THREE.TorusGeometry(0.035, 0.008, 8, 16),
  },
};

// SimplifiedWorker geometries (lower poly)
export const SIMPLIFIED_GEOMETRIES = {
  torso: new THREE.BoxGeometry(0.5, 0.9, 0.25),
  head: new THREE.SphereGeometry(0.15, 12, 12),
  hat: new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  arm: new THREE.BoxGeometry(0.12, 0.5, 0.12),
  hips: new THREE.BoxGeometry(0.45, 0.3, 0.25),
  leg: new THREE.BoxGeometry(0.15, 0.6, 0.15),
};

// Billboard geometries (lowest poly)
export const BILLBOARD_GEOMETRIES = {
  body: new THREE.BoxGeometry(0.4, 1.2, 0.25),
  head: new THREE.SphereGeometry(0.15, 8, 8),
  hat: new THREE.SphereGeometry(0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
};
