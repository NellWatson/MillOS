import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';

// Steam/vapor vent
export const SteamVent: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const steamRef = useRef<THREE.Points>(null);
  const particleCount = 30;

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      velocities.push(0.01 + Math.random() * 0.02);
    }

    return { positions, velocities };
  }, []);

  useFrame(() => {
    if (!shouldRunThisFrame(3)) return;
    if (!steamRef.current) return;
    const positions = steamRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] += particles.velocities[i];
      positions[i * 3] += (Math.random() - 0.5) * 0.01;

      if (positions[i * 3 + 1] > 1) {
        positions[i * 3] = (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      }
    }

    steamRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group position={position}>
      {/* Vent pipe */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.3, 12]} />
        <meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Vent cap */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.1, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.5} />
      </mesh>

      {/* Steam particles */}
      <points ref={steamRef} position={[0, 0.25, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#e2e8f0"
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};

// Pipe condensation drip effect
export const CondensationDrip: React.FC<{ position: [number, number, number] }> = ({
  position,
}) => {
  const dropRef = useRef<THREE.Mesh>(null);
  const dropYRef = useRef(0);
  const startY = 0;
  const endY = -3;

  useFrame((_, delta) => {
    if (!shouldRunThisFrame(2)) return;
    let newY = dropYRef.current - delta * 1.5;
    if (newY < endY) {
      // Reset with random delay
      newY = Math.random() > 0.98 ? startY : endY - 0.1;
    }
    dropYRef.current = newY;

    if (dropRef.current) {
      dropRef.current.position.y = newY;
      // Stretch as it falls
      const stretch = 1 + Math.abs(newY - startY) * 0.1;
      dropRef.current.scale.y = stretch;
      dropRef.current.visible = newY > endY;
    }
  });

  return (
    <group position={position}>
      {/* Water buildup on pipe */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.03, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#60a5fa"
          transparent
          opacity={0.6}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Falling drop */}
      <mesh ref={dropRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial
          color="#60a5fa"
          transparent
          opacity={0.7}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};
