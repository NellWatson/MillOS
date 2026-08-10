import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type R3FObjectState = {
  eventCount?: number;
  handlers?: Record<string, unknown>;
};

type BatchCandidate = {
  mesh: THREE.Mesh;
  matrixWorld: THREE.Matrix4;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  geometrySignature: string;
  geometryAttributeSignature: string;
  materialSignature: string;
  batchMaterialSignature: string;
  mergeMaterialSignature: string;
  instanceColor: THREE.Color | null;
};

type StaticBatch = {
  mesh: THREE.Mesh;
  originals: Array<{ mesh: THREE.Mesh; parent: THREE.Object3D; visible: boolean }>;
  ownsGeometry: boolean;
  ownsMaterial: boolean;
};

export interface StaticMeshBatchProps {
  children: React.ReactNode;
  name: string;
  revision?: string | number | boolean;
  minimumInstances?: number;
  sampleMilliseconds?: number;
}

export type StaticBatchDiagnostics = {
  totalMeshes: number;
  candidates: number;
  optimizedOriginals: number;
  batches: number;
  instancedOriginals: number;
  instancedBatches: number;
  mergedOriginals: number;
  mergedMeshes: number;
  exclusions: Record<string, number>;
  materialTypes: Record<string, number>;
};

const DYNAMIC_NAME_PATTERN = /forklift|shipping-truck|receiving-truck/i;
const MATRIX_EPSILON = 1e-5;
const MINIMUM_MERGE_MESHES = 4;
const MERGE_CELL_SIZE_METRES = 80;
// Keep enough authored neighbours together for colour-compatible merging. The
// earlier 120-mesh slices split repeated fences, trim, vegetation, and village
// details across unrelated tasks, leaving most candidates as individual draw
// calls. A 512-candidate slice preserves useful local repetition without the
// runtime regression observed when the collection task was widened further.
const MAX_BATCH_CANDIDATES_PER_TASK = 512;
const MAX_CANDIDATE_SCAN_PER_TASK = 96;
const pendingStaticBatches = new Set<symbol>();

const publishPendingStaticBatchCount = (): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.millosStaticBatchesPending = String(pendingStaticBatches.size);
};

const beginStaticBatch = (): symbol => {
  const token = Symbol('static-batch');
  pendingStaticBatches.add(token);
  publishPendingStaticBatchCount();
  return token;
};

const finishStaticBatch = (token: symbol): void => {
  pendingStaticBatches.delete(token);
  publishPendingStaticBatchCount();
};

const rounded = (value: number): number => Math.round(value * 10000) / 10000;

const textureSignature = (texture: THREE.Texture | null): string => {
  if (!texture) return 'none';
  const image = texture.source?.data as { currentSrc?: string; src?: string } | undefined;
  return [
    image?.currentSrc ?? image?.src ?? texture.source?.uuid ?? texture.uuid,
    texture.colorSpace,
    texture.mapping,
    texture.wrapS,
    texture.wrapT,
    rounded(texture.repeat.x),
    rounded(texture.repeat.y),
    rounded(texture.offset.x),
    rounded(texture.offset.y),
    rounded(texture.rotation),
  ].join(':');
};

const vectorSignature = (value: THREE.Vector2 | THREE.Vector3 | null | undefined): string =>
  value ? value.toArray().map(rounded).join(',') : 'none';

const geometrySignature = (geometry: THREE.BufferGeometry): string => {
  const parameterizedGeometry = geometry as THREE.BufferGeometry & {
    parameters?: Record<string, unknown>;
  };
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const sampleAttribute = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    const sample: number[] = [];
    const count = attribute.count;
    const indexes = [0, 1, 2, Math.max(0, count - 3), Math.max(0, count - 2), count - 1];
    indexes.forEach((index) => {
      if (index < 0 || index >= count) return;
      for (let component = 0; component < Math.min(attribute.itemSize, 3); component += 1) {
        sample.push(rounded(attribute.getComponent(index, component)));
      }
    });
    return sample.join(',');
  };
  return [
    geometry.type,
    JSON.stringify(parameterizedGeometry.parameters ?? {}),
    position?.count ?? 0,
    normal?.count ?? 0,
    geometry.index?.count ?? 0,
    vectorSignature(geometry.boundingBox?.min),
    vectorSignature(geometry.boundingBox?.max),
    rounded(geometry.boundingSphere?.radius ?? 0),
    position ? sampleAttribute(position) : '',
    normal ? sampleAttribute(normal) : '',
  ].join('|');
};

