/**
 * environmentRegistry.ts - Centralized animation registries for Environment.tsx
 *
 * These registries track animated objects without React re-renders, enabling
 * a consolidated animation loop in EnvironmentAnimationManager.
 *
 * Extracted to separate file to enable Fast Refresh in Environment.tsx.
 */

import * as THREE from 'three';
import React from 'react';

// =============================================================================
// ANIMATION STATE INTERFACES
// =============================================================================

export interface LensFlareData {
  position: [number, number, number];
  intensity: number;
  color: THREE.Color;
}

export interface LensFlareAnimationState {
  flares: LensFlareData[];
  isDaytime: boolean;
}

export interface GameTimeAnimationState {
  tickGameTime: (delta: number) => void;
  lastTickTime: number;
}

export interface PowerFlickerStateType {
  intensity: number;
  isFlickering: boolean;
  nextFlickerTime: number;
}

export interface PowerFlickerAnimationState {
  weather: string;
  powerFlickerState: PowerFlickerStateType;
}

export interface LightingAnimationState {
  overheadLightRefs: THREE.PointLight[];
  overheadEmissiveRefs: THREE.MeshStandardMaterial[];
  emergencyLightRefs: THREE.PointLight[];
  emergencyEmissiveRefs: THREE.MeshStandardMaterial[];
  baseIntensity: number;
  weather: string;
  powerFlickerState: PowerFlickerStateType;
}

export interface RippleAnimationState {
  meshRef: THREE.Mesh;
  materialRef: THREE.MeshBasicMaterial;
  scaleRef: { current: number };
  opacityRef: { current: number };
}

export interface PuddleSpawnAnimationState {
  weather: string;
  quality: string;
  enableFloorPuddles: boolean;
  puddlePositions: { x: number; z: number; size: number; irregular: number }[];
  rippleDataRef: React.MutableRefObject<
    Map<number, { x: number; z: number; scale: number; opacity: number }>
  >;
  nextRippleIdRef: React.MutableRefObject<number>;
  setRippleKeys: React.Dispatch<React.SetStateAction<number[]>>;
}

export interface WetFloorSignAnimationState {
  signRef: THREE.Group;
}

export interface TrackFadeAnimationState {
  materialRef: THREE.MeshBasicMaterial;
  opacityRef: { current: number };
  fadeRate: number;
}

export interface TireTrackSpawnAnimationState {
  isRainingRef: React.MutableRefObject<boolean>;
  puddlePositions: { x: number; z: number; size: number }[];
  trackDataRef: React.MutableRefObject<Map<number, any>>;
  trackIdRef: React.MutableRefObject<number>;
  lastTrackTimeRef: React.MutableRefObject<Map<string, number>>;
  setTrackKeys: React.Dispatch<React.SetStateAction<number[]>>;
}

export interface DripPhysicsAnimationState {
  groupRef: THREE.Group;
  materialRef: THREE.MeshStandardMaterial;
  trailRef: THREE.Mesh;
  trailMaterialRef: THREE.MeshBasicMaterial;
  yRef: { current: number };
  vyRef: { current: number };
  opacityRef: { current: number };
  hasImpactedRef: React.MutableRefObject<boolean>;
  data: { x: number; z: number };
  onImpact: (x: number, z: number) => void;
}

export interface SplashPhysicsAnimationState {
  meshRef: THREE.Mesh;
  ringRef: THREE.Mesh;
  materialRef: THREE.MeshBasicMaterial;
  ringMaterialRef: THREE.MeshBasicMaterial;
  posRef: { current: { x: number; y: number; z: number } };
  velRef: { current: { vx: number; vy: number; vz: number } };
  lifeRef: { current: number };
}

export interface DripSpawnAnimationState {
  weather: string;
  quality: string;
  dripSources: { x: number; z: number }[];
  dripDataRef: React.MutableRefObject<Map<number, { x: number; z: number }>>;
  dripIdRef: React.MutableRefObject<number>;
  lastDripTimeRef: React.MutableRefObject<number>;
  setDripKeys: React.Dispatch<React.SetStateAction<number[]>>;
}

export interface WeatherParticlesAnimationState {
  rainRef: THREE.Points | null;
  rainStreaksRef: THREE.Points | null;
  splashRef: THREE.Points | null;
  rainCount: number;
  streakCount: number;
  splashCount: number;
  weather: string;
  quality: string;
  splashVelocities: React.MutableRefObject<Float32Array>;
  splashLife: React.MutableRefObject<Float32Array>;
}

