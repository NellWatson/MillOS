import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
  hayBale: new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16),
  hayRing: new THREE.RingGeometry(0.2, 0.48, 16),
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
  mudPuddle: new THREE.CircleGeometry(2, 16),
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
  windmillTower: new THREE.CylinderGeometry(0.8, 1.2, 6, 8),
  windmillCap: new THREE.ConeGeometry(1, 1.5, 8),
  windmillHub: new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8),
  windmillBladeArm: new THREE.BoxGeometry(0.15, 3, 0.05),
  windmillBladeSail: new THREE.BoxGeometry(0.5, 2.5, 0.02),
  windmillDoor: new THREE.BoxGeometry(0.6, 1.6, 0.1),
};

// Shared Materials - created once at module load
const SM = {
  barnRed: new THREE.MeshStandardMaterial({ color: '#8B2323', roughness: 0.8 }),
  barnRoof: new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.7 }),
  whiteTrim: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.6 }),
  barnDoor: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.8 }),
  barnWindow: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: '#ffd700', roughness: 0.3, metalness: 0.7 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: '#424242', roughness: 0.4, metalness: 0.6 }),
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
  woodBrown: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.9 }),
  woodLight: new THREE.MeshStandardMaterial({ color: '#8d6e63', roughness: 0.85 }),
  woodTan: new THREE.MeshStandardMaterial({ color: '#a1887f', roughness: 0.8 }),
  grass: new THREE.MeshStandardMaterial({ color: '#4a7c59', roughness: 0.95 }),
  mud: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 1 }),
  soil: new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: '#d7ccc8', roughness: 0.8 }),
  water: new THREE.MeshStandardMaterial({
    color: '#64b5f6',
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
  }),
  treeTrunk: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.9 }),
  treeLeafDark: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.8 }),
  treeLeafLight: new THREE.MeshStandardMaterial({ color: '#388e3c', roughness: 0.8 }),
  hay: new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.95 }),
  hayDark: new THREE.MeshStandardMaterial({ color: '#c4956a', roughness: 0.95 }),
  carrotOrange: new THREE.MeshStandardMaterial({ color: '#ff7043', roughness: 0.8 }),
  vegetableGreen: new THREE.MeshStandardMaterial({ color: '#4caf50', roughness: 0.8 }),
  cabbageGreen: new THREE.MeshStandardMaterial({ color: '#81c784', roughness: 0.85 }),
  houseWall: new THREE.MeshStandardMaterial({ color: '#f5f5dc', roughness: 0.75 }),
  roofBrown: new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.8 }),
  chimneyRed: new THREE.MeshStandardMaterial({ color: '#8B0000', roughness: 0.8 }),
  windowBlue: new THREE.MeshStandardMaterial({ color: '#87ceeb', roughness: 0.2, metalness: 0.1 }),
  shutterGreen: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.7 }),
  coopBrown: new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.85 }),
  coopDark: new THREE.MeshStandardMaterial({ color: '#6d4c41', roughness: 0.85 }),
  coopRoof: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.7 }),
  windmillSail: new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.7,
    side: THREE.DoubleSide,
  }),
};

