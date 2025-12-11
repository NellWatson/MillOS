/**
 * DetailedWorker - High LOD Worker Model
 *
 * Static geometry component for close-up rendering (~50 meshes).
 * Receives refs from parent for animation manager to manipulate.
 * NO useFrame - animations handled by WorkerAnimationManager.
 */

import React from 'react';
import { WorkerAppearance, WorkerPoseRefs, HairStyle, ToolType } from './workerTypes';
import { TOOL_GEOMETRIES } from './sharedGeometries';

// === TOOL ACCESSORIES ===
const Clipboard: React.FC = React.memo(() => (
  <group position={[0.08, -0.02, 0.04]} rotation={[0.3, 0, 0.1]}>
    <mesh geometry={TOOL_GEOMETRIES.clipboard.board}>
      <meshStandardMaterial color="#8b4513" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.07, 0.01]} geometry={TOOL_GEOMETRIES.clipboard.clip}>
      <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, -0.01, 0.01]} geometry={TOOL_GEOMETRIES.clipboard.paper}>
      <meshStandardMaterial color="#ffffff" />
    </mesh>
    {[-0.03, 0, 0.03].map((y, i) => (
      <mesh key={i} position={[0, y, 0.012]} geometry={TOOL_GEOMETRIES.clipboard.line}>
        <meshStandardMaterial color="#333" />
      </mesh>
    ))}
  </group>
));
Clipboard.displayName = 'Clipboard';

const Tablet: React.FC = React.memo(() => (
  <group position={[0.06, -0.02, 0.04]} rotation={[0.4, 0, 0.15]}>
    <mesh geometry={TOOL_GEOMETRIES.tablet.body}>
      <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
    </mesh>
    <mesh position={[0, 0, 0.006]} geometry={TOOL_GEOMETRIES.tablet.screen}>
      <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.3} />
    </mesh>
    <mesh position={[0, 0.02, 0.008]} geometry={TOOL_GEOMETRIES.tablet.indicator}>
      <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
    </mesh>
  </group>
));
Tablet.displayName = 'Tablet';

const RadioWalkieTalkie: React.FC = React.memo(() => (
  <group position={[0.04, 0, 0.03]} rotation={[0.2, 0.3, 0]}>
    <mesh geometry={TOOL_GEOMETRIES.radio.body}>
      <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
    </mesh>
    <mesh position={[0.01, 0.07, 0]} geometry={TOOL_GEOMETRIES.radio.antenna}>
      <meshStandardMaterial color="#333" />
    </mesh>
    <mesh position={[0, 0.04, 0.014]} geometry={TOOL_GEOMETRIES.radio.led}>
      <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
    </mesh>
  </group>
));
RadioWalkieTalkie.displayName = 'RadioWalkieTalkie';

const Wrench: React.FC = React.memo(() => (
  <group position={[0.02, -0.04, 0.02]} rotation={[0, 0.5, -0.3]}>
    <mesh geometry={TOOL_GEOMETRIES.wrench.handle}>
      <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.08, 0]} geometry={TOOL_GEOMETRIES.wrench.head}>
      <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} />
    </mesh>
    <mesh position={[0, -0.03, 0.007]} geometry={TOOL_GEOMETRIES.wrench.grip}>
      <meshStandardMaterial color="#ef4444" roughness={0.8} />
    </mesh>
  </group>
));
Wrench.displayName = 'Wrench';

