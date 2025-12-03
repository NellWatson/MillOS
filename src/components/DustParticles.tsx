import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMillStore } from '../store';

interface DustParticlesProps {
  count: number;
}

// Particle pool for reuse
interface PooledParticle {
  t: number;
  factor: number;
  speed: number;
  xFactor: number;
  yFactor: number;
  zFactor: number;
  active: boolean;
  lifetime: number;
  maxLifetime: number;
}

// Skylight positions for light shaft calculation
const SKYLIGHT_POSITIONS = [-20, 0, 20];
const LIGHT_SHAFT_RADIUS = 6;
const LIGHT_SHAFT_Z = 0;

// Cached vectors for performance
const tempPosition = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();
const tempScale = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

// Check if a position is inside a light shaft cone (optimized)
const isInLightShaft = (x: number, y: number, z: number): number => {
  // Early exit for out-of-bounds
  if (y <= 5 || y >= 32) return 0;

  const normalizedY = (y - 5) / 27;
  const coneRadius = 3 + normalizedY * 3;
  const coneRadiusSq = coneRadius * coneRadius;

  for (let i = 0; i < SKYLIGHT_POSITIONS.length; i++) {
    const skylightX = SKYLIGHT_POSITIONS[i];
    const dx = x - skylightX;
    const dz = z - LIGHT_SHAFT_Z;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq < coneRadiusSq) {
      // Return intensity based on how centered the particle is
      return 1 - (Math.sqrt(distanceSq) / coneRadius) * 0.5;
    }
  }
  return 0;
};

// Particle pool class for efficient memory management
class ParticlePool {
  particles: PooledParticle[];
  maxCount: number;
  activeCount: number;

  constructor(maxCount: number) {
    this.maxCount = maxCount;
    this.activeCount = 0;
    this.particles = [];

    // Pre-allocate all particles
    for (let i = 0; i < maxCount; i++) {
      this.particles.push(this.createParticle(false));
    }
  }

  createParticle(active = true): PooledParticle {
    return {
      t: Math.random() * 100,
      factor: 20 + Math.random() * 80,
      speed: 0.005 + Math.random() / 300,
      xFactor: -40 + Math.random() * 80,
      yFactor: Math.random() * 25,
      zFactor: -30 + Math.random() * 60,
      active,
      lifetime: 0,
      maxLifetime: 200 + Math.random() * 300, // Particles live 200-500 frames
    };
  }

  activateParticle(index: number): void {
    if (index < this.maxCount && !this.particles[index].active) {
      const p = this.particles[index];
      p.active = true;
      p.lifetime = 0;
      p.t = Math.random() * 100;
      p.factor = 20 + Math.random() * 80;
      p.speed = 0.005 + Math.random() / 300;
      p.xFactor = -40 + Math.random() * 80;
      p.yFactor = Math.random() * 25;
      p.zFactor = -30 + Math.random() * 60;
      p.maxLifetime = 200 + Math.random() * 300;
      this.activeCount++;
    }
  }

  deactivateParticle(index: number): void {
    if (index < this.maxCount && this.particles[index].active) {
      this.particles[index].active = false;
      this.activeCount--;
    }
  }

  // Ensure we have the right number of active particles
  setActiveCount(count: number): void {
    count = Math.min(count, this.maxCount);

    // Activate particles if needed
    while (this.activeCount < count) {
      for (let i = 0; i < this.maxCount; i++) {
        if (!this.particles[i].active) {
          this.activateParticle(i);
          break;
        }
      }
    }

    // Deactivate particles if needed
    while (this.activeCount > count) {
      for (let i = this.maxCount - 1; i >= 0; i--) {
        if (this.particles[i].active) {
          this.deactivateParticle(i);
          break;
        }
      }
    }
  }
}

