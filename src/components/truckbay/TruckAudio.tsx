import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';

interface ExhaustSmokeProps {
  position: [number, number, number];
  throttle: number;
  isRunning: boolean;
}

export const ExhaustSmoke: React.FC<ExhaustSmokeProps> = ({ position, throttle, isRunning }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 20;

  const { positions, velocities, lifetimes, maxLifetimes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const life = new Float32Array(particleCount);
    const maxLife = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = 0.03 + Math.random() * 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      life[i] = Math.random();
      maxLife[i] = 0.8 + Math.random() * 0.4;
    }

    return { positions: pos, velocities: vel, lifetimes: life, maxLifetimes: maxLife };
  }, []);

  useFrame((_, delta) => {
    if (!shouldRunThisFrame(2)) return; // Throttle particles to 30fps
    if (!particlesRef.current || !isRunning) return;

    const posAttr = particlesRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      lifetimes[i] += delta * (0.5 + throttle * 0.5);

      if (lifetimes[i] > maxLifetimes[i]) {
        // Reset particle
        lifetimes[i] = 0;
        posArray[i * 3] = (Math.random() - 0.5) * 0.1;
        posArray[i * 3 + 1] = 0;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3] = (Math.random() - 0.5) * 0.03;
        velocities[i * 3 + 1] = 0.04 + Math.random() * 0.03 + throttle * 0.02;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
      } else {
        // Update position
        posArray[i * 3] += velocities[i * 3] * delta * 60;
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60;
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;
        // Spread out as it rises
        velocities[i * 3] *= 1.01;
        velocities[i * 3 + 2] *= 1.01;
      }
    }

    posAttr.needsUpdate = true;
  });

  if (!isRunning) return null;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15 + throttle * 0.1}
        color="#4b5563"
        transparent
        opacity={0.4 + throttle * 0.2}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};
