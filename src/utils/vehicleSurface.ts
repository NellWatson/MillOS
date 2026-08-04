/**
 * Vehicle surface shader injection: road grime and panel ribs.
 *
 * WHY A SHADER INJECTION RATHER THAN A TEXTURE. Every painted surface on the
 * truck is the same shared `UNIT_BOX` / `ROUNDED_BOX` geometry under wildly
 * different non-uniform scales - the trailer skin is `[2.55, 4.25, 11.2]` and a
 * cab pillar is `[0.18, 1.5, 0.18]`. A UV-space gradient stretches
 * incoherently between the two, and authoring per-mesh UVs would cost the
 * shared geometry that keeps the truck inside its draw-call budget. Two derived
 * coordinates solve it with no texture taps at all:
 *
 *   - WORLD Y drives the grime gradient. The truck root group is always placed
 *     at `position.set(x, 0, z)`, so world Y is literally height above the
 *     ground and road spray can be authored in metres.
 *   - OBJECT-SPACE METRES drive the panel ribs. Object space is invariant under
 *     the vehicle's own translation and yaw, so the rib pattern is welded to
 *     the panel instead of swimming across it as the truck drives. It is
 *     recovered by scaling the local `position` by the length of the object
 *     matrix basis vectors, which works for a shared unit cube at any scale.
 *
 * INSTANCING. `transformed` does NOT carry `instanceMatrix` - three applies it
 * inside `<project_vertex>`, after the point where this injects. The object
 * matrix is therefore composed explicitly so the same material can be used on a
 * plain `Mesh` and on an `InstancedMesh` and give the same answer on both.
 *
 * CLEARCOAT. Grime that only tints `diffuseColor` is nearly invisible under
 * `clearcoat: 1.0`, because the coat's specular sits on top of the tint. Dirt
 * reads as dirt only when it also kills the coat, so the injection reaches into
 * `material.clearcoat` / `material.clearcoatRoughness` after
 * `<lights_physical_fragment>`.
 *
 * CACHE KEY. `customProgramCacheKey` returns a fixed literal with a manually
 * incremented version. It must NEVER contain `Date.now()`, `Math.random()` or
 * any other non-deterministic value: that recompiles the program every frame
 * (see CLAUDE.md, "Shader Cache Key Bug"). Bump `SURFACE_PROGRAM_VERSION` by
 * hand whenever the injected GLSL below changes.
 */

import * as THREE from 'three';

/** Bump by hand whenever the injected GLSL changes. Never derive this. */
const SURFACE_PROGRAM_VERSION = 'v1';

export interface VehicleSurfaceOptions {
  /** Road-film strength at the very bottom of the body, 0..1. */
  readonly grime: number;
  /** World Y at which grime is at full strength. Defaults to the ground. */
  readonly grimeFloor?: number;
  /** World Y at which grime has faded out completely. */
  readonly grimeCeiling?: number;
  /** Colour of the road film. Defaults to a cool diesel-soot brown. */
  readonly grimeColor?: THREE.ColorRepresentation;
  /** Object-space Z pitch of the panel ribs, in metres. 0 disables them. */
  readonly ribPitch?: number;
  /** Roughness the rib grooves add on top of the base value. */
  readonly ribDepth?: number;
}

interface VehicleSurfaceUniforms {
  readonly uMillosGrime: { value: number };
  readonly uMillosGrimeSpan: { value: THREE.Vector2 };
  readonly uMillosGrimeColor: { value: THREE.Color };
  readonly uMillosRib: { value: THREE.Vector2 };
}

/** Materials carry their live uniforms here so callers can retune at runtime. */
export interface VehicleSurfaceMaterial extends THREE.Material {
  userData: { millosVehicleSurface?: VehicleSurfaceUniforms };
}

const VERTEX_ANCHOR = '#include <project_vertex>';
const VERTEX_INJECTION = /* glsl */ `
  mat4 millosObjectMatrix = modelMatrix;
  #ifdef USE_INSTANCING
    millosObjectMatrix = millosObjectMatrix * instanceMatrix;
  #endif
  vMillosHeight = ( millosObjectMatrix * vec4( transformed, 1.0 ) ).y;
  vMillosObject = transformed * vec3(
    length( millosObjectMatrix[ 0 ].xyz ),
    length( millosObjectMatrix[ 1 ].xyz ),
    length( millosObjectMatrix[ 2 ].xyz )
  );
`;