export const DustParticles: React.FC<DustParticlesProps> = ({ count }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const gameTime = useMillStore((state) => state.gameTime);
  const graphics = useMillStore((state) => state.graphics);

  // Use graphics setting for particle count
  const effectiveCount = Math.min(count, graphics.dustParticleCount);

  // Determine if it's daytime (light shafts visible)
  const isDaytime = gameTime >= 7 && gameTime < 18;

  // Create particle pool with max count
  const pool = useMemo(() => new ParticlePool(count), [count]);

  // Ensure correct number of active particles
  useMemo(() => {
    pool.setActiveCount(effectiveCount);
  }, [pool, effectiveCount]);

  // Pre-allocated color array for vertex colors
  const colorArray = useMemo(() => new Float32Array(count * 3).fill(0), [count]);
  const colorAttr = useRef<THREE.InstancedBufferAttribute | null>(null);

  // Hidden matrix for inactive particles (scaled to 0)
  const hiddenMatrix = useMemo(() => {
    const m = new THREE.Matrix4();
    m.makeScale(0, 0, 0);
    return m;
  }, []);

  // Check if dust particles are enabled (after all hooks)
  const isEnabled = graphics.enableDustParticles;

  useFrame(() => {
    if (!mesh.current || !isEnabled) return;

    const particles = pool.particles;

    for (let i = 0; i < count; i++) {
      const particle = particles[i];

      if (!particle.active) {
        // Hide inactive particles
        mesh.current.setMatrixAt(i, hiddenMatrix);
        continue;
      }

      // Update particle lifetime
      particle.lifetime++;

      // Recycle particle if lifetime exceeded
      if (particle.lifetime > particle.maxLifetime) {
        // Reset the particle
        particle.t = Math.random() * 100;
        particle.xFactor = -40 + Math.random() * 80;
        particle.yFactor = Math.random() * 25;
        particle.zFactor = -30 + Math.random() * 60;
        particle.lifetime = 0;
        particle.maxLifetime = 200 + Math.random() * 300;
      }

      const { factor, speed, xFactor, yFactor, zFactor } = particle;
      particle.t += speed;
      const t = particle.t;

      const s = Math.max(0.3, Math.cos(t) * 0.5 + 0.5);

      const x = xFactor + Math.cos((t / 10) * factor) * 2;
      let y = yFactor + Math.sin((t / 10) * factor) * 2 + 5;
      const z = zFactor + Math.cos((t / 10) * factor) * 2;

      // Keep particles within bounds
      if (y < 1) y = 25;
      if (y > 30) y = 5;

      // Check if particle is in a light shaft and adjust brightness
      const lightIntensity = isDaytime ? isInLightShaft(x, y, z) : 0;

      // Scale up particles in light shafts to make them more visible
      const scaleMultiplier = 1 + lightIntensity * 1.5;
      const finalScale = s * 0.8 * scaleMultiplier;

      // Build matrix efficiently
      tempPosition.set(x, y, z);
      tempScale.setScalar(finalScale);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

      mesh.current.setMatrixAt(i, tempMatrix);

      // Update color - brighter golden when in light shaft
      const baseR = 0.996; // #fef3c7
      const baseG = 0.953;
      const baseB = 0.780;
      colorArray[i * 3] = baseR + lightIntensity * 0.004;
      colorArray[i * 3 + 1] = baseG + lightIntensity * 0.047;
      colorArray[i * 3 + 2] = baseB + lightIntensity * 0.22;
    }

    mesh.current.instanceMatrix.needsUpdate = true;

    // Update colors if attribute exists
    if (colorAttr.current) {
      colorAttr.current.needsUpdate = true;
    }
  });

  // Return null if disabled (after all hooks have been called)
  if (!isEnabled) {
    return null;
  }

  // Use key to force remount when count changes, preventing buffer resize error
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} key={`dust-particles-${count}`}>
      <dodecahedronGeometry args={[0.04, 0]}>
        <instancedBufferAttribute
          ref={colorAttr}
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </dodecahedronGeometry>
      <meshBasicMaterial color="#fef3c7" transparent opacity={0.5} vertexColors />
    </instancedMesh>
  );
};

