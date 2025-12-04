import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MachineData, MachineType, GrainQuality } from '../types';
import * as THREE from 'three';
import { Html, Text } from '@react-three/drei';
import { audioManager } from '../utils/audioManager';
import { useMillStore } from '../store';

// Grain quality color mapping
const QUALITY_COLORS: Record<GrainQuality, string> = {
  premium: '#22c55e',  // Green
  standard: '#3b82f6', // Blue
  economy: '#f59e0b',  // Amber
  mixed: '#8b5cf6',    // Purple
};

const QUALITY_LABELS: Record<GrainQuality, string> = {
  premium: 'Premium',
  standard: 'Standard',
  economy: 'Economy',
  mixed: 'Mixed',
};

// Grain types for silos
const GRAIN_TYPES = ['Wheat', 'Corn', 'Barley', 'Oats', 'Rye'];

// Fill level indicator for silos
const SiloFillIndicator: React.FC<{
  fillLevel: number;
  quality: GrainQuality;
  grainType: string;
  radius: number;
  height: number;
}> = ({ fillLevel, quality, grainType, radius, height }) => {
  const fillHeight = (fillLevel / 100) * height * 0.85;
  const qualityColor = QUALITY_COLORS[quality];
  const graphics = useMillStore(state => state.graphics);

  return (
    <group>
      {/* Grain fill visualization */}
      <mesh position={[0, -height / 2 + fillHeight / 2 + 0.5, 0]}>
        <cylinderGeometry args={[radius - 0.15, radius - 0.15, fillHeight, graphics.quality === 'low' ? 16 : 32]} />
        {graphics.quality === 'low' ? (
          <meshBasicMaterial
            color={quality === 'premium' ? '#f5d78e' : quality === 'economy' ? '#d4a574' : '#e8c872'}
            transparent
            opacity={0.7}
          />
        ) : (
          <meshStandardMaterial
            color={quality === 'premium' ? '#f5d78e' : quality === 'economy' ? '#d4a574' : '#e8c872'}
            roughness={0.9}
            transparent
            opacity={0.7}
          />
        )}
      </mesh>

      {/* Quality indicator ring at fill level - skip on low */}
      {graphics.quality !== 'low' && (
        <mesh position={[0, -height / 2 + fillHeight + 0.5, 0]}>
          <torusGeometry args={[radius - 0.1, 0.05, 8, 32]} />
          <meshStandardMaterial
            color={qualityColor}
            emissive={qualityColor}
            emissiveIntensity={0.5}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Fill level percentage display - skip on low */}
      {graphics.quality !== 'low' && (
        <Html position={[radius + 0.8, 0, 0]} center distanceFactor={15}>
          <div className="bg-slate-900/90 backdrop-blur px-2 py-1 rounded-lg border border-slate-700 min-w-[70px]">
            <div className="text-xs font-mono text-white font-bold">{fillLevel.toFixed(0)}%</div>
            <div className="text-[9px] text-slate-400">{grainType}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: qualityColor }}
              />
              <span className="text-[8px]" style={{ color: qualityColor }}>
                {QUALITY_LABELS[quality]}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Maintenance countdown timer display
const MaintenanceCountdown: React.FC<{
  hoursRemaining: number;
  position: [number, number, number];
}> = ({ hoursRemaining, position }) => {
  const graphics = useMillStore(state => state.graphics.quality);

  // Skip Html overlay on low graphics
  if (graphics === 'low') return null;

  const isUrgent = hoursRemaining < 24;
  const isCritical = hoursRemaining < 8;

  const color = isCritical ? '#ef4444' : isUrgent ? '#f59e0b' : '#22c55e';

  // Format hours to days/hours display
  const formatTime = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
    return `${Math.floor(hours)}h`;
  };

  return (
    <Html position={position} center distanceFactor={12}>
      <div className={`bg-slate-900/90 backdrop-blur px-2 py-1 rounded border ${
        isCritical ? 'border-red-500/50 animate-pulse' : isUrgent ? 'border-amber-500/50' : 'border-slate-700'
      }`}>
        <div className="text-[8px] text-slate-500 uppercase tracking-wider">Maintenance</div>
        <div className="text-xs font-mono font-bold flex items-center gap-1" style={{ color }}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(hoursRemaining)}
        </div>
      </div>
    </Html>
  );
};

// Procedural texture generator for enhanced metal surfaces
const useProceduralMetalTexture = (enabled: boolean, seed: number = 0) => {
  return useMemo(() => {
    if (!enabled) return { roughnessMap: null, normalMap: null };

    const random = (s: number) => Math.abs(Math.sin(s * 12.9898 + 78.233) * 43758.5453) % 1;

    // Create roughness variation texture
    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = roughnessCanvas.height = 256;
    const rCtx = roughnessCanvas.getContext('2d')!;

    rCtx.fillStyle = '#666';
    rCtx.fillRect(0, 0, 256, 256);

    // Weld lines
    rCtx.fillStyle = '#444';
    for (let y = 40; y < 256; y += 60) {
      rCtx.fillRect(0, y + (seed % 10), 256, 3);
    }

    // Scratches
    rCtx.strokeStyle = '#555';
    rCtx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      rCtx.beginPath();
      rCtx.moveTo(random(seed + i) * 256, random(seed + i + 100) * 256);
      rCtx.lineTo(random(seed + i + 50) * 256, random(seed + i + 150) * 256);
      rCtx.stroke();
    }

    // Wear spots
    for (let i = 0; i < 15; i++) {
      const x = random(seed + i * 3) * 256;
      const y = random(seed + i * 3 + 1) * 256;
      const r = 5 + random(seed + i * 3 + 2) * 15;
      const gradient = rCtx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgb(${100 + random(seed + i) * 40}, ${100 + random(seed + i) * 40}, ${100 + random(seed + i) * 40})`);
      gradient.addColorStop(1, 'rgba(102, 102, 102, 0)');
      rCtx.fillStyle = gradient;
      rCtx.beginPath();
      rCtx.arc(x, y, r, 0, Math.PI * 2);
      rCtx.fill();
    }

    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTexture.wrapS = roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(1, 2);

    // Create enhanced normal map with industrial details
    const normalCanvas = document.createElement('canvas');
    const normalSize = 256;
    normalCanvas.width = normalCanvas.height = normalSize;
    const nCtx = normalCanvas.getContext('2d')!;

    // Base neutral normal (pointing up: R=128, G=128, B=255)
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, normalSize, normalSize);

    // Helper to draw normal-mapped features
    const drawNormalBump = (x: number, y: number, radius: number, height: number) => {
      const gradient = nCtx.createRadialGradient(x, y, 0, x, y, radius);
      // Center is raised (brighter green = pointing forward)
      const centerG = Math.min(255, 128 + height * 60);
      gradient.addColorStop(0, `rgb(128, ${centerG}, 255)`);
      gradient.addColorStop(0.7, 'rgb(128, 128, 255)');
      gradient.addColorStop(1, `rgb(128, ${Math.max(0, 128 - height * 30)}, 255)`);
      nCtx.fillStyle = gradient;
      nCtx.beginPath();
      nCtx.arc(x, y, radius, 0, Math.PI * 2);
      nCtx.fill();
    };

    // Add rivets in grid pattern
    const rivetSpacing = 48;
    const rivetRadius = 4;
    for (let row = 0; row < normalSize / rivetSpacing; row++) {
      for (let col = 0; col < normalSize / rivetSpacing; col++) {
        const x = 24 + col * rivetSpacing + (random(seed + row * 10 + col) - 0.5) * 4;
        const y = 24 + row * rivetSpacing + (random(seed + row * 10 + col + 50) - 0.5) * 4;
        drawNormalBump(x, y, rivetRadius, 1.5);
      }
    }

    // Panel seam lines (horizontal) - create edge lighting effect
    for (let y = 64; y < normalSize; y += 64) {
      // Top edge of seam (light from above)
      nCtx.fillStyle = 'rgb(128, 160, 255)';
      nCtx.fillRect(0, y - 2, normalSize, 2);
      // Bottom edge of seam (shadow)
      nCtx.fillStyle = 'rgb(128, 96, 255)';
      nCtx.fillRect(0, y, normalSize, 2);
    }

    // Panel seam lines (vertical)
    for (let x = 128; x < normalSize; x += 128) {
      // Left edge (light)
      nCtx.fillStyle = 'rgb(160, 128, 255)';
      nCtx.fillRect(x - 2, 0, 2, normalSize);
      // Right edge (shadow)
      nCtx.fillStyle = 'rgb(96, 128, 255)';
      nCtx.fillRect(x, 0, 2, normalSize);
    }

    // Scratches with directional normals
    for (let i = 0; i < 20; i++) {
      const x1 = random(seed + i * 7) * normalSize;
      const y1 = random(seed + i * 7 + 1) * normalSize;
      const angle = random(seed + i * 7 + 2) * Math.PI;
      const length = 20 + random(seed + i * 7 + 3) * 40;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;

      // Scratch creates a groove - perpendicular normal displacement
      const perpAngle = angle + Math.PI / 2;
      const normalX = Math.cos(perpAngle) * 30;
      const normalY = Math.sin(perpAngle) * 30;

      nCtx.strokeStyle = `rgb(${128 + normalX}, ${128 + normalY}, 240)`;
      nCtx.lineWidth = 1;
      nCtx.beginPath();
      nCtx.moveTo(x1, y1);
      nCtx.lineTo(x2, y2);
      nCtx.stroke();
    }

    // Dents (inverted bumps)
    for (let i = 0; i < 5; i++) {
      const x = random(seed + i * 11) * normalSize;
      const y = random(seed + i * 11 + 1) * normalSize;
      const radius = 8 + random(seed + i * 11 + 2) * 12;
      const gradient = nCtx.createRadialGradient(x, y, 0, x, y, radius);
      // Center is depressed (darker green)
      gradient.addColorStop(0, 'rgb(128, 80, 255)');
      gradient.addColorStop(0.6, 'rgb(128, 128, 255)');
      gradient.addColorStop(1, 'rgb(128, 150, 255)');
      nCtx.fillStyle = gradient;
      nCtx.beginPath();
      nCtx.arc(x, y, radius, 0, Math.PI * 2);
      nCtx.fill();
    }

    // Add subtle surface noise
    const imageData = nCtx.getImageData(0, 0, normalSize, normalSize);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (random(seed + i) - 0.5) * 6;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
    }
    nCtx.putImageData(imageData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;

    return { roughnessMap: roughnessTexture, normalMap: normalTexture };
  }, [enabled, seed]);
};

// Weathering/dust layer for machines
const WeatheringLayer: React.FC<{
  size: [number, number, number];
  yOffset?: number;
  enabled: boolean;
}> = ({ size, yOffset = 0, enabled }) => {
  if (!enabled) return null;

  return (
    <group position={[0, yOffset, 0]}>
      <mesh position={[0, size[1] / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.95, size[2] * 0.95]} />
        <meshStandardMaterial color="#e8dcc8" transparent opacity={0.2} roughness={1} depthWrite={false} />
      </mesh>
      <mesh position={[0, -size[1] / 2 + 0.15, size[2] / 2 + 0.003]}>
        <planeGeometry args={[size[0], 0.3]} />
        <meshStandardMaterial color="#8b7355" transparent opacity={0.15} roughness={1} depthWrite={false} />
      </mesh>
    </group>
  );
};

// Weld seams for silos
const WeldSeams: React.FC<{ radius: number; height: number; enabled: boolean }> = ({ radius, height, enabled }) => {
  if (!enabled) return null;
  const seamCount = Math.floor(height / 3);
  return (
    <group>
      {Array.from({ length: seamCount }).map((_, i) => (
        <mesh key={i} position={[0, -height / 2 + (i + 1) * (height / (seamCount + 1)), 0]}>
          <torusGeometry args={[radius + 0.02, 0.015, 8, 32]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// Heat shimmer effect for hot machines
const HeatShimmer: React.FC<{ position: [number, number, number]; temperature: number; size: [number, number, number] }> = ({
  position,
  temperature,
  size
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Only show shimmer for temperatures above 45°C
  const intensity = Math.max(0, (temperature - 45) / 30); // 0-1 based on temp 45-75°C
  if (intensity <= 0) return null;

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: intensity }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
          float distort = sin(vUv.y * 20.0 + time * 3.0) * 0.02 * intensity;
          float alpha = (1.0 - vUv.y) * 0.08 * intensity;
          alpha *= sin(vUv.x * 3.14159);
          gl_FragColor = vec4(1.0, 0.95, 0.9, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, [intensity]);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + size[1] + 1.5, position[2]]}
      material={shaderMaterial}
    >
      <planeGeometry args={[size[0] * 1.5, 4]} />
    </mesh>
  );
};

// Steam vent effect for hot machinery
const SteamVent: React.FC<{ position: [number, number, number]; intensity: number }> = ({ position, intensity }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 30;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = Math.random() * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return pos;
  }, []);

  const velocities = useMemo(() => {
    return Array.from({ length: count }, () => ({
      speed: 0.5 + Math.random() * 1,
      drift: (Math.random() - 0.5) * 0.02
    }));
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || intensity <= 0) return;
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += velocities[i].speed * delta * intensity;
      pos[i * 3] += velocities[i].drift;
      pos[i * 3 + 2] += velocities[i].drift;

      if (pos[i * 3 + 1] > 2.5) {
        pos[i * 3 + 1] = 0;
        pos[i * 3] = (Math.random() - 0.5) * 0.3;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (intensity <= 0) return null;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#e2e8f0" transparent opacity={0.4 * intensity} sizeAttenuation />
    </points>
  );
};

// Blinking control panel with LED indicators
const ControlPanel: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  status: 'running' | 'idle' | 'warning' | 'critical';
  enabled: boolean;
}> = ({ position, rotation = [0, 0, 0], status, enabled }) => {
  const blinkStateRef = useRef(0);
  const [, forceUpdate] = useState(0);

  useFrame((state) => {
    if (!enabled) return;
    // Different blink patterns based on status
    const time = state.clock.elapsedTime;
    let newState = 0;
    if (status === 'running') {
      newState = Math.floor(time * 2) % 4; // Slow cycle through LEDs
    } else if (status === 'warning') {
      newState = Math.sin(time * 6) > 0 ? 1 : 0; // Fast blink
    } else if (status === 'critical') {
      newState = Math.sin(time * 10) > 0 ? 2 : 3; // Very fast alternating
    }
    // Only trigger re-render when state actually changes
    if (newState !== blinkStateRef.current) {
      blinkStateRef.current = newState;
      forceUpdate(n => n + 1);
    }
  });

  const blinkState = blinkStateRef.current;

  if (!enabled) return null;

  const ledColors = {
    running: ['#22c55e', '#22c55e', '#3b82f6', '#3b82f6'],
    idle: ['#64748b', '#64748b', '#64748b', '#64748b'],
    warning: ['#f59e0b', '#1e293b', '#f59e0b', '#1e293b'],
    critical: ['#ef4444', '#ef4444', '#1e293b', '#1e293b']
  };

  const colors = ledColors[status];

  return (
    <group position={position} rotation={rotation}>
      {/* Panel backing */}
      <mesh>
        <boxGeometry args={[0.4, 0.3, 0.05]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Screen/display area */}
      <mesh position={[0, 0.02, 0.026]}>
        <planeGeometry args={[0.25, 0.12]} />
        <meshStandardMaterial
          color={status === 'critical' ? '#450a0a' : status === 'warning' ? '#451a03' : '#0f172a'}
          emissive={status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#3b82f6'}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* LED indicators */}
      {[[-0.12, -0.08], [-0.04, -0.08], [0.04, -0.08], [0.12, -0.08]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.026]}>
          <circleGeometry args={[0.02, 8]} />
          <meshStandardMaterial
            color={colors[(blinkState + i) % 4]}
            emissive={colors[(blinkState + i) % 4]}
            emissiveIntensity={colors[(blinkState + i) % 4] !== '#1e293b' && colors[(blinkState + i) % 4] !== '#64748b' ? 0.8 : 0}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Buttons */}
      {[[0.15, 0.08], [0.15, 0.0]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.03]}>
          <cylinderGeometry args={[0.015, 0.015, 0.02, 8]} />
          <meshStandardMaterial color={i === 0 ? '#22c55e' : '#ef4444'} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

// Anisotropic metal surface (brushed metal effect for rollers)
const AnisotropicRoller: React.FC<{
  position: [number, number, number];
  radius: number;
  length: number;
  rotation?: [number, number, number];
  enabled: boolean;
  rpm?: number;
}> = ({ position, radius, length, rotation = [0, 0, Math.PI / 2], enabled, rpm = 0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create anisotropic normal map
  const normalMap = useMemo(() => {
    if (!enabled) return null;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base neutral normal
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, size, size);

    // Horizontal brushed lines (anisotropic direction)
    for (let y = 0; y < size; y += 2) {
      const intensity = 20 + Math.random() * 20;
      ctx.strokeStyle = `rgb(128, ${128 + intensity}, 255)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }

    // Add some scratches perpendicular to brush direction
    ctx.strokeStyle = 'rgb(150, 128, 240)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      const x = Math.random() * size;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 20, size);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }, [enabled]);

  // Animate rotation based on RPM
  useFrame((_, delta) => {
    if (meshRef.current && rpm > 0) {
      meshRef.current.rotation.x += (rpm / 60) * Math.PI * 2 * delta;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 32]} />
      <meshStandardMaterial
        color="#94a3b8"
        metalness={0.95}
        roughness={enabled ? 0.15 : 0.3}
        normalMap={normalMap}
        normalScale={enabled ? new THREE.Vector2(0.5, 0.1) : undefined}
      />
    </mesh>
  );
};

// Sparks effect for grinding/milling machinery
const Sparks: React.FC<{ position: [number, number, number]; active: boolean }> = ({ position, active }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 20;
  const nextSparkRef = useRef(0);

  const positions = useMemo(() => new Float32Array(count * 3), []);
  const velocities = useMemo(() => Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, life: 0 })), []);

  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return;
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;

    // Occasionally spawn new sparks
    nextSparkRef.current -= delta;
    if (nextSparkRef.current <= 0 && Math.random() > 0.7) {
      const idx = Math.floor(Math.random() * count);
      pos[idx * 3] = 0;
      pos[idx * 3 + 1] = 0;
      pos[idx * 3 + 2] = 0;
      velocities[idx] = {
        x: (Math.random() - 0.5) * 3,
        y: Math.random() * 2 + 1,
        z: (Math.random() - 0.5) * 3,
        life: 1
      };
      nextSparkRef.current = 0.05 + Math.random() * 0.1;
    }

    // Update spark positions
    for (let i = 0; i < count; i++) {
      if (velocities[i].life > 0) {
        pos[i * 3] += velocities[i].x * delta;
        pos[i * 3 + 1] += velocities[i].y * delta;
        pos[i * 3 + 2] += velocities[i].z * delta;
        velocities[i].y -= 5 * delta; // Gravity
        velocities[i].life -= delta * 2;
      } else {
        pos[i * 3 + 1] = -100; // Hide dead sparks
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#fcd34d" transparent opacity={0.9} sizeAttenuation />
    </points>
  );
};

