import React, { useCallback } from 'react';
import { Zap } from 'lucide-react';
import { DPad } from './DPad';
import { MobilePanel } from './MobilePanel';
import { CameraPresetMenu } from './CameraPresetMenu';
import { useMobileControlStore } from '../../stores/mobileControlStore';
import { useUIStore } from '../../stores/uiStore';

/**
 * Sprint button for mobile FPS mode.
 * Hold to sprint, release to walk.
 */
const SprintButton: React.FC = () => {
  const setIsSprinting = useMobileControlStore((s) => s.setIsSprinting);
  const isSprinting = useMobileControlStore((s) => s.isSprinting);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsSprinting(true);
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    },
    [setIsSprinting]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsSprinting(false);
    },
    [setIsSprinting]
  );

  return (
    <button
      type="button"
      className={`
        w-14 h-14 rounded-full
        flex items-center justify-center
        transition-all duration-100
        touch-none select-none
        pointer-events-auto
        backdrop-blur-sm
        ${
          isSprinting
            ? 'bg-amber-500/80 border-amber-400 scale-95'
            : 'bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/60'
        }
        border-2
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      aria-label="Sprint"
      aria-pressed={isSprinting}
    >
      <Zap className={`w-6 h-6 ${isSprinting ? 'text-white' : 'text-amber-400'}`} />
    </button>
  );
};

/**
 * Main overlay container for mobile controls.
 * Contains the D-pad, sprint button (in FPS mode), and mobile panel.
 * Should only be rendered on mobile/touch devices.
 */
export const MobileControlsOverlay: React.FC = () => {
  const { mobilePanelVisible, mobilePanelContent, closeMobilePanel } = useMobileControlStore();
  const fpsMode = useUIStore((s) => s.fpsMode);

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Camera preset menu - top right, only in orbit mode */}
      {!fpsMode && (
        <div className="absolute top-4 right-4">
          <CameraPresetMenu />
        </div>
      )}

      {/* D-Pad - bottom left */}
      <div className="absolute bottom-24 left-4">
        <DPad />
      </div>

      {/* Sprint button - bottom right, only in FPS mode */}
      {fpsMode && (
        <div
          className="absolute bottom-28 right-4"
          style={{
            marginBottom: 'max(16px, env(safe-area-inset-bottom))',
            marginRight: 'max(16px, env(safe-area-inset-right))',
          }}
        >
          <SprintButton />
        </div>
      )}

      {/* Mobile Panel */}
      <MobilePanel
        isVisible={mobilePanelVisible}
        content={mobilePanelContent}
        onClose={closeMobilePanel}
      />
    </div>
  );
};

// Export all mobile components for easy importing
export { DPad } from './DPad';
export { MobilePanel } from './MobilePanel';
export { TouchLookHandler } from './TouchLookHandler';
export { MobileFirstPersonController, MobileFPSInstructions } from './MobileFirstPersonController';
export { RotateDeviceOverlay } from './RotateDeviceOverlay';
export { CameraPresetMenu } from './CameraPresetMenu';