// Static components with React.memo
const Barn = React.memo<{ position: [number, number, number] }>(({ position }) => (
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
    <mesh position={[0, 5, 4.05]}>
      <circleGeometry args={[0.8, 16]} />
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
    <mesh position={[0, 2, 0]} castShadow>
      <boxGeometry args={[3.5, 0.15, 3]} />
      <primitive object={SM.coopRoof} attach="material" />
    </mesh>
    <mesh position={[0, 2.4, -0.6]} rotation={[0.5, 0, 0]} castShadow>
      <boxGeometry args={[3.5, 0.15, 1.5]} />
      <primitive object={SM.coopRoof} attach="material" />
    </mesh>
    <mesh position={[0, 2.4, 0.6]} rotation={[-0.5, 0, 0]} castShadow>
      <boxGeometry args={[3.5, 0.15, 1.5]} />
      <primitive object={SM.coopRoof} attach="material" />
    </mesh>
    <mesh position={[1.51, 0.4, 0]}>
      <boxGeometry args={[0.1, 0.6, 0.5]} />
      <primitive object={SM.black} attach="material" />
    </mesh>
    <mesh position={[2.2, 0.2, 0]} rotation={[0, 0, 0.4]} castShadow>
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

const Farmhouse = React.memo<{ position: [number, number, number] }>(({ position }) => (
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

const Tree = React.memo<{ position: [number, number, number] }>(({ position }) => (
  <group position={position}>
    <mesh position={[0, 2, 0]} castShadow>
      <primitive object={SG.treeTrunk} attach="geometry" />
      <primitive object={SM.treeTrunk} attach="material" />
    </mesh>
    <mesh position={[0, 5.5, 0]} castShadow>
      <primitive object={SG.treeFoliage} attach="geometry" />
      <primitive object={SM.treeLeafDark} attach="material" />
    </mesh>
    <mesh position={[0, 8, 0]} castShadow>
      <primitive object={SG.treeFoliageTop} attach="geometry" />
      <primitive object={SM.treeLeafLight} attach="material" />
    </mesh>
  </group>
));
Tree.displayName = 'Tree';

const Sheep = React.memo<{ position: [number, number, number]; rotation?: number }>(
  ({ position, rotation = 0 }) => (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <primitive object={SG.sheepBody} attach="geometry" />
        <primitive object={SM.sheepWool} attach="material" />
      </mesh>
      {[
        [0.2, 0.7, 0.2],
        [-0.2, 0.75, 0.15],
        [0, 0.8, -0.2],
        [0.15, 0.65, -0.25],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <primitive object={SG.sheepFluff} attach="geometry" />
          <primitive object={SM.sheepWool} attach="material" />
        </mesh>
      ))}
      <mesh position={[0.4, 0.55, 0]} castShadow>
        <primitive object={SG.sheepHead} attach="geometry" />
        <primitive object={SM.sheepFace} attach="material" />
      </mesh>
      <mesh position={[0.35, 0.65, 0.15]} rotation={[0, 0.5, 0.5]} castShadow>
        <primitive object={SG.sheepEar} attach="geometry" />
        <primitive object={SM.sheepFace} attach="material" />
      </mesh>
      <mesh position={[0.35, 0.65, -0.15]} rotation={[0, -0.5, -0.5]} castShadow>
        <primitive object={SG.sheepEar} attach="geometry" />
        <primitive object={SM.sheepFace} attach="material" />
      </mesh>
      <mesh position={[0.52, 0.6, 0.08]}>
        <primitive object={SG.sheepEye} attach="geometry" />
        <primitive object={SM.sheepEye} attach="material" />
      </mesh>
      <mesh position={[0.52, 0.6, -0.08]}>
        <primitive object={SG.sheepEye} attach="geometry" />
        <primitive object={SM.sheepEye} attach="material" />
      </mesh>
      {[
        [0.2, 0.12, 0.18],
        [0.2, 0.12, -0.18],
        [-0.2, 0.12, 0.18],
        [-0.2, 0.12, -0.18],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <primitive object={SG.sheepLeg} attach="geometry" />
          <primitive object={SM.sheepFace} attach="material" />
        </mesh>
      ))}
    </group>
  )
);
Sheep.displayName = 'Sheep';

// Animated components with refs for centralized animation
// Movement interface
interface AnimalState {
  target: THREE.Vector3;
  isIdle: boolean;
  idleTime: number;
}

const Chicken: React.FC<{
  position: [number, number, number];
  rotation?: number;
  groupRef: React.RefObject<THREE.Group | null>;
  animRef: React.RefObject<THREE.Group | null>;
}> = ({ position, rotation = 0, groupRef, animRef }) => (
  <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
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
    <mesh position={[0.05, 0.08, 0.05]} castShadow>
      <primitive object={SG.chickenLeg} attach="geometry" />
      <primitive object={SM.chickenBeak} attach="material" />
    </mesh>
    <mesh position={[0.05, 0.08, -0.05]} castShadow>
      <primitive object={SG.chickenLeg} attach="geometry" />
      <primitive object={SM.chickenBeak} attach="material" />
    </mesh>
  </group>
);

const Pig: React.FC<{
  position: [number, number, number];
  rotation?: number;
  groupRef: React.RefObject<THREE.Group | null>;
  tailRef: React.RefObject<THREE.Mesh | null>;
}> = ({ position, rotation = 0, groupRef, tailRef }) => (
  <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
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
    <mesh position={[0.61, 0.37, 0.04]}>
      <primitive object={SG.pigNostril} attach="geometry" />
      <primitive object={SM.pigNostril} attach="material" />
    </mesh>
    <mesh position={[0.61, 0.37, -0.04]}>
      <primitive object={SG.pigNostril} attach="geometry" />
      <primitive object={SM.pigNostril} attach="material" />
    </mesh>
    <mesh position={[0.25, 0.6, 0.15]} rotation={[0.5, 0.3, 0]} castShadow>
      <primitive object={SG.pigEar} attach="geometry" />
      <primitive object={SM.pigPink} attach="material" />
    </mesh>
    <mesh position={[0.25, 0.6, -0.15]} rotation={[0.5, -0.3, 0]} castShadow>
      <primitive object={SG.pigEar} attach="geometry" />
      <primitive object={SM.pigPink} attach="material" />
    </mesh>
    <mesh position={[0.5, 0.48, 0.12]}>
      <primitive object={SG.pigEye} attach="geometry" />
      <primitive object={SM.black} attach="material" />
    </mesh>
    <mesh position={[0.5, 0.48, -0.12]}>
      <primitive object={SG.pigEye} attach="geometry" />
      <primitive object={SM.black} attach="material" />
    </mesh>
    {[
      [0.15, 0.1, 0.2],
      [0.15, 0.1, -0.2],
      [-0.15, 0.1, 0.2],
      [-0.15, 0.1, -0.2],
    ].map((pos, i) => (
      <mesh key={i} position={pos as [number, number, number]} castShadow>
        <primitive object={SG.pigLeg} attach="geometry" />
        <primitive object={SM.pigPink} attach="material" />
      </mesh>
    ))}
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
}> = ({ position, rotation = 0, groupRef, headRef }) => (
  <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
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
      <mesh position={[0.88, 0.62, 0.05]}>
        <primitive object={SG.cowNostril} attach="geometry" />
        <primitive object={SM.cowNostril} attach="material" />
      </mesh>
      <mesh position={[0.88, 0.62, -0.05]}>
        <primitive object={SG.cowNostril} attach="geometry" />
        <primitive object={SM.cowNostril} attach="material" />
      </mesh>
      <mesh position={[0.7, 0.78, 0.12]}>
        <primitive object={SG.cowEye} attach="geometry" />
        <primitive object={SM.black} attach="material" />
      </mesh>
      <mesh position={[0.7, 0.78, -0.12]}>
        <primitive object={SG.cowEye} attach="geometry" />
        <primitive object={SM.black} attach="material" />
      </mesh>
      <mesh position={[0.5, 0.82, 0.18]} rotation={[0, 0.5, 0.3]} castShadow>
        <primitive object={SG.cowEar} attach="geometry" />
        <primitive object={SM.cowWhite} attach="material" />
      </mesh>
      <mesh position={[0.5, 0.82, -0.18]} rotation={[0, -0.5, -0.3]} castShadow>
        <primitive object={SG.cowEar} attach="geometry" />
        <primitive object={SM.cowWhite} attach="material" />
      </mesh>
      <mesh position={[0.45, 0.92, 0.1]} rotation={[0, 0, 0.3]} castShadow>
        <primitive object={SG.cowHorn} attach="geometry" />
        <primitive object={SM.cowHorn} attach="material" />
      </mesh>
      <mesh position={[0.45, 0.92, -0.1]} rotation={[0, 0, -0.3]} castShadow>
        <primitive object={SG.cowHorn} attach="geometry" />
        <primitive object={SM.cowHorn} attach="material" />
      </mesh>
    </group>
    {[
      [0.3, 0.2, 0.25],
      [0.3, 0.2, -0.25],
      [-0.35, 0.2, 0.25],
      [-0.35, 0.2, -0.25],
    ].map((pos, i) => (
      <mesh key={i} position={pos as [number, number, number]} castShadow>
        <primitive object={SG.cowLeg} attach="geometry" />
        <primitive object={SM.cowWhite} attach="material" />
      </mesh>
    ))}
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

const WindmillComp: React.FC<{
  position: [number, number, number];
  bladesRef: React.RefObject<THREE.Group | null>;
}> = ({ position, bladesRef }) => (
  <group position={position}>
    <mesh position={[0, 3, 0]} castShadow>
      <primitive object={SG.windmillTower} attach="geometry" />
      <primitive object={SM.stone} attach="material" />
    </mesh>
    <mesh position={[0, 6.5, 0]} castShadow>
      <primitive object={SG.windmillCap} attach="geometry" />
      <primitive object={SM.woodBrown} attach="material" />
    </mesh>
    <mesh position={[0, 5.5, 0.9]} castShadow>
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
    <mesh position={[0, 0.9, 1.15]}>
      <primitive object={SG.windmillDoor} attach="geometry" />
      <primitive object={SM.woodBrown} attach="material" />
    </mesh>
  </group>
);

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
    Array.from({ length: 5 }, () => ({
      target: new THREE.Vector3(12 + (Math.random() - 0.5) * 8, 0, -5 + (Math.random() - 0.5) * 8),
      isIdle: false,
      idleTime: 0,
    }))
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
    Array.from({ length: 3 }, () => ({
      target: new THREE.Vector3(-12 + (Math.random() - 0.5) * 4, 0, -5 + (Math.random() - 0.5) * 4),
      isIdle: false,
      idleTime: 0,
    }))
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
    Array.from({ length: 3 }, () => ({
      target: new THREE.Vector3(5 + (Math.random() - 0.5) * 15, 0, 15 + (Math.random() - 0.5) * 8),
      isIdle: false,
      idleTime: 0,
    }))
  );

  const windmillBladesRef = useRef<THREE.Group>(null);
  const frameCountRef = useRef(0);

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
        // Pick new target within bounds
        state.target.set(
          bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
          yOffset,
          bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
        );
      }
    } else {
      // Move towards target
      const currentPos = ref.position;
      const direction = new THREE.Vector3().subVectors(state.target, currentPos);
      const dist = direction.length();

      if (dist < 0.1) {
        state.isIdle = true;
        state.idleTime = 2 + Math.random() * 4; // Idle for 2-6 seconds
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
    frameCountRef.current++;
    const time = state.clock.elapsedTime;

    // Windmill: every 2nd frame (30 FPS)
    if (frameCountRef.current % 2 === 0 && windmillBladesRef.current) {
      windmillBladesRef.current.rotation.z = time * 0.5;
    }

    // Animals: every 2nd frame for smooth movement (30 FPS)
    // We update movement slightly more often than the body animations (pecking/wagging)
    if (frameCountRef.current % 2 === 0) {
      const adjustDelta = delta * 2; // Compensate for skipping frames

      // Chickens
      chickenRefs.forEach((ref, i) => {
        updateAnimalMovement(
          ref.current,
          chickenStates.current[i],
          adjustDelta,
          1.5, // Speed
          { minX: 8, maxX: 16, minZ: -9, maxZ: -1 } // Bounds
        );
      });

      // Pigs
      pigRefs.forEach((ref, i) => {
        updateAnimalMovement(
          ref.current,
          pigStates.current[i],
          adjustDelta,
          0.8, // Speed
          { minX: -14, maxX: -10, minZ: -7, maxZ: -3 } // Bounds
        );
      });

      // Cows
      cowRefs.forEach((ref, i) => {
        updateAnimalMovement(
          ref.current,
          cowStates.current[i],
          adjustDelta,
          0.5, // Speed
          { minX: -5, maxX: 15, minZ: 10, maxZ: 20 } // Bounds
        );
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

  return (
    <group position={[75, 0, 120]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={SG.farmGround} attach="geometry" />
        <primitive object={SM.grass} attach="material" />
      </mesh>
      <Barn position={[0, 0, 0]} />
      <ChickenCoop position={[12, 0, -5]} />
      <Farmhouse position={[-10, 0, 12]} />
      <GardenBed position={[-15, 0, 16]} />
      <GardenBed position={[-15, 0, 19]} />
      {chickenData.map((c, i) => (
        <Chicken
          key={`chicken-${i}`}
          position={c.pos}
          rotation={c.rot}
          groupRef={chickenRefs[i]}
          animRef={chickenAnimRefs[i]}
        />
      ))}
      <group position={[-12, 0, -5]}>
        <FenceSection position={[0, 0, -3]} length={6} />
        <FenceSection position={[0, 0, 3]} length={6} />
        <FenceSection position={[-3, 0, 0]} rotation={Math.PI / 2} length={6} />
        <FenceSection position={[3, 0, 0]} rotation={Math.PI / 2} length={6} />
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={SG.mudPuddle} attach="geometry" />
          <primitive object={SM.mud} attach="material" />
        </mesh>
        {/** Pigs are now positioned at top level relative to FarmArea, not inside this group, 
             so that they can move freely within the fence bounds defined in world/farm space.
             Wait, if I move them out of this group, I need to adjust their initial coordinates 
             and bounds to be relative to the FarmArea origin. 
             Result: I will render them at the FarmArea level but use coordinates that place them here.
             The fence is at [-12, 0, -5].
        */}
      </group>
      {/* Pig Rendering moved to main group to allow easier ref movement control */}
      {pigData.map((p, i) => (
        <Pig
          key={`pig-${i}`}
          position={p.pos}
          rotation={p.rot}
          groupRef={pigRefs[i]}
          tailRef={pigTailRefs[i]}
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
      {/* Cow Rendering moved to main group */}
      {cowData.map((c, i) => (
        <Cow
          key={`cow-${i}`}
          position={c.pos}
          rotation={c.rot}
          groupRef={cowRefs[i]}
          headRef={cowHeadRefs[i]}
        />
      ))}

      <WindmillComp position={[15, 0, -15]} bladesRef={windmillBladesRef} />
      <Sheep position={[6, 0, -2]} rotation={0.6} />
      <Sheep position={[7, 0, 1]} rotation={-0.4} />
      <Sheep position={[5, 0, 3]} rotation={1.8} />
      <Sheep position={[-6, 0, 3]} rotation={2.5} />
      <WaterTrough position={[0, 0, -4]} />
      <HayBale position={[6, 0, -2]} rotation={0.3} />
      <HayBale position={[6.5, 0, 0]} rotation={-0.2} />
      <HayBale position={[6.2, 0.8, -1]} rotation={0.5} />
      <HayBale position={[-6, 0, 3]} rotation={1.2} />
      <Tree position={[-20, 0, -15]} />
      <Tree position={[18, 0, -12]} />
      <Tree position={[-22, 0, 20]} />
      <Tree position={[20, 0, 18]} />
      <Tree position={[-15, 0, -18]} />
    </group>
  );
};
