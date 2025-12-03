import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard, Text } from '@react-three/drei';
import { WorkerData, WORKER_ROSTER } from '../types';
import { positionRegistry } from '../utils/positionRegistry';
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

// Worker appearance configuration based on role
const getWorkerAppearance = (role: string, color: string, id: string) => {
  // Use worker ID to create consistent skin tone per worker
  const skinTones = ['#f5d0c5', '#d4a574', '#8d5524', '#c68642', '#e0ac69', '#ffdbac', '#f1c27d', '#cd8c52'];
  const skinIndex = id.charCodeAt(id.length - 1) % skinTones.length;
  const skinTone = skinTones[skinIndex];

  switch (role) {
    case 'Supervisor':
      return {
        uniformColor: '#1e40af',
        skinTone,
        hatColor: '#1e40af',
        hasVest: false,
        pantsColor: '#1e293b'
      };
    case 'Engineer':
      return {
        uniformColor: '#374151',
        skinTone,
        hatColor: '#ffffff',
        hasVest: false,
        pantsColor: '#1f2937'
      };
    case 'Safety Officer':
      return {
        uniformColor: '#166534',
        skinTone,
        hatColor: '#22c55e',
        hasVest: true,
        pantsColor: '#14532d'
      };
    case 'Quality Control':
      return {
        uniformColor: '#7c3aed',
        skinTone,
        hatColor: '#ffffff',
        hasVest: false,
        pantsColor: '#1e1b4b'
      };
    case 'Maintenance':
      return {
        uniformColor: '#9a3412',
        skinTone,
        hatColor: '#f97316',
        hasVest: true,
        pantsColor: '#431407'
      };
    case 'Operator':
    default:
      return {
        uniformColor: color || '#475569',
        skinTone,
        hatColor: '#eab308',
        hasVest: Math.random() > 0.5,
        pantsColor: '#1e3a5f'
      };
  }
};

// Realistic Human Model Component
const HumanModel: React.FC<{
  walkCycle: number;
  uniformColor: string;
  skinTone: string;
  hatColor: string;
  hasVest: boolean;
  pantsColor: string;
}> = ({ walkCycle, uniformColor, skinTone, hatColor, hasVest, pantsColor }) => {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  // Animate limbs
  useFrame(() => {
    const armSwing = Math.sin(walkCycle) * 0.5;
    const legSwing = Math.sin(walkCycle) * 0.6;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = armSwing;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -armSwing;
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = -legSwing;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = legSwing;
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
        <group position={[0, 0.82, 0]}>
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
  const [walkCycle, setWalkCycle] = useState(0);
  const directionRef = useRef(data.direction);
  const baseXRef = useRef(data.position[0]); // Remember original X position
  const isEvadingRef = useRef(false);
  const evadeDirectionRef = useRef(0); // -1 for left, 1 for right

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
      setWalkCycle(prev => prev + delta * 2);
    } else {
      isEvadingRef.current = false;

      // Return to original path when safe
      const diffX = baseXRef.current - ref.current.position.x;
      if (Math.abs(diffX) > 0.1) {
        ref.current.position.x += Math.sign(diffX) * EVADE_SPEED * 0.5 * delta;
      }

      // Normal walking animation
      setWalkCycle(prev => prev + delta * 5.5);
    }

    // Move worker with natural bobbing motion
    const bobHeight = Math.abs(Math.sin(walkCycle)) * 0.025;
    ref.current.position.z += data.speed * delta * directionRef.current;
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
    switch (data.role) {
      case 'Supervisor': return '👨‍💼';
      case 'Engineer': return '👩‍🔧';
      case 'Operator': return '👷';
      case 'Safety Officer': return '🦺';
      case 'Quality Control': return '👩‍🔬';
      case 'Maintenance': return '🔧';
      default: return '👤';
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
      position={new THREE.Vector3(...data.position)}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Human Model */}
      <HumanModel
        walkCycle={walkCycle}
        uniformColor={appearance.uniformColor}
        skinTone={appearance.skinTone}
        hatColor={appearance.hatColor}
        hasVest={appearance.hasVest}
        pantsColor={appearance.pantsColor}
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
              <span className="text-2xl">{getRoleIcon()}</span>
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
