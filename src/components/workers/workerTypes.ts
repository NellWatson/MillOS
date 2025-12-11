/**
 * Worker Model Types
 * Shared types for worker appearance and refs
 */

import * as THREE from 'three';

// Hair style options
export type HairStyle = 'bald' | 'short' | 'medium' | 'curly' | 'ponytail';

// Tool types workers can hold
export type ToolType = 'clipboard' | 'tablet' | 'radio' | 'wrench' | 'magnifier' | 'none';

// Worker appearance configuration
export interface WorkerAppearance {
  uniformColor: string;
  skinTone: string;
  hatColor: string;
  hasVest: boolean;
  pantsColor: string;
  hairColor: string;
  hairStyle: HairStyle;
  tool: ToolType;
}

// Refs for animatable body parts (passed to DetailedWorker)
// Allow null since refs start as null before mounting
export interface WorkerPoseRefs {
  torso: React.RefObject<THREE.Group | null>;
  head: React.RefObject<THREE.Group | null>;
  leftArm: React.RefObject<THREE.Group | null>;
  rightArm: React.RefObject<THREE.Group | null>;
  leftLeg: React.RefObject<THREE.Group | null>;
  rightLeg: React.RefObject<THREE.Group | null>;
  hips: React.RefObject<THREE.Mesh | null>;
  chest: React.RefObject<THREE.Mesh | null>;
  leftEyelid: React.RefObject<THREE.Mesh | null>;
  rightEyelid: React.RefObject<THREE.Mesh | null>;
  leftFingers: React.RefObject<THREE.Mesh | null>;
  rightFingers: React.RefObject<THREE.Mesh | null>;
}

// Simplified refs for medium LOD
export interface SimplifiedPoseRefs {
  leftArm: React.RefObject<THREE.Group | null>;
  rightArm: React.RefObject<THREE.Group | null>;
  leftLeg: React.RefObject<THREE.Group | null>;
  rightLeg: React.RefObject<THREE.Group | null>;
}

// Skin tone options for variety
export const SKIN_TONES = [
  '#f5d0c5',
  '#d4a574',
  '#8d5524',
  '#c68642',
  '#e0ac69',
  '#ffdbac',
  '#f1c27d',
  '#cd8c52',
];

// Hair color options
export const HAIR_COLORS = [
  '#1a1a1a',
  '#3d2314',
  '#8b4513',
  '#d4a574',
  '#4a3728',
  '#2d1810',
  '#654321',
  '#8b0000',
];

// Hair styles
export const HAIR_STYLES: HairStyle[] = ['bald', 'short', 'medium', 'curly', 'ponytail'];

/**
 * Get worker appearance based on role and ID (for deterministic variety)
 */
export function getWorkerAppearance(role: string, color: string, id: string): WorkerAppearance {
  // Use ID characters for deterministic randomization
  const skinIndex = id.charCodeAt(id.length - 1) % SKIN_TONES.length;
  const hairColorIndex = id.charCodeAt(0) % HAIR_COLORS.length;
  const hairStyleIndex = (id.charCodeAt(1) || 0) % HAIR_STYLES.length;

  const skinTone = SKIN_TONES[skinIndex];
  const hairColor = HAIR_COLORS[hairColorIndex];
  const hairStyle = HAIR_STYLES[hairStyleIndex];

  switch (role) {
    case 'Supervisor':
      return {
        uniformColor: '#1e40af',
        skinTone,
        hatColor: '#1e40af',
        hasVest: false,
        pantsColor: '#1e293b',
        hairColor,
        hairStyle,
        tool: 'clipboard',
      };
    case 'Engineer':
      return {
        uniformColor: '#374151',
        skinTone,
        hatColor: '#ffffff',
        hasVest: false,
        pantsColor: '#1f2937',
        hairColor,
        hairStyle,
        tool: 'tablet',
      };
    case 'Safety Officer':
      return {
        uniformColor: '#166534',
        skinTone,
        hatColor: '#22c55e',
        hasVest: true,
        pantsColor: '#14532d',
        hairColor,
        hairStyle,
        tool: 'radio',
      };
    case 'Quality Control':
      return {
        uniformColor: '#7c3aed',
        skinTone,
        hatColor: '#ffffff',
        hasVest: false,
        pantsColor: '#1e1b4b',
        hairColor,
        hairStyle,
        tool: 'magnifier',
      };
    case 'Maintenance':
      return {
        uniformColor: '#9a3412',
        skinTone,
        hatColor: '#f97316',
        hasVest: true,
        pantsColor: '#431407',
        hairColor,
        hairStyle,
        tool: 'wrench',
      };
    case 'Operator':
    default:
      return {
        uniformColor: color || '#475569',
        skinTone,
        hatColor: '#eab308',
        hasVest: id.charCodeAt(2) % 2 === 0,
        pantsColor: '#1e3a5f',
        hairColor,
        hairStyle,
        tool: 'none',
      };
  }
}
