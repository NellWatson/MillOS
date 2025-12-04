import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';
import { audioManager } from '../../utils/audioManager';
import { WarningLight } from './LightingEffects';

// Cable tray with hanging wires
export const CableTray: React.FC<{
  position: [number, number, number];
  length?: number;
  rotation?: [number, number, number];
}> = ({ position, length = 10, rotation = [0, 0, 0] }) => {
  const wiresRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (wiresRef.current) {
      wiresRef.current.children.forEach((wire, i) => {
        wire.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.02;
      });
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[length, 0.05, 0.3]} />
        <meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.12, 0.12].map((z, i) => (
        <mesh key={i} position={[0, 0.05, z]}>
          <boxGeometry args={[length, 0.1, 0.02]} />
          <meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <group ref={wiresRef}>
        {Array.from({ length: 3 }).map((_, i) => (
          <group key={i} position={[-length / 3 + i * (length / 3), -0.1, 0]}>
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.5 + Math.random() * 0.3, 6]} />
              <meshStandardMaterial color={['#ef4444', '#eab308', '#3b82f6'][i]} roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

// Drainage grate
export const DrainageGrate: React.FC<{ position: [number, number, number]; size?: number }> = ({
  position,
  size = 0.6,
}) => {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 0.4, size * 0.5, 4]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0.015, (i - 2) * size * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[size * 0.8, 0.02, 0.03]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size * 0.4, 8]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
};

// Electrical panel
export const ElectricalPanel: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  const sparkRef = useRef<THREE.PointLight>(null);
  const sparkState = useRef({ nextSpark: 5 + Math.random() * 30, sparking: false, sparkEnd: 0 });

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (!sparkRef.current) return;
    const time = state.clock.elapsedTime;

    if (time > sparkState.current.nextSpark && !sparkState.current.sparking) {
      sparkState.current.sparking = true;
      sparkState.current.sparkEnd = time + 0.1 + Math.random() * 0.2;
      sparkState.current.nextSpark = time + 20 + Math.random() * 60;
    }

    if (sparkState.current.sparking) {
      if (time < sparkState.current.sparkEnd) {
        sparkRef.current.intensity = Math.random() > 0.5 ? 5 : 0;
      } else {
        sparkState.current.sparking = false;
        sparkRef.current.intensity = 0;
      }
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.8, 0.15]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[0.55, 0.75, 0.02]} />
        <meshStandardMaterial color="#52525b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, 0.1]}>
        <planeGeometry args={[0.3, 0.15]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
      <pointLight
        ref={sparkRef}
        position={[0, -0.2, 0.2]}
        color="#60a5fa"
        intensity={0}
        distance={2}
      />
    </group>
  );
};

// Swinging chain
export const SwingingChain: React.FC<{ position: [number, number, number]; length?: number }> = ({
  position,
  length = 3,
}) => {
  const chainRef = useRef<THREE.Group>(null);
  const swingSpeed = useRef(0.5 + Math.random() * 0.5);
  const swingAmount = useRef(0.05 + Math.random() * 0.1);

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (chainRef.current) {
      chainRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * swingSpeed.current) * swingAmount.current;
      chainRef.current.rotation.x =
        Math.cos(state.clock.elapsedTime * swingSpeed.current * 0.7) * swingAmount.current * 0.5;
    }
  });

  const links = Math.floor(length / 0.15);

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.7} />
      </mesh>
      <group ref={chainRef}>
        {Array.from({ length: links }).map((_, i) => (
          <mesh
            key={i}
            position={[0, -0.1 - i * 0.12, 0]}
            rotation={[0, i % 2 === 0 ? 0 : Math.PI / 2, 0]}
          >
            <torusGeometry args={[0.03, 0.008, 6, 12]} />
            <meshStandardMaterial color="#52525b" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Pressure gauge
export const PressureGauge: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  const needleRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!shouldRunThisFrame(3)) return;
    if (needleRef.current) {
      const pressure = 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      needleRef.current.rotation.z = -Math.PI / 4 + (pressure * Math.PI) / 2;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 16]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      <group position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh ref={needleRef} position={[0.04, 0, 0]}>
          <boxGeometry args={[0.08, 0.01, 0.01]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
};

// Valve wheel
export const ValveWheel: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
}> = ({ position, rotation = [0, 0, 0], size = 0.15 }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <torusGeometry args={[size, size * 0.1, 8, 24]} />
        <meshStandardMaterial color="#ef4444" roughness={0.5} metalness={0.4} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * size * 0.5, Math.cos(angle) * size * 0.5, 0]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[size * 0.15, size, size * 0.1]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

// Loading dock door
export const LoadingDockDoor: React.FC<{
  position: [number, number, number];
  isOpen: boolean;
}> = ({ position, isOpen }) => {
  const doorRef = useRef<THREE.Group>(null);
  const currentOpenRef = useRef(0);
  const warningLightsActiveRef = useRef(false);
  const [warningActive, setWarningActive] = useState(false);
  const targetOpen = isOpen ? 1 : 0;

  const doorHeight = 6;
  const segments = 8;

  useFrame((_, delta) => {
    if (!shouldRunThisFrame(2)) return;
    const speed = 0.5;
    const diff = targetOpen - currentOpenRef.current;
    if (Math.abs(diff) > 0.01) {
      currentOpenRef.current += diff * speed * delta * 10;

      if (doorRef.current) {
        doorRef.current.children.forEach((mesh, i) => {
          const segmentHeight = doorHeight / segments;
          const yOffset = currentOpenRef.current * doorHeight;
          const baseY = (i + 0.5) * segmentHeight;
          const y = Math.min(baseY + yOffset, doorHeight + 0.5);
          mesh.position.y = y;
          mesh.visible = y <= doorHeight + 0.3;
        });
      }

      const shouldBeActive = currentOpenRef.current > 0.1 && currentOpenRef.current < 0.9;
      if (shouldBeActive !== warningLightsActiveRef.current) {
        warningLightsActiveRef.current = shouldBeActive;
        setWarningActive(shouldBeActive);
      }
    }
  });

  useEffect(() => {
    if (audioManager.initialized) {
      if (isOpen) {
        audioManager.playDoorOpen();
      } else {
        audioManager.playDoorClose();
      }
    }
  }, [isOpen]);

  return (
    <group position={position}>
      <mesh position={[0, doorHeight / 2 + 0.1, 0]}>
        <boxGeometry args={[5.4, 0.2, 0.3]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={doorRef}>
        {Array.from({ length: segments }).map((_, i) => {
          const segmentHeight = doorHeight / segments;
          const baseY = (i + 0.5) * segmentHeight;
          return (
            <mesh key={i} position={[0, baseY, 0.05]}>
              <boxGeometry args={[5, segmentHeight - 0.02, 0.1]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#475569' : '#64748b'}
                metalness={0.4}
                roughness={0.6}
              />
            </mesh>
          );
        })}
      </group>
      <WarningLight position={[-2.3, doorHeight + 0.5, 0.2]} isActive={warningActive} />
      <WarningLight position={[2.3, doorHeight + 0.5, 0.2]} isActive={warningActive} />
    </group>
  );
};
