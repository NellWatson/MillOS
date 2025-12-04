/**
 * Shared Materials Module
 *
 * Centralized material definitions to reduce GPU memory usage and GC pressure.
 * Materials are created once and reused across all components.
 *
 * IMPORTANT: These materials should NOT be disposed - they are module-level singletons.
 */
import * as THREE from 'three';

// === METAL MATERIALS ===
export const METAL_MATERIALS = {
  // Standard industrial steel
  steel: new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.8,
    roughness: 0.2,
  }),
  steelDark: new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.7,
    roughness: 0.3,
  }),
  steelLight: new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.8,
    roughness: 0.2,
  }),
  // Polished chrome/aluminum
  chrome: new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    metalness: 0.9,
    roughness: 0.1,
  }),
  // Painted metals
  paintedDarkGray: new THREE.MeshStandardMaterial({
    color: '#1f2937',
    metalness: 0.6,
    roughness: 0.4,
  }),
  paintedSlate: new THREE.MeshStandardMaterial({
    color: '#334155',
    metalness: 0.7,
    roughness: 0.4,
  }),
  paintedMediumGray: new THREE.MeshStandardMaterial({
    color: '#374151',
    metalness: 0.6,
    roughness: 0.4,
  }),
  paintedBlack: new THREE.MeshStandardMaterial({
    color: '#0f172a',
    metalness: 0.4,
    roughness: 0.6,
  }),
  // Accent metals
  brass: new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    metalness: 0.9,
    roughness: 0.1,
  }),
  copper: new THREE.MeshStandardMaterial({
    color: '#d97706',
    metalness: 0.85,
    roughness: 0.15,
  }),
  // Industrial blue (motor housings)
  industrialBlue: new THREE.MeshStandardMaterial({
    color: '#1e3a5f',
    metalness: 0.7,
    roughness: 0.3,
  }),
} as const;

// === RUBBER/BELT MATERIALS ===
export const RUBBER_MATERIALS = {
  conveyorBelt: new THREE.MeshStandardMaterial({
    color: '#1f2937',
    roughness: 0.8,
  }),
  tire: new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.9,
  }),
} as const;

// === SAFETY/ACCENT MATERIALS ===
export const SAFETY_MATERIALS = {
  warningRed: new THREE.MeshStandardMaterial({
    color: '#ef4444',
    metalness: 0.5,
    roughness: 0.5,
  }),
  warningYellow: new THREE.MeshBasicMaterial({
    color: '#fbbf24',
  }),
  safetyGreen: new THREE.MeshStandardMaterial({
    color: '#22c55e',
    metalness: 0.5,
    roughness: 0.5,
  }),
  safetyOrange: new THREE.MeshStandardMaterial({
    color: '#f97316',
    metalness: 0.5,
    roughness: 0.5,
  }),
} as const;

// === PIPE MATERIALS ===
export const PIPE_MATERIALS = {
  darkPipe: new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.85,
    roughness: 0.15,
  }),
  lightPipe: new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.85,
    roughness: 0.15,
  }),
  whitePipe: new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.85,
    roughness: 0.15,
  }),
  supportGray: new THREE.MeshStandardMaterial({
    color: '#374151',
    metalness: 0.8,
    roughness: 0.3,
  }),
  supportSlate: new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.8,
    roughness: 0.3,
  }),
} as const;

// === WORKER/HUMAN MATERIALS ===
export const WORKER_MATERIALS = {
  // Skin tones - indexed by character code for deterministic selection
  skin: [
    new THREE.MeshStandardMaterial({ color: '#f5d0c5', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#8d5524', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#c68642', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#e0ac69', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#ffdbac', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#f1c27d', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#cd8c52', roughness: 0.6 }),
  ],
  // Hair colors
  hair: [
    new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#3d2314', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#8b4513', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#4a3728', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#2d1810', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#654321', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#8b0000', roughness: 0.9 }),
  ],
  // Uniform colors by role
  supervisorUniform: new THREE.MeshStandardMaterial({ color: '#1e40af', roughness: 0.6 }),
  engineerUniform: new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.6 }),
  safetyUniform: new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.6 }),
  qualityUniform: new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.6 }),
  maintenanceUniform: new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.6 }),
  operatorUniform: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 }),
  // Vest
  safetyVest: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.7 }),
  // Pants colors
  darkPants: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 }),
  navyPants: new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.7 }),
} as const;

