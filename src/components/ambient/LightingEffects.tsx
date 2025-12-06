/**
 * Lighting Effects
 *
 * Various lighting effects for the factory scene:
 * - Flickering fluorescent lights
 * - God rays / dust motes
 * - Warning lights
 * - Control panel LEDs
 * - Pulsing indicators
 *
 * PERFORMANCE: Consolidated from 5 separate useFrame hooks into 1 centralized manager
 * with fallback behavior for components used outside the manager context
 */

import React, { useRef, useMemo, useCallback, createContext, useContext, useEffect } from 'react';
import { useFrame, type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';

// =========================================================================
// ANIMATION MANAGER - Single useFrame for all lighting effects
// =========================================================================

type LightingRefType = 'flickering' | 'godrays' | 'warning' | 'led' | 'pulsing';

interface LightingRefs {
  type: LightingRefType;
  id: string;
  // Flickering light refs
  lightRef?: React.RefObject<THREE.PointLight | null>;
  tubeRef?: React.RefObject<THREE.Mesh | null>;
  flickerState?: React.MutableRefObject<{ nextFlicker: number; isFlickering: boolean; flickerEnd: number }>;
  // God rays refs
  particlesRef?: React.RefObject<THREE.Points | null>;
  particleCount?: number;
  // Warning light refs
  isActive?: boolean;
  // LED refs
  meshRef?: React.RefObject<THREE.Mesh | null>;
  blinkPattern?: 'steady' | 'slow' | 'fast' | 'pulse';
  // Pulsing indicator refs
  baseColor?: string;
}

type RegisterLightingFn = (refs: LightingRefs) => void;
type UnregisterLightingFn = (id: string) => void;

const LightingAnimationContext = createContext<{
  register: RegisterLightingFn;
  unregister: UnregisterLightingFn;
} | null>(null);

const useLightingAnimation = () => {
  return useContext(LightingAnimationContext);
};

// =========================================================================
// ANIMATION FUNCTIONS - Pure functions for each lighting type
// =========================================================================

function animateFlickeringLight(refs: LightingRefs, state: RootState): void {
  if (!refs.lightRef?.current || !refs.tubeRef?.current || !refs.flickerState) return;

  const time = state.clock.elapsedTime;
  const mat = refs.tubeRef.current.material as THREE.MeshStandardMaterial;

  if (time > refs.flickerState.current.nextFlicker && !refs.flickerState.current.isFlickering) {
    if (Math.random() < 0.002) {
      refs.flickerState.current.isFlickering = true;
      refs.flickerState.current.flickerEnd = time + 0.5 + Math.random() * 1;
    }
    refs.flickerState.current.nextFlicker = time + 0.1;
  }

  if (refs.flickerState.current.isFlickering) {
    if (time < refs.flickerState.current.flickerEnd) {
      const flicker = Math.random() > 0.3 ? 1 : 0.1;
      refs.lightRef.current.intensity = flicker * 2;
      mat.emissiveIntensity = flicker * 0.8;
    } else {
      refs.flickerState.current.isFlickering = false;
      refs.lightRef.current.intensity = 2;
      mat.emissiveIntensity = 0.8;
    }
  }
}

function animateGodRays(refs: LightingRefs, state: RootState): void {
  if (!refs.particlesRef?.current || !refs.particleCount) return;

  const positions = refs.particlesRef.current.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < refs.particleCount; i++) {
    positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.002;
    positions[i * 3 + 1] += 0.005;
    positions[i * 3 + 2] += Math.cos(state.clock.elapsedTime * 0.2 + i) * 0.002;

    if (positions[i * 3 + 1] > 0) {
      const t = Math.random();
      const spread = t * 2;
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = -8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
  }

  refs.particlesRef.current.geometry.attributes.position.needsUpdate = true;
}

function animateWarningLight(refs: LightingRefs, state: RootState): void {
  if (!refs.lightRef?.current) return;

  if (refs.isActive) {
    refs.lightRef.current.intensity = Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 2;
  } else {
    refs.lightRef.current.intensity = 0;
  }
}

function animateLED(refs: LightingRefs, state: RootState): void {
  if (!refs.meshRef?.current) return;

  const mat = refs.meshRef.current.material as THREE.MeshStandardMaterial;
  const t = state.clock.elapsedTime;

  let intensity = 1;
  switch (refs.blinkPattern) {
    case 'slow':
      intensity = Math.sin(t * 1) > 0 ? 1 : 0.1;
      break;
    case 'fast':
      intensity = Math.sin(t * 5) > 0 ? 1 : 0.1;
      break;
    case 'pulse':
      intensity = 0.3 + Math.abs(Math.sin(t * 2)) * 0.7;
      break;
    default:
      intensity = 0.8;
  }

  mat.emissiveIntensity = intensity;
}

function animatePulsingIndicator(refs: LightingRefs, state: RootState): void {
  const intensity = 0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.5;

  if (refs.meshRef?.current) {
    const mat = refs.meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = intensity;
  }

  if (refs.lightRef?.current) {
    refs.lightRef.current.intensity = intensity * 0.5;
  }
}

// =========================================================================
// LIGHTING ANIMATION MANAGER - Single useFrame for all effects
// =========================================================================

export const LightingAnimationManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lightingRefsMap = useRef<Map<string, LightingRefs>>(new Map());
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  const register = useCallback<RegisterLightingFn>((refs) => {
    lightingRefsMap.current.set(refs.id, refs);
  }, []);

  const unregister = useCallback<UnregisterLightingFn>((id) => {
    lightingRefsMap.current.delete(id);
  }, []);

  // Single useFrame for ALL lighting effects (consolidates 5 hooks into 1)
  useFrame((state) => {
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;

    lightingRefsMap.current.forEach((refs) => {
      switch (refs.type) {
        case 'flickering':
          animateFlickeringLight(refs, state);
          break;
        case 'godrays':
          animateGodRays(refs, state);
          break;
        case 'warning':
          animateWarningLight(refs, state);
          break;
        case 'led':
          animateLED(refs, state);
          break;
        case 'pulsing':
          animatePulsingIndicator(refs, state);
          break;
      }
    });
  });

  const contextValue = useMemo(() => ({ register, unregister }), [register, unregister]);

  return (
    <LightingAnimationContext.Provider value={contextValue}>
      {children}
    </LightingAnimationContext.Provider>
  );
};

