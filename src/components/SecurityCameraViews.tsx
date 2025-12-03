import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { useMillStore } from '../store';
import { SECURITY_CAMERAS } from './GameFeatures';

// Individual camera view that renders to a FBO and copies to DOM canvas
const CameraFeed: React.FC<{
  camId: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  container: HTMLDivElement | null;
}> = ({ camId, position, lookAt, container }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { scene, gl } = useThree();

  // Create a render target for this camera
  const renderTarget = useFBO(256, 192, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    depthBuffer: true,
  });

  // Calculate camera look-at direction
  const lookAtVector = useMemo(() => new THREE.Vector3(...lookAt), [lookAt]);

  // Create canvas in container on mount
  useEffect(() => {
    if (!container) return;

    let canvas = container.querySelector('canvas.camera-feed') as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'camera-feed';
      canvas.width = 256;
      canvas.height = 192;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'cover';
      container.appendChild(canvas);
    }

    return () => {
      if (canvas && canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [container]);

  // Throttle frame updates for performance
  const frameCount = useRef(0);

  useFrame(() => {
    if (!cameraRef.current || !container) return;

    // Only update every 3rd frame for performance (20fps instead of 60fps)
    frameCount.current++;
    if (frameCount.current % 3 !== 0) return;

    // Position and orient the camera
    cameraRef.current.position.set(...position);
    cameraRef.current.lookAt(lookAtVector);
    cameraRef.current.updateMatrixWorld();

    // Store current render state
    const currentRenderTarget = gl.getRenderTarget();

    // Render the scene from this camera's perspective to the render target
    gl.setRenderTarget(renderTarget);
    gl.clear();
    gl.render(scene, cameraRef.current);
    gl.setRenderTarget(currentRenderTarget);

    // Copy to DOM canvas
    const canvas = container.querySelector('canvas.camera-feed') as HTMLCanvasElement | null;
    if (!canvas) return;

    try {
      const width = renderTarget.width;
      const height = renderTarget.height;

      const pixels = new Uint8Array(width * height * 4);
      gl.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(width, height);

        // Flip the image vertically (WebGL renders upside down)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - 1 - y) * width + x) * 4;
            const dstIdx = (y * width + x) * 4;
            imageData.data[dstIdx] = pixels[srcIdx];
            imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
            imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
            imageData.data[dstIdx + 3] = 255; // Full opacity
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }
    } catch (e) {
      // Ignore errors during rendering
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={false}
      fov={60}
      near={0.5}
      far={200}
      position={position}
    />
  );
};

// Main component that manages all security camera views
export const SecurityCameraViews: React.FC = () => {
  const showSecurityCameras = useMillStore(state => state.showSecurityCameras);
  const cameraContainers = useMillStore(state => state.cameraContainers);
  const activeCameraId = useMillStore(state => state.activeCameraId);

  // Don't render cameras if panel is not shown
  if (!showSecurityCameras) return null;

  // Get the active camera for PiP
  const activeCam = activeCameraId
    ? SECURITY_CAMERAS.find(c => c.id === activeCameraId)
    : null;

  return (
    <>
      {/* Render feeds for the 6 grid cameras */}
      {SECURITY_CAMERAS.slice(0, 6).map((cam) => {
        const container = cameraContainers.get(cam.id) || null;
        return (
          <CameraFeed
            key={cam.id}
            camId={cam.id}
            position={cam.position}
            lookAt={cam.lookAt}
            container={container}
          />
        );
      })}

      {/* Render the active camera PiP feed */}
      {activeCam && (
        <CameraFeed
          key={`${activeCam.id}-pip`}
          camId={`${activeCam.id}-pip`}
          position={activeCam.position}
          lookAt={activeCam.lookAt}
          container={cameraContainers.get(`${activeCam.id}-pip`) || null}
        />
      )}
    </>
  );
};
