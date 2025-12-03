import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DustParticlesProps {
  count: number;
}

interface Particle {
  t: number;
  factor: number;
  speed: number;
  xFactor: number;
  yFactor: number;
  zFactor: number;
}

export const DustParticles: React.FC<DustParticlesProps> = ({ count }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo<Particle[]>(() => {
    const temp: Particle[] = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random() * 100,
        factor: 20 + Math.random() * 80,
        speed: 0.005 + Math.random() / 300,
        xFactor: -40 + Math.random() * 80,
        yFactor: Math.random() * 25,
        zFactor: -30 + Math.random() * 60,
      });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!mesh.current) return;

    particles.forEach((particle, i) => {
      const { factor, speed, xFactor, yFactor, zFactor } = particle;
      particle.t += speed;
      const t = particle.t;

      const a = Math.cos(t) + Math.sin(t * 0.5) / 10;
      const b = Math.sin(t) + Math.cos(t * 0.3) / 10;
      const s = Math.max(0.3, Math.cos(t) * 0.5 + 0.5);

      dummy.position.set(
        xFactor + Math.cos((t / 10) * factor) * 2,
        yFactor + Math.sin((t / 10) * factor) * 2 + 5,
        zFactor + Math.cos((t / 10) * factor) * 2
      );

      // Keep particles within bounds
      if (dummy.position.y < 1) dummy.position.y = 25;
      if (dummy.position.y > 30) dummy.position.y = 5;

      dummy.scale.setScalar(s * 0.8);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <dodecahedronGeometry args={[0.04, 0]} />
      <meshBasicMaterial color="#fef3c7" transparent opacity={0.5} />
    </instancedMesh>
  );
};

// Grain particles flowing through pipes (visual effect)
export const GrainFlow: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Position along pipe paths
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = 5 + Math.random() * 15;
      pos[i * 3 + 2] = -15 + Math.random() * 20;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Move particles downward (gravity effect)
      positions[i * 3 + 1] -= 0.05;
      // Move forward
      positions[i * 3 + 2] += 0.02;

      // Reset when below floor
      if (positions[i * 3 + 1] < 2) {
        positions[i * 3 + 1] = 18 + Math.random() * 5;
        positions[i * 3 + 2] = -15;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

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
