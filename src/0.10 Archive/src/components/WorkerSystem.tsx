import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard, Text } from '@react-three/drei';
import { Briefcase, FlaskConical, HardHat, Shield, User, Wrench as WrenchIcon } from 'lucide-react';
import { WorkerData, WorkerIconType, WORKER_ROSTER } from '../types';
import { positionRegistry } from '../utils/positionRegistry';
import { useMillStore } from '../store';
import { audioManager } from '../utils/audioManager';
import * as THREE from 'three';

interface WorkerSystemProps {
  onSelectWorker: (worker: WorkerData) => void;
}

export const WorkerSystem: React.FC<WorkerSystemProps> = ({ onSelectWorker }) => {
  const workers = useMemo(() => {
    const aisles = [10, -10, 0];
    return WORKER_ROSTER.map((roster, i) => ({
      ...roster,
      position: [
        aisles[i % aisles.length] + (Math.random() - 0.5) * 4,
        0,
        (Math.random() * 40) - 20
      ] as [number, number, number],
      direction: (Math.random() > 0.5 ? 1 : -1) as 1 | -1
    }));
  }, []);

  return (
    <group>
      {workers.map(w => (
        <Worker key={w.id} data={w} onSelect={() => onSelectWorker(w)} />
      ))}
    </group>
  );
};

// Types for customization
type HairStyle = 'bald' | 'short' | 'medium' | 'curly' | 'ponytail';
type ToolType = 'clipboard' | 'tablet' | 'radio' | 'wrench' | 'magnifier' | 'none';

// Worker appearance configuration based on role
const getWorkerAppearance = (role: string, color: string, id: string) => {
  const skinTones = ['#f5d0c5', '#d4a574', '#8d5524', '#c68642', '#e0ac69', '#ffdbac', '#f1c27d', '#cd8c52'];
  const hairColors = ['#1a1a1a', '#3d2314', '#8b4513', '#d4a574', '#4a3728', '#2d1810', '#654321', '#8b0000'];
  const hairStyles: HairStyle[] = ['bald', 'short', 'medium', 'curly', 'ponytail'];
  const skinIndex = id.charCodeAt(id.length - 1) % skinTones.length;
  const hairColorIndex = id.charCodeAt(0) % hairColors.length;
  const hairStyleIndex = (id.charCodeAt(1) || 0) % hairStyles.length;
  const skinTone = skinTones[skinIndex];
  const hairColor = hairColors[hairColorIndex];
  const hairStyle = hairStyles[hairStyleIndex];

  switch (role) {
    case 'Supervisor':
      return { uniformColor: '#1e40af', skinTone, hatColor: '#1e40af', hasVest: false, pantsColor: '#1e293b', hairColor, hairStyle, tool: 'clipboard' as ToolType };
    case 'Engineer':
      return { uniformColor: '#374151', skinTone, hatColor: '#ffffff', hasVest: false, pantsColor: '#1f2937', hairColor, hairStyle, tool: 'tablet' as ToolType };
    case 'Safety Officer':
      return { uniformColor: '#166534', skinTone, hatColor: '#22c55e', hasVest: true, pantsColor: '#14532d', hairColor, hairStyle, tool: 'radio' as ToolType };
    case 'Quality Control':
      return { uniformColor: '#7c3aed', skinTone, hatColor: '#ffffff', hasVest: false, pantsColor: '#1e1b4b', hairColor, hairStyle, tool: 'magnifier' as ToolType };
    case 'Maintenance':
      return { uniformColor: '#9a3412', skinTone, hatColor: '#f97316', hasVest: true, pantsColor: '#431407', hairColor, hairStyle, tool: 'wrench' as ToolType };
    case 'Operator':
    default:
      return { uniformColor: color || '#475569', skinTone, hatColor: '#eab308', hasVest: id.charCodeAt(2) % 2 === 0, pantsColor: '#1e3a5f', hairColor, hairStyle, tool: 'none' as ToolType };
  }
};

