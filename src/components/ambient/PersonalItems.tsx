import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shouldRunThisFrame } from '../../utils/frameThrottle';

interface PersonalCoffeeMugProps {
  position: [number, number, number];
  name?: string;
  color?: string;
}

export const PersonalCoffeeMug: React.FC<PersonalCoffeeMugProps> = ({
  position,
  color = '#3b82f6',
}) => {
  const steamRef = useRef<THREE.Points>(null);

  // Steam particles rising from coffee
  const steamGeometry = useMemo(() => {
    const vertices: number[] = [];
    for (let i = 0; i < 20; i++) {
      vertices.push(
        (Math.random() - 0.5) * 0.03,
        Math.random() * 0.08,
        (Math.random() - 0.5) * 0.03
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!shouldRunThisFrame(2)) return;
    if (steamRef.current) {
      const positions = steamRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i);
        y += 0.001;
        if (y > 0.08) y = 0;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      const material = steamRef.current.material as THREE.PointsMaterial;
      if (material) {
        material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  return (
    <group position={position}>
      {/* Mug body */}
      <mesh>
        <cylinderGeometry args={[0.04, 0.045, 0.09, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Handle */}
      <mesh position={[0.045, -0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.025, 0.008, 8, 12, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>

      {/* Coffee surface */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.038, 16]} />
        <meshStandardMaterial color="#3e2723" roughness={0.2} metalness={0.3} />
      </mesh>

      {/* Steam particles */}
      <points ref={steamRef} position={[0, 0.05, 0]} geometry={steamGeometry}>
        <pointsMaterial color="#e0e7ff" size={0.008} transparent opacity={0.2} />
      </points>
    </group>
  );
};

interface FamilyPhotoProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const FamilyPhoto: React.FC<FamilyPhotoProps> = ({ position, rotation = [0, 0, 0] }) => {
  const photoTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    // Photo background (outdoor scene)
    const gradient = ctx.createLinearGradient(0, 0, 0, 96);
    gradient.addColorStop(0, '#60a5fa');
    gradient.addColorStop(0.5, '#93c5fd');
    gradient.addColorStop(1, '#86efac');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 96);

    // Simple family silhouettes
    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 3; i++) {
      const x = 25 + i * 30;
      const height = i === 1 ? 25 : 20; // Taller for adult
      ctx.beginPath();
      ctx.arc(x, 55 - height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 10, 55, 20, height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[0.14, 0.11, 0.01]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Photo */}
      <mesh>
        <planeGeometry args={[0.12, 0.09]} />
        <meshStandardMaterial map={photoTexture} />
      </mesh>

      {/* Stand */}
      <mesh position={[0, -0.07, -0.015]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.01]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
    </group>
  );
};

interface PersonalToolboxProps {
  position: [number, number, number];
  workerName?: string;
}

export const PersonalToolbox: React.FC<PersonalToolboxProps> = ({
  position,
}) => {
  return (
    <group position={position}>
      {/* Toolbox base */}
      <mesh>
        <boxGeometry args={[0.4, 0.15, 0.2]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Name stencil (simulated with darker rectangle) */}
      <mesh position={[0, 0.08, 0.101]}>
        <planeGeometry args={[0.25, 0.04]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
      </mesh>

      {/* Lid */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.2]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Handle */}
      <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.06, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Latch */}
      <mesh position={[0, 0.04, 0.11]}>
        <boxGeometry args={[0.04, 0.02, 0.02]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

interface LunchBoxProps {
  position: [number, number, number];
  color?: string;
}

export const LunchBox: React.FC<LunchBoxProps> = ({ position, color = '#22c55e' }) => {
  return (
    <group position={position}>
      {/* Box body */}
      <mesh>
        <boxGeometry args={[0.25, 0.15, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Lid */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.25, 0.02, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Handle */}
      <mesh position={[0, 0.13, 0]}>
        <torusGeometry args={[0.06, 0.008, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Latch */}
      <mesh position={[0, 0.03, 0.09]}>
        <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
        <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};

interface RadioProps {
  position: [number, number, number];
}

export const Radio: React.FC<RadioProps> = ({ position }) => {
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!shouldRunThisFrame(4)) return;
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Radio body */}
      <mesh>
        <boxGeometry args={[0.2, 0.12, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Speaker grille */}
      <mesh position={[-0.05, 0, 0.041]}>
        <planeGeometry args={[0.08, 0.08]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0.08, 0.1, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.002, 0.002, 0.15, 6]} />
        <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Power LED */}
      <mesh ref={ledRef} position={[0.05, 0.04, 0.041]}>
        <circleGeometry args={[0.005, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>

      {/* Control knobs */}
      <mesh position={[0.05, -0.03, 0.041]}>
        <cylinderGeometry args={[0.01, 0.01, 0.01, 12]} />
        <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0.08, -0.03, 0.041]}>
        <cylinderGeometry args={[0.01, 0.01, 0.01, 12]} />
        <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
};

// Convenience component to scatter personal items
interface PersonalItemsGroupProps {
  breakRoomPosition?: [number, number, number];
  workstationPositions?: [number, number, number][];
}

export const PersonalItemsGroup: React.FC<PersonalItemsGroupProps> = ({
  breakRoomPosition = [-25, 0, 0],
  workstationPositions,
}) => {
  const defaultWorkstations = useMemo(
    () => [
      [-20, 1.2, -8] as [number, number, number],
      [-15, 1.2, -8] as [number, number, number],
      [15, 1.2, -8] as [number, number, number],
      [20, 1.2, -8] as [number, number, number],
    ],
    []
  );

  const workstations = workstationPositions ?? defaultWorkstations;

  return (
    <group>
      {/* Break room items */}
      <group position={breakRoomPosition}>
        <Radio position={[2, 1.5, 0]} />
        <LunchBox position={[1, 0.8, 0.5]} color="#3b82f6" />
        <LunchBox position={[1.3, 0.8, 0.5]} color="#22c55e" />
        <LunchBox position={[0.7, 0.8, 0.5]} color="#eab308" />
      </group>

      {/* Workstation items */}
      {workstations.map((pos, i) => (
        <group key={i}>
          <PersonalCoffeeMug
            position={pos}
            color={['#3b82f6', '#dc2626', '#22c55e', '#a855f7'][i % 4]}
          />
          <FamilyPhoto
            position={[pos[0] + 0.3, pos[1] - 0.2, pos[2]] as [number, number, number]}
          />
        </group>
      ))}

      {/* Maintenance area - personal toolboxes */}
      <PersonalToolbox position={[22, 0.08, -5]} workerName="D. KIM" />
      <PersonalToolbox position={[22.5, 0.08, -5]} workerName="S. MITCHELL" />
    </group>
  );
};
