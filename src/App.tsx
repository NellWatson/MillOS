import React, { useState, Suspense, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Preload } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { MillScene } from './components/MillScene';
import { trackRender } from './utils/renderProfiler';
import { GameInterface } from './components/ui-new/GameInterface';
import { SpatialAudioTracker } from './components/SpatialAudioTracker';
import { FPSTracker, useFPSStore } from './components/FPSMonitor';
import { CameraController, CameraPresetIndicator } from './components/CameraController';
import {
  FirstPersonController,
  FPSCrosshair,
  FPSInstructions,
} from './components/FirstPersonController';
import {
  FactoryColliders,
  ExitZoneSensors,
  PhysicsFirstPersonController,
  PhysicsDebug,
} from './components/physics';
import ErrorBoundary from './components/ErrorBoundary';
import { MachineData, WorkerData } from './types';
import { ForkliftData } from './components/ForkliftSystem';
import { AnimatePresence, motion } from 'framer-motion';
import { audioManager } from './utils/audioManager';
import { initializeAIEngine } from './utils/aiEngine';
import {
  useGraphicsStore,
  useUIStore,
  initializeSCADASync,
  useGameSimulationStore,
  useProductionStore,
} from './store';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Expose stores to window for performance debugging (dev mode only)
if (import.meta.env.DEV) {
  (
    window as unknown as {
      useGraphicsStore: typeof useGraphicsStore;
      useFPSStore: typeof useFPSStore;
    }
  ).useGraphicsStore = useGraphicsStore;
  (window as unknown as { useFPSStore: typeof useFPSStore }).useFPSStore = useFPSStore;
}
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMultiplayerSync } from './multiplayer';
import { MultiplayerChat, AIDecisionVotingPanel } from './components/multiplayer';

