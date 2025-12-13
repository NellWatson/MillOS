import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMobileControlStore } from '../../stores/mobileControlStore';

interface TouchLookHandlerProps {
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  sensitivity?: number;
  zoomSensitivity?: number;
  minDistance?: number;
  maxDistance?: number;
}

/**
 * React Three Fiber component that handles touch gestures on the canvas.
 * - Single-finger drag: rotates the camera view (orbit)
 * - Two-finger pinch: zooms in/out
 * This is a behavior-only component that returns null.
 */
export const TouchLookHandler: React.FC<TouchLookHandlerProps> = ({
  orbitControlsRef,
  sensitivity = 0.004,
  zoomSensitivity = 0.02,
  minDistance = 15,
  maxDistance = 200,
}) => {
  const { gl, camera } = useThree();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const setIsTouchLooking = useMobileControlStore((s) => s.setIsTouchLooking);

  // Helper to calculate distance between two touch points
  const getTouchDistance = (t1: Touch, t2: Touch): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  useEffect(() => {
    const canvas = gl.domElement;
    const TOUCH_THROTTLE_MS = 16; // ~60fps

    const handleTouchStart = (e: TouchEvent) => {
      // Check if touch started on a UI element
      const target = e.target as HTMLElement;
      if (target.closest('.pointer-events-auto')) return;

      // Prevent default to avoid conflicts with OrbitControls
      e.preventDefault();

      // Use targetTouches to only count touches on this element (canvas)
      // This allows D-pad and look to work simultaneously
      if (e.targetTouches.length === 1) {
        // Single touch on canvas - start look/drag
        touchStartRef.current = {
          x: e.targetTouches[0].clientX,
          y: e.targetTouches[0].clientY,
        };
        setIsTouchLooking(true);
      } else if (e.targetTouches.length === 2) {
        // Two touches on canvas - start pinch-to-zoom
        touchStartRef.current = null; // Cancel any single-touch drag
        pinchStartDistRef.current = getTouchDistance(e.targetTouches[0], e.targetTouches[1]);
        // Store current camera distance from target
        const controls = orbitControlsRef.current;
        if (controls) {
          pinchStartZoomRef.current = camera.position.distanceTo(controls.target);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Throttle touch events for performance
      const now = Date.now();
      if (now - lastTouchTimeRef.current < TOUCH_THROTTLE_MS) return;
      lastTouchTimeRef.current = now;

      e.preventDefault();

      // Handle pinch-to-zoom (two fingers on canvas)
      if (
        e.targetTouches.length === 2 &&
        pinchStartDistRef.current !== null &&
        pinchStartZoomRef.current !== null
      ) {
        const currentDist = getTouchDistance(e.targetTouches[0], e.targetTouches[1]);
        const pinchDelta = pinchStartDistRef.current - currentDist;
        const zoomDelta = pinchDelta * zoomSensitivity;

        const controls = orbitControlsRef.current;
        if (controls) {
          const target = controls.target;
          const offset = camera.position.clone().sub(target);

          // Calculate new radius with pinch delta
          let newRadius = pinchStartZoomRef.current + zoomDelta;
          newRadius = Math.max(minDistance, Math.min(maxDistance, newRadius));

          // Scale offset to new radius
          offset.normalize().multiplyScalar(newRadius);
          camera.position.copy(target).add(offset);
        }
        return;
      }

      // Handle single-finger drag (look) - use targetTouches for simultaneous D-pad + look
      if (!touchStartRef.current || e.targetTouches.length !== 1) return;

      const deltaX = e.targetTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.targetTouches[0].clientY - touchStartRef.current.y;

      // Apply rotation by manipulating camera position around target
      const controls = orbitControlsRef.current;
      if (controls) {
        const target = controls.target;
        const offset = camera.position.clone().sub(target);

        // Convert to spherical coordinates
        const radius = offset.length();
        let theta = Math.atan2(offset.x, offset.z); // azimuthal angle
        let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius))); // polar angle

        // Apply rotation (deltaX rotates horizontally, deltaY rotates vertically)
        theta -= deltaX * sensitivity;
        phi += deltaY * sensitivity;

        // Clamp polar angle to prevent camera from going above or below limits
        phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, phi));

        // Convert back to cartesian
        offset.x = radius * Math.sin(phi) * Math.sin(theta);
        offset.y = radius * Math.cos(phi);
        offset.z = radius * Math.sin(phi) * Math.cos(theta);

        camera.position.copy(target).add(offset);
        camera.lookAt(target);
      }

      // Update start position for continuous drag
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Reset pinch state when fingers lift
      if (e.touches.length < 2) {
        pinchStartDistRef.current = null;
        pinchStartZoomRef.current = null;
      }

      // Only end look state if all touches are released
      if (e.touches.length === 0) {
        touchStartRef.current = null;
        setIsTouchLooking(false);
      }
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
      pinchStartDistRef.current = null;
      pinchStartZoomRef.current = null;
      setIsTouchLooking(false);
    };

    // Add event listeners with passive: false to allow preventDefault
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [
    gl,
    camera,
    orbitControlsRef,
    sensitivity,
    zoomSensitivity,
    minDistance,
    maxDistance,
    setIsTouchLooking,
  ]);

  // This is a behavior-only component
  return null;
};