const materialSignature = (
  material: THREE.Material,
  options: { includeColor?: boolean; mergeCompatible?: boolean } = {}
): string => {
  const standard = material as THREE.MeshStandardMaterial;
  const physical = material as THREE.MeshPhysicalMaterial;
  const phong = material as THREE.MeshPhongMaterial;
  const includeColor = options.includeColor ?? true;
  const scalar = options.mergeCompatible
    ? (value: number): number => Math.round(value * 4) / 4
    : rounded;
  return [
    material.type,
    includeColor ? (standard.color?.getHexString() ?? 'none') : 'vertex-color',
    standard.emissive?.getHexString() ?? 'none',
    rounded(standard.emissiveIntensity ?? 0),
    scalar(standard.roughness ?? 0),
    scalar(standard.metalness ?? 0),
    scalar(phong.shininess ?? 0),
    phong.specular?.getHexString() ?? 'none',
    rounded(physical.clearcoat ?? 0),
    rounded(physical.clearcoatRoughness ?? 0),
    rounded(physical.ior ?? 0),
    rounded(physical.reflectivity ?? 0),
    rounded(physical.transmission ?? 0),
    rounded(physical.thickness ?? 0),
    rounded(physical.attenuationDistance ?? 0),
    physical.attenuationColor?.getHexString() ?? 'none',
    rounded(physical.sheen ?? 0),
    physical.sheenColor?.getHexString() ?? 'none',
    rounded(physical.sheenRoughness ?? 0),
    rounded(physical.iridescence ?? 0),
    rounded(physical.iridescenceIOR ?? 0),
    rounded(material.opacity),
    rounded(material.alphaTest),
    material.alphaHash,
    material.alphaToCoverage,
    material.side,
    material.blending,
    material.depthTest,
    material.depthWrite,
    material.colorWrite,
    material.vertexColors,
    material.toneMapped,
    material.polygonOffset,
    material.polygonOffsetFactor,
    material.polygonOffsetUnits,
    standard.flatShading ?? false,
    standard.wireframe ?? false,
    standard.fog ?? false,
    standard.dithering ?? false,
    standard.premultipliedAlpha ?? false,
    vectorSignature(standard.normalScale),
    textureSignature(standard.map),
    textureSignature(standard.normalMap),
    textureSignature(standard.roughnessMap),
    textureSignature(standard.metalnessMap),
    textureSignature(standard.aoMap),
    textureSignature(standard.emissiveMap),
    textureSignature(standard.alphaMap),
  ].join('|');
};

const getInstanceColor = (material: THREE.Material): THREE.Color | null => {
  const colorMaterial = material as THREE.Material & { color?: THREE.Color };
  if (
    material.transparent ||
    material.opacity < 1 ||
    !colorMaterial.color ||
    !(colorMaterial.color instanceof THREE.Color)
  ) {
    return null;
  }
  return colorMaterial.color.clone();
};

const geometryAttributeSignature = (geometry: THREE.BufferGeometry): string =>
  Object.entries(geometry.attributes)
    .map(([name, attribute]) =>
      [
        name,
        attribute.itemSize,
        attribute.normalized,
        attribute.array.constructor.name,
        'gpuType' in attribute ? attribute.gpuType : '',
      ].join(':')
    )
    .sort()
    .join('|');