// === TOOL ACCESSORY COMPONENTS ===
const Clipboard: React.FC = () => (
  <group position={[0.08, -0.02, 0.04]} rotation={[0.3, 0, 0.1]}>
    <mesh castShadow><boxGeometry args={[0.12, 0.16, 0.015]} /><meshStandardMaterial color="#8b4513" roughness={0.7} /></mesh>
    <mesh position={[0, 0.07, 0.01]}><boxGeometry args={[0.04, 0.02, 0.02]} /><meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, -0.01, 0.01]}><boxGeometry args={[0.1, 0.12, 0.002]} /><meshStandardMaterial color="#ffffff" /></mesh>
    {[-0.03, 0, 0.03].map((y, i) => (<mesh key={i} position={[0, y, 0.012]}><boxGeometry args={[0.07, 0.008, 0.001]} /><meshStandardMaterial color="#333" /></mesh>))}
  </group>
);

const Tablet: React.FC = () => (
  <group position={[0.06, -0.02, 0.04]} rotation={[0.4, 0, 0.15]}>
    <mesh castShadow><boxGeometry args={[0.1, 0.14, 0.01]} /><meshStandardMaterial color="#1a1a1a" roughness={0.3} /></mesh>
    <mesh position={[0, 0, 0.006]}><boxGeometry args={[0.085, 0.12, 0.002]} /><meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.3} /></mesh>
    <mesh position={[0, 0.02, 0.008]}><boxGeometry args={[0.06, 0.002, 0.001]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} /></mesh>
  </group>
);

const RadioWalkieTalkie: React.FC = () => (
  <group position={[0.04, 0, 0.03]} rotation={[0.2, 0.3, 0]}>
    <mesh castShadow><boxGeometry args={[0.04, 0.1, 0.025]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
    <mesh position={[0.01, 0.07, 0]}><cylinderGeometry args={[0.004, 0.003, 0.06, 8]} /><meshStandardMaterial color="#333" /></mesh>
    <mesh position={[0, 0.04, 0.014]}><sphereGeometry args={[0.004, 8, 8]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} /></mesh>
  </group>
);

const Wrench: React.FC = () => (
  <group position={[0.02, -0.04, 0.02]} rotation={[0, 0.5, -0.3]}>
    <mesh castShadow><boxGeometry args={[0.025, 0.14, 0.012]} /><meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} /></mesh>
    <mesh castShadow position={[0, 0.08, 0]}><boxGeometry args={[0.05, 0.03, 0.012]} /><meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} /></mesh>
    <mesh position={[0, -0.03, 0.007]}><boxGeometry args={[0.027, 0.05, 0.004]} /><meshStandardMaterial color="#ef4444" roughness={0.8} /></mesh>
  </group>
);

const Magnifier: React.FC = () => (
  <group position={[0.05, 0, 0.04]} rotation={[0.3, 0.2, 0]}>
    <mesh castShadow><cylinderGeometry args={[0.012, 0.015, 0.08, 12]} /><meshStandardMaterial color="#1a1a1a" roughness={0.5} /></mesh>
    <mesh castShadow position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.035, 0.006, 8, 24]} /><meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} /></mesh>
    <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.032, 24]} /><meshStandardMaterial color="#a0d8ef" transparent opacity={0.4} /></mesh>
  </group>
);

const ToolAccessory: React.FC<{ tool: ToolType }> = ({ tool }) => {
  switch (tool) {
    case 'clipboard': return <Clipboard />;
    case 'tablet': return <Tablet />;
    case 'radio': return <RadioWalkieTalkie />;
    case 'wrench': return <Wrench />;
    case 'magnifier': return <Magnifier />;
    default: return null;
  }
};

