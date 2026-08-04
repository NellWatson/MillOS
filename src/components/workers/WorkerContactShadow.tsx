/**
 * Ambient contact patch under each person.
 *
 * A character with nothing darkening the floor beneath it reads as a decal
 * hovering above the surface. The one shadow-casting sun writes a 2048 map over
 * a roughly 110 m site, so a boot sole is well under one shadow texel and the
 * cast shadow cannot resolve the contact. This is the cheap stand-in: one
 * shared disc geometry and one shared material for the whole roster.
 *
 * Deliberately texture-free. The radial falloff is baked into an RGBA vertex
 * colour attribute (three enables `USE_COLOR_ALPHA` for an itemSize-4 colour
 * attribute), so the patch costs no texture unit, no texture tap, and raises no
 * colour-space question.
 */

import React, { useEffect } from 'react';
import * as THREE from 'three';
import { FLOOR_LAYERS, POLYGON_OFFSET, RENDER_ORDER } from '../../constants/renderLayers';
import { useGraphicsStore } from '../../stores/graphicsStore';

const RADIUS = 0.42;
const SEGMENTS = 20;

/** Ring radii as a fraction of RADIUS, paired with their alpha. */
const RINGS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.42, 0.82],
  [0.72, 0.34],
  [1, 0],
];

function createContactDisc(): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const colors: number[] = [1, 1, 1, RINGS[0][1]];

  for (let ring = 1; ring < RINGS.length; ring += 1) {
    const [fraction, alpha] = RINGS[ring];
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const angle = (segment / SEGMENTS) * Math.PI * 2;
      positions.push(Math.cos(angle) * fraction * RADIUS, Math.sin(angle) * fraction * RADIUS, 0);
      colors.push(1, 1, 1, alpha);
    }
  }

  const indices: number[] = [];
  // Inner fan from the centre vertex to the first ring.
  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    indices.push(0, 1 + segment, 1 + ((segment + 1) % SEGMENTS));
  }
  // Quad strips between successive rings.
  for (let ring = 1; ring < RINGS.length - 1; ring += 1) {
    const inner = 1 + (ring - 1) * SEGMENTS;
    const outer = 1 + ring * SEGMENTS;
    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const next = (segment + 1) % SEGMENTS;
      indices.push(inner + segment, outer + segment, outer + next);
      indices.push(inner + segment, outer + next, inner + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const CONTACT_GEOMETRY = createContactDisc();

const CONTACT_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#000000',
  vertexColors: true,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  toneMapped: false,
  polygonOffset: true,
  polygonOffsetFactor: POLYGON_OFFSET.moderate.factor,
  polygonOffsetUnits: POLYGON_OFFSET.moderate.units,
});

/** Opacity with screen-space AO already darkening the same contact. */
const OPACITY_WITH_AO = 0.4;
const OPACITY_WITHOUT_AO = 0.55;

/** The patch must not extend the worker's hover/click target. */
const NO_RAYCAST = () => null;

export const WorkerContactShadow: React.FC = React.memo(() => {
  const ambientOcclusion = useGraphicsStore((state) => state.graphics.enableAmbientOcclusion);

  // One shared material, so this is an idempotent write of the same value from
  // every mounted worker rather than per-instance state.
  useEffect(() => {
    CONTACT_MATERIAL.opacity = ambientOcclusion ? OPACITY_WITH_AO : OPACITY_WITHOUT_AO;
  }, [ambientOcclusion]);

  return (
    <mesh
      name="worker-contact-shadow"
      geometry={CONTACT_GEOMETRY}
      material={CONTACT_MATERIAL}
      position={[0, FLOOR_LAYERS.wornSecondary, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={RENDER_ORDER.floorMarkings}
      raycast={NO_RAYCAST}
      // Geometry and material are module singletons shared by the whole roster:
      // one worker unmounting must not free them out from under the others.
      dispose={null}
    />
  );
});

WorkerContactShadow.displayName = 'WorkerContactShadow';