const createMergedGeometry = (
  group: BatchCandidate[],
  inverseRoot: THREE.Matrix4
): THREE.BufferGeometry | null => {
  const relativeMatrix = new THREE.Matrix4();
  const geometries: THREE.BufferGeometry[] = [];

  for (const candidate of group) {
    const source = candidate.mesh.geometry;
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    relativeMatrix.multiplyMatrices(inverseRoot, candidate.mesh.matrixWorld);
    geometry.applyMatrix4(relativeMatrix);

    const position = geometry.getAttribute('position');
    if (!position || !candidate.instanceColor) {
      geometry.dispose();
      geometries.forEach((item) => item.dispose());
      return null;
    }

    const sourceColor = geometry.getAttribute('color');
    const colors = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index += 1) {
      const offset = index * 3;
      colors[offset] = candidate.instanceColor.r * (sourceColor ? sourceColor.getX(index) : 1);
      colors[offset + 1] = candidate.instanceColor.g * (sourceColor ? sourceColor.getY(index) : 1);
      colors[offset + 2] = candidate.instanceColor.b * (sourceColor ? sourceColor.getZ(index) : 1);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometries.push(geometry);
  }

  const merged = mergeGeometries(geometries, false) ?? null;
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
};

const hasInteractionHandlers = (object: THREE.Object3D): boolean => {
  const state = (object as THREE.Object3D & { __r3f?: R3FObjectState }).__r3f;
  return Boolean(
    state && ((state.eventCount ?? 0) > 0 || Object.keys(state.handlers ?? {}).length > 0)
  );
};

const hasExcludedAncestor = (mesh: THREE.Mesh, root: THREE.Group): boolean => {
  let object: THREE.Object3D | null = mesh;
  while (object && object !== root) {
    if (
      object.userData.noStaticBatch === true ||
      object.userData.dynamic === true ||
      DYNAMIC_NAME_PATTERN.test(object.name) ||
      hasInteractionHandlers(object)
    ) {
      return true;
    }
    object = object.parent;
  }
  return object !== root;
};

const countPotentialStaticMeshes = (root: THREE.Group): number => {
  let count = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.visible) count += 1;
  });
  return count;
};

const isSupportedMaterial = (material: THREE.Material): boolean => {
  const supported =
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial;
  if (!supported) return false;
  if (
    Object.hasOwn(material, 'onBeforeCompile') ||
    Object.hasOwn(material, 'customProgramCacheKey') ||
    material.clippingPlanes?.length
  ) {
    return false;
  }
  return true;
};

type CandidateCollection = {
  candidates: BatchCandidate[];
  exclusions: Record<string, number>;
  materialTypes: Record<string, number>;
  totalMeshes: number;
};

const createCandidateCollection = (): CandidateCollection => ({
  candidates: [],
  exclusions: {},
  materialTypes: {},
  totalMeshes: 0,
});

const inspectStaticBatchObject = (
  object: THREE.Object3D,
  root: THREE.Group,
  collection: CandidateCollection
): void => {
  if (!(object instanceof THREE.Mesh)) return;
  collection.totalMeshes += 1;
  const exclude = (reason: string): void => {
    collection.exclusions[reason] = (collection.exclusions[reason] ?? 0) + 1;
  };
  if (object instanceof THREE.InstancedMesh) return exclude('instanced');
  if (object instanceof THREE.SkinnedMesh) return exclude('skinned');
  if (!object.visible) return exclude('hidden');
  if (!object.geometry) return exclude('missingGeometry');
  if (Object.keys(object.geometry.morphAttributes).length > 0) return exclude('morph');
  if (Array.isArray(object.material)) return exclude('materialArray');
  collection.materialTypes[object.material.type] =
    (collection.materialTypes[object.material.type] ?? 0) + 1;
  if (!isSupportedMaterial(object.material)) return exclude('unsupportedMaterial');
  if (hasExcludedAncestor(object, root)) return exclude('dynamicOrInteractive');
  const instanceColor = getInstanceColor(object.material);
  collection.candidates.push({
    mesh: object,
    matrixWorld: object.matrixWorld.clone(),
    geometry: object.geometry,
    material: object.material,
    geometrySignature: geometrySignature(object.geometry),
    geometryAttributeSignature: geometryAttributeSignature(object.geometry),
    materialSignature: materialSignature(object.material),
    batchMaterialSignature: materialSignature(object.material, {
      includeColor: !instanceColor,
    }),
    mergeMaterialSignature: materialSignature(object.material, {
      includeColor: false,
      mergeCompatible: true,
    }),
    instanceColor,
  });
};

