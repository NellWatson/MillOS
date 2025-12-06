import React, { useRef, useMemo, createContext, useContext, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, CloudRain, Wind, ClipboardCheck } from 'lucide-react';
import { useGameSimulationStore } from '../stores/gameSimulationStore';

// ============================================================
// Crisis Animation Manager - Centralized useFrame for all crisis effects
// ============================================================

interface SmokeParticlesEntry {
  type: 'smokeParticles';
  particlesRef: React.RefObject<THREE.Points | null>;
  velocities: Float32Array;
  lifetimes: Float32Array;
  count: number;
}

interface EmergencyLightingEntry {
  type: 'emergencyLighting';
  lightRef: React.RefObject<THREE.PointLight | null>;
  active: boolean;
}

interface RainParticlesEntry {
  type: 'rainParticles';
  particlesRef: React.RefObject<THREE.Points | null>;
  count: number;
}

type CrisisEntry = SmokeParticlesEntry | EmergencyLightingEntry | RainParticlesEntry;

interface CrisisAnimationContextValue {
  register: (id: string, entry: CrisisEntry) => void;
  unregister: (id: string) => void;
}

const CrisisAnimationContext = createContext<CrisisAnimationContextValue | null>(null);

// Pure animation functions
function animateSmokeParticles(entry: SmokeParticlesEntry, delta: number) {
  if (!entry.particlesRef.current) return;
  const pos = entry.particlesRef.current.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < entry.count; i++) {
    entry.lifetimes[i] += delta * 0.8;

    if (entry.lifetimes[i] > 1) {
      entry.lifetimes[i] = 0;
      pos[i * 3] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 1] = Math.random() * 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      entry.velocities[i * 3] = (Math.random() - 0.5) * 0.4;
      entry.velocities[i * 3 + 1] = 1.2 + Math.random() * 0.8;
      entry.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    pos[i * 3] += entry.velocities[i * 3] * delta;
    pos[i * 3 + 1] += entry.velocities[i * 3 + 1] * delta;
    pos[i * 3 + 2] += entry.velocities[i * 3 + 2] * delta;

    entry.velocities[i * 3] += (Math.random() - 0.5) * delta * 0.8;
    entry.velocities[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.8;

    entry.velocities[i * 3 + 1] *= 0.98;
  }

  entry.particlesRef.current.geometry.attributes.position.needsUpdate = true;
}

function animateEmergencyLighting(entry: EmergencyLightingEntry, elapsedTime: number) {
  if (!entry.lightRef.current || !entry.active) return;
  const flicker = Math.sin(elapsedTime * 8) * 0.2 + 0.8;
  entry.lightRef.current.intensity = flicker * 2;
}

function animateRainParticles(entry: RainParticlesEntry) {
  if (!entry.particlesRef.current) return;
  const pos = entry.particlesRef.current.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < entry.count; i++) {
    pos[i * 3 + 1] -= 0.5;

    if (pos[i * 3 + 1] < 0) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
  }

  entry.particlesRef.current.geometry.attributes.position.needsUpdate = true;
}

export const CrisisAnimationManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const entriesRef = useRef<Map<string, CrisisEntry>>(new Map());
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  const register = useCallback((id: string, entry: CrisisEntry) => {
    entriesRef.current.set(id, entry);
  }, []);

  const unregister = useCallback((id: string) => {
    entriesRef.current.delete(id);
  }, []);

  useFrame((state, delta) => {
    if (!isTabVisible) return;

    const elapsedTime = state.clock.elapsedTime;

    entriesRef.current.forEach((entry) => {
      switch (entry.type) {
        case 'smokeParticles':
          animateSmokeParticles(entry, delta);
          break;
        case 'emergencyLighting':
          animateEmergencyLighting(entry, elapsedTime);
          break;
        case 'rainParticles':
          animateRainParticles(entry);
          break;
      }
    });
  });

  const contextValue = React.useMemo(() => ({ register, unregister }), [register, unregister]);

  return (
    <CrisisAnimationContext.Provider value={contextValue}>
      {children}
    </CrisisAnimationContext.Provider>
  );
};

function useCrisisAnimation() {
  return useContext(CrisisAnimationContext);
}

// Smoke/Fire particle system for equipment fires
interface SmokeParticlesProps {
  position: [number, number, number];
  intensity: number;
}

