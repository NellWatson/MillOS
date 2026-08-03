import React, { useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MachineData, MachineType } from '../types';
import { audioManager } from '../utils/audioManager';
import { PIPE_MATERIALS } from '../utils/sharedMaterials';
import { shouldRunThisFrame } from '../utils/frameThrottle';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useGraphicsStore } from '../stores/graphicsStore';
import { useShallow } from 'zustand/react/shallow';
import { generateMachinePanelNormal } from '../textures/normalGenerator';
import {
  buildSpoutRoutes,
  spoutMachineKey,
  SPOUT_PIPE_RADIUS,
  type PipeRouteFamily,
} from './flow/spoutRoutes';

const PIPE_RADIUS = SPOUT_PIPE_RADIUS;
// 12 radial segments: an 8-sided 0.17 m pipe reads as a visible octagon at
// interior camera distances. Instanced, so this is one geometry either way.
const PIPE_FLANGE_GEOMETRY = new THREE.CylinderGeometry(
  PIPE_RADIUS + 0.05,
  PIPE_RADIUS + 0.05,
  0.12,
  12
);
// Same 12 segments as the flange above, for the same reason: these are
// instanced at [0.1, height, 0.1] - 0.2 m columns standing 10-12 m through the
// interior - so they are read at closer range than the 0.17 m pipe that
// argument was originally made about.
const PIPE_SUPPORT_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 12);
const PIPE_FLANGE_MATERIAL = new THREE.MeshStandardMaterial({
  // Machined joint faces read brighter and tighter than the tube body - that
  // contrast is what makes a spouting run legible from across the mill.
  color: '#8b9ca0',
  metalness: 0.62,
  roughness: 0.35,
  envMapIntensity: 1.25,
});

interface PipeRouteMesh {
  readonly family: PipeRouteFamily;
  readonly geometry: THREE.BufferGeometry;
}

/**
 * Family-specific route materials.
 *
 * These are CLONES of the shared `PIPE_MATERIALS`, not edits to them:
 * `sharedMaterials.ts` is consumed by machines, forklifts and infrastructure,
 * and the spouting network is the only place that wants sheet relief and a
 * per-family roughness spread. The clone shares the source textures, so the
 * only cost is three extra material objects.
 *
 * The `color` values are KEPT. These materials carry a `roughnessMap` but no
 * albedo `map`, so `color` IS the albedo - it is not a tint compensating for
 * the old linear/sRGB texture bug and must not be reset to white.
 */
let routeMaterialCache: Record<PipeRouteFamily, THREE.MeshStandardMaterial> | null = null;

const getRouteMaterials = (): Record<PipeRouteFamily, THREE.MeshStandardMaterial> => {
  if (routeMaterialCache) return routeMaterialCache;

  // Cloned so the tiling below cannot leak into other consumers of the cached
  // source texture.
  const detailNormal = generateMachinePanelNormal(256, 4, 6).clone();
  detailNormal.wrapS = THREE.RepeatWrapping;
  detailNormal.wrapT = THREE.RepeatWrapping;
  // u runs along the tube axis, v around the circumference: 8 sheet sections
  // along the run, 2 seams around the bore.
  detailNormal.repeat.set(8, 2);
  detailNormal.needsUpdate = true;

  const normalScale = new THREE.Vector2(0.28, 0.28);

  const derive = (
    source: THREE.MeshStandardMaterial,
    roughness: number
  ): THREE.MeshStandardMaterial => {
    const material = source.clone();
    material.roughness = roughness;
    material.normalMap = detailNormal;
    material.normalScale = normalScale;
    material.envMapIntensity = 1.2;
    return material;
  };

  routeMaterialCache = {
    intake: derive(PIPE_MATERIALS.darkPipe, 0.46), // dusty raw-grain line
    pneumatic: derive(PIPE_MATERIALS.whitePipe, 0.34), // painted lift line
    finished: derive(PIPE_MATERIALS.lightPipe, 0.3), // polished product line
  };
  return routeMaterialCache;
};

function InstancedPipeFlanges({ matrices }: { readonly matrices: readonly THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    matrices.forEach((matrix, index) => ref.current?.setMatrixAt(index, matrix));
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [matrices]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[PIPE_FLANGE_GEOMETRY, PIPE_FLANGE_MATERIAL, matrices.length]}
      castShadow
      receiveShadow
    />
  );
}