const finalizeCandidateCollection = (
  root: THREE.Group,
  collection: CandidateCollection
): BatchCandidate[] => {
  root.userData.staticBatchStats = {
    totalMeshes: collection.totalMeshes,
    candidates: collection.candidates.length,
    optimizedOriginals: 0,
    batches: 0,
    instancedOriginals: 0,
    instancedBatches: 0,
    mergedOriginals: 0,
    mergedMeshes: 0,
    exclusions: collection.exclusions,
    materialTypes: collection.materialTypes,
  } satisfies StaticBatchDiagnostics;
  return collection.candidates;
};

export const collectStaticBatchCandidates = (root: THREE.Group): BatchCandidate[] => {
  root.updateWorldMatrix(true, true);
  const collection = createCandidateCollection();
  root.traverse((object) => inspectStaticBatchObject(object, root, collection));
  return finalizeCandidateCollection(root, collection);
};

const collectStaticBatchCandidatesIncrementally = (
  root: THREE.Group,
  schedule: (callback: () => void) => void,
  isCancelled: () => boolean,
  onComplete: (candidates: BatchCandidate[]) => void
): void => {
  root.updateWorldMatrix(true, true);
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  const collection = createCandidateCollection();

  const processSlice = (start: number): void => {
    if (isCancelled()) return;
    const end = Math.min(meshes.length, start + MAX_CANDIDATE_SCAN_PER_TASK);
    for (let index = start; index < end; index += 1) {
      const mesh = meshes[index];
      if (mesh) inspectStaticBatchObject(mesh, root, collection);
    }
    if (end < meshes.length) {
      schedule(() => processSlice(end));
      return;
    }
    onComplete(finalizeCandidateCollection(root, collection));
  };

  processSlice(0);
};

const matrixIsStable = (before: THREE.Matrix4, after: THREE.Matrix4): boolean =>
  before.elements.every(
    (value, index) => Math.abs(value - (after.elements[index] ?? value)) <= MATRIX_EPSILON
  );

