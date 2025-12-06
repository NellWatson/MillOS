import React, { useState, Suspense, useEffect, useCallback, useRef, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Preload } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { MillScene } from './components/MillScene';
import { trackRender } from './utils/renderProfiler';
import { UIOverlay } from './components/UIOverlay';
import { AlertSystem } from './components/AlertSystem';
import { SpatialAudioTracker } from './components/SpatialAudioTracker';
import { FPSTracker, useFPSStore } from './components/FPSMonitor';
import { EmergencyOverlay } from './components/EmergencyOverlay';
import { CameraController, CameraPresetIndicator } from './components/CameraController';
import {
  FirstPersonController,
  FPSCrosshair,
  FPSInstructions,
} from './components/FirstPersonController';
import ErrorBoundary from './components/ErrorBoundary';
import { MachineData, WorkerData } from './types';
import { ForkliftData } from './components/ForkliftSystem';
import { AnimatePresence, motion } from 'framer-motion';
import { audioManager } from './utils/audioManager';
import { initializeAIEngine } from './utils/aiEngine';
import { useGraphicsStore, useUIStore, initializeSCADASync, useGameSimulationStore } from './store';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Expose stores to window for performance debugging (dev mode only)
if (import.meta.env.DEV) {
  (window as unknown as { useGraphicsStore: typeof useGraphicsStore; useFPSStore: typeof useFPSStore }).useGraphicsStore = useGraphicsStore;
  (window as unknown as { useFPSStore: typeof useFPSStore }).useFPSStore = useFPSStore;
}
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy-load heavy panels to reduce initial bundle size (saves ~300KB gzipped)
const AICommandCenter = lazy(() =>
  import('./components/AICommandCenter').then((m) => ({ default: m.AICommandCenter }))
);
const SCADAPanel = lazy(() =>
  import('./components/SCADAPanel').then((m) => ({ default: m.SCADAPanel }))
);
const WorkerDetailPanel = lazy(() =>
  import('./components/WorkerDetailPanel').then((m) => ({ default: m.WorkerDetailPanel }))
);
// const PostProcessing = lazy(() =>
//   import('./components/PostProcessing').then((m) => ({ default: m.PostProcessing }))
// );

// NOTE: FrameLimiter component was removed - it caused the 30fps performance ceiling
// that made v0.20 run "like treacle". Default frameloop="always" is now used instead.

