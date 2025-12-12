import React from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  SSAO,
  Noise,
  ToneMapping,
  DepthOfField,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Color } from 'three';
import { useGraphicsStore } from '../stores/graphicsStore';

// SSAO color constant (dark blue-gray for contact shadows)
const SSAO_COLOR = new Color(0x1a1a2e);

export const PostProcessing: React.FC = () => {
  const graphics = useGraphicsStore((state) => state.graphics);

  // Check if any post-processing effects are enabled
  const hasAnyEffect =
    graphics.enableSSAO ||
    graphics.enableBloom ||
    graphics.enableVignette ||
    graphics.enableChromaticAberration ||
    graphics.enableFilmGrain ||
    graphics.enableDepthOfField;

  // If no effects are enabled, don't render the effect composer for performance
  if (!hasAnyEffect) {
    return null;
  }

  return (
    <EffectComposer enableNormalPass={graphics.enableSSAO}>
      <>
        {/* SSAO for contact shadows and depth in crevices */}
        {graphics.enableSSAO && (
          <SSAO
            blendFunction={BlendFunction.MULTIPLY}
            samples={graphics.ssaoSamples}
            radius={0.15}
            intensity={1.5}
            luminanceInfluence={0.5}
            color={SSAO_COLOR}
            worldDistanceThreshold={50}
            worldDistanceFalloff={8}
            worldProximityThreshold={0.5}
            worldProximityFalloff={0.2}
          />
        )}

        {/* Depth of Field for subtle cinematic focus effect */}
        {graphics.enableDepthOfField && (
          <DepthOfField focusDistance={0.15} focalLength={0.02} bokehScale={1} height={480} />
        )}

        {/* Bloom for emissive lights and glow effects */}
        {/* Tuned for cleaner targeting: higher threshold, sharper falloff */}
        {graphics.enableBloom && (
          <Bloom intensity={0.4} luminanceThreshold={0.85} luminanceSmoothing={0.8} mipmapBlur />
        )}

        {/* Film grain for industrial grittiness */}
        {graphics.enableFilmGrain && (
          <Noise opacity={0.025} blendFunction={BlendFunction.OVERLAY} />
        )}

        {/* Linear tone mapping - ACES can cause brightness fluctuations with animated lights */}
        <ToneMapping mode={ToneMappingMode.LINEAR} />

        {/* Vignette for cinematic framing */}
        {graphics.enableVignette && (
          <Vignette offset={0.3} darkness={0.5} blendFunction={BlendFunction.NORMAL} />
        )}

        {/* Subtle chromatic aberration for lens effect */}
        {graphics.enableChromaticAberration && (
          <ChromaticAberration offset={[0.0005, 0.0005]} blendFunction={BlendFunction.NORMAL} />
        )}
      </>
    </EffectComposer>
  );
};