export const createStaticMeshBatches = (
  root: THREE.Group,
  candidates: BatchCandidate[],
  name: string,
  minimumInstances: number
): StaticBatch[] => {
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const relativeMatrix = new THREE.Matrix4();
  const relativePosition = new THREE.Vector3();
  const batches: StaticBatch[] = [];
  const optimizedOriginals = new Set<THREE.Mesh>();
  let instancedBatchCount = 0;
  let instancedOriginalCount = 0;
  let mergedOriginalCount = 0;
  let mergedMeshCount = 0;
  let batchIndex = 0;

  const stableCandidates = candidates.filter((candidate) => {
    const { mesh } = candidate;
    return Boolean(
      mesh.parent &&
      mesh.visible &&
      matrixIsStable(candidate.matrixWorld, mesh.matrixWorld) &&
      mesh.geometry === candidate.geometry &&
      mesh.material === candidate.material
    );
  });

  // Draw-call cost dominates this authored low-poly world. Merge compatible opaque
  // meshes first, within bounded spatial cells so frustum culling remains useful.
  const mergeGroups = new Map<string, BatchCandidate[]>();
  stableCandidates.forEach((candidate) => {
    const { mesh } = candidate;
    if (!candidate.instanceColor || !mesh.parent) return;

    relativeMatrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    relativePosition.setFromMatrixPosition(relativeMatrix);
    const cellX = Math.floor(relativePosition.x / MERGE_CELL_SIZE_METRES);
    const cellZ = Math.floor(relativePosition.z / MERGE_CELL_SIZE_METRES);
    const key = [
      candidate.mergeMaterialSignature,
      candidate.geometryAttributeSignature,
      mesh.castShadow,
      mesh.receiveShadow,
      mesh.renderOrder,
      mesh.layers.mask,
      cellX,
      cellZ,
    ].join('||');
    const group = mergeGroups.get(key);
    if (group) group.push(candidate);
    else mergeGroups.set(key, [candidate]);
  });

  mergeGroups.forEach((group) => {
    const activeGroup = group.filter(
      (candidate) => candidate.mesh.parent && !optimizedOriginals.has(candidate.mesh)
    );
    if (activeGroup.length < MINIMUM_MERGE_MESHES) return;
    const representative = activeGroup[0]?.mesh;
    if (!representative || Array.isArray(representative.material)) return;
    const geometry = createMergedGeometry(activeGroup, inverseRoot);
    if (!geometry) return;

    const material = representative.material.clone() as THREE.Material & {
      color: THREE.Color;
      vertexColors: boolean;
    };
    material.color.set(0xffffff);
    material.vertexColors = true;
    material.needsUpdate = true;

    const mergedMesh = new THREE.Mesh(geometry, material);
    mergedMesh.name = `static-merge:${name}:${batchIndex}`;
    mergedMesh.castShadow = representative.castShadow;
    mergedMesh.receiveShadow = representative.receiveShadow;
    mergedMesh.renderOrder = representative.renderOrder;
    mergedMesh.layers.mask = representative.layers.mask;
    mergedMesh.userData.staticBatch = true;

    const originals: StaticBatch['originals'] = [];
    activeGroup.forEach((candidate) => {
      const parent = candidate.mesh.parent;
      if (!parent) return;
      originals.push({ mesh: candidate.mesh, parent, visible: candidate.mesh.visible });
      parent.remove(candidate.mesh);
      optimizedOriginals.add(candidate.mesh);
    });
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    root.add(mergedMesh);
    batches.push({
      mesh: mergedMesh,
      originals,
      ownsGeometry: true,
      ownsMaterial: true,
    });
    mergedOriginalCount += originals.length;
    mergedMeshCount += 1;
    batchIndex += 1;
  });

  // Preserve exact small repeats as instances after the broader opaque merge.
  // Transparent meshes stay on this path because independent merge ordering is unsafe.
  const instanceGroups = new Map<string, BatchCandidate[]>();
  stableCandidates.forEach((candidate) => {
    const { mesh } = candidate;
    if (!mesh.parent || optimizedOriginals.has(mesh)) return;
    const key = [
      candidate.geometrySignature,
      candidate.batchMaterialSignature,
      mesh.castShadow,
      mesh.receiveShadow,
      mesh.renderOrder,
      mesh.layers.mask,
    ].join('||');
    const group = instanceGroups.get(key);
    if (group) group.push(candidate);
    else instanceGroups.set(key, [candidate]);
  });

  instanceGroups.forEach((group) => {
    const activeGroup = group.filter(
      (candidate) => candidate.mesh.parent && !optimizedOriginals.has(candidate.mesh)
    );
    if (activeGroup.length < minimumInstances) return;
    const representative = activeGroup[0]?.mesh;
    if (!representative || Array.isArray(representative.material)) return;

    const usesInstanceColor = activeGroup.every((candidate) => candidate.instanceColor);
    const batchMaterial = usesInstanceColor
      ? (representative.material as THREE.Material).clone()
      : representative.material;
    if (usesInstanceColor) {
      const colorMaterial = batchMaterial as THREE.Material & {
        color: THREE.Color;
        vertexColors: boolean;
      };
      colorMaterial.color.set(0xffffff);
      colorMaterial.vertexColors = true;
      colorMaterial.needsUpdate = true;
    }
    const instance = new THREE.InstancedMesh(
      representative.geometry,
      batchMaterial,
      activeGroup.length
    );
    instance.name = `static-batch:${name}:${batchIndex}`;
    instance.castShadow = representative.castShadow;
    instance.receiveShadow = representative.receiveShadow;
    instance.renderOrder = representative.renderOrder;
    instance.layers.mask = representative.layers.mask;
    instance.userData.staticBatch = true;

    const originals: StaticBatch['originals'] = [];
    activeGroup.forEach((candidate, index) => {
      relativeMatrix.multiplyMatrices(inverseRoot, candidate.mesh.matrixWorld);
      instance.setMatrixAt(index, relativeMatrix);
      if (usesInstanceColor && candidate.instanceColor) {
        instance.setColorAt(index, candidate.instanceColor);
      }
      const parent = candidate.mesh.parent;
      if (!parent) return;
      originals.push({ mesh: candidate.mesh, parent, visible: candidate.mesh.visible });
      parent.remove(candidate.mesh);
      optimizedOriginals.add(candidate.mesh);
    });
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
    instance.computeBoundingBox();
    instance.computeBoundingSphere();
    root.add(instance);
    batches.push({
      mesh: instance,
      originals,
      ownsGeometry: false,
      ownsMaterial: usesInstanceColor,
    });
    instancedOriginalCount += originals.length;
    instancedBatchCount += 1;
    batchIndex += 1;
  });

  const existingDiagnostics = root.userData.staticBatchStats as StaticBatchDiagnostics | undefined;
  if (existingDiagnostics) {
    existingDiagnostics.optimizedOriginals += batches.reduce(
      (total, batch) => total + batch.originals.length,
      0
    );
    existingDiagnostics.batches += batches.length;
    existingDiagnostics.instancedOriginals += instancedOriginalCount;
    existingDiagnostics.instancedBatches += instancedBatchCount;
    existingDiagnostics.mergedOriginals += mergedOriginalCount;
    existingDiagnostics.mergedMeshes += mergedMeshCount;
  }

  return batches;
};