const App: React.FC = () => {
  // PERF DEBUG: Track App re-renders
  trackRender('App');

  const [productionSpeed, setProductionSpeed] = useState(0.8);
  const [showZones, setShowZones] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSCADAPanel, setShowSCADAPanel] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [selectedForklift, setSelectedForklift] = useState<ForkliftData | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [qualityNotification, setQualityNotification] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  const currentQuality = useGraphicsStore((state) => state.graphics.quality);
  // CRITICAL: Canvas WebGL props (shadows, antialias, dpr) cannot change at runtime.
  // Use a stable initial quality to prevent Canvas recreation when quality changes.
  // This ref captures the initial quality and is used for Canvas-level settings.
  const initialQualityRef = useRef(currentQuality);
  const canvasQuality = initialQualityRef.current;
  // const postProcessingEnabled = useGraphicsStore(
  //   (state) =>
  //     state.graphics.enableSSAO ||
  //     state.graphics.enableBloom ||
  //     state.graphics.enableVignette ||
  //     state.graphics.enableChromaticAberration ||
  //     state.graphics.enableFilmGrain ||
  //     state.graphics.enableDepthOfField
  // );
  const fpsMode = useUIStore((state) => state.fpsMode);
  const [showFpsInstructions, setShowFpsInstructions] = useState(false);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const webglHandlersRef = useRef<{ lost: (event: Event) => void; restored: () => void } | null>(
    null
  );

  // Memoized callbacks to prevent unnecessary re-renders
  const handleCloseSelection = useCallback(() => setSelectedMachine(null), []);
  const handleCloseAIPanel = useCallback(() => setShowAIPanel(false), []);
  const handleCloseSCADAPanel = useCallback(() => setShowSCADAPanel(false), []);
  const handleCloseWorker = useCallback(() => setSelectedWorker(null), []);
  const handleCloseForklift = useCallback(() => setSelectedForklift(null), []);
  const handleSelectMachine = useCallback(
    (machine: MachineData) => setSelectedMachine(machine),
    []
  );
  const handleSelectWorker = useCallback((worker: WorkerData) => setSelectedWorker(worker), []);
  const handleSelectForklift = useCallback(
    (forklift: ForkliftData) => setSelectedForklift(forklift),
    []
  );
  const handleLockChange = useCallback((locked: boolean) => {
    if (locked) {
      setShowFpsInstructions(false);
    }
  }, []);

  // Show FPS instructions when entering FPS mode
  useEffect(() => {
    if (fpsMode) {
      setShowFpsInstructions(true);
    }
  }, [fpsMode]);

  // Use custom hook for keyboard shortcuts (extracted to reduce component complexity and dependencies)
  useKeyboardShortcuts({
    showAIPanel,
    setShowAIPanel,
    showSCADAPanel,
    setShowSCADAPanel,
    selectedMachine,
    setSelectedMachine,
    selectedWorker,
    setSelectedWorker,
    productionSpeed,
    setProductionSpeed,
    showZones,
    setShowZones,
    autoRotate,
    setAutoRotate,
    setQualityNotification,
  });

  // Initialize audio on first user interaction (required by Web Audio API)
  const initializeAudio = useCallback(() => {
    if (!audioInitialized) {
      audioManager
        .resume()
        .then(() => {
          audioManager.startAmbientSounds();
          audioManager.startOutdoorAmbient(); // Birds, wind, distant traffic
          audioManager.startRadioChatter(); // Radio static/beeps from workers
          audioManager.startWorkerVoices(); // Distant shouts/whistles from workers
          audioManager.startPASystem(); // PA announcements and shift bells
          audioManager.startCompressorCycling(); // Industrial air compressor cycling
          audioManager.startMetalClanks(); // Random metal clanks from factory floor
          audioManager.startMusic(); // Background music (respects musicEnabled setting)
          setAudioInitialized(true);
        })
        .catch((error) => {
          console.warn('[Audio] Failed to initialize:', error);
          setAudioInitialized(true); // Continue without audio
        });
    }
  }, [audioInitialized]);

  useEffect(() => {
    const handleInteraction = () => initializeAudio();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [initializeAudio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioManager.stopAll();
    };
  }, []);

  // PERFORMANCE: Pause animations when tab is hidden
  const setTabVisible = useGameSimulationStore((state) => state.setTabVisible);
  useEffect(() => {
    const handleVisibility = () => {
      const isVisible = !document.hidden;
      audioManager.setBackgroundVisibility(document.hidden);
      setTabVisible(isVisible);
    };
    // Set initial state
    setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [setTabVisible]);

  useEffect(() => {
    return () => {
      const gl = glRef.current;
      const handlers = webglHandlersRef.current;
      if (gl && handlers) {
        gl.domElement.removeEventListener('webglcontextlost', handlers.lost);
        gl.domElement.removeEventListener('webglcontextrestored', handlers.restored);
      }
    };
  }, []);

  // Initialize AI Engine observers (shift change detection, outcome tracking)
  useEffect(() => {
    const cleanup = initializeAIEngine();
    return cleanup;
  }, []);

  // Initialize SCADA system with bidirectional store sync (if enabled)
  // PERFORMANCE FIX: SCADA is now OFF by default - causes 900 updates/sec overhead
  const enableSCADA = useGraphicsStore((state) => state.graphics.enableSCADA);
  useEffect(() => {
    if (!enableSCADA) {
      // SCADA disabled - skip initialization for performance
      return;
    }
    const cleanup = initializeSCADASync();
    return cleanup;
  }, [enableSCADA]);

  // Panel open/close sounds
  const prevShowAIPanelRef = React.useRef(showAIPanel);
  const prevShowSCADAPanelRef = React.useRef(showSCADAPanel);
  const prevSelectedMachineRef = React.useRef(selectedMachine);
  const prevSelectedWorkerRef = React.useRef(selectedWorker);

  useEffect(() => {
    if (showAIPanel && !prevShowAIPanelRef.current) {
      audioManager.playPanelOpen();
    } else if (!showAIPanel && prevShowAIPanelRef.current) {
      audioManager.playPanelClose();
    }
    prevShowAIPanelRef.current = showAIPanel;
  }, [showAIPanel]);

  useEffect(() => {
    if (showSCADAPanel && !prevShowSCADAPanelRef.current) {
      audioManager.playPanelOpen();
    } else if (!showSCADAPanel && prevShowSCADAPanelRef.current) {
      audioManager.playPanelClose();
    }
    prevShowSCADAPanelRef.current = showSCADAPanel;
  }, [showSCADAPanel]);

  useEffect(() => {
    if (selectedMachine && !prevSelectedMachineRef.current) {
      audioManager.playPanelOpen();
    } else if (!selectedMachine && prevSelectedMachineRef.current) {
      audioManager.playPanelClose();
    }
    prevSelectedMachineRef.current = selectedMachine;
  }, [selectedMachine]);

  useEffect(() => {
    if (selectedWorker && !prevSelectedWorkerRef.current) {
      audioManager.playPanelOpen();
    } else if (!selectedWorker && prevSelectedWorkerRef.current) {
      audioManager.playPanelClose();
    }
    prevSelectedWorkerRef.current = selectedWorker;
  }, [selectedWorker]);

  // WebGL context loss fallback component
  const WebGLErrorFallback = (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-8 max-w-md text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">WebGL Context Lost</h2>
        <p className="text-slate-400 mb-4">
          The 3D graphics context encountered an error. This can happen due to GPU limitations or
          driver issues.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg mx-auto"
        >
          <RotateCcw className="w-4 h-4" />
          Reload Application
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-slate-950">
      {/* UI Layer */}
      <UIOverlay
        productionSpeed={productionSpeed}
        setProductionSpeed={setProductionSpeed}
        showZones={showZones}
        setShowZones={setShowZones}
        showAIPanel={showAIPanel}
        setShowAIPanel={setShowAIPanel}
        showSCADAPanel={showSCADAPanel}
        setShowSCADAPanel={setShowSCADAPanel}
        selectedMachine={selectedMachine}
        onCloseSelection={handleCloseSelection}
      />

      {/* Alert System */}
      <AlertSystem />

      {/* Emergency Overlay - flashing red border */}
      <EmergencyOverlay />

      {/* AI Command Center Slide-out */}
      <AnimatePresence>
        {showAIPanel && <AICommandCenter isOpen={showAIPanel} onClose={handleCloseAIPanel} />}
      </AnimatePresence>

      {/* SCADA Monitor Panel */}
      <AnimatePresence>
        {showSCADAPanel && <SCADAPanel isOpen={showSCADAPanel} onClose={handleCloseSCADAPanel} />}
      </AnimatePresence>

      {/* Worker Detail Panel */}
      <AnimatePresence>
        {selectedWorker && (
          <WorkerDetailPanel worker={selectedWorker} onClose={handleCloseWorker} />
        )}
      </AnimatePresence>

      {/* Forklift Info Panel */}
      <AnimatePresence>
        {selectedForklift && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-4 top-20 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-amber-500/30 z-50 min-w-64"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-amber-400 font-bold text-lg">Forklift</h3>
              <button
                onClick={handleCloseForklift}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">ID:</span>
                <span className="text-white font-mono">{selectedForklift.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Operator:</span>
                <span className="text-white">{selectedForklift.operatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cargo:</span>
                <span
                  className={
                    selectedForklift.cargo === 'pallet' ? 'text-green-400' : 'text-gray-500'
                  }
                >
                  {selectedForklift.cargo === 'pallet' ? 'Loaded' : 'Empty'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Position:</span>
                <span className="text-white font-mono text-xs">
                  [{selectedForklift.position.map((p) => p.toFixed(1)).join(', ')}]
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Canvas with Error Boundary */}
      <ErrorBoundary fallback={WebGLErrorFallback}>
        <Canvas
          // PERFORMANCE FIX: Removed frameloop="demand" which was capping FPS at 30
          // CRITICAL: Use canvasQuality (stable) instead of currentQuality (reactive)
          // WebGL context props cannot change at runtime without breaking the canvas
          shadows={canvasQuality !== 'low' ? { type: THREE.PCFShadowMap } : false}
          camera={{ position: [70, 40, 70], fov: 65, near: 0.5, far: 300 }}
          gl={{
            antialias: canvasQuality !== 'low',
            alpha: false,
            toneMappingExposure: 1.1,
            powerPreference: 'high-performance',
            // Limit texture and geometry to prevent GPU memory exhaustion
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={canvasQuality === 'low' ? 1 : Math.min(window.devicePixelRatio, 1.5)}
          onCreated={({ gl }) => {
            glRef.current = gl;

            const handleContextLost = (event: Event) => {
              event.preventDefault();
              console.error(
                '[WebGL] Context lost - too many GPU resources. Try lowering graphics quality.'
              );
            };

            const handleContextRestored = () => {
              console.log('[WebGL] Context restored');
              window.location.reload();
            };

            webglHandlersRef.current = {
              lost: handleContextLost,
              restored: handleContextRestored,
            };

            // Handle WebGL context loss gracefully
            gl.domElement.addEventListener('webglcontextlost', handleContextLost);
            gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);

            // Log renderer info for debugging
            const info = gl.info;
            console.log('[WebGL] Renderer initialized:', {
              geometries: info.memory.geometries,
              textures: info.memory.textures,
            });
          }}
        >
          <color attach="background" args={['#0a0f1a']} />
          <fog attach="fog" args={['#0a0f1a', 150, 350]} />
          {/* PERFORMANCE FIX: Removed FrameLimiter - was causing 30fps ceiling */}

          <Suspense fallback={null}>
            {/* Camera controls - conditionally render Orbit or FPS mode */}
            {fpsMode ? (
              <FirstPersonController onLockChange={handleLockChange} />
            ) : (
              <>
                {/* Note: OrbitControls uses non-passive wheel event listeners for camera zoom.
                    This triggers a Chrome DevTools warning but is expected behavior for 3D controls.
                    The listener must call preventDefault() to control zoom, which is incompatible
                    with passive listeners. This is a known Three.js/drei limitation. */}
                <OrbitControls
                  ref={orbitControlsRef}
                  maxPolarAngle={Math.PI / 2 - 0.05}
                  minPolarAngle={0.2}
                  minDistance={15}
                  maxDistance={100}
                  autoRotate
                  autoRotateSpeed={0}
                  target={[0, 5, 0]}
                  enableDamping
                  dampingFactor={0.05}
                />
              </>
            )}

            <MillScene
              productionSpeed={productionSpeed}
              showZones={showZones}
              onSelectMachine={handleSelectMachine}
              onSelectWorker={handleSelectWorker}
              onSelectForklift={handleSelectForklift}
            />

            {/* Spatial audio tracking - updates audio volume based on camera distance */}
            <SpatialAudioTracker />

            {/* FPS tracking for performance monitoring */}
            <FPSTracker />

            {/* Camera preset controller for smooth transitions (orbit mode only) */}
            {!fpsMode && (
              <CameraController
                orbitControlsRef={orbitControlsRef}
                autoRotateEnabled={
                  autoRotate && !selectedMachine && !selectedWorker && !showAIPanel
                }
                targetSpeed={0.15}
              />
            )}

            {/* CRITICAL FIX: PostProcessing disabled until we fix runtime quality switch issues.
                EffectComposer breaks scene when mounted during quality change.
                TODO: Investigate if we can preload EffectComposer or use stable initial quality */}
            {/* {postProcessingEnabled && (
              <Suspense fallback={null}>
                <PostProcessing />
              </Suspense>
            )} */}
            <Preload all />
          </Suspense>
        </Canvas>
      </ErrorBoundary>

      {/* Loading overlay */}
      <div className="fixed bottom-4 left-4 text-slate-600 text-xs pointer-events-none">
        MillOS Digital Twin v0.20 | Powered by AI
      </div>

      {/* Camera preset indicator (orbit mode only) */}
      {!fpsMode && <CameraPresetIndicator />}

      {/* FPS mode overlays */}
      <FPSCrosshair />
      <FPSInstructions visible={showFpsInstructions && fpsMode} />

      {/* Quality/Status change notification */}
      <AnimatePresence>
        {qualityNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div
              className={`px-6 py-4 rounded-xl backdrop-blur-xl border shadow-2xl ${qualityNotification === 'EMERGENCY STOP'
                ? 'bg-red-900/95 border-red-500 text-red-100 animate-pulse'
                : qualityNotification === 'E-STOP RELEASED'
                  ? 'bg-green-900/90 border-green-600 text-green-300'
                  : qualityNotification === 'low'
                    ? 'bg-slate-800/90 border-slate-600 text-slate-300'
                    : qualityNotification === 'medium'
                      ? 'bg-yellow-900/90 border-yellow-600 text-yellow-300'
                      : qualityNotification === 'high'
                        ? 'bg-cyan-900/90 border-cyan-600 text-cyan-300'
                        : qualityNotification === 'ultra'
                          ? 'bg-purple-900/90 border-purple-600 text-purple-300'
                          : 'bg-slate-800/90 border-slate-600 text-slate-300'
                }`}
            >
              <div className="text-center">
                <div className="text-3xl font-bold uppercase tracking-wider">
                  {qualityNotification}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {qualityNotification.includes('EMERGENCY') ||
                    qualityNotification.includes('E-STOP')
                    ? 'Safety System'
                    : ['low', 'medium', 'high', 'ultra'].includes(qualityNotification)
                      ? 'Graphics Quality'
                      : 'Status'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