const App: React.FC = () => {
  // PERF DEBUG: Track App re-renders
  trackRender('App');

  const [productionSpeed, setProductionSpeedLocal] = useState(0.8);
  const [showZones, setShowZones] = useState(true);

  // Sync local production speed to store (HolographicDisplays reads from store)
  const setStoreProductionSpeed = useProductionStore((state) => state.setProductionSpeed);
  const setProductionSpeed = useCallback(
    (speed: number) => {
      setProductionSpeedLocal(speed);
      setStoreProductionSpeed(speed);
    },
    [setStoreProductionSpeed]
  );

  // Initialize store with local state on mount
  useEffect(() => {
    setStoreProductionSpeed(productionSpeed);
  }, []);

  // New UI handles panels via Dock/Sidebar, but we still need some state for selection
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [selectedForklift, setSelectedForklift] = useState<ForkliftData | null>(null);

  // AI/SCADA panel state - synced bidirectionally with GameInterface via props
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSCADAPanel, setShowSCADAPanel] = useState(false);

  const [audioInitialized, setAudioInitialized] = useState(false);
  const [qualityNotification, setQualityNotification] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  // PERFORMANCE: Consolidated store subscriptions with useShallow to prevent unnecessary re-renders
  const { currentQuality, enablePhysics } = useGraphicsStore(
    useShallow((state) => ({
      currentQuality: state.graphics.quality,
      enablePhysics: state.graphics.enablePhysics,
    }))
  );
  // Use currentQuality directly - Canvas key forces remount when quality changes
  const canvasQuality = currentQuality;
  const fpsMode = useUIStore((state) => state.fpsMode);
  const [showFpsInstructions, setShowFpsInstructions] = useState(false);
  const hasShownFpsInstructions = useRef(false);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const webglHandlersRef = useRef<{ lost: (event: Event) => void; restored: () => void } | null>(
    null
  );

  // Memoized callbacks
  const handleCloseSelection = useCallback(() => {
    setSelectedMachine(null);
    setSelectedWorker(null);
  }, []);

  const handleSelectMachine = useCallback((machine: MachineData) => {
    setSelectedMachine(machine);
    setSelectedWorker(null); // Mutual exclusion
  }, []);
  const handleSelectWorker = useCallback((worker: WorkerData) => {
    setSelectedWorker(worker);
    setSelectedMachine(null); // Mutual exclusion
  }, []);

  const handleSelectForklift = useCallback(
    (forklift: ForkliftData) => setSelectedForklift(forklift),
    []
  );
  const handleLockChange = useCallback((locked: boolean) => {
    if (locked) {
      setShowFpsInstructions(false);
    }
  }, []);

  // Show FPS instructions only once when first entering FPS mode
  useEffect(() => {
    if (fpsMode && !hasShownFpsInstructions.current) {
      setShowFpsInstructions(true);
      hasShownFpsInstructions.current = true;
    }
  }, [fpsMode]);

  // Use custom hook for keyboard shortcuts
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

  // Initialize multiplayer state synchronization
  useMultiplayerSync();

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

  // Cleanup WebGL context listeners on unmount
  useEffect(() => {
    return () => {
      const gl = glRef.current;
      const handlers = webglHandlersRef.current;
      if (gl?.domElement && handlers) {
        gl.domElement.removeEventListener('webglcontextlost', handlers.lost);
        gl.domElement.removeEventListener('webglcontextrestored', handlers.restored);
      }
    };
  }, []);

  // Initialize AI Engine observers
  useEffect(() => {
    const cleanup = initializeAIEngine();
    return cleanup;
  }, []);

  // Initialize SCADA system - uses same consolidated subscription
  const enableSCADA = useGraphicsStore((state) => state.graphics.enableSCADA);
  useEffect(() => {
    if (!enableSCADA) {
      return;
    }
    const cleanup = initializeSCADASync();
    return cleanup;
  }, [enableSCADA]);

  // Audio effects for selection
  const prevSelectedMachineRef = useRef(selectedMachine);
  useEffect(() => {
    if (selectedMachine && !prevSelectedMachineRef.current) {
      audioManager.playPanelOpen();
    } else if (!selectedMachine && prevSelectedMachineRef.current) {
      audioManager.playPanelClose();
    }
    prevSelectedMachineRef.current = selectedMachine;
  }, [selectedMachine]);

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
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        Skip to main content
      </a>

      {/* NEW UI INTERFACE Wrapper */}
      <GameInterface
        productionSpeed={productionSpeed}
        setProductionSpeed={setProductionSpeed}
        showZones={showZones}
        setShowZones={setShowZones}
        selectedMachine={selectedMachine}
        selectedWorker={selectedWorker}
        onCloseSelection={handleCloseSelection}
        showAIPanel={showAIPanel}
        showSCADAPanel={showSCADAPanel}
        onAIPanelChange={setShowAIPanel}
        onSCADAPanelChange={setShowSCADAPanel}
      />

      {/* Forklift Info Panel (Keep as legacy simple overlay for now, or move to sidebar later) */}
      <AnimatePresence>
        {selectedForklift && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-4 top-20 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-amber-500/30 z-50 min-w-64 pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-amber-400 font-bold text-lg">Forklift</h3>
              <button
                onClick={() => setSelectedForklift(null)}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Canvas with Error Boundary */}
      <main
        id="main-content"
        className="absolute inset-0 z-0"
        aria-label="3D factory visualization"
      >
        <ErrorBoundary fallback={WebGLErrorFallback}>
          <Canvas
            key={`canvas-${canvasQuality}`} // Force remount when quality changes
            shadows={canvasQuality !== 'low' ? { type: THREE.PCFShadowMap } : false}
            camera={{ position: [70, 40, 70], fov: 65, near: 0.5, far: 600 }}
            gl={{
              antialias: canvasQuality !== 'low',
              alpha: false,
              toneMappingExposure: 1.1,
              powerPreference: 'high-performance',
              preserveDrawingBuffer: false,
              failIfMajorPerformanceCaveat: false,
            }}
            dpr={canvasQuality === 'low' ? 1 : Math.min(window.devicePixelRatio, 1.5)}
            onCreated={({ gl }) => {
              glRef.current = gl;
              const handleContextLost = (event: Event) => {
                event.preventDefault();
                console.error('[WebGL] Context lost - too many GPU resources.');
              };
              const handleContextRestored = () => {
                console.log('[WebGL] Context restored');
                window.location.reload();
              };
              webglHandlersRef.current = {
                lost: handleContextLost,
                restored: handleContextRestored,
              };
              gl.domElement.addEventListener('webglcontextlost', handleContextLost);
              gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
            }}
          >
            <color attach="background" args={['#0a0f1a']} />
            {/* Fog extended to match camera far plane, prevents clipping artifacts */}
            <fog attach="fog" args={['#0a0f1a', 150, 550]} />

            <Suspense fallback={null}>
              {enablePhysics ? (
                /* Physics-enabled mode */
                <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
                  {/* Static colliders for factory geometry */}
                  <FactoryColliders />
                  <ExitZoneSensors />
                  {/* Debug wireframes (only on ultra quality) */}
                  <PhysicsDebug />

                  {fpsMode ? (
                    <PhysicsFirstPersonController onLockChange={handleLockChange} />
                  ) : (
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
                  )}

                  <MillScene
                    productionSpeed={productionSpeed}
                    showZones={showZones}
                    onSelectMachine={handleSelectMachine}
                    onSelectWorker={handleSelectWorker}
                    onSelectForklift={handleSelectForklift}
                  />
                </Physics>
              ) : (
                /* Legacy non-physics mode */
                <>
                  {fpsMode ? (
                    <FirstPersonController onLockChange={handleLockChange} />
                  ) : (
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
                  )}

                  <MillScene
                    productionSpeed={productionSpeed}
                    showZones={showZones}
                    onSelectMachine={handleSelectMachine}
                    onSelectWorker={handleSelectWorker}
                    onSelectForklift={handleSelectForklift}
                  />
                </>
              )}

              <SpatialAudioTracker />
              <FPSTracker />

              {!fpsMode && (
                <CameraController
                  orbitControlsRef={orbitControlsRef}
                  autoRotateEnabled={autoRotate && !selectedMachine && !selectedWorker}
                  targetSpeed={0.15}
                />
              )}
              <Preload all />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </main>

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
              className={`px-6 py-4 rounded-xl backdrop-blur-xl border shadow-2xl ${
                qualityNotification === 'EMERGENCY STOP'
                  ? 'bg-red-900/95 border-red-500 text-red-100 animate-pulse'
                  : 'bg-slate-800/90 border-slate-600 text-slate-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl font-bold uppercase tracking-wider">
                  {qualityNotification}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multiplayer UI Components */}
      <MultiplayerChat />
      <AIDecisionVotingPanel />
    </div>
  );
};

export default App;
