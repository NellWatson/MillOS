import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGraphicsStore } from '../../stores/graphicsStore';

/**
 * A/B instrument: hide every punctual light that does not cast a shadow.
 *
 * WHY THIS IS AN INSTRUMENT AND NOT AN OPTIMISATION. In a forward renderer the
 * cost of a light is not mainly its radiance contribution - it is a uniform
 * count baked into the program parameters of every material in the scene, plus
 * a texture unit if it carries a cookie. A sibling project found fourteen
 * unshadowed spotlights that moved the lit surfaces by 0.0% and 0.10%, and
 * removed them anyway, because the texture-unit budget they forced was why
 * three of its materials were silently running without their occlusion maps.
 *
 * This repo declares point and spot lights across roughly twenty files, so the
 * question "what are they actually costing us" cannot be answered by reading.
 * It has to be toggled, in one page load, against a control.
 *
 * HOW TO READ THE RESULT. Compare `renderer.programs` and `p95FrameMs` between
 * a control run and one with `--disable-systems=lights`. Three outcomes:
 *
 *   - `programs` drops and p95 improves: the lights are costing us, and the
 *     saving is in shader permutations rather than in shading work.
 *   - `programs` drops and p95 is unchanged: we are not program-bound. Removing
 *     lights would buy cold-start time, not frame time.
 *   - Nothing moves at all: the term is inert. An exactly-zero delta means the
 *     lights were never reaching the materials, which is a bug, not a saving.
 *
 * `visible = false` is the right lever rather than unmounting: `projectObject`
 * skips invisible objects before they reach the lights array, so the renderer's
 * `numPointLights` genuinely falls and the programs genuinely recompile. That
 * recompile is why the benchmark's warmup and settle windows must run after the
 * toggle, which they do.
 */

/** Lights that survive isolation regardless, because they define the scene's key. */
function isStructuralLight(light: THREE.Light): boolean {
  // A shadow caster is load-bearing for the scene's read, and there should only
  // ever be one of them (see CLAUDE.md, "Preventing Future Flickering").
  if (light.castShadow) return true;
  // Ambient and hemisphere lights are not punctual and cost one uniform each.
  return !(light instanceof THREE.PointLight || light instanceof THREE.SpotLight);
}

/**
 * How often the graph is re-walked for lights that were not there last time.
 *
 * Lazily mounted machines, vehicles and ambient detail each bring their own
 * fittings long after the first walk, so a one-shot would leave the isolation
 * steadily leaking lights back in over the warmup window - and the run would
 * quietly measure something between the two arms.
 */
const RESWEEP_INTERVAL_MS = 500;

export function PunctualLightIsolation() {
  const scene = useThree((state) => state.scene);
  const disablePunctualLights = useGraphicsStore(
    (state) => state.graphics.perfDebug.disablePunctualLights
  );
  // Remember what each light's visibility was before we touched it, so the
  // toggle is reversible and never promotes a light that was already hidden.
  const hidden = useRef(new Map<THREE.Light, boolean>());
  const nextSweepAt = useRef(0);

  useFrame(({ clock }) => {
    if (!disablePunctualLights) return;
    const now = clock.elapsedTime * 1000;
    if (now < nextSweepAt.current) return;
    nextSweepAt.current = now + RESWEEP_INTERVAL_MS;

    scene.traverse((object) => {
      const light = object as THREE.Light;
      if (!light.isLight || isStructuralLight(light)) return;
      if (hidden.current.has(light)) return;
      hidden.current.set(light, light.visible);
      light.visible = false;
    });
  });

  useEffect(() => {
    if (disablePunctualLights) return;
    // Restoring on the way out keeps this usable interactively, not only for a
    // one-shot benchmark process.
    const restored = hidden.current;
    restored.forEach((wasVisible, light) => {
      light.visible = wasVisible;
    });
    restored.clear();
    nextSweepAt.current = 0;
  }, [disablePunctualLights]);

  useEffect(() => {
    const restored = hidden.current;
    return () => {
      restored.forEach((wasVisible, light) => {
        light.visible = wasVisible;
      });
      restored.clear();
    };
  }, []);

  return null;
}

export default PunctualLightIsolation;