// Rotating fan for machine ventilation
const RotatingFan: React.FC<{ position: [number, number, number]; speed: number; size?: number }> = ({
  position,
  speed,
  size = 0.4
}) => {
  const fanRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (fanRef.current && speed > 0) {
      fanRef.current.rotation.z += delta * speed * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Fan housing */}
      <mesh>
        <cylinderGeometry args={[size + 0.05, size + 0.05, 0.1, 16]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Rotating blades */}
      <group ref={fanRef} position={[0, 0.06, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]}>
            <boxGeometry args={[size * 1.8, 0.02, size * 0.3]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Animated gauge with needle
const AnimatedGauge: React.FC<{ position: [number, number, number]; value: number; maxValue: number }> = ({
  position,
  value,
  maxValue
}) => {
  const needleRef = useRef<THREE.Mesh>(null);
  const targetAngle = useRef(0);

  useFrame(() => {
    if (!needleRef.current) return;
    // Map value to angle (-135 to +135 degrees)
    const normalizedValue = Math.min(value / maxValue, 1);
    targetAngle.current = (-0.75 + normalizedValue * 1.5) * Math.PI;
    needleRef.current.rotation.z = THREE.MathUtils.lerp(
      needleRef.current.rotation.z,
      targetAngle.current,
      0.05
    );
  });

  return (
    <group position={position}>
      {/* Gauge face */}
      <mesh>
        <circleGeometry args={[0.12, 32]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Gauge markings */}
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[0.08, 0.1, 32, 1, -2.35, 4.7]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      {/* Warning zone */}
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[0.08, 0.1, 32, 1, 1.57, 0.78]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Needle */}
      <mesh ref={needleRef} position={[0, 0, 0.002]}>
        <boxGeometry args={[0.015, 0.08, 0.005]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Center cap */}
      <mesh position={[0, 0, 0.003]}>
        <circleGeometry args={[0.02, 16]} />
        <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
};

interface MachinesProps {
  machines: MachineData[];
  onSelect: (data: MachineData) => void;
}

export const Machines: React.FC<MachinesProps> = ({ machines, onSelect }) => {
  return (
    <group>
      {machines.map((m) => (
        <MachineMesh key={m.id} data={m} onClick={() => onSelect(m)} />
      ))}
    </group>
  );
};

const MachineMesh: React.FC<{ data: MachineData; onClick: () => void }> = ({ data, onClick }) => {
  const { type, position, size, rotation, status } = data;
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Graphics settings
  const graphics = useMillStore(state => state.graphics);
  const enableVibration = graphics.enableMachineVibration;
  const enableTextures = graphics.enableProceduralTextures;
  const enableWeathering = graphics.enableWeathering;
  const enableControlPanels = graphics.enableControlPanels;
  const enableAnisotropicReflections = graphics.enableAnisotropicReflections;

  // Generate unique seed for this machine's textures
  const textureSeed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < data.id.length; i++) {
      hash = ((hash << 5) - hash) + data.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [data.id]);

  const { roughnessMap, normalMap } = useProceduralMetalTexture(enableTextures, textureSeed);

  // Machine-specific sounds based on type and status
  useEffect(() => {
    if (status !== 'running') {
      audioManager.stopMachineSound(data.id);
      return;
    }

    // Start appropriate sound for machine type
    switch (type) {
      case MachineType.ROLLER_MILL:
        audioManager.playMillSound(data.id, data.metrics.rpm);
        break;
      case MachineType.PLANSIFTER:
        audioManager.playSifterSound(data.id, data.metrics.rpm);
        break;
      case MachineType.PACKER:
        audioManager.playPackerSound(data.id);
        break;
    }

    return () => {
      audioManager.stopMachineSound(data.id);
    };
  }, [data.id, type, status, data.metrics.rpm]);

  useFrame((state) => {
    if (status === 'running' && groupRef.current && enableVibration) {
      const time = state.clock.elapsedTime;
      const rpm = data.metrics.rpm || 0;
      const rpmFactor = Math.min(rpm / 1500, 1); // Normalize RPM to 0-1

      switch (type) {
        case MachineType.PLANSIFTER: {
          // Sifters have strong circular oscillation
          const intensity = 0.04 + rpmFactor * 0.03;
          const speed = 12 + rpmFactor * 8;
          groupRef.current.position.x = position[0] + Math.cos(time * speed) * intensity;
          groupRef.current.position.z = position[2] + Math.sin(time * speed) * intensity;
          // Add slight rotation wobble
          groupRef.current.rotation.x = Math.sin(time * speed * 0.5) * 0.003;
          groupRef.current.rotation.z = Math.cos(time * speed * 0.5) * 0.003;
          break;
        }
        case MachineType.ROLLER_MILL: {
          // Mills have high-frequency vertical vibration based on RPM
          const intensity = 0.005 + rpmFactor * 0.015;
          const speed = 30 + rpmFactor * 30;
          groupRef.current.position.y = position[1] + Math.sin(time * speed) * intensity;
          // Add harmonic vibration
          groupRef.current.position.x = position[0] + Math.sin(time * speed * 2.3) * intensity * 0.3;
          break;
        }
        case MachineType.PACKER: {
          // Packers have rhythmic mechanical motion
          const cycleTime = time * 3;
          const cycle = Math.sin(cycleTime) > 0.7 ? 1 : 0;
          groupRef.current.position.y = position[1] + cycle * 0.02;
          // Subtle continuous vibration
          groupRef.current.position.x = position[0] + Math.sin(time * 15) * 0.003;
          break;
        }
        case MachineType.SILO: {
          // Silos have very subtle low-frequency rumble when filling
          const load = data.metrics.load || 0;
          if (load > 50) {
            const intensity = 0.002 * (load / 100);
            groupRef.current.position.x = position[0] + Math.sin(time * 5) * intensity;
            groupRef.current.position.z = position[2] + Math.cos(time * 4) * intensity;
          }
          break;
        }
      }
    } else if (groupRef.current && !enableVibration) {
      // Reset position when vibration is disabled
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.set(0, rotation, 0);
    }

    // Register machine position for spatial audio
    if (status === 'running') {
      audioManager.registerSoundPosition(data.id, position[0], position[1] + size[1] / 2, position[2]);
      audioManager.updateMachineSpatialVolume(data.id);
    }
  });

  const statusColor = status === 'running' ? '#22c55e' : status === 'warning' ? '#f59e0b' : status === 'critical' ? '#ef4444' : '#9ca3af';
  const matProps = {
    emissive: hovered ? '#3b82f6' : '#000000',
    emissiveIntensity: hovered ? 0.3 : 0
  };

  const renderGeometry = () => {
    switch (type) {
      case MachineType.SILO:
        // Generate fill level and quality if not set
        const fillLevel = data.fillLevel ?? (50 + Math.sin(textureSeed) * 30);
        const grainQuality = data.grainQuality ?? (['premium', 'standard', 'economy', 'mixed'] as const)[textureSeed % 4];
        const grainType = data.grainType ?? GRAIN_TYPES[textureSeed % GRAIN_TYPES.length];
        const maintenanceHours = data.maintenanceCountdown ?? (48 + (textureSeed % 200));

        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Main cylinder */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 32]} />
              <meshStandardMaterial
                color="#cbd5e1"
                metalness={0.7}
                roughness={0.2}
                roughnessMap={roughnessMap}
                normalMap={normalMap}
                normalScale={normalMap ? new THREE.Vector2(0.3, 0.3) : undefined}
                {...matProps}
              />
            </mesh>

            {/* Fill level visualization */}
            <SiloFillIndicator
              fillLevel={fillLevel}
              quality={grainQuality}
              grainType={grainType}
              radius={size[0] / 2}
              height={size[1]}
            />

            {/* Weld seams */}
            <WeldSeams radius={size[0] / 2} height={size[1]} enabled={enableTextures} />
            {/* Top cone */}
            <mesh position={[0, size[1] / 2 + 1, 0]} castShadow>
              <coneGeometry args={[size[0] / 2, 2, 32]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} {...matProps} />
            </mesh>
            {/* Dust on top of cone */}
            {enableWeathering && (
              <mesh position={[0, size[1] / 2 + 2.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[size[0] / 2 * 0.6, 16]} />
                <meshStandardMaterial color="#e8dcc8" transparent opacity={0.25} roughness={1} depthWrite={false} />
              </mesh>
            )}
            {/* Bottom cone (hopper) */}
            <mesh position={[0, -size[1] / 2 - 1, 0]} castShadow>
              <coneGeometry args={[size[0] / 2, 2, 32]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.2} {...matProps} />
            </mesh>
            {/* Legs */}
            {[1, -1].map(x => [1, -1].map(z => (
              <mesh key={`${x}-${z}`} position={[x * size[0] / 3, -size[1] / 2 - 3, z * size[0] / 3]}>
                <cylinderGeometry args={[0.15, 0.2, 4]} />
                <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
              </mesh>
            )))}
            {/* Access ladder */}
            <mesh position={[size[0] / 2 + 0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.1, size[1], 0.4]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Maintenance countdown - skip on low graphics */}
            {graphics.quality !== 'low' && (
              <MaintenanceCountdown
                hoursRemaining={maintenanceHours}
                position={[-(size[0] / 2 + 1), size[1] / 2 - 1, 0]}
              />
            )}
          </group>
        );

      case MachineType.ROLLER_MILL:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Main body - painted metal with clearcoat */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              <meshPhysicalMaterial
                color="#3b82f6"
                metalness={0.3}
                roughness={0.4}
                roughnessMap={roughnessMap}
                clearcoat={0.8}
                clearcoatRoughness={0.2}
                {...matProps}
              />
            </mesh>
            {/* Weathering layer */}
            <WeatheringLayer size={size as [number, number, number]} enabled={enableWeathering} />
            {/* Hopper on top */}
            <mesh position={[0, size[1] / 2 + 0.5, 0]}>
              <coneGeometry args={[1.2, 1.2, 4]} rotation={[Math.PI, 0, 0]} />
              <meshStandardMaterial color="#bfdbfe" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Control panel - simple version for low graphics */}
            {!enableControlPanels && (
              <>
                <mesh position={[size[0] / 2 + 0.1, 0.5, 0]} castShadow>
                  <boxGeometry args={[0.2, 1, 0.8]} />
                  <meshStandardMaterial color="#1e293b" />
                </mesh>
                <mesh position={[size[0] / 2 + 0.15, 0.5, 0]}>
                  <planeGeometry args={[0.1, 0.5]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </>
            )}
            {/* Animated control panel with blinking LEDs - high/ultra */}
            <ControlPanel
              position={[size[0] / 2 + 0.13, 0.5, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              status={status}
              enabled={enableControlPanels}
            />
            {/* Animated gauges on control panel */}
            <AnimatedGauge
              position={[size[0] / 2 + 0.16, 0.8, 0.2]}
              value={data.metrics.rpm}
              maxValue={1600}
            />
            <AnimatedGauge
              position={[size[0] / 2 + 0.16, 0.8, -0.2]}
              value={data.metrics.temperature}
              maxValue={80}
            />
            {/* Anisotropic brushed metal rollers - visible inside machine */}
            {enableAnisotropicReflections && (
              <>
                <AnisotropicRoller
                  position={[0, -size[1] / 4, size[2] / 2 - 0.3]}
                  radius={0.3}
                  length={size[0] - 0.4}
                  enabled={enableAnisotropicReflections}
                  rpm={status === 'running' ? data.metrics.rpm * 0.8 : 0}
                />
                <AnisotropicRoller
                  position={[0, -size[1] / 4 - 0.4, size[2] / 2 - 0.3]}
                  radius={0.25}
                  length={size[0] - 0.4}
                  enabled={enableAnisotropicReflections}
                  rpm={status === 'running' ? -data.metrics.rpm : 0}
                />
              </>
            )}
            {/* Rotating ventilation fan */}
            <RotatingFan
              position={[-size[0] / 2 - 0.05, 0, 0]}
              speed={status === 'running' ? data.metrics.rpm / 100 : 0}
              size={0.35}
            />
            {/* Steam vents when hot - disable on low graphics */}
            {graphics.quality !== 'low' && status === 'running' && data.metrics.temperature > 50 && (
              <SteamVent
                position={[0, size[1] / 2 + 1, size[2] / 2]}
                intensity={(data.metrics.temperature - 50) / 25}
              />
            )}
            {/* Occasional sparks from milling process - disable on low graphics */}
            {graphics.quality !== 'low' && status === 'running' && data.metrics.rpm > 1400 && (
              <Sparks position={[0, -size[1] / 2 + 0.5, 0]} active />
            )}
          </group>
        );

      case MachineType.PLANSIFTER:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Hanging cables */}
            {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], i) => (
              <mesh key={i} position={[x * (size[0] / 2 - 0.3), 5, z * (size[2] / 2 - 0.3)]}>
                <cylinderGeometry args={[0.03, 0.03, 10]} />
                <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
              </mesh>
            ))}
            {/* Main box - white painted with clearcoat */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              <meshPhysicalMaterial
                color="#f8fafc"
                metalness={0.1}
                roughness={0.15}
                roughnessMap={roughnessMap}
                clearcoat={1.0}
                clearcoatRoughness={0.1}
                {...matProps}
              />
            </mesh>
            {/* Weathering - flour dust on sifters */}
            <WeatheringLayer size={size as [number, number, number]} enabled={enableWeathering} />
            {/* Side vents */}
            {[-1, 1].map(x => (
              <mesh key={x} position={[x * (size[0] / 2 + 0.05), 0, 0]} castShadow>
                <boxGeometry args={[0.1, size[1] * 0.8, size[2] * 0.6]} />
                <meshStandardMaterial color="#e2e8f0" />
              </mesh>
            ))}
            {/* Control panel */}
            <ControlPanel
              position={[0, -size[1] / 2 + 0.3, size[2] / 2 + 0.05]}
              rotation={[0, 0, 0]}
              status={status}
              enabled={enableControlPanels}
            />
          </group>
        );

      case MachineType.PACKER:
        return (
          <group position={[0, size[1] / 2, 0]}>
            {/* Main body - orange painted with clearcoat */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              <meshPhysicalMaterial
                color="#f59e0b"
                metalness={0.25}
                roughness={0.35}
                roughnessMap={roughnessMap}
                clearcoat={0.7}
                clearcoatRoughness={0.25}
                {...matProps}
              />
            </mesh>
            {/* Weathering */}
            <WeatheringLayer size={size as [number, number, number]} enabled={enableWeathering} />
            {/* Output chute */}
            <mesh position={[0, -size[1] / 3, size[2] / 2 + 0.5]} rotation={[0.3, 0, 0]} castShadow>
              <boxGeometry args={[1.8, 0.3, 1.2]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Control panel - simple version for low graphics */}
            {!enableControlPanels && (
              <>
                <mesh position={[-size[0] / 2 - 0.1, 0.5, 0]} castShadow>
                  <boxGeometry args={[0.2, 1.5, 1]} />
                  <meshStandardMaterial color="#1e293b" />
                </mesh>
                <mesh position={[-size[0] / 2 - 0.15, 0.5, 0]}>
                  <planeGeometry args={[0.1, 0.8]} />
                  <meshBasicMaterial color="#3b82f6" />
                </mesh>
              </>
            )}
            {/* Animated control panel with blinking LEDs - high/ultra */}
            <ControlPanel
              position={[-size[0] / 2 - 0.13, 0.5, 0]}
              rotation={[0, Math.PI / 2, 0]}
              status={status}
              enabled={enableControlPanels}
            />
          </group>
        );

      default: return null;
    }
  };

  return (
    <group
      ref={groupRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); audioManager.playClick(); onClick(); }}
    >
      {renderGeometry()}

      {/* Heat shimmer effect for hot machines */}
      {status === 'running' && (type === MachineType.ROLLER_MILL || type === MachineType.PACKER) && (
        <HeatShimmer
          position={position as [number, number, number]}
          temperature={data.metrics.temperature}
          size={size as [number, number, number]}
        />
      )}

      {/* Status light */}
      <mesh position={[0, size[1] + 1.5, 0]}>
        <sphereGeometry args={[0.3]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, size[1] + 0.75, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, size[1] + 2.5, 0]} center distanceFactor={12}>
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 px-4 py-2 rounded-lg shadow-2xl pointer-events-none min-w-[180px]">
            <div className="font-bold text-white text-sm">{data.name}</div>
            <div className="text-xs text-cyan-400">{data.type.replace('_', ' ')}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor }}></span>
              <span className="text-xs text-slate-400 capitalize">{status}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Click to inspect</div>
          </div>
        </Html>
      )}
    </group>
  );
};