const restoreBatches = (root: THREE.Group, batches: StaticBatch[]): void => {
  batches.forEach((batch) => {
    root.remove(batch.mesh);
    if (batch.ownsGeometry) batch.mesh.geometry.dispose();
    if (batch.ownsMaterial) {
      const materials = Array.isArray(batch.mesh.material)
        ? batch.mesh.material
        : [batch.mesh.material];
      materials.forEach((material) => material.dispose());
    }
    batch.originals.forEach(({ mesh, parent, visible }) => {
      mesh.visible = visible;
      parent.add(mesh);
    });
  });
};

export const StaticMeshBatch: React.FC<StaticMeshBatchProps> = ({
  children,
  name,
  revision = 0,
  minimumInstances = 2,
  sampleMilliseconds = 650,
}) => {
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const pendingToken = beginStaticBatch();
    root.userData.staticBatchReady = false;
    let batchFinished = false;
    let cancelled = false;
    let pollTimer = 0;
    let sampleTimer = 0;
    const batchTimers: number[] = [];
    let previousCount = -1;
    let stablePolls = 0;
    const batches: StaticBatch[] = [];
    const markFinished = (): void => {
      if (batchFinished) return;
      batchFinished = true;
      root.userData.staticBatchReady = true;
      finishStaticBatch(pendingToken);
    };

    const poll = (): void => {
      if (cancelled) return;
      const candidateCount = countPotentialStaticMeshes(root);
      if (candidateCount > 0 && candidateCount === previousCount) stablePolls += 1;
      else stablePolls = 0;
      previousCount = candidateCount;

      if (stablePolls >= 2) {
        const schedule = (callback: () => void): void => {
          batchTimers.push(window.setTimeout(callback, 0));
        };
        collectStaticBatchCandidatesIncrementally(
          root,
          schedule,
          () => cancelled,
          (candidates) => {
            sampleTimer = window.setTimeout(() => {
              if (cancelled) return;
              const candidateChunks: BatchCandidate[][] = [];
              for (
                let start = 0;
                start < candidates.length;
                start += MAX_BATCH_CANDIDATES_PER_TASK
              ) {
                candidateChunks.push(
                  candidates.slice(start, start + MAX_BATCH_CANDIDATES_PER_TASK)
                );
              }

              const processChunk = (index: number): void => {
                if (cancelled) return;
                if (index >= candidateChunks.length) {
                  markFinished();
                  return;
                }
                const chunk = candidateChunks[index];
                if (chunk) {
                  batches.push(
                    ...createStaticMeshBatches(root, chunk, `${name}:${index}`, minimumInstances)
                  );
                }
                if (index + 1 < candidateChunks.length) {
                  schedule(() => processChunk(index + 1));
                } else {
                  markFinished();
                }
              };
              processChunk(0);
            }, sampleMilliseconds);
          }
        );
        return;
      }
      pollTimer = window.setTimeout(poll, 250);
    };

    pollTimer = window.setTimeout(poll, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
      window.clearTimeout(sampleTimer);
      batchTimers.forEach((timer) => window.clearTimeout(timer));
      restoreBatches(root, batches);
      markFinished();
    };
  }, [minimumInstances, name, revision, sampleMilliseconds]);

  return (
    <group ref={rootRef} name={name}>
      {children}
    </group>
  );
};
