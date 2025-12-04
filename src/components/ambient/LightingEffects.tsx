import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';

// Flickering fluorescent light
export const FlickeringLight: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const tubeRef = useRef<THREE.Mesh>(null);
  const flickerState = useRef({ nextFlicker: 0, isFlickering: false, flickerEnd: 0 });

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (!lightRef.current || !tubeRef.current) return;
    const time = state.clock.elapsedTime;
    const mat = tubeRef.current.material as THREE.MeshStandardMaterial;

    // Random flickering behavior
    if (time > flickerState.current.nextFlicker && !flickerState.current.isFlickering) {
      if (Math.random() < 0.002) {
        // Rare flicker
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
export const GodRays: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a cone/beam shape
      const t = Math.random();
      const spread = t * 2; // Wider at bottom
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = -t * 8; // Vertical beam
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      sizes[i] = 0.02 + Math.random() * 0.03;
    }

    return { positions, sizes };
  }, []);

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      // Slow floating motion
      positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.002;
      positions[i * 3 + 1] += 0.005;
      positions[i * 3 + 2] += Math.cos(state.clock.elapsedTime * 0.2 + i) * 0.002;

      // Reset when reaching top
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
export const WarningLight: React.FC<{ position: [number, number, number]; isActive: boolean }> = ({
  position,
  isActive,
}) => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
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
export const ControlPanelLED: React.FC<{
  position: [number, number, number];
  color?: string;
  blinkPattern?: 'steady' | 'slow' | 'fast' | 'pulse';
}> = ({ position, color = '#22c55e', blinkPattern = 'steady' }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
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
export const PulsingIndicator: React.FC<{
  position: [number, number, number];
  baseColor: string;
  size?: number;
}> = ({ position, baseColor, size = 0.1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
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
