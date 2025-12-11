import React, { useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useGraphicsStore } from '../../stores/graphicsStore';

interface ReflectiveFloorProps {
  width: number;
  depth: number;
}

export const ReflectiveFloor: React.FC<ReflectiveFloorProps> = ({ width, depth }) => {
  const quality = useGraphicsStore((state) => state.graphics.quality);

  // CRITICAL: Guard against NaN/undefined/zero dimensions which cause
  // "computeBoundingSphere(): Computed radius is NaN" errors in THREE.js
  // This can happen during quality switches or when props aren't yet set
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 120;
  const safeDepth = Number.isFinite(depth) && depth > 0 ? depth : 160;

  // Resolution based on quality
  const resolution = useMemo(() => {
    return quality === 'ultra' ? 1024 : 512;
  }, [quality]);

  // Blur based on quality
  const blur = useMemo(() => {
    return quality === 'ultra' ? [500, 100] : [400, 100];
  }, [quality]);

  // Mix contrast based on quality
  const mixContrast = useMemo(() => {
    return quality === 'ultra' ? 1 : 0.8;
  }, [quality]);

  // Create a key that changes when quality changes to force full remount
  // This prevents the dreaded "black screen" or shader errors when switching quality
  const key = `reflector-${quality}-${safeWidth}-${safeDepth}`;

  return (
    <mesh key={key} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[safeWidth, safeDepth]} />
      {/* 
        MeshReflectorMaterial parameters tuned for polished concrete:
        - mirror: 0 (not a perfect mirror)
        - blur: High blur for rough concrete look
        - mixBlur: How much surface roughness affects blur
        - mixStrength: Strength of reflections (low for concrete)
        - depthScale: Fade out reflections at distance
      */}
      <MeshReflectorMaterial
        resolution={resolution}
        mirror={0}
        blur={blur as [number, number]}
        mixBlur={10}
        mixStrength={1.5} // Enhanced for "enormous improvement" - slick industrial floor
        mixContrast={mixContrast}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        depthToBlurRatioBias={0.25}
        distortion={1} // Add some noise to reflections
        distortionMap={null} // TODO: Add a noise texture here for even better realism
        reflectorOffset={0.2} // Fix z-fighting
        color="#1e293b" // Base dark slate color
        metalness={0.4}
        roughness={0.4} // Concrete roughness
      />
    </mesh>
  );
};