// Flickering fluorescent light
// Falls back to standalone useFrame when not in LightingAnimationManager context
let flickeringLightIdCounter = 0;
export const FlickeringLight: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const ctx = useLightingAnimation();
  const lightRef = useRef<THREE.PointLight>(null);
  const tubeRef = useRef<THREE.Mesh>(null);
  const flickerState = useRef({ nextFlicker: 0, isFlickering: false, flickerEnd: 0 });
  const idRef = useRef(`flickering-${flickeringLightIdCounter++}`);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  // Register with animation manager if available
  useEffect(() => {
    if (ctx) {
      ctx.register({
        type: 'flickering',
        id: idRef.current,
        lightRef,
        tubeRef,
        flickerState,
      });
      return () => ctx.unregister(idRef.current);
    }
  }, [ctx]);

  // Fallback useFrame when not in context
  useFrame((state) => {
    if (ctx) return; // Manager handles animation
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;
    if (!lightRef.current || !tubeRef.current) return;

    const time = state.clock.elapsedTime;
    const mat = tubeRef.current.material as THREE.MeshStandardMaterial;

    if (time > flickerState.current.nextFlicker && !flickerState.current.isFlickering) {
      if (Math.random() < 0.002) {
        flickerState.current.isFlickering = true;
        flickerState.current.flickerEnd = time + 0.5 + Math.random() * 1;
      }
      flickerState.current.nextFlicker = time + 0.1;
    }

    if (flickerState.current.isFlickering) {
      if (time < flickerState.current.flickerEnd) {
        const flicker = Math.random() > 0.3 ? 1 : 0.1;
        lightRef.current.intensity = flicker * 2;
        mat.emissiveIntensity = flicker * 0.8;
      } else {
        flickerState.current.isFlickering = false;
        lightRef.current.intensity = 2;
        mat.emissiveIntensity = 0.8;
      }
    }
  });

  return (
    <group position={position}>
      {/* Light fixture housing */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.15]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Fluorescent tube */}
      <mesh ref={tubeRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshStandardMaterial color="#f5f5f5" emissive="#f5f5f5" emissiveIntensity={0.8} />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, -0.1, 0]}
        color="#f5f5f5"
        intensity={2}
        distance={8}
      />
    </group>
  );
};