export const SmokeParticles: React.FC<SmokeParticlesProps> = ({ position, intensity }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const idRef = useRef(`smokeParticles-${Math.random().toString(36).slice(2, 9)}`);
  const context = useCrisisAnimation();
  const count = Math.floor(50 * intensity);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  const { positions, velocities, lifetimes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start at fire position with small random offset
      pos[i * 3] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 1] = Math.random() * 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      // Upward velocity with turbulence
      vel[i * 3] = (Math.random() - 0.5) * 0.4;
      vel[i * 3 + 1] = 1.2 + Math.random() * 0.8; // Strong upward
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      life[i] = Math.random();
    }

    return { positions: pos, velocities: vel, lifetimes: life };
  }, [count]);

  // Register with manager if available
  useEffect(() => {
    if (context) {
      context.register(idRef.current, {
        type: 'smokeParticles',
        particlesRef,
        velocities,
        lifetimes,
        count,
      });
      return () => context.unregister(idRef.current);
    }
  }, [context, velocities, lifetimes, count]);

  // Fallback useFrame when not in manager context
  useFrame((_, delta) => {
    if (context) return; // Manager handles animation
    if (!isTabVisible) return;
    animateSmokeParticles(
      { type: 'smokeParticles', particlesRef, velocities, lifetimes, count },
      delta
    );
  });

  // Smoke color transitions from dark gray (smoke) to orange (fire) based on position
  const colorGradient = useMemo(() => {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const heightFactor = Math.random();
      // Lower = more orange (fire), higher = more gray (smoke)
      if (heightFactor < 0.3) {
        colors[i * 3] = 0.9; // Orange-red
        colors[i * 3 + 1] = 0.4;
        colors[i * 3 + 2] = 0.1;
      } else {
        colors[i * 3] = 0.2; // Dark gray smoke
        colors[i * 3 + 1] = 0.2;
        colors[i * 3 + 2] = 0.2;
      }
    }
    return colors;
  }, [count]);

  return (
    <points ref={particlesRef} position={position} key={`smoke-${count}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colorGradient, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.25 * intensity}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        vertexColors
      />
    </points>
  );
};

// Emergency lighting effect for power outage
export const EmergencyLighting: React.FC<{ active: boolean }> = ({ active }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const idRef = useRef(`emergencyLighting-${Math.random().toString(36).slice(2, 9)}`);
  const context = useCrisisAnimation();
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  // Register with manager if available
  useEffect(() => {
    if (context) {
      context.register(idRef.current, {
        type: 'emergencyLighting',
        lightRef,
        active,
      });
      return () => context.unregister(idRef.current);
    }
  }, [context, active]);

  // Fallback useFrame when not in manager context
  useFrame(({ clock }) => {
    if (context) return; // Manager handles animation
    if (!isTabVisible) return;
    animateEmergencyLighting({ type: 'emergencyLighting', lightRef, active }, clock.elapsedTime);
  });

  if (!active) return null;

  return (
    <>
      {/* Amber emergency lights at key positions */}
      <pointLight ref={lightRef} position={[-20, 8, -20]} color="#ff9800" distance={30} />
      <pointLight position={[0, 8, 0]} color="#ff9800" intensity={2} distance={30} />
      <pointLight position={[20, 8, 20]} color="#ff9800" intensity={2} distance={30} />
    </>
  );
};

// Rain particles for weather emergency
export const RainParticles: React.FC<{ intensity: number }> = ({ intensity }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const idRef = useRef(`rainParticles-${Math.random().toString(36).slice(2, 9)}`);
  const context = useCrisisAnimation();
  const count = Math.floor(1000 * intensity);
  const isTabVisible = useGameSimulationStore((state) => state.isTabVisible);

  const { positions } = useMemo(() => {
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spread across factory area
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }

    return { positions: pos };
  }, [count]);

  // Register with manager if available
  useEffect(() => {
    if (context) {
      context.register(idRef.current, {
        type: 'rainParticles',
        particlesRef,
        count,
      });
      return () => context.unregister(idRef.current);
    }
  }, [context, count]);

  // Fallback useFrame when not in manager context
  useFrame(() => {
    if (context) return; // Manager handles animation
    if (!isTabVisible) return;
    animateRainParticles({ type: 'rainParticles', particlesRef, count });
  });

  return (
    <points ref={particlesRef} key={`rain-${count}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#a0c4ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

// Screen overlay effects for different crisis types
export const CrisisScreenOverlay: React.FC = () => {
  const crisisState = useGameSimulationStore((state) => state.crisisState);

  if (!crisisState.active || !crisisState.type) return null;

  const getOverlayConfig = () => {
    switch (crisisState.type) {
      case 'power_outage':
        return {
          bgColor: 'bg-black/60',
          borderColor: 'border-amber-500/50',
          icon: Zap,
          iconColor: 'text-amber-400',
          message: 'Power Outage - Emergency Systems Active',
        };
      case 'fire':
        return {
          bgColor: 'bg-red-900/40',
          borderColor: 'border-red-500/80',
          icon: Flame,
          iconColor: 'text-red-400',
          message: 'Equipment Fire Detected - Evacuation Protocol Active',
        };
      case 'weather':
        return {
          bgColor: 'bg-blue-900/30',
          borderColor: 'border-blue-500/50',
          icon: CloudRain,
          iconColor: 'text-blue-400',
          message: 'Severe Weather Alert - Securing Operations',
        };
      case 'inspection':
        return {
          bgColor: 'bg-purple-900/20',
          borderColor: 'border-purple-500/50',
          icon: ClipboardCheck,
          iconColor: 'text-purple-400',
          message: 'Inspection in Progress - Compliance Mode Active',
        };
      case 'supply_emergency':
        return {
          bgColor: 'bg-yellow-900/30',
          borderColor: 'border-yellow-500/50',
          icon: Wind,
          iconColor: 'text-yellow-400',
          message: 'Supply Emergency - Adjusting Production Schedule',
        };
      default:
        return null;
    }
  };

  const config = getOverlayConfig();
  if (!config) return null;

  const { bgColor, borderColor, icon: Icon, iconColor, message } = config;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-30 pointer-events-none ${bgColor}`}
      >
        {/* Crisis banner */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl rounded-xl border-2 ${borderColor} px-6 py-3 shadow-2xl`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${iconColor} animate-pulse`} />
            <span className="text-white font-bold text-lg">{message}</span>
            <Icon className={`w-6 h-6 ${iconColor} animate-pulse`} />
          </div>
          <div className="mt-1 text-center">
            <span className="text-slate-400 text-xs uppercase tracking-wider">
              Severity: {crisisState.severity}
            </span>
          </div>
        </motion.div>

        {/* Flashing border for critical events */}
        {crisisState.severity === 'critical' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `inset 0 0 0 4px ${
                crisisState.type === 'fire' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(251, 191, 36, 0.8)'
              }`,
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Power outage screen flicker effect
export const PowerOutageFlicker: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.4, 0, 0.3, 0] }}
      transition={{ duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1], repeat: Infinity }}
      className="fixed inset-0 z-40 pointer-events-none bg-black"
    />
  );
};
