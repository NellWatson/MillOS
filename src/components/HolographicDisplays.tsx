import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useMillStore } from '../store';

export const HolographicDisplays: React.FC = () => {
  return (
    <group>
      {/* Main production display */}
      <HoloPanel
        position={[0, 12, -25]}
        title="PRODUCTION STATUS"
        value="OPTIMAL"
        color="#22c55e"
        size={[12, 4]}
      />

      {/* Zone displays */}
      <HoloPanel
        position={[-20, 8, -18]}
        title="ZONE 1: STORAGE"
        value="5 Silos Active"
        subValue="Capacity: 87%"
        color="#3b82f6"
        size={[6, 2.5]}
      />

      <HoloPanel
        position={[0, 8, -8]}
        title="ZONE 2: MILLING"
        value="6 Mills Running"
        subValue="Output: 1,240 T/hr"
        color="#8b5cf6"
        size={[6, 2.5]}
      />

      <HoloPanel
        position={[20, 10, 5]}
        title="ZONE 3: SIFTING"
        value="3 Plansifters"
        subValue="Grade A: 99.2%"
        color="#ec4899"
        size={[6, 2.5]}
      />

      <HoloPanel
        position={[0, 8, 22]}
        title="ZONE 4: PACKING"
        value="42 bags/min"
        subValue="Today: 24,120 bags"
        color="#f59e0b"
        size={[6, 2.5]}
      />

      {/* Floating data particles */}
      <DataParticles />
    </group>
  );
};

interface HoloPanelProps {
  position: [number, number, number];
  title: string;
  value: string;
  subValue?: string;
  color: string;
  size: [number, number];
}

const HoloPanel: React.FC<HoloPanelProps> = ({ position, title, value, subValue, color, size }) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const graphicsQuality = useMillStore(state => state.graphics.quality);
  const frameSkipRef = useRef(0);

  useFrame((state) => {
    // Throttle on low graphics - skip every other frame
    if (graphicsQuality === 'low') {
      frameSkipRef.current++;
      if (frameSkipRef.current % 2 !== 0) return;
    }

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard>
        {/* Glow background */}
        <mesh ref={glowRef} position={[0, 0, -0.1]}>
          <planeGeometry args={[size[0] + 1, size[1] + 0.5]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} />
        </mesh>

        {/* Main panel */}
        <RoundedBox args={[size[0], size[1], 0.05]} radius={0.1} smoothness={4}>
          <meshStandardMaterial
            color="#0f172a"
            transparent
            opacity={0.9}
            metalness={0.5}
            roughness={0.5}
          />
        </RoundedBox>

        {/* Border glow */}
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[size[0] - 0.1, size[1] - 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={0.05} />
        </mesh>

        {/* Top border accent */}
        <mesh position={[0, size[1] / 2 - 0.1, 0.03]}>
          <planeGeometry args={[size[0] - 0.2, 0.05]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Title */}
        <Text
          position={[0, size[1] / 2 - 0.35, 0.04]}
          fontSize={0.2}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>

        {/* Main value */}
        <Text
          position={[0, subValue ? 0.1 : 0, 0.04]}
          fontSize={0.5}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {value}
        </Text>

        {/* Sub value */}
        {subValue && (
          <Text
            position={[0, -0.5, 0.04]}
            fontSize={0.25}
            color="#64748b"
            anchorX="center"
            anchorY="middle"
          >
            {subValue}
          </Text>
        )}

        {/* Corner accents */}
        {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, y], i) => (
          <mesh
            key={i}
            position={[x * (size[0] / 2 - 0.15), y * (size[1] / 2 - 0.15), 0.03]}
          >
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ))}
      </Billboard>
    </group>
  );
};

const DataParticles: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const graphicsQuality = useMillStore(state => state.graphics.quality);
  const frameSkipRef = useRef(0);
  const count = graphicsQuality === 'low' ? 50 : 100; // Reduce particle count on low

  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 20 + 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, [count]);

  useFrame(() => {
    // Throttle on low graphics
    if (graphicsQuality === 'low') {
      frameSkipRef.current++;
      if (frameSkipRef.current % 2 !== 0) return;
    }

    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const speed = graphicsQuality === 'low' ? 0.04 : 0.02; // Compensate for skipped frames

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += speed;
      if (positions[i * 3 + 1] > 25) {
        positions[i * 3 + 1] = 5;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Use key to force remount when count changes, preventing buffer resize error
  return (
    <points ref={particlesRef} key={`data-particles-${count}`}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#06b6d4"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};