// God rays / dust motes in light beams
// Falls back to standalone useFrame when not in LightingAnimationManager context
let godRaysIdCounter = 0;
export const GodRays: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  const ctx = useLightingAnimation();
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;
  const idRef = useRef(`godrays-${godRaysIdCounter++}`);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      const spread = t * 2;
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = -t * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      sizes[i] = 0.02 + Math.random() * 0.03;
    }

    return { positions, sizes };
  }, []);

  // Register with animation manager if available
  useEffect(() => {
    if (ctx) {
      ctx.register({
        type: 'godrays',
        id: idRef.current,
        particlesRef,
        particleCount,
      });
      return () => ctx.unregister(idRef.current);
    }
  }, [ctx]);

  // Fallback useFrame when not in context
  useFrame((state) => {
    if (ctx) return; // Manager handles animation
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.002;
      positions[i * 3 + 1] += 0.005;
      positions[i * 3 + 2] += Math.cos(state.clock.elapsedTime * 0.2 + i) * 0.002;

      if (positions[i * 3 + 1] > 0) {
        const t = Math.random();
        const spread = t * 2;
        positions[i * 3] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = -8;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Light beam cone (volumetric effect) */}
      <mesh>
        <coneGeometry args={[2, 8, 16, 1, true]} />
        <meshBasicMaterial
          color="#fef3c7"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Dust particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#fef3c7"
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};

// Warning light component
// Falls back to standalone useFrame when not in LightingAnimationManager context
let warningLightIdCounter = 0;
export const WarningLight: React.FC<{ position: [number, number, number]; isActive: boolean }> = ({
  position,
  isActive,
}) => {
  const ctx = useLightingAnimation();
  const lightRef = useRef<THREE.PointLight>(null);
  const idRef = useRef(`warning-${warningLightIdCounter++}`);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  // Register with animation manager if available
  useEffect(() => {
    if (ctx) {
      ctx.register({
        type: 'warning',
        id: idRef.current,
        lightRef,
        isActive,
      });
      return () => ctx.unregister(idRef.current);
    }
  }, [ctx, isActive]);

  // Fallback useFrame when not in context
  useFrame((state) => {
    if (ctx) return; // Manager handles animation
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;
    if (lightRef.current && isActive) {
      lightRef.current.intensity = Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 2;
    } else if (lightRef.current) {
      lightRef.current.intensity = 0;
    }
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 16]} />
        <meshStandardMaterial
          color={isActive ? '#f97316' : '#64748b'}
          emissive={isActive ? '#f97316' : '#000000'}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </mesh>
      <pointLight ref={lightRef} color="#f97316" intensity={0} distance={5} />
    </group>
  );
};

// Blinking control panel LED
// Falls back to standalone useFrame when not in LightingAnimationManager context
let ledIdCounter = 0;
export const ControlPanelLED: React.FC<{
  position: [number, number, number];
  color?: string;
  blinkPattern?: 'steady' | 'slow' | 'fast' | 'pulse';
}> = ({ position, color = '#22c55e', blinkPattern = 'steady' }) => {
  const ctx = useLightingAnimation();
  const meshRef = useRef<THREE.Mesh>(null);
  const idRef = useRef(`led-${ledIdCounter++}`);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  // Register with animation manager if available
  useEffect(() => {
    if (ctx) {
      ctx.register({
        type: 'led',
        id: idRef.current,
        meshRef,
        blinkPattern,
      });
      return () => ctx.unregister(idRef.current);
    }
  }, [ctx, blinkPattern]);

  // Fallback useFrame when not in context
  useFrame((state) => {
    if (ctx) return; // Manager handles animation
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const t = state.clock.elapsedTime;

    let intensity = 1;
    switch (blinkPattern) {
      case 'slow':
        intensity = Math.sin(t * 1) > 0 ? 1 : 0.1;
        break;
      case 'fast':
        intensity = Math.sin(t * 5) > 0 ? 1 : 0.1;
        break;
      case 'pulse':
        intensity = 0.3 + Math.abs(Math.sin(t * 2)) * 0.7;
        break;
      default:
        intensity = 0.8;
    }

    mat.emissiveIntensity = intensity;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  );
};

// Pulsing indicator
// Falls back to standalone useFrame when not in LightingAnimationManager context
let pulsingIdCounter = 0;
export const PulsingIndicator: React.FC<{
  position: [number, number, number];
  baseColor: string;
  size?: number;
}> = ({ position, baseColor, size = 0.1 }) => {
  const ctx = useLightingAnimation();
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const idRef = useRef(`pulsing-${pulsingIdCounter++}`);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  // Register with animation manager if available
  useEffect(() => {
    if (ctx) {
      ctx.register({
        type: 'pulsing',
        id: idRef.current,
        meshRef,
        lightRef,
        baseColor,
      });
      return () => ctx.unregister(idRef.current);
    }
  }, [ctx, baseColor]);

  // Fallback useFrame when not in context
  useFrame((state) => {
    if (ctx) return; // Manager handles animation
    if (!isTabVisible) return;
    if (!shouldRunThisFrame(3)) return;

    const intensity = 0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.5;

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = intensity;
    }

    if (lightRef.current) {
      lightRef.current.intensity = intensity * 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={0.5} />
      </mesh>
      <pointLight ref={lightRef} color={baseColor} intensity={0.5} distance={2} />
    </group>
  );
};