const SURFACE_HEAD = /* glsl */ `
uniform float uMillosGrime;
uniform vec2 uMillosGrimeSpan;
uniform vec3 uMillosGrimeColor;
uniform vec2 uMillosRib;
varying float vMillosHeight;
varying vec3 vMillosObject;

float millosSurfaceHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}
`;

// Splash is concentrated at the very bottom and tapers fast, so the falloff is
// squared rather than linear. The mottle breaks the gradient into patches so it
// does not read as an airbrushed band.
const GRIME_INJECTION = /* glsl */ `
  float millosFall = 1.0 - smoothstep( uMillosGrimeSpan.x, uMillosGrimeSpan.y, vMillosHeight );
  float millosMottle = 0.58 + 0.42 * millosSurfaceHash( floor( vMillosObject.xz * 6.0 ) );
  float millosGrime = clamp( millosFall * millosFall * uMillosGrime * millosMottle, 0.0, 1.0 );
  float millosRib = 0.0;
  if ( uMillosRib.x > 0.0 ) {
    float millosCell = fract( vMillosObject.z / uMillosRib.x );
    millosRib = ( 1.0 - smoothstep( 0.0, 0.14, abs( millosCell - 0.5 ) ) ) * uMillosRib.y;
  }
  diffuseColor.rgb = mix( diffuseColor.rgb, uMillosGrimeColor, millosGrime * 0.82 );
  diffuseColor.rgb *= 1.0 - millosRib * 0.16;
`;

const ROUGHNESS_INJECTION = /* glsl */ `
  roughnessFactor = clamp( mix( roughnessFactor, 0.9, millosGrime ) + millosRib, 0.03, 1.0 );
`;

const CLEARCOAT_INJECTION = /* glsl */ `
  #ifdef USE_CLEARCOAT
    material.clearcoat = mix( material.clearcoat, 0.1, millosGrime );
    material.clearcoatRoughness = clamp(
      mix( material.clearcoatRoughness, 0.62, millosGrime ) + millosRib * 0.5,
      0.0525,
      1.0
    );
  #endif
`;

/**
 * Attach the grime/rib injection to a standard or physical material.
 *
 * Returns the same material so it can be used inline in a `useMemo`. Safe to
 * call on a material that is shared between a `Mesh` and an `InstancedMesh`;
 * three keys `USE_INSTANCING` into the program cache itself, so both variants
 * compile once and stay cached.
 */
export function applyVehicleSurface<T extends THREE.MeshStandardMaterial>(
  material: T,
  options: VehicleSurfaceOptions
): T {
  const uniforms: VehicleSurfaceUniforms = {
    uMillosGrime: { value: Math.max(0, Math.min(1, options.grime)) },
    uMillosGrimeSpan: {
      value: new THREE.Vector2(options.grimeFloor ?? 0.15, options.grimeCeiling ?? 1.6),
    },
    uMillosGrimeColor: { value: new THREE.Color(options.grimeColor ?? '#3a3128') },
    uMillosRib: {
      value: new THREE.Vector2(Math.max(0, options.ribPitch ?? 0), options.ribDepth ?? 0.12),
    },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vMillosHeight;\nvarying vec3 vMillosObject;'
      )
      .replace(VERTEX_ANCHOR, `${VERTEX_ANCHOR}\n${VERTEX_INJECTION}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SURFACE_HEAD}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${GRIME_INJECTION}`)
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n${ROUGHNESS_INJECTION}`
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>\n${CLEARCOAT_INJECTION}`
      );
  };

  // Fixed literal, versioned by hand. See the note at the top of this file.
  material.customProgramCacheKey = () => `millos_vehicle_surface_${SURFACE_PROGRAM_VERSION}`;
  (material as VehicleSurfaceMaterial).userData.millosVehicleSurface = uniforms;
  return material;
}
