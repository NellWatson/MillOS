import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SHARED_WORKER_GEOMETRY } from './SharedWorkerGeometries';

const getSize = (geometry: THREE.BufferGeometry): THREE.Vector3 => {
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox?.getSize(size);
  return size;
};

describe('shared personnel geometry', () => {
  it('keeps every shared geometry finite', () => {
    for (const [name, geometry] of Object.entries(SHARED_WORKER_GEOMETRY)) {
      const positions = geometry.getAttribute('position');
      expect(positions, `${name} should have position data`).toBeDefined();
      for (let index = 0; index < positions.count; index += 1) {
        expect(Number.isFinite(positions.getX(index)), `${name} x${index}`).toBe(true);
        expect(Number.isFinite(positions.getY(index)), `${name} y${index}`).toBe(true);
        expect(Number.isFinite(positions.getZ(index)), `${name} z${index}`).toBe(true);
      }
    }
  });

  it('uses a shoulder-led tapered close torso', () => {
    const position = SHARED_WORKER_GEOMETRY.torso.getAttribute('position');
    let upperRadius = 0;
    let lowerRadius = 0;

    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const radius = Math.hypot(position.getX(index), position.getZ(index));
      if (y > 0.2) upperRadius = Math.max(upperRadius, radius);
      if (y < -0.2) lowerRadius = Math.max(lowerRadius, radius);
    }

    expect(upperRadius).toBeGreaterThan(lowerRadius * 1.2);
  });

  it('keeps hands and feet subordinate to the body silhouette', () => {
    const torso = getSize(SHARED_WORKER_GEOMETRY.torso);
    const hand = getSize(SHARED_WORKER_GEOMETRY.hand);
    const boot = getSize(SHARED_WORKER_GEOMETRY.boot);

    expect(hand.x).toBeLessThan(torso.x * 0.4);
    expect(boot.x).toBeLessThan(torso.x * 0.55);
    expect(boot.z).toBeGreaterThan(hand.z);
  });

  it('keeps medium LOD proportions consistent with the close model', () => {
    const closeHead = getSize(SHARED_WORKER_GEOMETRY.head);
    const mediumHead = getSize(SHARED_WORKER_GEOMETRY.mediumHead);
    const closeTorso = getSize(SHARED_WORKER_GEOMETRY.torso);
    const mediumTorso = getSize(SHARED_WORKER_GEOMETRY.mediumTorso);

    expect(mediumHead.y / closeHead.y).toBeGreaterThan(0.9);
    expect(mediumHead.y / closeHead.y).toBeLessThan(1.15);
    expect(mediumTorso.y / closeTorso.y).toBeGreaterThan(1.1);
    expect(mediumTorso.y / closeTorso.y).toBeLessThan(1.3);
  });
});