// =============================================================================
// REGISTRIES (Module-level Maps)
// =============================================================================

export const lensFlareRegistry = new Map<string, LensFlareAnimationState>();
export const gameTimeRegistry = new Map<string, GameTimeAnimationState>();
export const powerFlickerRegistry = new Map<string, PowerFlickerAnimationState>();
export const lightingRegistry = new Map<string, LightingAnimationState>();
export const rippleRegistry = new Map<string, RippleAnimationState>();
export const puddleSpawnRegistry = new Map<string, PuddleSpawnAnimationState>();
export const wetFloorSignRegistry = new Map<string, WetFloorSignAnimationState>();
export const trackFadeRegistry = new Map<string, TrackFadeAnimationState>();
export const tireTrackSpawnRegistry = new Map<string, TireTrackSpawnAnimationState>();
export const dripPhysicsRegistry = new Map<string, DripPhysicsAnimationState>();
export const splashPhysicsRegistry = new Map<string, SplashPhysicsAnimationState>();
export const dripSpawnRegistry = new Map<string, DripSpawnAnimationState>();
export const weatherParticlesRegistry = new Map<string, WeatherParticlesAnimationState>();

// =============================================================================
// REGISTER/UNREGISTER FUNCTIONS
// =============================================================================

export const registerLensFlare = (id: string, state: LensFlareAnimationState) => {
  lensFlareRegistry.set(id, state);
};
export const unregisterLensFlare = (id: string) => {
  lensFlareRegistry.delete(id);
};

export const registerGameTime = (id: string, state: GameTimeAnimationState) => {
  gameTimeRegistry.set(id, state);
};
export const unregisterGameTime = (id: string) => {
  gameTimeRegistry.delete(id);
};

export const registerPowerFlicker = (id: string, state: PowerFlickerAnimationState) => {
  powerFlickerRegistry.set(id, state);
};
export const unregisterPowerFlicker = (id: string) => {
  powerFlickerRegistry.delete(id);
};

export const registerLighting = (id: string, state: LightingAnimationState) => {
  lightingRegistry.set(id, state);
};
export const unregisterLighting = (id: string) => {
  lightingRegistry.delete(id);
};

export const registerRipple = (id: string, state: RippleAnimationState) => {
  rippleRegistry.set(id, state);
};
export const unregisterRipple = (id: string) => {
  rippleRegistry.delete(id);
};

export const registerPuddleSpawn = (id: string, state: PuddleSpawnAnimationState) => {
  puddleSpawnRegistry.set(id, state);
};
export const unregisterPuddleSpawn = (id: string) => {
  puddleSpawnRegistry.delete(id);
};

export const registerWetFloorSign = (id: string, state: WetFloorSignAnimationState) => {
  wetFloorSignRegistry.set(id, state);
};
export const unregisterWetFloorSign = (id: string) => {
  wetFloorSignRegistry.delete(id);
};

export const registerTrackFade = (id: string, state: TrackFadeAnimationState) => {
  trackFadeRegistry.set(id, state);
};
export const unregisterTrackFade = (id: string) => {
  trackFadeRegistry.delete(id);
};

export const registerTireTrackSpawn = (id: string, state: TireTrackSpawnAnimationState) => {
  tireTrackSpawnRegistry.set(id, state);
};
export const unregisterTireTrackSpawn = (id: string) => {
  tireTrackSpawnRegistry.delete(id);
};

export const registerDripPhysics = (id: string, state: DripPhysicsAnimationState) => {
  dripPhysicsRegistry.set(id, state);
};
export const unregisterDripPhysics = (id: string) => {
  dripPhysicsRegistry.delete(id);
};

export const registerSplashPhysics = (id: string, state: SplashPhysicsAnimationState) => {
  splashPhysicsRegistry.set(id, state);
};
export const unregisterSplashPhysics = (id: string) => {
  splashPhysicsRegistry.delete(id);
};

export const registerDripSpawn = (id: string, state: DripSpawnAnimationState) => {
  dripSpawnRegistry.set(id, state);
};
export const unregisterDripSpawn = (id: string) => {
  dripSpawnRegistry.delete(id);
};

export const registerWeatherParticles = (id: string, state: WeatherParticlesAnimationState) => {
  weatherParticlesRegistry.set(id, state);
};
export const unregisterWeatherParticles = (id: string) => {
  weatherParticlesRegistry.delete(id);
};
