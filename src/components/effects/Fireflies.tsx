import React, { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useGraphicsStore } from '../../stores/graphicsStore';
import { shouldRunThisFrame } from '../../utils/frameThrottle';

interface FirefliesProps {
  count?: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  color?: string;
}

/** FIXED literal, never a timestamp (CLAUDE.md, shader cache key bug). */
const FIREFLY_CACHE_KEY = 'millos-firefly-v1';

/**
 * Camera-facing additive glow.
 *
 * The quads had no billboarding at all: every firefly was a card fixed in the
 * world XY plane, so they vanished entirely from any camera looking along world
 * X - which the exterior orbit passes through - and foreshortened into slivers
 * everywhere else.
 */
const createFireflyMaterial = (color: string): THREE.MeshBasicMaterial => {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n        varying vec2 vGlowUv;`)
      .replace(
        '#include <project_vertex>',
        `// Read the instance scale back explicitly - it carries the firefly's
        // brightness pulse, and taking only the translation column would
        // freeze every one of them at a constant size.
        float glowScale = length( instanceMatrix[ 0 ].xyz );
        vec4 mvPosition = modelViewMatrix * vec4( ( instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz, 1.0 );
        mvPosition.xy += position.xy * glowScale;
        gl_Position = projectionMatrix * mvPosition;
        vGlowUv = uv;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n        varying vec2 vGlowUv;`)
      .replace(
        '#include <opaque_fragment>',
        `diffuseColor.a *= 1.0 - smoothstep( 0.15, 0.5, length( vGlowUv - 0.5 ) );
        #include <opaque_fragment>`
      );
  };

  material.customProgramCacheKey = () => FIREFLY_CACHE_KEY;
  return material;
};

const Fireflies: React.FC<FirefliesProps> = ({ count = 50, bounds, color = '#ccff66' }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const quality = useGraphicsStore((state) => state.graphics.quality);

  // Selector optimization: Only re-render when night status CHANGES
  const isNight = useGameSimulationStore((state) => state.gameTime >= 20 || state.gameTime < 6);

  // Generate initial data
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      const speed = 0.5 + Math.random() * 0.5;
      const offset = Math.random() * Math.PI * 2;
      temp.push({
        basePos: new THREE.Vector3(x, y, z),
        speed,
        offset,
        time: Math.random() * 10,
      });
    }
    return temp;
  }, [count, bounds]);

  // Dummy object for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const material = useMemo(() => createFireflyMaterial(color), [color]);
  useEffect(() => () => material.dispose(), [material]);

  // Seed the matrices and pin the culling volume BEFORE the first frame.
  //
  // `frustumCulled` was previously forced off because it could not work: three
  // would have auto-computed `InstancedMesh.boundingSphere` from the (still
  // all-zero) instance matrices and cached a zero-radius sphere at the world
  // origin, culling every firefly forever. Seeding first and then assigning the
  // sphere from `bounds` makes culling correct AND cheap.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    particles.forEach((p, i) => {
      dummy.position.copy(p.basePos);
      dummy.scale.setScalar(0.8 + Math.sin(p.time * 2 + p.offset) * 0.4);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    const centre = new THREE.Vector3(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2,
      (bounds.minZ + bounds.maxZ) / 2
    );
    const radius =
      0.5 *
        Math.hypot(
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY,
          bounds.maxZ - bounds.minZ
        ) +
      // Wander (+/-0.5), pulse scale and the billboard quad's own extent.
      2;
    mesh.boundingSphere = new THREE.Sphere(centre, radius);
  }, [particles, dummy, bounds]);

  useFrame((_state, delta) => {
    if (!meshRef.current || !isNight) return;

    // Performance optimization: Skip animation on Low quality
    if (quality === 'low') return;

    // Throttle firefly animation to every 3rd frame (~20 FPS)
    const throttle = 3;
    if (!shouldRunThisFrame(throttle)) return;

    // Compensate for skipped frames; cap to avoid jumps on tab refocus
    const cappedDelta = Math.min(delta * throttle, 0.1);

    particles.forEach((p, i) => {
      p.time += cappedDelta * p.speed;

      // Gentle wandering motion
      const x = p.basePos.x + Math.sin(p.time * 0.5 + p.offset) * 0.5;
      const y = p.basePos.y + Math.cos(p.time * 0.3 + p.offset) * 0.3; // Slight vertical drift
      const z = p.basePos.z + Math.sin(p.time * 0.4 + p.offset) * 0.5;

      // Pulsing scale
      const scale = 0.8 + Math.sin(p.time * 2 + p.offset) * 0.4;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // If not night or low quality, don't render. (The old `&& !meshRef.current`
  // term latched the fireflies on after their first night: once the mesh had
  // mounted, the guard never returned null again, so they stayed rendered -
  // frozen and glowing - all day. React remounts cleanly next night.)
  if (!isNight || quality === 'low') return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      material={material}
      frustumCulled={true}
    >
      <planeGeometry args={[0.08, 0.08]} />
    </instancedMesh>
  );
};

export default Fireflies;