// === MACHINE-SPECIFIC MATERIALS ===
export const MACHINE_MATERIALS = {
  // Silo materials
  siloBody: new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.7,
    roughness: 0.2,
  }),
  siloRing: new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.7,
    roughness: 0.2,
  }),
  // Mill materials
  millBody: new THREE.MeshStandardMaterial({
    color: '#374151',
    metalness: 0.8,
    roughness: 0.3,
  }),
  millDrum: new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.6,
    roughness: 0.4,
  }),
  // Control panel materials
  panelBody: new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.8,
    roughness: 0.3,
  }),
  panelScreen: new THREE.MeshStandardMaterial({
    color: '#1e3a5f',
    metalness: 0.5,
    roughness: 0.4,
  }),
  // Motor/mechanical materials
  motorBody: new THREE.MeshStandardMaterial({
    color: '#374151',
    metalness: 0.9,
    roughness: 0.2,
  }),
  shaft: new THREE.MeshStandardMaterial({
    color: '#6b7280',
    metalness: 0.9,
    roughness: 0.1,
  }),
  // Conveyor belt roller (for packer)
  rollerMetal: new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.7,
    roughness: 0.2,
  }),
} as const;

// === LOW QUALITY (MeshBasicMaterial) VERSIONS ===
export const BASIC_MATERIALS = {
  steel: new THREE.MeshBasicMaterial({ color: '#64748b' }),
  gray: new THREE.MeshBasicMaterial({ color: '#475569' }),
  darkGray: new THREE.MeshBasicMaterial({ color: '#1f2937' }),
  white: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  black: new THREE.MeshBasicMaterial({ color: '#0f172a' }),
} as const;

// === SHARED GEOMETRIES ===
// Common geometries that can be reused with different materials
export const SHARED_GEOMETRIES = {
  // Roller geometries
  rollerMain: new THREE.CylinderGeometry(0.15, 0.15, 2, 16),
  rollerAxle: new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8),
  rollerEndCap: new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12),

  // Bracket geometries
  bracketSmall: new THREE.BoxGeometry(0.08, 0.25, 0.08),
  bracketLarge: new THREE.BoxGeometry(0.15, 0.15, 0.08),

  // Support leg geometries
  legVertical: new THREE.BoxGeometry(0.2, 0.6, 0.2),
  legFoot: new THREE.BoxGeometry(0.4, 0.04, 0.25),

  // Pipe support geometries
  pipeVerticalSupport: (height: number) => new THREE.CylinderGeometry(0.1, 0.1, height * 2),
  pipeCrossBeam: new THREE.CylinderGeometry(0.08, 0.08, 3),
} as const;

// Helper function to get material for quality level
export const getMaterialForQuality = (
  standardMaterial: THREE.MeshStandardMaterial,
  basicMaterial: THREE.MeshBasicMaterial,
  quality: 'low' | 'medium' | 'high' | 'ultra'
): THREE.Material => {
  return quality === 'low' ? basicMaterial : standardMaterial;
};

// Helper to get skin material by worker ID
export const getSkinMaterial = (workerId: string): THREE.MeshStandardMaterial => {
  const index = workerId.charCodeAt(workerId.length - 1) % WORKER_MATERIALS.skin.length;
  return WORKER_MATERIALS.skin[index];
};

// Helper to get hair material by worker ID
export const getHairMaterial = (workerId: string): THREE.MeshStandardMaterial => {
  const index = workerId.charCodeAt(0) % WORKER_MATERIALS.hair.length;
  return WORKER_MATERIALS.hair[index];
};