export const SpoutingSystem = React.memo<{
  machines: MachineData[];
  enableAudio?: boolean;
}>(({ machines, enableAudio = true }) => {
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);
  const quality = useGraphicsStore(useShallow((state) => state.graphics.quality));
  // Extract stable machine data to prevent unnecessary re-renders.
  // Shared with GrainFlow through `spoutRoutes`, so both agree on when the
  // layout has actually changed (and ignore per-tick status churn).
  const machineKey = useMemo(() => spoutMachineKey(machines), [machines]);

  // Calculate spouting sound positions (midpoints of key pipe connections)
  const spoutPositions = useMemo(() => {
    const positions: { id: string; x: number; y: number; z: number }[] = [];
    const silos = machines.filter((m) => m.type === MachineType.SILO);
    const mills = machines.filter((m) => m.type === MachineType.ROLLER_MILL);
    const sifters = machines.filter((m) => m.type === MachineType.PLANSIFTER);

    // Add sound positions at key pipe junctions
    mills.forEach((mill, i) => {
      const silo = silos[i % silos.length];
      if (silo) {
        positions.push({
          id: `spout-silo-mill-${i}`,
          x: (silo.position[0] + mill.position[0]) / 2,
          y: 8,
          z: (silo.position[2] + mill.position[2]) / 2,
        });
      }
    });

    sifters.forEach((sifter, i) => {
      positions.push({
        id: `spout-sifter-${i}`,
        x: sifter.position[0],
        y: sifter.position[1],
        z: sifter.position[2],
      });
    });

    return positions;
  }, [machineKey]); // Use stable key instead of full machines array

  // Start spouting sounds on mount
  useEffect(() => {
    if (!enableAudio) return;
    spoutPositions.forEach((pos) => {
      audioManager.startSpoutingSound(pos.id, pos.x, pos.y, pos.z);
    });

    return () => {
      spoutPositions.forEach((pos) => {
        audioManager.stopSpoutingSound(pos.id);
      });
    };
  }, [enableAudio, spoutPositions]);

  // Update spatial audio volumes each frame
  useFrame(() => {
    if (!enableAudio) return;
    if (!isTabVisible) return;
    // Spatial volume is fine at ~30fps; throttle to reduce per-frame audio work
    if (!shouldRunThisFrame(2)) return;

    spoutPositions.forEach((pos) => {
      audioManager.updateSpoutingSpatialVolume(pos.id);
    });
  });

  // Silhouette quality by tier. 8 radial segments on a 0.17 m pipe is a visible
  // octagon at interior camera distance; the routes are merged into 3 draw
  // calls either way, so this is vertex throughput only.
  const radialSegments = quality === 'low' ? 6 : quality === 'medium' ? 8 : 12;

  const pipeData = useMemo(() => {
    const routeGeometries: Record<PipeRouteFamily, THREE.BufferGeometry[]> = {
      intake: [],
      pneumatic: [],
      finished: [],
    };
    const flangeMatrices: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const tangentTarget = new THREE.Vector3();

    // Curves come from the shared route builder so GrainFlow puts product
    // inside these exact pipes.
    buildSpoutRoutes(machines).forEach(({ family, curve, length }) => {
      routeGeometries[family].push(
        new THREE.TubeGeometry(curve, 32, PIPE_RADIUS, radialSegments, false)
      );

      // Real spouting is bolted up roughly every 3-4 m. Flanges are instanced
      // into one draw call, so density here is nearly free and it is what makes
      // the run read as jointed pipework rather than an extruded noodle.
      const flangeCount = Math.min(16, Math.max(2, Math.round(length / 4)));

      for (let f = 1; f < flangeCount; f++) {
        const t = f / flangeCount;
        const pt = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);

        dummy.position.copy(pt);
        tangentTarget.copy(pt).add(tan);
        dummy.lookAt(tangentTarget);
        dummy.rotateX(Math.PI / 2);
        dummy.updateMatrix();
        flangeMatrices.push(dummy.matrix.clone());
      }
    });

    const routes = (Object.entries(routeGeometries) as [PipeRouteFamily, THREE.BufferGeometry[]][])
      .map(([family, geometries]): PipeRouteMesh | null => {
        if (geometries.length === 0) return null;
        const geometry = mergeGeometries(geometries, false);
        geometries.forEach((sourceGeometry) => sourceGeometry.dispose());
        return geometry ? { family, geometry } : null;
      })
      .filter((route): route is PipeRouteMesh => route !== null);

    return { routes, flangeMatrices };
    // Stable layout key + tier, not the machines array (status ticks constantly).
  }, [machineKey, radialSegments]);

  // Dispose route geometries on unmount or when dependencies change. Module-level
  // materials and instanced detail geometry remain shared for the application lifetime.
  useEffect(() => {
    return () => {
      pipeData.routes.forEach(({ geometry }) => geometry.dispose());
    };
  }, [pipeData]);

  const routeMaterials = getRouteMaterials();

  return (
    <group name="process-spouting-network">
      {pipeData.routes.map(({ family, geometry }) => (
        // receiveShadow: without it the runs never darken under the roof
        // structure or under each other, which is most of the "nothing is
        // occluded at ceiling height" read.
        <mesh
          key={family}
          geometry={geometry}
          material={routeMaterials[family]}
          castShadow
          receiveShadow
        />
      ))}
      <InstancedPipeFlanges matrices={pipeData.flangeMatrices} />
      <PipeSupports />
    </group>
  );
});

// Pipe support positions (static, defined at module level)
const PIPE_SUPPORT_POSITIONS: [number, number, number][] = [
  [-21, 10, -14],
  [0, 10, -14],
  [21, 10, -14],
  [-18, 12, 7],
  [18, 12, 7],
];

const PipeSupports: React.FC = React.memo(() => {
  const verticalRef = useRef<THREE.InstancedMesh>(null);
  const crossBeamRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const object = new THREE.Object3D();
    PIPE_SUPPORT_POSITIONS.forEach(([x, height, z], index) => {
      object.position.set(x, height / 2, z);
      object.rotation.set(0, 0, 0);
      object.scale.set(0.1, height, 0.1);
      object.updateMatrix();
      verticalRef.current?.setMatrixAt(index, object.matrix);

      object.position.set(x, height, z);
      object.rotation.set(0, 0, Math.PI / 2);
      object.scale.set(0.08, 3, 0.08);
      object.updateMatrix();
      crossBeamRef.current?.setMatrixAt(index, object.matrix);
    });

    [verticalRef.current, crossBeamRef.current].forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, []);

  return (
    <group name="process-spouting-supports">
      <instancedMesh
        ref={verticalRef}
        args={[PIPE_SUPPORT_GEOMETRY, PIPE_MATERIALS.supportGray, PIPE_SUPPORT_POSITIONS.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={crossBeamRef}
        args={[PIPE_SUPPORT_GEOMETRY, PIPE_MATERIALS.supportSlate, PIPE_SUPPORT_POSITIONS.length]}
        receiveShadow
      />
    </group>
  );
});
