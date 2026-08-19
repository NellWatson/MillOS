import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GlyphsGeometry } from 'troika-three-text';
import { initialiseGlyphInstanceCount } from '../SceneText';

/**
 * The bug this pins, reproduced against the real `GlyphsGeometry`.
 *
 * Every in-scene label in this app is a troika text mesh, and troika's
 * `GlyphsGeometry` never assigns `instanceCount` in its constructor
 * (`troika-three-text@0.52.4`, `src/GlyphsGeometry.js:55-71`); it only takes a
 * real value in `updateGlyphs()`, which runs asynchronously after layout. Until
 * then the geometry is an `InstancedBufferGeometry` whose count is still
 * `Infinity` and which carries no instanced attribute at all.
 *
 * three then resolves the draw as
 * `Math.min(geometry.instanceCount, geometry._maxInstanceCount ?? Infinity)`
 * (`WebGLRenderer.js:1316-1317`), and `_maxInstanceCount` is set ONLY where an
 * instanced attribute is bound (`WebGLBindingStates.js:361,403`) - so with none
 * present it stays `undefined` and the draw goes out with `primcount` Infinity.
 * Nothing renders wrong, because the GL call coerces that to 0. But
 * `WebGLInfo.update` runs first and does
 * `render.triangles += instanceCount * (count / 3)`, and `render.calls`
 * increments ABOVE the switch while `render.triangles` accumulates inside it.
 * The result is a draw-call count that stays exact beside a triangle count that
 * is permanently non-finite, and benchmarks hold `info.autoReset` off for the
 * whole measured window, so a single transient frame poisons it for good.
 *
 * Measured before the fix: `triangles` reported as 0 for `overview`, `forklift`
 * and `shipping` alike, against `calls` of 1345, 1052 and 1205 - and the raw
 * accumulator behind that printed 0 was `NaN`/`Infinity`, not a zero.
 *
 * This is a DEPENDENCY-BEHAVIOUR test as much as an app test. The two `expect`s
 * below that read a freshly constructed geometry are the load-bearing ones: if
 * a future three stops defaulting `instanceCount` to a non-finite value, or a
 * future troika initialises it, they fail and the fix becomes redundant rather
 * than wrong.
 */
describe('glyph geometry instance count', () => {
  it('three still defaults an instanced geometry to a non-finite count', () => {
    const geometry = new THREE.InstancedBufferGeometry();
    expect(Number.isFinite(geometry.instanceCount)).toBe(false);
  });

  it('troika still ships a glyph geometry that would draw unbounded', () => {
    const geometry = new GlyphsGeometry();
    expect(geometry.isInstancedBufferGeometry).toBe(true);
    expect(Number.isFinite(geometry.instanceCount)).toBe(false);
    // No instanced attribute, which is precisely why three cannot clamp it:
    // `_maxInstanceCount` is only assigned where one is bound.
    const instancedAttributes = Object.values(geometry.attributes).filter(
      (attribute) => (attribute as THREE.InstancedBufferAttribute).isInstancedBufferAttribute
    );
    expect(instancedAttributes).toHaveLength(0);
  });

  it('bounds a fresh glyph geometry to zero instances', () => {
    const mesh = new THREE.Mesh(new GlyphsGeometry());
    initialiseGlyphInstanceCount(mesh);
    // Zero specifically, because `renderInstances` returns on `primcount === 0`
    // BEFORE calling `info.update` - any other finite value would still draw.
    expect((mesh.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(0);
  });

  it('leaves a laid-out glyph geometry alone', () => {
    const geometry = new GlyphsGeometry();
    geometry.instanceCount = 12;
    initialiseGlyphInstanceCount(new THREE.Mesh(geometry));
    expect(geometry.instanceCount).toBe(12);
  });

  it('leaves an ordinary geometry alone', () => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    expect(() => initialiseGlyphInstanceCount(mesh)).not.toThrow();
    expect(
      (mesh.geometry as THREE.BufferGeometry & { instanceCount?: number }).instanceCount
    ).toBeUndefined();
  });

  it('tolerates a null mesh', () => {
    expect(() => initialiseGlyphInstanceCount(null)).not.toThrow();
  });
});
