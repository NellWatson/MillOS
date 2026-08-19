/**
 * `troika-three-text` ships no type declarations (no `types`/`typings` field in
 * its package.json), and drei re-exports only its own `<Text>` wrapper. This
 * declares the one class the repo touches directly.
 *
 * Deliberately narrow: everything else in that package reaches this codebase
 * through drei, which carries its own types, and a broad `declare module` here
 * would hide a real signature change behind `any`.
 */
declare module 'troika-three-text' {
  import type { InstancedBufferGeometry } from 'three';

  /**
   * The glyph quad. `instanceCount` is inherited from
   * `InstancedBufferGeometry` and is NOT initialised by the constructor - it
   * stays `Infinity` until `updateGlyphs()` runs. See
   * `SceneText.initialiseGlyphInstanceCount` for why that matters.
   */
  export class GlyphsGeometry extends InstancedBufferGeometry {
    detail: number;
    curveRadius: number;
  }
}
