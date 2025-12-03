import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Environment as DreiEnvironment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useMillStore } from '../store';

// Calculate daylight color based on game time
const getDaylightProperties = (hour: number) => {
  // Night (8pm - 5am): dark blue, minimal glow
  if (hour >= 20 || hour < 5) {
    return { color: '#1e3a5f', intensity: 0.1, opacity: 0.2 };
  }
  // Dawn (5am - 7am): warm orange/pink
  if (hour >= 5 && hour < 7) {
    const t = (hour - 5) / 2;
    return { color: '#f97316', intensity: 0.2 + t * 0.3, opacity: 0.3 + t * 0.2 };
  }
  // Morning (7am - 10am): transitioning to bright
  if (hour >= 7 && hour < 10) {
    const t = (hour - 7) / 3;
    return { color: '#fbbf24', intensity: 0.5 + t * 0.3, opacity: 0.5 + t * 0.2 };
  }
  // Midday (10am - 4pm): bright daylight
  if (hour >= 10 && hour < 16) {
    return { color: '#7dd3fc', intensity: 0.8, opacity: 0.7 };
  }
  // Afternoon (4pm - 6pm): warm golden
  if (hour >= 16 && hour < 18) {
    const t = (hour - 16) / 2;
    return { color: '#fbbf24', intensity: 0.7 - t * 0.2, opacity: 0.6 - t * 0.1 };
  }
  // Dusk (6pm - 8pm): orange/red sunset
  if (hour >= 18 && hour < 20) {
    const t = (hour - 18) / 2;
    return { color: '#f97316', intensity: 0.5 - t * 0.3, opacity: 0.5 - t * 0.2 };
  }

  return { color: '#7dd3fc', intensity: 0.5, opacity: 0.5 };
};

// Window component that responds to game time daylight
const DaylightWindow: React.FC<{ position: [number, number, number]; size: [number, number] }> = ({ position, size }) => {
  const gameTime = useMillStore((state) => state.gameTime);
  const { color, intensity, opacity } = getDaylightProperties(gameTime);

  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

// Game time ticker component
const GameTimeTicker: React.FC = () => {
  const tickGameTime = useMillStore((state) => state.tickGameTime);

  useFrame(() => {
    tickGameTime();
  });

  return null;
};

export const FactoryEnvironment: React.FC = () => {
  const spotlightRefs = useRef<THREE.SpotLight[]>([]);

  return (
    <group>
      {/* Game time ticker - advances time each frame */}
      <GameTimeTicker />

      {/* Main ambient */}
      <ambientLight intensity={0.15} color="#b4c6e7" />

      {/* Dramatic key light */}
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
        color="#fff5e6"
      />

      {/* Fill light */}
      <directionalLight
        position={[-20, 30, -10]}
        intensity={0.4}
        color="#7dd3fc"
      />

      {/* Industrial overhead lights */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <group key={i}>
          <pointLight
            position={[x, 18, 0]}
            intensity={50}
            distance={30}
            decay={2}
            color="#fef3c7"
          />
          {/* Light fixture */}
          <mesh position={[x, 19, 0]}>
            <cylinderGeometry args={[0.5, 0.8, 0.3, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[x, 18.7, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.1, 8]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fef3c7"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Colored accent lights for drama */}
      <pointLight position={[-30, 5, -15]} intensity={30} distance={25} color="#3b82f6" />
      <pointLight position={[30, 5, 15]} intensity={30} distance={25} color="#f97316" />
      <pointLight position={[0, 3, 25]} intensity={20} distance={20} color="#22c55e" />

      {/* Spot lights on key machines */}
      <spotLight
        position={[0, 20, -20]}
        angle={0.3}
        penumbra={0.5}
        intensity={100}
        distance={40}
        castShadow
        color="#ffffff"
        target-position={[0, 0, -20]}
      />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={100}
        blur={2}
        far={50}
        color="#000000"
      />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[200, 32, 32]} />
        <meshBasicMaterial color="#0f172a" side={THREE.BackSide} />
      </mesh>

      {/* Factory walls - planes facing inward (only visible from inside) */}
      {/* Back wall */}
      <group position={[0, 15, -40]}>
        <mesh receiveShadow>
          <planeGeometry args={[120, 35]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Industrial windows - daylight responsive */}
        {[-40, -20, 0, 20, 40].map((x, i) => (
          <DaylightWindow key={i} position={[x, 5, 0.1]} size={[8, 12]} />
        ))}
        {/* Wall panels */}
        {[-50, -30, -10, 10, 30, 50].map((x, i) => (
          <mesh key={i} position={[x, -5, 0.05]}>
            <planeGeometry args={[6, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Front wall */}
      <group position={[0, 15, 40]} rotation={[0, Math.PI, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[120, 35]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Large loading bay doors */}
        {[-30, 0, 30].map((x, i) => (
          <mesh key={i} position={[x, -5, 0.1]}>
            <planeGeometry args={[15, 20]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        {/* Door warning stripes */}
        {[-30, 0, 30].map((x, i) => (
          <mesh key={i} position={[x, -14, 0.15]}>
            <planeGeometry args={[15, 2]} />
            <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.2} />
          </mesh>
        ))}
      </group>

      {/* Left wall */}
      <group position={[-55, 15, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[82, 35]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Windows - daylight responsive */}
        {[-25, 0, 25].map((z, i) => (
          <DaylightWindow key={i} position={[z, 5, 0.1]} size={[10, 12]} />
        ))}
      </group>

      {/* Right wall */}
      <group position={[55, 15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[82, 35]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* Windows - daylight responsive */}
        {[-25, 0, 25].map((z, i) => (
          <DaylightWindow key={i} position={[z, 5, 0.1]} size={[10, 12]} />
        ))}
      </group>

      {/* Ceiling - plane facing down (only visible from below) */}
      <mesh position={[0, 32, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[110, 80]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Skylights */}
      {[-20, 0, 20].map((x, i) => (
        <mesh key={i} position={[x, 31.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 15]} />
          <meshStandardMaterial
            color="#87ceeb"
            transparent
            opacity={0.3}
            emissive="#87ceeb"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Support beams */}
      {[-40, -20, 0, 20, 40].map((x, i) => (
        <mesh key={i} position={[x, 20, 0]} castShadow>
          <boxGeometry args={[0.5, 25, 0.5]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Roof trusses */}
      {[-30, -15, 0, 15, 30].map((z, i) => (
        <mesh key={i} position={[0, 28, z]}>
          <boxGeometry args={[110, 0.3, 0.3]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};
