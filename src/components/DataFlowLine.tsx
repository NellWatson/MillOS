/**
 * DataFlowLine Component
 *
 * Animated data flow lines between connected machines.
 * Shows material/data flow with animated dashed lines.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../utils/digitalTwinPalette';
import { useMaterialFlowStore } from '../stores/materialFlowStore';

interface DataFlowLineProps {
  start: [number, number, number];
  end: [number, number, number];
  /** Whether flow is active */
  active?: boolean;
  /** Custom flow color */
  color?: string;
  /** Number of dashes in the line */
  segments?: number;
}

/** Tube radius in world units. A `THREE.Line` was one DEVICE pixel wide at any
 *  distance, so at the 0.5-0.65 resolution scale these tiers render at it
 *  upscaled into a crawling two-pixel stipple. */
const FLOW_TUBE_RADIUS = 0.045;
const FLOW_TUBE_RADIAL_SEGMENTS = 6;

/**
 * Create the data flow line shader material
 */
const createDataFlowMaterial = (color: string, active: boolean): THREE.ShaderMaterial => {
  const material = new THREE.ShaderMaterial({
    name: 'MillOS Data Flow Line',
    uniforms: {
      color: { value: new THREE.Color(color) },
      time: { value: 0 },
      flowActive: { value: active ? 1.0 : 0.3 },
    },
    vertexShader: `
      varying vec2 vFlowUv;
      varying vec3 vFlowNormal;
      varying vec3 vFlowView;

      void main() {
        // TubeGeometry's uv.x runs ALONG the tube, so it replaces the custom
        // lineProgress attribute the old THREE.Line needed.
        vFlowUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vFlowNormal = normalize(normalMatrix * normal);
        vFlowView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform float flowActive;

      varying vec2 vFlowUv;
      varying vec3 vFlowNormal;
      varying vec3 vFlowView;

      void main() {
        float phase = fract(vFlowUv.x * 10.0 - time * 2.0);
        // Smoothed dash edges. The old hard step(0.5, ...) had no filtering and
        // shimmered at every resolution scale below 1.
        float dash = smoothstep(0.42, 0.5, phase) * (1.0 - smoothstep(0.9, 0.98, phase));

        // View-facing rim so the tube reads as a glowing filament rather than
        // a grey noodle.
        float rim = pow(1.0 - abs(dot(normalize(vFlowNormal), normalize(vFlowView))), 2.0);

        float alpha = dash * flowActive * 0.55 * (0.35 + 0.65 * rim);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    // Additive so the lines read as a data overlay rather than as geometry.
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    depthWrite: false,
  });
  // FIXED literal, never a timestamp (CLAUDE.md, shader cache key bug).
  material.customProgramCacheKey = () => 'millos-data-flow-line-v3';
  return material;
};

export const DataFlowLine: React.FC<DataFlowLineProps> = ({
  start,
  end,
  active = true,
  color = PALETTE.data.primary,
  segments = 32,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const material = useMemo(() => {
    const mat = createDataFlowMaterial(color, active);
    materialRef.current = mat;
    return mat;
  }, [color, active]);

  // Create tube geometry along the flow arc
  const geometry = useMemo(() => {
    // Create curved path between start and end
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

    // Add height to midpoint for arc
    const distance = startVec.distanceTo(endVec);
    midPoint.y += distance * 0.15;

    // Create quadratic bezier curve
    const curve = new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec);

    // ~290 triangles per connection at segments=24. Ten connections is under
    // 3k triangles against a 60k-245k scene: geometry is not the constraint,
    // and this replaces an unfilterable 1-pixel GL line primitive.
    return new THREE.TubeGeometry(
      curve,
      segments,
      FLOW_TUBE_RADIUS,
      FLOW_TUBE_RADIAL_SEGMENTS,
      false
    );
  }, [start, end, segments]);

  // Stable Mesh identity + disposal. Building the object inline in the JSX
  // allocated a fresh one every render (forcing R3F to detach and reattach it),
  // and superseded geometries/materials were never disposed - a GPU leak that
  // grew with every color/active/endpoint change.
  const mesh = useMemo(() => new THREE.Mesh(geometry, material), [geometry, material]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // Animate time uniform
  useFrame(() => {
    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.time.value = useMaterialFlowStore.getState().simulationTime;
      materialRef.current.uniforms.flowActive.value = active ? 1.0 : 0.3;
    }
  });

  // Use primitive element for the pre-built Three.js Mesh
  return <primitive object={mesh} />;
};

/**
 * Memoized version for lists
 */
export const MemoizedDataFlowLine = React.memo(DataFlowLine);
