/**
 * WindDriver - one global wind clock for all vegetation.
 *
 * Before this, nothing in the world moved: a 300-stalk grain field stood
 * frozen under a spinning windmill. Every swaying material shares the single
 * uniform object below, so the whole site reads as one wind front rather than
 * as per-object jitter.
 *
 * DESIGN NOTES
 *
 * - The clock is advanced from `useFrame`, but the advance is IDEMPOTENT per
 *   frame (guarded on `state.clock.elapsedTime`). That means the driver can be
 *   mounted more than once - e.g. once inside the village and once inside the
 *   farm - without the wind running at double speed, so no central scene file
 *   has to be edited to own it.
 * - Time wraps at 20*PI. Every frequency used in the shader is an integer
 *   multiple of 0.1, so `f * 20*PI` is always an integer multiple of 2*PI and
 *   the wrap is seamless. Keeping the value small also keeps float32 sin()
 *   precise, which an ever-growing elapsedTime would not.
 * - `customProgramCacheKey` returns a CONSTANT literal. Anything derived from
 *   Date.now()/Math.random() recompiles the shader every frame (see CLAUDE.md,
 *   "Shader Cache Key Bug").
 * - Any material given `onBeforeCompile` is permanently excluded from
 *   StaticMeshBatch merging. Only apply the injection to materials that are
 *   consumed exclusively by InstancedMesh (which the batcher already skips) or
 *   by a handful of meshes - never to a shared building material.
 */

import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Wrap period. All shader frequencies are multiples of 0.1, so f*PERIOD is a
 *  whole number of cycles and the wrap is invisible. */
export const WIND_PERIOD = Math.PI * 20;

/**
 * Shared uniform objects. Injected by reference into every wind material, so
 * one float write per frame animates the entire world.
 */
export const WIND_UNIFORMS = {
  uWindTime: { value: 0 },
  /** Prevailing direction on the ground plane (world XZ), unit length. */
  uWindDir: { value: new THREE.Vector2(0.82, 0.57) },
  /** Metres of sway at the tip of a reference-height plant. */
  uWindStrength: { value: 0.16 },
};

let lastElapsed = -1;

/**
 * Advance the shared clock. Safe to call from any number of subscribers in the
 * same frame - only the first call of a given frame does work.
 */
export const advanceWind = (elapsed: number, delta: number): void => {
  if (elapsed === lastElapsed) return;
  lastElapsed = elapsed;
  // Clamp delta so a tab-switch stall does not teleport the whole field.
  const next = WIND_UNIFORMS.uWindTime.value + Math.min(delta, 0.1);
  WIND_UNIFORMS.uWindTime.value = next >= WIND_PERIOD ? next - WIND_PERIOD : next;
};

/** Mount anywhere vegetation is rendered. Mounting several is harmless. */
export const WindDriver: React.FC = () => {
  useFrame((state, delta) => {
    advanceWind(state.clock.elapsedTime, delta);
  });
  return null;
};
WindDriver.displayName = 'WindDriver';

export interface WindShaderOptions {
  /**
   * Object-space height at which a plant reaches full sway. Vertices above it
   * are clamped, vertices at y=0 do not move at all.
   */
  heightRef: number;
  /** Multiplier on `uWindStrength` for this species. */
  strengthScale: number;
  /** CONSTANT literal cache key. Must be unique per injected variant. */
  cacheKey: string;
}

/**
 * Inject wind sway into a MeshStandardMaterial (or MeshDepthMaterial).
 *
 * The bend is applied in world-ish space and then pulled back through the
 * instance transform, so a field of randomly-rotated instances all lean the
 * same way. Without that correction each instance sways along its own local
 * axis and the field looks like static, not weather.
 *
 * `transpose(M3)/scale^2` is the inverse of a rotation-plus-uniform-scale
 * matrix, which is exactly what the instance matrices here are. It avoids
 * GLSL `inverse()` and costs about ten ALU ops on a handful of vertices.
 */
export const applyWindShader = (
  material: THREE.Material,
  { heightRef, strengthScale, cacheKey }: WindShaderOptions
): void => {
  const h = heightRef.toFixed(4);
  const s = strengthScale.toFixed(4);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = WIND_UNIFORMS.uWindTime;
    shader.uniforms.uWindDir = WIND_UNIFORMS.uWindDir;
    shader.uniforms.uWindStrength = WIND_UNIFORMS.uWindStrength;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uWindTime;
uniform vec2 uWindDir;
uniform float uWindStrength;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
{
  vec4 millosWindLocal = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    millosWindLocal = instanceMatrix * millosWindLocal;
  #endif
  vec3 millosWindWorld = ( modelMatrix * millosWindLocal ).xyz;

  // Phase from WORLD position, so gusts travel across the site as a front
  // instead of every plant flickering on its own timer.
  float millosPhase = millosWindWorld.x * 0.35 + millosWindWorld.z * 0.27;
  float millosGust =
      sin( uWindTime * 0.9 + millosPhase ) * 0.65
    + sin( uWindTime * 2.3 + millosPhase * 1.7 ) * 0.25
    + sin( uWindTime * 5.1 + millosPhase * 3.1 ) * 0.10;

  // Squared falloff pins the base of the plant so leaves never detach.
  float millosStiff = clamp( position.y / ${h}, 0.0, 1.0 );
  millosStiff *= millosStiff;

  vec3 millosOffset = vec3( uWindDir.x, 0.0, uWindDir.y )
    * ( millosGust * uWindStrength * ${s} * millosStiff );

  #ifdef USE_INSTANCING
    // Pull the world-space offset back through the instance rotation so all
    // instances lean the same way: inverse of (rotation * uniform scale) is
    // transpose(M) / scale^2.
    vec3 millosCol0 = instanceMatrix[ 0 ].xyz;
    vec3 millosCol1 = instanceMatrix[ 1 ].xyz;
    vec3 millosCol2 = instanceMatrix[ 2 ].xyz;
    float millosScaleSq = max( dot( millosCol0, millosCol0 ), 1e-5 );
    millosOffset = vec3(
      dot( millosCol0, millosOffset ),
      dot( millosCol1, millosOffset ),
      dot( millosCol2, millosOffset )
    ) / millosScaleSq;
  #endif

  transformed += millosOffset;
}`
    );
  };

  material.customProgramCacheKey = () => cacheKey;
  material.needsUpdate = true;
};
