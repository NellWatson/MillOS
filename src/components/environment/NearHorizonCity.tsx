import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RENDER_ORDER } from '../../constants/renderLayers';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { getExteriorLampLevel } from '../exterior/ExteriorLighting';

export interface NearCityBuildingSpec {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly yaw: number;
  readonly tone: number;
}

const deterministicNoise = (index: number, channel: number): number => {
  const value = Math.sin(index * 91.731 + channel * 37.117 + 8.913) * 43758.5453;
  return value - Math.floor(value);
};

/** A compact, world-anchored skyline that restores nearby parallax. */
export const buildNearCitySpecs = (count = 32): NearCityBuildingSpec[] =>
  Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 0.5 : index / (count - 1);
    const angle = THREE.MathUtils.lerp(-1.08, -0.25, progress);
    const radius = 225 + deterministicNoise(index, 0) * 15;
    const landmark = deterministicNoise(index, 1) > 0.9;
    const height = 8 + deterministicNoise(index, 2) * 20 + (landmark ? 8 : 0);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      x,
      z,
      width: 4 + deterministicNoise(index, 3) * 3.2,
      depth: 4 + deterministicNoise(index, 4) * 4.5,
      height,
      yaw: Math.atan2(-x, -z),
      tone: deterministicNoise(index, 5),
    };
  });

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const CITY_BODY_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  roughness: 0.88,
  metalness: 0.04,
  vertexColors: true,
});
const CITY_ROOF_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#59636b',
  roughness: 0.78,
  metalness: 0.12,
});
const CITY_WINDOW_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#4b7189',
  emissive: '#ffca72',
  emissiveIntensity: 0,
  roughness: 0.28,
  metalness: 0.12,
});
const CITY_BODY_COLOURS = [
  new THREE.Color('#84949c'),
  new THREE.Color('#958d82'),
  new THREE.Color('#758c9a'),
  new THREE.Color('#899693'),
] as const;

interface WindowSpec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly yaw: number;
}

export const NearHorizonCity: React.FC = () => {
  const buildings = useMemo(() => buildNearCitySpecs(), []);
  const windows = useMemo<WindowSpec[]>(() => {
    const result: WindowSpec[] = [];
    buildings.forEach((building, buildingIndex) => {
      const inwardX = -building.x / Math.hypot(building.x, building.z);
      const inwardZ = -building.z / Math.hypot(building.x, building.z);
      const columns = building.width > 7 ? 4 : 3;
      const floors = Math.max(2, Math.floor((building.height - 3) / 3.5));
      for (let floor = 0; floor < floors; floor += 1) {
        for (let column = 0; column < columns; column += 1) {
          if (deterministicNoise(buildingIndex * 31 + floor * 5 + column, 8) < 0.18) continue;
          const across = (column + 0.5) / columns - 0.5;
          const tangentX = -inwardZ;
          const tangentZ = inwardX;
          result.push({
            x:
              building.x +
              inwardX * (building.depth / 2 + 0.05) +
              tangentX * across * building.width * 0.76,
            y: 2.3 + floor * 3.5,
            z:
              building.z +
              inwardZ * (building.depth / 2 + 0.05) +
              tangentZ * across * building.width * 0.76,
            width: (building.width / columns) * 0.38,
            yaw: building.yaw,
          });
        }
      }
    });
    return result;
  }, [buildings]);
  const bodiesRef = useRef<THREE.InstancedMesh>(null);
  const roofsRef = useRef<THREE.InstancedMesh>(null);
  const windowsRef = useRef<THREE.InstancedMesh>(null);
  const initialLightLevel = getExteriorLampLevel(
    useGameSimulationStore.getState().gameTime,
    useGameSimulationStore.getState().weather
  );
  const lightTargetRef = useRef(initialLightLevel);
  const lightLevelRef = useRef(initialLightLevel);

  useLayoutEffect(() => {
    const bodies = bodiesRef.current;
    const roofs = roofsRef.current;
    const windowMesh = windowsRef.current;
    if (!bodies || !roofs || !windowMesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();

    buildings.forEach((building, index) => {
      position.set(building.x, building.height / 2 - 0.8, building.z);
      rotation.setFromEuler(euler.set(0, building.yaw, 0));
      scale.set(building.width, building.height, building.depth);
      bodies.setMatrixAt(index, matrix.compose(position, rotation, scale));
      bodies.setColorAt(index, CITY_BODY_COLOURS[Math.floor(building.tone * 4) % 4]);

      position.set(building.x, building.height - 0.35, building.z);
      scale.set(building.width * 0.72, 0.7, building.depth * 0.72);
      roofs.setMatrixAt(index, matrix.compose(position, rotation, scale));
    });
    windows.forEach((window, index) => {
      position.set(window.x, window.y, window.z);
      rotation.setFromEuler(euler.set(0, window.yaw, 0));
      scale.set(window.width, 0.54, 0.09);
      windowMesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
    });
    bodies.instanceMatrix.needsUpdate = true;
    bodies.instanceColor!.needsUpdate = true;
    roofs.instanceMatrix.needsUpdate = true;
    windowMesh.instanceMatrix.needsUpdate = true;
    bodies.computeBoundingSphere();
    roofs.computeBoundingSphere();
    windowMesh.computeBoundingSphere();
  }, [buildings, windows]);

  useEffect(
    () =>
      useGameSimulationStore.subscribe((state) => {
        lightTargetRef.current = getExteriorLampLevel(state.gameTime, state.weather);
      }),
    []
  );

  useFrame((_, delta) => {
    lightLevelRef.current = THREE.MathUtils.damp(
      lightLevelRef.current,
      lightTargetRef.current,
      3.2,
      Math.min(Math.max(delta, 0), 0.1)
    );
    CITY_WINDOW_MATERIAL.emissiveIntensity = lightLevelRef.current * 3.4;
  });

  return (
    <group name="near-horizon-city" dispose={null}>
      <instancedMesh
        ref={bodiesRef}
        name="near-city-buildings"
        args={[UNIT_BOX, CITY_BODY_MATERIAL, buildings.length]}
        renderOrder={RENDER_ORDER.cityNear}
      />
      <instancedMesh
        ref={roofsRef}
        name="near-city-roofs"
        args={[UNIT_BOX, CITY_ROOF_MATERIAL, buildings.length]}
        renderOrder={RENDER_ORDER.cityNear + 1}
      />
      <instancedMesh
        ref={windowsRef}
        name="near-city-windows"
        args={[UNIT_BOX, CITY_WINDOW_MATERIAL, windows.length]}
        renderOrder={RENDER_ORDER.cityNear + 2}
      />
    </group>
  );
};
