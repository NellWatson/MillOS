import * as THREE from 'three';

const DEFAULT_SEGMENTS = 72;

function shorelineFactor(angle: number, seed: number): number {
  return (
    1 +
    Math.sin(angle * 3 + seed) * 0.055 +
    Math.sin(angle * 5 - seed * 1.7) * 0.035 +
    Math.sin(angle * 11 + seed * 0.6) * 0.015
  );
}

/** Build a softly irregular lake using the original proven fan topology. */
export function createOrganicLakeSurfaceGeometry(
  radiusX: number,
  radiusZ: number,
  segments = DEFAULT_SEGMENTS,
  seed = 0.74
): THREE.BufferGeometry {
  const safeRadiusX = Math.max(0.1, radiusX);
  const safeRadiusZ = Math.max(0.1, radiusZ);
  const safeSegments = Math.max(12, Math.floor(segments));
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];

  for (let segment = 0; segment <= safeSegments; segment += 1) {
    const progress = segment === safeSegments ? 0 : segment / safeSegments;
    const angle = progress * Math.PI * 2;
    const edgeFactor = shorelineFactor(angle, seed);
    const x = Math.cos(angle) * safeRadiusX * edgeFactor;
    const z = Math.sin(angle) * safeRadiusZ * edgeFactor;
    positions.push(x, z, 0);
    uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
  }

  for (let segment = 0; segment < safeSegments; segment += 1) {
    indices.push(0, 1 + segment, 2 + segment);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Build one non-overlapping bank mesh with a damp inner edge, aggregate
 * middle, and grass-tinted outer transition.
 */
export function createOrganicLakeBankGeometry(
  waterRadiusX: number,
  waterRadiusZ: number,
  shoreRadiusX: number,
  shoreRadiusZ: number,
  segments = DEFAULT_SEGMENTS,
  seed = 0.74
): THREE.BufferGeometry {
  const safeSegments = Math.max(12, Math.floor(segments));
  const rows = 3;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rowColors = [
    new THREE.Color('#4f655d'),
    new THREE.Color('#9e9375'),
    new THREE.Color('#5d744f'),
  ];

  for (let segment = 0; segment <= safeSegments; segment += 1) {
    const progress = segment === safeSegments ? 0 : segment / safeSegments;
    const angle = progress * Math.PI * 2;
    const innerFactor = shorelineFactor(angle, seed);
    const outerFactor =
      innerFactor + Math.sin(angle * 7 - seed * 2.1) * 0.01 + Math.sin(angle * 13 + seed) * 0.006;

    for (let row = 0; row < rows; row += 1) {
      const ratio = row / (rows - 1);
      const radiusX = THREE.MathUtils.lerp(waterRadiusX * 0.985, shoreRadiusX, ratio);
      const radiusZ = THREE.MathUtils.lerp(waterRadiusZ * 0.985, shoreRadiusZ, ratio);
      const factor = THREE.MathUtils.lerp(innerFactor, outerFactor, ratio);
      positions.push(Math.cos(angle) * radiusX * factor, Math.sin(angle) * radiusZ * factor, 0);
      const color = rowColors[row];
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let segment = 0; segment < safeSegments; segment += 1) {
    for (let row = 0; row < rows - 1; row += 1) {
      const innerLeft = segment * rows + row;
      const innerRight = (segment + 1) * rows + row;
      const outerLeft = innerLeft + 1;
      const outerRight = innerRight + 1;
      indices.push(innerLeft, outerLeft, innerRight, innerRight, outerLeft, outerRight);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