// Grain particles flowing through pipes (visual effect) - with pooling
export const GrainFlow: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const graphics = useMillStore((state) => state.graphics);
  const isEnabled = graphics.enableGrainFlow;

  const count = 200;

  // Pre-allocated arrays for better memory management
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Position along pipe paths
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = 5 + Math.random() * 15;
      pos[i * 3 + 2] = -15 + Math.random() * 20;

      // Pre-compute velocities with slight variation
      vel[i * 3] = 0;
      vel[i * 3 + 1] = -0.04 - Math.random() * 0.02; // Gravity
      vel[i * 3 + 2] = 0.015 + Math.random() * 0.01; // Forward
    }

    return { positions: pos, velocities: vel };
  }, []);

  useFrame(() => {
    if (!particlesRef.current || !isEnabled) return;
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;

      // Apply pre-computed velocities
      posArray[idx] += velocities[idx];
      posArray[idx + 1] += velocities[idx + 1];
      posArray[idx + 2] += velocities[idx + 2];

      // Reset when below floor (recycling)
      if (posArray[idx + 1] < 2) {
        posArray[idx] = (Math.random() - 0.5) * 30;
        posArray[idx + 1] = 18 + Math.random() * 5;
        posArray[idx + 2] = -15;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Return null if disabled (after all hooks have been called)
  if (!isEnabled) {
    return null;
  }

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#fcd34d"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

// Atmospheric haze for depth and industrial atmosphere
export const AtmosphericHaze: React.FC = () => {
  const graphics = useMillStore((state) => state.graphics);
  const isEnabled = graphics.enableAtmosphericHaze;

  // Pre-created materials for better performance - depthTest false to prevent flickering
  const materials = useMemo(() => ({
    main: new THREE.MeshBasicMaterial({
      color: '#fef3c7',
      transparent: true,
      opacity: 0.012,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
    lower: new THREE.MeshBasicMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.018,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
    accent: new THREE.MeshBasicMaterial({
      color: '#fcd34d',
      transparent: true,
      opacity: 0.008,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  }), []);

  // Return null if disabled (after all hooks have been called)
  if (!isEnabled) {
    return null;
  }

  return (
    <group>
      {/* Main atmospheric volume - subtle golden industrial haze */}
      <mesh position={[0, 15, 0]} material={materials.main}>
        <boxGeometry args={[100, 30, 80]} />
      </mesh>

      {/* Lower haze layer - denser near floor */}
      <mesh position={[0, 4, 0]} material={materials.lower}>
        <boxGeometry args={[100, 8, 80]} />
      </mesh>

      {/* Accent haze near machinery zones */}
      <mesh position={[0, 8, -15]} material={materials.accent}>
        <boxGeometry args={[60, 12, 20]} />
      </mesh>
    </group>
  );
};

// Machine steam/dust effect for industrial atmosphere
interface MachineSteamProps {
  position: [number, number, number];
  type: 'steam' | 'dust' | 'exhaust';
  intensity?: number;
}

const MachineSteamParticle: React.FC<MachineSteamProps> = ({
  position,
  type,
  intensity = 1
}) => {
  const particlesRef = useRef<THREE.Points>(null);
  const count = type === 'dust' ? 30 : 20;

  const { positions, velocities, lifetimes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Start at machine position with small random offset
      pos[i * 3] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = Math.random() * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      // Upward velocity with drift
      vel[i * 3] = (Math.random() - 0.5) * 0.3;
      vel[i * 3 + 1] = type === 'steam' ? 0.8 + Math.random() * 0.5 : 0.3 + Math.random() * 0.3;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      life[i] = Math.random(); // Random starting lifetime
    }

    return { positions: pos, velocities: vel, lifetimes: life };
  }, [count, type]);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Update lifetime
      lifetimes[i] += delta * (type === 'steam' ? 1.5 : 1);

      if (lifetimes[i] > 1) {
        // Reset particle
        lifetimes[i] = 0;
        pos[i * 3] = (Math.random() - 0.5) * 0.5;
        pos[i * 3 + 1] = Math.random() * 0.3;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

        // Reset velocity
        velocities[i * 3] = (Math.random() - 0.5) * 0.3;
        velocities[i * 3 + 1] = type === 'steam' ? 0.8 + Math.random() * 0.5 : 0.3 + Math.random() * 0.3;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      }

      // Apply velocity with drift
      pos[i * 3] += velocities[i * 3] * delta;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      // Add turbulence
      velocities[i * 3] += (Math.random() - 0.5) * delta * 0.5;
      velocities[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.5;

      // Slow down vertical velocity for steam dissipation
      if (type === 'steam') {
        velocities[i * 3 + 1] *= 0.98;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const color = type === 'steam' ? '#e2e8f0' : type === 'dust' ? '#d4a574' : '#9ca3af';
  const opacity = type === 'steam' ? 0.3 : 0.4;
  const size = type === 'steam' ? 0.15 : 0.08;

  // Use key to force remount when count changes, preventing buffer resize error
  return (
    <points ref={particlesRef} position={position} key={`steam-${count}-${type}`}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size * intensity}
        color={color}
        transparent
        opacity={opacity * intensity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Steam vents component - renders multiple steam sources near machines
export const MachineSteamVents: React.FC = () => {
  const graphics = useMillStore((state) => state.graphics);
  const isEnabled = graphics.quality !== 'low';

  // Machine positions from MillScene zones:
  // Zone 2 (z=-6): Roller Mills - hot grinding process creates steam/heat
  // Zone 3 (z=6, y=9): Plansifters - dust from sifting
  // Zone 4 (z=20): Packers - dust from packaging

  const steamSources = useMemo(() => [
    // Roller mill steam vents (grinding creates heat)
    { position: [-18, 4, -6] as [number, number, number], type: 'steam' as const, intensity: 0.8 },
    { position: [-10, 4, -6] as [number, number, number], type: 'steam' as const, intensity: 0.7 },
    { position: [-2, 4, -6] as [number, number, number], type: 'exhaust' as const, intensity: 0.6 },
    { position: [6, 4, -6] as [number, number, number], type: 'steam' as const, intensity: 0.9 },
    { position: [14, 4, -6] as [number, number, number], type: 'exhaust' as const, intensity: 0.7 },

    // Plansifter dust (sifting creates fine flour dust)
    { position: [-12, 12, 6] as [number, number, number], type: 'dust' as const, intensity: 1 },
    { position: [0, 12, 6] as [number, number, number], type: 'dust' as const, intensity: 0.9 },
    { position: [12, 12, 6] as [number, number, number], type: 'dust' as const, intensity: 0.8 },

    // Packer dust (packaging creates airborne flour)
    { position: [-15, 3, 20] as [number, number, number], type: 'dust' as const, intensity: 0.7 },
    { position: [0, 3, 20] as [number, number, number], type: 'dust' as const, intensity: 0.8 },
    { position: [15, 3, 20] as [number, number, number], type: 'dust' as const, intensity: 0.6 },
  ], []);

  // On medium quality, reduce number of sources
  const activeSources = graphics.quality === 'medium'
    ? steamSources.filter((_, i) => i % 2 === 0)
    : steamSources;

  // Return null if disabled (after all hooks have been called)
  if (!isEnabled) {
    return null;
  }

  return (
    <group>
      {activeSources.map((source, i) => (
        <MachineSteamParticle
          key={i}
          position={source.position}
          type={source.type}
          intensity={source.intensity}
        />
      ))}
    </group>
  );
};