const Magnifier: React.FC = React.memo(() => (
  <group position={[0.05, 0, 0.04]} rotation={[0.3, 0.2, 0]}>
    <mesh geometry={TOOL_GEOMETRIES.magnifier.handle}>
      <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
    </mesh>
    <mesh
      position={[0, 0.06, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      geometry={TOOL_GEOMETRIES.magnifier.ring}
    >
      <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh
      position={[0, 0.06, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      geometry={TOOL_GEOMETRIES.magnifier.lens}
    >
      <meshStandardMaterial color="#a0d8ef" transparent opacity={0.4} />
    </mesh>
  </group>
));
Magnifier.displayName = 'Magnifier';

const ToolAccessory: React.FC<{ tool: ToolType }> = React.memo(({ tool }) => {
  switch (tool) {
    case 'clipboard':
      return <Clipboard />;
    case 'tablet':
      return <Tablet />;
    case 'radio':
      return <RadioWalkieTalkie />;
    case 'wrench':
      return <Wrench />;
    case 'magnifier':
      return <Magnifier />;
    default:
      return null;
  }
});
ToolAccessory.displayName = 'ToolAccessory';

// === HAIR COMPONENT ===
const Hair: React.FC<{ style: HairStyle; color: string }> = React.memo(({ style, color }) => {
  switch (style) {
    case 'short':
      return (
        <group position={[0, 0.05, -0.02]}>
          <mesh castShadow position={[-0.14, -0.02, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.1]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0.14, -0.02, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.1]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, -0.02, -0.12]}>
            <boxGeometry args={[0.2, 0.1, 0.04]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        </group>
      );
    case 'medium':
      return (
        <group position={[0, 0.02, 0]}>
          <mesh castShadow position={[-0.15, -0.06, 0]}>
            <boxGeometry args={[0.04, 0.14, 0.12]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0.15, -0.06, 0]}>
            <boxGeometry args={[0.04, 0.14, 0.12]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, -0.04, -0.13]}>
            <boxGeometry args={[0.22, 0.14, 0.04]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        </group>
      );
    case 'curly':
      return (
        <group position={[0, 0.02, 0]}>
          {[
            [-0.13, -0.04, 0.02],
            [0.13, -0.04, 0.02],
            [-0.12, -0.08, -0.04],
            [0.12, -0.08, -0.04],
            [0, -0.06, -0.14],
          ].map((pos, i) => (
            <mesh key={i} castShadow position={pos as [number, number, number]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color={color} roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case 'ponytail':
      return (
        <group position={[0, 0, -0.1]}>
          <mesh castShadow position={[0, -0.1, -0.05]}>
            <capsuleGeometry args={[0.03, 0.12, 6, 12]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.02, -0.05]}>
            <torusGeometry args={[0.035, 0.008, 8, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      );
    case 'bald':
    default:
      return null;
  }
});
Hair.displayName = 'Hair';

// === MAIN COMPONENT ===
export interface DetailedWorkerProps {
  appearance: WorkerAppearance;
  poseRefs: WorkerPoseRefs;
}

/**
 * DetailedWorker - High-fidelity worker model
 * Pure geometry rendering, no animations (handled by manager)
 */
export const DetailedWorker: React.FC<DetailedWorkerProps> = React.memo(
  ({ appearance, poseRefs }) => {
    const { uniformColor, skinTone, hatColor, hasVest, pantsColor, hairColor, hairStyle, tool } =
      appearance;

    return (
      <group scale={[0.85, 0.85, 0.85]} position={[0, 0.32, 0]}>
        {/* === TORSO === */}
        <group ref={poseRefs.torso} position={[0, 1.15, 0]}>
          {/* Upper torso / chest */}
          <mesh ref={poseRefs.chest} castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[0.48, 0.45, 0.24]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>

          {/* Shoulders */}
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
              {[0.32, 0.12, -0.08].map((y, i) => (
                <mesh key={i} position={[0, y, 0.13]}>
                  <boxGeometry args={[0.51, 0.035, 0.01]} />
                  <meshStandardMaterial
                    color="#e5e5e5"
                    emissive="#ffffff"
                    emissiveIntensity={0.4}
                    metalness={0.9}
                    roughness={0.1}
                  />
                </mesh>
              ))}
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
          <group ref={poseRefs.head} position={[0, 0.82, 0]}>
            {/* Head base */}
            <mesh castShadow>
              <sphereGeometry args={[0.17, 32, 32]} />
              <meshStandardMaterial color={skinTone} roughness={0.55} />
            </mesh>

            {/* Jaw */}
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

            {/* Eyelids (for blinking) */}
            <mesh ref={poseRefs.leftEyelid} position={[-0.055, 0.045, 0.155]}>
              <boxGeometry args={[0.04, 0.025, 0.02]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
            <mesh ref={poseRefs.rightEyelid} position={[0.055, 0.045, 0.155]}>
              <boxGeometry args={[0.04, 0.025, 0.02]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
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

            {/* Hair */}
            <Hair style={hairStyle} color={hairColor} />

            {/* Hard Hat */}
            <group position={[0, 0.1, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.19, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={hatColor} metalness={0.35} roughness={0.45} />
              </mesh>
              <mesh castShadow position={[0, -0.02, 0]}>
                <cylinderGeometry args={[0.21, 0.21, 0.025, 32]} />
                <meshStandardMaterial color={hatColor} metalness={0.35} roughness={0.45} />
              </mesh>
              <mesh castShadow position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.015, 0.3, 4, 8]} />
                <meshStandardMaterial color={hatColor} metalness={0.35} roughness={0.45} />
              </mesh>
            </group>
          </group>

          {/* === LEFT ARM === */}
          <group ref={poseRefs.leftArm} position={[-0.34, 0.22, 0]}>
            <mesh castShadow position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.055, 0.22, 8, 16]} />
              <meshStandardMaterial color={uniformColor} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, -0.3, 0]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={uniformColor} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, -0.45, 0]}>
              <capsuleGeometry args={[0.045, 0.2, 8, 16]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
            <group position={[0, -0.62, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.06, 0.08, 0.03]} />
                <meshStandardMaterial color={skinTone} roughness={0.6} />
              </mesh>
              <mesh ref={poseRefs.leftFingers} castShadow position={[0, -0.055, 0]}>
                <boxGeometry args={[0.055, 0.04, 0.025]} />
                <meshStandardMaterial color={skinTone} roughness={0.6} />
              </mesh>
              <ToolAccessory tool={tool} />
            </group>
          </group>

          {/* === RIGHT ARM === */}
          <group ref={poseRefs.rightArm} position={[0.34, 0.22, 0]}>
            <mesh castShadow position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.055, 0.22, 8, 16]} />
              <meshStandardMaterial color={uniformColor} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, -0.3, 0]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={uniformColor} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, -0.45, 0]}>
              <capsuleGeometry args={[0.045, 0.2, 8, 16]} />
              <meshStandardMaterial color={skinTone} roughness={0.6} />
            </mesh>
            <group position={[0, -0.62, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.06, 0.08, 0.03]} />
                <meshStandardMaterial color={skinTone} roughness={0.6} />
              </mesh>
              <mesh ref={poseRefs.rightFingers} castShadow position={[0, -0.055, 0]}>
                <boxGeometry args={[0.055, 0.04, 0.025]} />
                <meshStandardMaterial color={skinTone} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>

        {/* === HIPS / PELVIS === */}
        <mesh ref={poseRefs.hips} castShadow position={[0, 0.72, 0]}>
          <boxGeometry args={[0.38, 0.14, 0.2]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>

        {/* Belt */}
        <mesh castShadow position={[0, 0.78, 0]}>
          <boxGeometry args={[0.4, 0.04, 0.22]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh castShadow position={[0, 0.78, 0.115]}>
          <boxGeometry args={[0.05, 0.035, 0.01]} />
          <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* === LEFT LEG === */}
        <group ref={poseRefs.leftLeg} position={[-0.1, 0.62, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.075, 0.28, 8, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.38, 0.02]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.58, 0]}>
            <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <group position={[0, -0.78, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.1, 0.16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
            </mesh>
            <mesh castShadow position={[0, -0.05, 0]}>
              <boxGeometry args={[0.11, 0.02, 0.17]} />
              <meshStandardMaterial color="#0d0d0d" roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0, -0.02, 0.07]}>
              <boxGeometry args={[0.09, 0.06, 0.04]} />
              <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.2} />
            </mesh>
          </group>
        </group>

        {/* === RIGHT LEG === */}
        <group ref={poseRefs.rightLeg} position={[0.1, 0.62, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.075, 0.28, 8, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.38, 0.02]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.58, 0]}>
            <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <group position={[0, -0.78, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.1, 0.16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
            </mesh>
            <mesh castShadow position={[0, -0.05, 0]}>
              <boxGeometry args={[0.11, 0.02, 0.17]} />
              <meshStandardMaterial color="#0d0d0d" roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0, -0.02, 0.07]}>
              <boxGeometry args={[0.09, 0.06, 0.04]} />
              <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.2} />
            </mesh>
          </group>
        </group>
      </group>
    );
  }
);

DetailedWorker.displayName = 'DetailedWorker';
