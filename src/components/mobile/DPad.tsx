import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Move, Eye } from 'lucide-react';
import { useMobileControlStore, type DPadDirection } from '../../stores/mobileControlStore';
import { useUIStore } from '../../stores/uiStore';

interface DPadProps {
  disabled?: boolean;
  idleOpacity?: number;
  activeOpacity?: number;
}

// Joystick configuration
const JOYSTICK_SIZE = 144; // Total size in pixels
const KNOB_SIZE = 48; // Draggable knob size
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2; // Max knob travel from center
const DEAD_ZONE = 0.1; // Ignore inputs below this threshold

/**
 * Analog joystick for mobile movement/camera controls.
 * - Drag the knob to move in any direction with proportional speed
 * - Center button toggles between move and look modes (disabled in FPS mode)
 * - Outputs normalized direction vector (-1 to 1) to mobileControlStore
 */
export const DPad: React.FC<DPadProps> = ({
  disabled = false,
  idleOpacity = 0.5,
  activeOpacity = 1,
}) => {
  // Optimize selectors to avoid re-renders when dpadDirection changes
  const dpadMode = useMobileControlStore((state) => state.dpadMode);
  const toggleDpadMode = useMobileControlStore((state) => state.toggleDpadMode);
  const setDpadDirection = useMobileControlStore((state) => state.setDpadDirection);

  const fpsMode = useUIStore((state) => state.fpsMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  // Store position in ref to avoid re-renders
  const positionRef = useRef({ x: 0, y: 0 });

  const updateKnobVisuals = useCallback((x: number, y: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
    positionRef.current = { x, y };
  }, []);

  const updateJoystick = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate offset from center
      let deltaX = clientX - centerX;
      let deltaY = clientY - centerY;

      // Calculate distance from center
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Clamp to max distance
      if (distance > MAX_DISTANCE) {
        const scale = MAX_DISTANCE / distance;
        deltaX *= scale;
        deltaY *= scale;
      }

      // Update visual knob position directly via DOM
      updateKnobVisuals(deltaX, deltaY);

      // Normalize to -1 to 1 range
      let normalizedX = deltaX / MAX_DISTANCE;
      let normalizedY = deltaY / MAX_DISTANCE;

      // Apply dead zone
      const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      if (magnitude < DEAD_ZONE) {
        setDpadDirection(null);
        return;
      }

      // Remap values accounting for dead zone for smoother control
      const remappedMagnitude = (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE);
      const scale = remappedMagnitude / magnitude;
      normalizedX *= scale;
      normalizedY *= scale;

      const direction: DPadDirection = { x: normalizedX, y: normalizedY };
      setDpadDirection(direction);
    },
    [setDpadDirection, updateKnobVisuals]
  );

  const resetJoystick = useCallback(() => {
    updateKnobVisuals(0, 0);
    setDpadDirection(null);
    setIsActive(false);
    touchIdRef.current = null;
  }, [setDpadDirection, updateKnobVisuals]);

  // Global touch listeners to ensure joystick resets even if touch moves off-element
  useEffect(() => {
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;

      // Check if our tracked touch is still active
      let touchStillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          touchStillActive = true;
          break;
        }
      }

      if (!touchStillActive) {
        resetJoystick();
      }
    };

    const handleGlobalTouchCancel = () => {
      if (touchIdRef.current !== null) {
        resetJoystick();
      }
    };

    // Add global listeners with passive: false to ensure we don't miss events
    // although for end/cancel passive: true is usually fine, being consistent helps
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchCancel);

    return () => {
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchCancel);
    };
  }, [resetJoystick]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      // Critical for preventing scrolling on iOS
      e.preventDefault();
      e.stopPropagation();

      // Track the first touch
      if (touchIdRef.current === null && e.touches.length > 0) {
        const touch = e.touches[0];
        touchIdRef.current = touch.identifier;
        setIsActive(true);
        updateJoystick(touch.clientX, touch.clientY);

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    },
    [disabled, updateJoystick]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || touchIdRef.current === null) return;
      // Critical for responsiveness
      e.preventDefault();
      e.stopPropagation();

      // Find the tracked touch
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          updateJoystick(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    },
    [disabled, updateJoystick]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Check if our tracked touch ended
      let touchStillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          touchStillActive = true;
          break;
        }
      }

      if (!touchStillActive) {
        resetJoystick();
      }
    },
    [resetJoystick]
  );

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      resetJoystick();
    },
    [resetJoystick]
  );

  // Handle center button touch separately to prevent joystick activation
  const handleCenterTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative pointer-events-auto touch-none select-none transition-opacity duration-300"
      style={{
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        marginBottom: 'max(16px, env(safe-area-inset-bottom))',
        marginLeft: 'max(16px, env(safe-area-inset-left))',
        opacity: isActive ? activeOpacity : idleOpacity,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Background circle with subtle ring indicators */}
      <div className="absolute inset-0 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/50">
        {/* Inner guide ring */}
        <div
          className="absolute inset-4 rounded-full border border-slate-600/30"
          style={{ borderStyle: 'dashed' }}
        />
      </div>

      {/* Draggable knob */}
      <div
        ref={knobRef}
        className={`absolute rounded-full transition-colors duration-100 flex items-center justify-center shadow-lg ${isActive
          ? dpadMode === 'move'
            ? 'bg-cyan-500/90 border-cyan-400'
            : 'bg-violet-500/90 border-violet-400'
          : 'bg-slate-700/90 border-slate-600'
          } border-2`}
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          // Remove transition when dragging for instant response
          transition: isActive ? 'none' : 'transform 0.15s ease-out, background 0.1s',
          // Ensure hardware acceleration
          willChange: 'transform',
        }}
      >
        {/* Direction indicator dot - simple check of ref current would be stale here for render, 
            but we can use isActive as a proxy since we only show dot when moving usually. 
            Actually, let's keep it simple: show dot if active. */}
        {isActive && (
          <div className="w-2 h-2 rounded-full bg-white/80" />
        )}
      </div>

      {/* Center mode toggle button - overlays when not dragging */}
      {!isActive && (
        <button
          type="button"
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-12 h-12 rounded-full
            flex items-center justify-center
            transition-all duration-200
            touch-none select-none
            ${fpsMode
              ? 'bg-cyan-600/90 border-cyan-400'
              : dpadMode === 'move'
                ? 'bg-cyan-600/90 border-cyan-400'
                : 'bg-violet-600/90 border-violet-400'
            }
            border-2
            ${fpsMode ? 'opacity-70' : 'active:scale-95'}
          `}
          onClick={() => !fpsMode && toggleDpadMode()}
          onTouchStart={handleCenterTouchStart}
          disabled={disabled || fpsMode}
          aria-label={`Switch to ${dpadMode === 'move' ? 'look' : 'move'} mode`}
        >
          {fpsMode || dpadMode === 'move' ? (
            <Move className="w-5 h-5 text-white" />
          ) : (
            <Eye className="w-5 h-5 text-white" />
          )}
        </button>
      )}
    </div>
  );
};