// === HAIR COMPONENT ===
const Hair: React.FC<{ style: HairStyle; color: string }> = ({ style, color }) => {
  switch (style) {
    case 'short':
      return (
        <group position={[0, 0.05, -0.02]}>
          <mesh castShadow position={[-0.14, -0.02, 0]}><boxGeometry args={[0.04, 0.08, 0.1]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
          <mesh castShadow position={[0.14, -0.02, 0]}><boxGeometry args={[0.04, 0.08, 0.1]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
          <mesh castShadow position={[0, -0.02, -0.12]}><boxGeometry args={[0.2, 0.1, 0.04]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
        </group>
      );
    case 'medium':
      return (
        <group position={[0, 0.02, 0]}>
          <mesh castShadow position={[-0.15, -0.06, 0]}><boxGeometry args={[0.04, 0.14, 0.12]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
          <mesh castShadow position={[0.15, -0.06, 0]}><boxGeometry args={[0.04, 0.14, 0.12]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
          <mesh castShadow position={[0, -0.04, -0.13]}><boxGeometry args={[0.22, 0.14, 0.04]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
        </group>
      );
    case 'curly':
      return (
        <group position={[0, 0.02, 0]}>
          {[[-0.13, -0.04, 0.02], [0.13, -0.04, 0.02], [-0.12, -0.08, -0.04], [0.12, -0.08, -0.04], [0, -0.06, -0.14]].map((pos, i) => (
            <mesh key={i} castShadow position={pos as [number, number, number]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
          ))}
        </group>
      );
    case 'ponytail':
      return (
        <group position={[0, 0, -0.1]}>
          <mesh castShadow position={[0, -0.1, -0.05]}><capsuleGeometry args={[0.03, 0.12, 6, 12]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
          <mesh position={[0, -0.02, -0.05]}><torusGeometry args={[0.035, 0.008, 8, 16]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        </group>
      );
    case 'bald':
    default:
      return null;
  }
};

// Realistic Human Model Component
const HumanModel: React.FC<{
  walkCycleRef: React.MutableRefObject<number>; // Use ref to avoid re-renders
  uniformColor: string;
  skinTone: string;
  hatColor: string;
  hasVest: boolean;
  pantsColor: string;
  headRotation?: number;
  hairColor: string;
  hairStyle: HairStyle;
  tool: ToolType;
  isWaving?: boolean;
  isIdle?: boolean;
}> = ({ walkCycleRef, uniformColor, skinTone, hatColor, hasVest, pantsColor, headRotation = 0, hairColor, hairStyle, tool, isWaving = false, isIdle = false }) => {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const wavePhaseRef = useRef(0);

  // Animate limbs and head
  useFrame((state, delta) => {
    const walkCycle = walkCycleRef.current; // Read current value from ref
    const isDoingSomething = isIdle && tool !== 'none';
    const armSwing = isIdle ? Math.sin(walkCycle) * 0.05 : Math.sin(walkCycle) * 0.5;
    const legSwing = isIdle ? 0 : Math.sin(walkCycle) * 0.6;

    if (leftArmRef.current) {
      if (isDoingSomething) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.8, 0.05);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.3, 0.05);
      } else {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, armSwing, 0.1);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0, 0.1);
      }
    }
    if (rightArmRef.current) {
      if (isWaving) {
        wavePhaseRef.current += delta * 12;
        const waveAngle = Math.sin(wavePhaseRef.current) * 0.4;
        rightArmRef.current.rotation.x = -2.2;
        rightArmRef.current.rotation.z = -0.8 + waveAngle;
      } else if (isDoingSomething) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.3, 0.05);
      } else {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -armSwing, 0.1);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0, 0.1);
        wavePhaseRef.current = 0;
      }
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, -legSwing, 0.1);
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, legSwing, 0.1);
    }
    if (headRef.current) {
      const targetY = isDoingSomething ? -0.3 : headRotation;
      const targetX = isDoingSomething ? 0.2 : 0;
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetY, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetX, 0.1);
    }
  });

  return (
    <group scale={[0.85, 0.85, 0.85]}>
      {/* === TORSO === */}
      <group position={[0, 1.15, 0]}>
        {/* Upper torso / chest */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[0.48, 0.45, 0.24]} />
          <meshStandardMaterial color={uniformColor} roughness={0.8} />
        </mesh>

        {/* Shoulders - rounded */}
        <mesh castShadow position={[-0.28, 0.32, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={uniformColor} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0.28, 0.32, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={uniformColor} roughness={0.8} />
        </mesh>

        {/* Lower torso / waist */}
        <mesh castShadow position={[0, -0.15, 0]}>
          <boxGeometry args={[0.42, 0.3, 0.22]} />
          <meshStandardMaterial color={uniformColor} roughness={0.8} />
        </mesh>

        {/* Safety vest overlay */}
        {hasVest && (
          <>
            <mesh castShadow position={[0, 0.15, 0.005]}>
              <boxGeometry args={[0.5, 0.52, 0.25]} />
              <meshStandardMaterial color="#f97316" roughness={0.6} />
            </mesh>
            {/* Reflective stripes */}
            <mesh position={[0, 0.32, 0.13]}>
              <boxGeometry args={[0.51, 0.035, 0.01]} />
              <meshStandardMaterial
                color="#e5e5e5"
                emissive="#ffffff"
                emissiveIntensity={0.4}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
            <mesh position={[0, 0.12, 0.13]}>
              <boxGeometry args={[0.51, 0.035, 0.01]} />
              <meshStandardMaterial
                color="#e5e5e5"
                emissive="#ffffff"
                emissiveIntensity={0.4}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
            <mesh position={[0, -0.08, 0.13]}>
              <boxGeometry args={[0.51, 0.035, 0.01]} />
              <meshStandardMaterial
                color="#e5e5e5"
                emissive="#ffffff"
                emissiveIntensity={0.4}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          </>
        )}

        {/* Collar */}
        <mesh castShadow position={[0, 0.48, 0.02]}>
          <boxGeometry args={[0.2, 0.08, 0.15]} />
          <meshStandardMaterial color={uniformColor} roughness={0.7} />
        </mesh>

        {/* Neck */}
        <mesh castShadow position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 16]} />
          <meshStandardMaterial color={skinTone} roughness={0.6} />
        </mesh>

        {/* === HEAD === */}
        <group ref={headRef} position={[0, 0.82, 0]}>
          {/* Head base - slightly elongated sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.17, 32, 32]} />
            <meshStandardMaterial color={skinTone} roughness={0.55} />
          </mesh>

          {/* Jaw / chin area */}
          <mesh castShadow position={[0, -0.08, 0.05]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={skinTone} roughness={0.55} />
          </mesh>

          {/* Nose */}
          <mesh castShadow position={[0, -0.02, 0.155]}>
            <coneGeometry args={[0.025, 0.05, 8]} />
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0, -0.045, 0.16]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </mesh>

          {/* Eyes - whites */}
          <mesh position={[-0.055, 0.025, 0.135]}>
            <sphereGeometry args={[0.028, 16, 16]} />
            <meshStandardMaterial color="#fefefe" roughness={0.2} />
          </mesh>
          <mesh position={[0.055, 0.025, 0.135]}>
            <sphereGeometry args={[0.028, 16, 16]} />
            <meshStandardMaterial color="#fefefe" roughness={0.2} />
          </mesh>

          {/* Irises */}
          <mesh position={[-0.055, 0.025, 0.158]}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#4a3728" roughness={0.3} />
          </mesh>
          <mesh position={[0.055, 0.025, 0.158]}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#4a3728" roughness={0.3} />
          </mesh>

          {/* Pupils */}
          <mesh position={[-0.055, 0.025, 0.168]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.055, 0.025, 0.168]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>

          {/* Eyebrows */}
          <mesh position={[-0.055, 0.07, 0.14]} rotation={[0.15, 0, 0.12]}>
            <boxGeometry args={[0.045, 0.012, 0.015]} />
            <meshStandardMaterial color="#2d1810" roughness={0.9} />
          </mesh>
          <mesh position={[0.055, 0.07, 0.14]} rotation={[0.15, 0, -0.12]}>
            <boxGeometry args={[0.045, 0.012, 0.015]} />
            <meshStandardMaterial color="#2d1810" roughness={0.9} />
          </mesh>

          {/* Mouth */}
          <mesh position={[0, -0.075, 0.14]}>
            <boxGeometry args={[0.06, 0.015, 0.01]} />
            <meshStandardMaterial color="#a0524a" roughness={0.7} />
          </mesh>

          {/* Ears */}
          <mesh castShadow position={[-0.165, 0, 0]} rotation={[0, -0.2, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0.165, 0, 0]} rotation={[0, 0.2, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </mesh>

          {/* Hair (visible under hard hat) */}
          <Hair style={hairStyle} color={hairColor} />

          {/* Hard Hat */}
          <group position={[0, 0.1, 0]}>
            {/* Hat dome */}
            <mesh castShadow>
              <sphereGeometry args={[0.19, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hatColor} metalness={0.35} roughness={0.45} />
            </mesh>
            {/* Hat brim */}
            <mesh castShadow position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.21, 0.21, 0.025, 32]} />
              <meshStandardMaterial color={hatColor} metalness={0.35} roughness={0.45} />
            </mesh>
            {/* Hat ridge */}
            <mesh castShadow position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.015, 0.3, 4, 8]} />
              <meshStandardMaterial color={hatColor} metalness={0.35} roughness={0.45} />
            </mesh>
          </group>
        </group>

        {/* === LEFT ARM === */}
        <group ref={leftArmRef} position={[-0.34, 0.22, 0]}>
          {/* Upper arm */}
          <mesh castShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.055, 0.22, 8, 16]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>
          {/* Elbow */}
          <mesh castShadow position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.045, 0.2, 8, 16]} />
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </mesh>
          {/* Hand */}
          <group position={[0, -0.62, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.06, 0.08, 0.03]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
            {/* Fingers */}
            <mesh castShadow position={[0, -0.055, 0]}>
              <boxGeometry args={[0.055, 0.04, 0.025]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
            {/* Tool accessory */}
            <ToolAccessory tool={tool} />
          </group>
        </group>

        {/* === RIGHT ARM === */}
        <group ref={rightArmRef} position={[0.34, 0.22, 0]}>
          {/* Upper arm */}
          <mesh castShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.055, 0.22, 8, 16]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>
          {/* Elbow */}
          <mesh castShadow position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.045, 0.2, 8, 16]} />
            <meshStandardMaterial color={skinTone} roughness={0.6} />
          </mesh>
          {/* Hand */}
          <group position={[0, -0.62, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.06, 0.08, 0.03]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
            {/* Fingers */}
            <mesh castShadow position={[0, -0.055, 0]}>
              <boxGeometry args={[0.055, 0.04, 0.025]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
          </group>
        </group>
      </group>

      {/* === HIPS / PELVIS === */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[0.38, 0.14, 0.2]} />
        <meshStandardMaterial color={pantsColor} roughness={0.8} />
      </mesh>

      {/* Belt */}
      <mesh castShadow position={[0, 0.78, 0]}>
        <boxGeometry args={[0.4, 0.04, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Belt buckle */}
      <mesh castShadow position={[0, 0.78, 0.115]}>
        <boxGeometry args={[0.05, 0.035, 0.01]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* === LEFT LEG === */}
      <group ref={leftLegRef} position={[-0.1, 0.62, 0]}>
        {/* Upper thigh */}
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.075, 0.28, 8, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Knee */}
        <mesh castShadow position={[0, -0.38, 0.02]}>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Lower leg / shin */}
        <mesh castShadow position={[0, -0.58, 0]}>
          <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Boot */}
        <group position={[0, -0.78, 0.03]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.1, 0.16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
          {/* Boot sole */}
          <mesh castShadow position={[0, -0.05, 0]}>
            <boxGeometry args={[0.11, 0.02, 0.17]} />
            <meshStandardMaterial color="#0d0d0d" roughness={0.9} />
          </mesh>
          {/* Boot toe cap */}
          <mesh castShadow position={[0, -0.02, 0.07]}>
            <boxGeometry args={[0.09, 0.06, 0.04]} />
            <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>
      </group>

      {/* === RIGHT LEG === */}
      <group ref={rightLegRef} position={[0.1, 0.62, 0]}>
        {/* Upper thigh */}
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.075, 0.28, 8, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Knee */}
        <mesh castShadow position={[0, -0.38, 0.02]}>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Lower leg / shin */}
        <mesh castShadow position={[0, -0.58, 0]}>
          <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Boot */}
        <group position={[0, -0.78, 0.03]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.1, 0.16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
          {/* Boot sole */}
          <mesh castShadow position={[0, -0.05, 0]}>
            <boxGeometry args={[0.11, 0.02, 0.17]} />
            <meshStandardMaterial color="#0d0d0d" roughness={0.9} />
          </mesh>
          {/* Boot toe cap */}
          <mesh castShadow position={[0, -0.02, 0.07]}>
            <boxGeometry args={[0.09, 0.06, 0.04]} />
            <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const Worker: React.FC<{ data: WorkerData; onSelect: () => void }> = ({ data, onSelect }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const walkCycleRef = useRef(0); // Changed to ref - no re-render on animation
  const [headRotation, setHeadRotation] = useState(0);
  const [isWaving, setIsWaving] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const directionRef = useRef(data.direction);
  const baseXRef = useRef(data.position[0]);
  const idleTimerRef = useRef(Math.random() * 10 + 5); // 5-15s before first idle
  const idleDurationRef = useRef(0);
  const isEvadingRef = useRef(false);
  const wasEvadingRef = useRef(false);
  const evadeDirectionRef = useRef(0); // -1 for left, 1 for right
  const evadeCooldownRef = useRef(0); // Cooldown after evasion before returning
  const EVADE_COOLDOWN_TIME = 1.5; // Wait 1.5s after forklift passes before returning
  const waveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStepRef = useRef(0); // Track walk cycle phase for footsteps
  const recordWorkerEvasion = useMillStore(state => state.recordWorkerEvasion);

  // Track when evasion starts and ends
  useEffect(() => {
    if (isEvadingRef.current && !wasEvadingRef.current) {
      recordWorkerEvasion();
    }
    // When evasion ends, wave to acknowledge the forklift
    if (!isEvadingRef.current && wasEvadingRef.current) {
      setIsWaving(true);
      // Stop waving after 1.5 seconds
      if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
      waveTimeoutRef.current = setTimeout(() => setIsWaving(false), 1500);
    }
    wasEvadingRef.current = isEvadingRef.current;
  }, [recordWorkerEvasion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
    };
  }, []);

  // Set initial position only once (not via prop to avoid reset on re-render)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      ref.current.position.set(...data.position);
      initializedRef.current = true;
    }
  }, [data.position]);

  // Memoize appearance for consistency
  const appearance = useMemo(
    () => getWorkerAppearance(data.role, data.color, data.id),
    [data.role, data.color, data.id]
  );

  useFrame((state, delta) => {
    if (!ref.current) return;

    const FORKLIFT_DETECTION_RANGE = 8; // How far away to detect forklifts
    const EVADE_DISTANCE = 3; // How far to step aside
    const EVADE_SPEED = 4; // How fast to move sideways

    // Check for nearby forklifts
    const nearestForklift = positionRegistry.getNearestForklift(
      ref.current.position.x,
      ref.current.position.z,
      FORKLIFT_DETECTION_RANGE
    );

    // Calculate head rotation to look at forklift
    if (nearestForklift) {
      const dx = nearestForklift.x - ref.current.position.x;
      const dz = nearestForklift.z - ref.current.position.z;
      // Calculate angle to forklift, relative to worker's body direction
      const angleToForklift = Math.atan2(dx, dz);
      const bodyAngle = directionRef.current > 0 ? 0 : Math.PI;
      let relativeAngle = angleToForklift - bodyAngle;
      // Clamp head rotation to realistic range (-90 to +90 degrees)
      relativeAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, relativeAngle));
      // Only update if angle changed significantly (avoid jitter from tiny fluctuations)
      if (Math.abs(relativeAngle - headRotation) > 0.05) {
        setHeadRotation(relativeAngle);
      }
    } else {
      // Only reset to 0 if not already near 0
      if (Math.abs(headRotation) > 0.05) {
        setHeadRotation(0);
      }
    }

    // Determine if we need to evade
    if (nearestForklift && positionRegistry.isForkliftApproaching(
      ref.current.position.x,
      ref.current.position.z,
      nearestForklift
    )) {
      if (!isEvadingRef.current) {
        // Decide which direction to evade (away from forklift's path)
        // Use cross product to determine which side of the forklift's path we're on
        const toWorkerX = ref.current.position.x - nearestForklift.x;
        const toWorkerZ = ref.current.position.z - nearestForklift.z;
        const crossProduct = (nearestForklift.dirX || 0) * toWorkerZ - (nearestForklift.dirZ || 0) * toWorkerX;
        evadeDirectionRef.current = crossProduct > 0 ? 1 : -1;
        isEvadingRef.current = true;
      }

      // Move sideways to evade
      const targetX = baseXRef.current + (evadeDirectionRef.current * EVADE_DISTANCE);
      const diffX = targetX - ref.current.position.x;
      if (Math.abs(diffX) > 0.1) {
        ref.current.position.x += Math.sign(diffX) * EVADE_SPEED * delta;
      }

      // Slow down forward movement while evading
      walkCycleRef.current += delta * 2;
    } else {
      // Cooldown before clearing evade state and returning to path
      if (isEvadingRef.current) {
        evadeCooldownRef.current = EVADE_COOLDOWN_TIME; // Start cooldown when we stop evading
        isEvadingRef.current = false;
      }

      // Count down the cooldown timer
      if (evadeCooldownRef.current > 0) {
        evadeCooldownRef.current -= delta;
      }

      // Only return to original path after cooldown expires
      if (evadeCooldownRef.current <= 0) {
        const diffX = baseXRef.current - ref.current.position.x;
        if (Math.abs(diffX) > 0.1) {
          ref.current.position.x += Math.sign(diffX) * EVADE_SPEED * 0.5 * delta;
        }
      }

      // Idle behavior management
      if (isIdle) {
        idleDurationRef.current -= delta;
        if (idleDurationRef.current <= 0) {
          setIsIdle(false);
          idleTimerRef.current = Math.random() * 12 + 8; // 8-20s until next idle
        }
        // Slow breathing animation while idle
        walkCycleRef.current += delta * 0.5;
      } else {
        idleTimerRef.current -= delta;
        if (idleTimerRef.current <= 0) {
          setIsIdle(true);
          idleDurationRef.current = Math.random() * 4 + 2; // Idle for 2-6s
        }
        // Normal walking animation
        walkCycleRef.current += delta * 5.5;
      }
    }

    // Move worker (skip movement when idle)
    const bobHeight = isIdle ? 0 : Math.abs(Math.sin(walkCycleRef.current)) * 0.025;
    if (!isIdle) {
      ref.current.position.z += data.speed * delta * directionRef.current;

      // Trigger footstep sounds at each step (when sin crosses 0)
      const currentStep = Math.floor(walkCycleRef.current / Math.PI);
      if (currentStep !== lastStepRef.current) {
        lastStepRef.current = currentStep;
        audioManager.playFootstep(data.id);
      }
    }
    ref.current.position.y = bobHeight;
    ref.current.rotation.y = directionRef.current > 0 ? 0 : Math.PI;

    // Register position for collision avoidance
    positionRegistry.register(data.id, ref.current.position.x, ref.current.position.z, 'worker');

    // Turn around at boundaries
    if (ref.current.position.z > 25 || ref.current.position.z < -25) {
      directionRef.current *= -1;
    }
  });

  const getRoleIcon = () => {
    const iconClass = "w-6 h-6";
    switch (data.role) {
      case 'Supervisor': return <Briefcase className={iconClass} />;
      case 'Engineer': return <WrenchIcon className={iconClass} />;
      case 'Operator': return <HardHat className={iconClass} />;
      case 'Safety Officer': return <Shield className={iconClass} />;
      case 'Quality Control': return <FlaskConical className={iconClass} />;
      case 'Maintenance': return <WrenchIcon className={iconClass} />;
      default: return <User className={iconClass} />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'working': return '#22c55e';
      case 'responding': return '#f59e0b';
      case 'break': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  return (
    <group
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); audioManager.playClick(); onSelect(); }}
    >
      {/* Human Model */}
      <HumanModel
        walkCycleRef={walkCycleRef}
        uniformColor={appearance.uniformColor}
        skinTone={appearance.skinTone}
        hatColor={appearance.hatColor}
        hasVest={appearance.hasVest}
        pantsColor={appearance.pantsColor}
        headRotation={headRotation}
        hairColor={appearance.hairColor}
        hairStyle={appearance.hairStyle}
        tool={appearance.tool}
        isWaving={isWaving}
        isIdle={isIdle}
      />

      {/* Status indicator above head */}
      <group position={[0, 2.15, 0]}>
        <mesh>
          <sphereGeometry args={[0.055]} />
          <meshStandardMaterial
            color={getStatusColor()}
            emissive={getStatusColor()}
            emissiveIntensity={2.5}
            toneMapped={false}
          />
        </mesh>
        {/* Pulsing ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.07, 0.085, 20]} />
          <meshStandardMaterial
            color={getStatusColor()}
            emissive={getStatusColor()}
            emissiveIntensity={1.5}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Floating name tag when hovered */}
      {hovered && (
        <Html position={[0, 2.6, 0]} center distanceFactor={12}>
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-500/50 px-4 py-3 rounded-xl shadow-2xl pointer-events-none min-w-[220px]">
            <div className="flex items-center gap-3 mb-2">
              {getRoleIcon()}
              <div>
                <div className="font-bold text-white text-sm">{data.name}</div>
                <div className="text-xs text-blue-400">{data.role}</div>
              </div>
            </div>
            <div className="text-xs text-slate-400 border-t border-slate-700/50 pt-2 mt-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: getStatusColor() }}
                />
                <span className="text-slate-300">{data.currentTask}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Click for details
            </div>
          </div>
        </Html>
      )}

      {/* Always visible name badge */}
      <Billboard position={[0, 2.4, 0]}>
        <Text
          fontSize={0.14}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#000000"
        >
          {data.name.split(' ')[0]}
        </Text>
      </Billboard>

      {/* ID badge on chest */}
      <group position={[0.12, 1.28, 0.125]} rotation={[0, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.09, 0.06]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.012, 0.001]}>
          <planeGeometry args={[0.07, 0.015]} />
          <meshStandardMaterial color="#1e40af" />
        </mesh>
        <mesh position={[0, -0.012, 0.001]}>
          <planeGeometry args={[0.06, 0.008]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
    </group>
  );
};
