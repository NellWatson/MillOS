import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { collectStaticBatchCandidates, createStaticMeshBatches } from './StaticMeshBatch';

const makeBox = (x: number, color: string = '#778899'): THREE.Mesh => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 3),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  );
  mesh.position.x = x;
  return mesh;
};

describe('StaticMeshBatch', () => {
  it('instances transform-stable opaque duplicates without changing their world transforms', () => {
    const root = new THREE.Group();
    const left = makeBox(-2);
    const right = makeBox(3);
    root.add(left, right);

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'test', 2);

    expect(batches).toHaveLength(1);
    const batchMesh = batches[0]?.mesh;
    expect(batchMesh).toBeInstanceOf(THREE.InstancedMesh);
    if (!(batchMesh instanceof THREE.InstancedMesh)) {
      throw new Error('Expected transform-compatible duplicates to produce an InstancedMesh');
    }
    expect(batchMesh.count).toBe(2);
    expect(left.parent).toBeNull();
    expect(right.parent).toBeNull();

    const matrix = new THREE.Matrix4();
    batchMesh.getMatrixAt(0, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).x).toBeCloseTo(-2);
    batchMesh.getMatrixAt(1, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).x).toBeCloseTo(3);
  });

  it('keeps interactive and explicitly dynamic meshes out of static batching', () => {
    const root = new THREE.Group();
    const transparent = makeBox(0);
    (transparent.material as THREE.MeshStandardMaterial).transparent = true;
    const interactive = makeBox(1);
    interactive.userData.noStaticBatch = true;
    const dynamicParent = new THREE.Group();
    dynamicParent.userData.dynamic = true;
    dynamicParent.add(makeBox(2));
    root.add(transparent, interactive, dynamicParent);

    expect(collectStaticBatchCandidates(root)).toEqual([
      expect.objectContaining({ mesh: transparent }),
    ]);
  });

  it('instances exact transparent duplicates without merging their draw order', () => {
    const root = new THREE.Group();
    const left = makeBox(-1);
    const right = makeBox(1);
    for (const mesh of [left, right]) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = 0.45;
      material.depthWrite = false;
    }
    root.add(left, right);

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'transparent', 2);

    expect(batches).toHaveLength(1);
    expect(batches[0]?.mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect((batches[0]?.mesh.material as THREE.Material).transparent).toBe(true);
  });

  it('rejects candidates whose transforms change during the sample window', () => {
    const root = new THREE.Group();
    const left = makeBox(-1);
    const right = makeBox(1);
    root.add(left, right);
    const candidates = collectStaticBatchCandidates(root);

    right.position.x = 4;
    right.updateMatrixWorld(true);
    const batches = createStaticMeshBatches(root, candidates, 'test', 2);

    expect(batches).toHaveLength(0);
    expect(left.visible).toBe(true);
    expect(right.visible).toBe(true);
  });

  it('does not merge different geometries at startup', () => {
    const root = new THREE.Group();
    const materialA = new THREE.MeshStandardMaterial({ color: '#445566', roughness: 0.8 });
    const materialB = new THREE.MeshStandardMaterial({ color: '#445566', roughness: 0.8 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materialA);
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 8), materialB);
    cylinder.position.x = 3;
    root.add(box, cylinder);

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'test', 2);

    expect(batches).toHaveLength(0);
    expect(box.parent).toBe(root);
    expect(cylinder.parent).toBe(root);
  });

  it('does not merge colour variants when their geometry differs', () => {
    const root = new THREE.Group();
    const red = makeBox(-2, '#ff0000');
    const blue = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
      new THREE.MeshStandardMaterial({ color: '#0000ff', roughness: 0.7 })
    );
    blue.position.x = 2;
    root.add(red, blue);

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'test', 2);

    expect(batches).toHaveLength(0);
    expect(red.parent).toBe(root);
    expect(blue.parent).toBe(root);
  });

  it('preserves opaque colour variants with per-instance colours', () => {
    const root = new THREE.Group();
    const red = makeBox(-2, '#ff0000');
    const blue = makeBox(2, '#0000ff');
    root.add(red, blue);

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'colour', 2);

    expect(batches).toHaveLength(1);
    const instance = batches[0]?.mesh as THREE.InstancedMesh;
    expect(instance.count).toBe(2);
    const color = new THREE.Color();
    instance.getColorAt(0, color);
    expect(color.getHexString()).toBe('ff0000');
    instance.getColorAt(1, color);
    expect(color.getHexString()).toBe('0000ff');
    expect((instance.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('ffffff');
    expect((instance.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
  });

  it('keeps transparent colour variants in separate draw-order groups', () => {
    const root = new THREE.Group();
    const red = makeBox(-2, '#ff0000');
    const blue = makeBox(2, '#0000ff');
    for (const mesh of [red, blue]) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = 0.5;
      material.depthWrite = false;
    }
    root.add(red, blue);

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'transparent-colour', 2);

    expect(batches).toHaveLength(0);
    expect(red.parent).toBe(root);
    expect(blue.parent).toBe(root);
  });

  it('merges stable opaque singletons by material and spatial cell', () => {
    const root = new THREE.Group();
    const meshes = [
      new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 })
      ),
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.7 })
      ),
      new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.7 })
      ),
      new THREE.Mesh(
        new THREE.ConeGeometry(0.6, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.7 })
      ),
    ];
    meshes.forEach((mesh, index) => {
      mesh.position.x = index * 2;
      root.add(mesh);
    });

    const candidates = collectStaticBatchCandidates(root);
    const batches = createStaticMeshBatches(root, candidates, 'merge', 2);

    expect(batches).toHaveLength(1);
    expect(batches[0]?.mesh).not.toBeInstanceOf(THREE.InstancedMesh);
    expect(batches[0]?.originals).toHaveLength(4);
    expect(batches[0]?.mesh.geometry.getAttribute('color')).toBeDefined();
    expect(root.userData.staticBatchStats).toMatchObject({
      mergedOriginals: 4,
      mergedMeshes: 1,
    });
  });
});
