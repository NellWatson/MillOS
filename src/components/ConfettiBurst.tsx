import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getThrottleLevel } from '../utils/frameThrottle';

interface ConfettiBurstProps {
  position: [number, number, number];
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  position,
  count = 100,
  duration = 3,
  onComplete,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startTime = useRef<number>(Date.now());
  const velocitiesRef = useRef<Float32Array | null>(null);
  const frameCountRef = useRef(0);

  // Initialize particle positions and velocities
  const { positions, colors } = useMemo(() => {
    const positionsArray = new Float32Array(count * 3);
    const colorsArray = new Float32Array(count * 3);
    const velocitiesArray = new Float32Array(count * 3);

    // Confetti colors: gold, cyan, yellow, white, orange
    const confettiColors = [
      new THREE.Color(0xffd700), // Gold
      new THREE.Color(0x00ffff), // Cyan
      new THREE.Color(0xffff00), // Yellow
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xff8800), // Orange
      new THREE.Color(0xff00ff), // Magenta
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Start at center
      positionsArray[i3] = position[0];
      positionsArray[i3 + 1] = position[1];
      positionsArray[i3 + 2] = position[2];

      // Random explosion velocity
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.5; // Upward bias
      const speed = 2 + Math.random() * 3;

      velocitiesArray[i3] = Math.cos(angle) * Math.cos(elevation) * speed;
      velocitiesArray[i3 + 1] = Math.sin(elevation) * speed + 2; // Extra upward boost
      velocitiesArray[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;

      // Random color
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      colorsArray[i3] = color.r;
      colorsArray[i3 + 1] = color.g;
      colorsArray[i3 + 2] = color.b;
    }

    velocitiesRef.current = velocitiesArray;

    return {
      positions: positionsArray,
      colors: colorsArray,
    };
  }, [count, position]);

  // Animate particles
  useFrame(() => {
    if (!pointsRef.current || !velocitiesRef.current) return;

    // Throttle to every 2nd frame for confetti (still smooth at 30 FPS)
    frameCountRef.current++;
    const throttleLevel = getThrottleLevel('medium');
    if (frameCountRef.current % throttleLevel !== 0) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed > duration) {
      onComplete?.();
      return;
    }

    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const positions = positionAttribute.array as Float32Array;
    const velocities = velocitiesRef.current;

    const gravity = -9.8;
    const drag = 0.98;
    const dt = 0.016; // Approximate frame time

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update velocities with gravity and drag
      velocities[i3] *= drag;
      velocities[i3 + 1] += gravity * dt;
      velocities[i3 + 1] *= drag;
      velocities[i3 + 2] *= drag;

      // Update positions
      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;

      // Floor bounce with energy loss
      if (positions[i3 + 1] < 0.1) {
        positions[i3 + 1] = 0.1;
        velocities[i3 + 1] *= -0.3; // Bounce with 70% energy loss
      }
    }

    positionAttribute.needsUpdate = true;

    // Fade out material
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, 1 - elapsed / duration);
  });

  // Cleanup on unmount
  useEffect(() => {
    const points = pointsRef.current;
    return () => {
      if (points) {
        points.geometry.dispose();
        (points.material as THREE.Material).dispose();
      }
    };
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
