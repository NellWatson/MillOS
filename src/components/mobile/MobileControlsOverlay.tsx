import React, { useCallback, useState, useEffect } from 'react';
import { Zap, Maximize, Minimize } from 'lucide-react';
import { DPad } from './DPad';
import { MobilePanel } from './MobilePanel';
import { CameraPresetMenu } from './CameraPresetMenu';
import { useMobileControlStore } from '../../stores/mobileControlStore';
import { useUIStore } from '../../stores/uiStore';

/**
 * Fullscreen toggle button for mobile.
 * Uses Fullscreen API with webkit fallback for iOS Safari.
 */
const FullscreenButton: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        const docEl = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          // Safari/iOS fallback
          await docEl.webkitRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
        };
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch (err) {
      // Fullscreen may be blocked by browser policy
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  return (
    <button
      type="button"
      className="w-11 h-11 rounded-xl bg-slate-800/60 border border-slate-600/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto transition-colors active:bg-slate-700/60"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <Minimize className="w-5 h-5 text-slate-200" />
      ) : (
        <Maximize className="w-5 h-5 text-slate-200" />
      )}
    </button>
  );
};

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
      {/* Fullscreen button - top left */}
      <div
        className="absolute top-4 left-4"
        style={{
          marginTop: 'max(16px, env(safe-area-inset-top))',
          marginLeft: 'max(16px, env(safe-area-inset-left))',
        }}
      >
        <FullscreenButton />
      </div>

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
