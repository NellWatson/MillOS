import React, { useState, Suspense, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Preload } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { MillScene } from './components/MillScene';
import { UIOverlay } from './components/UIOverlay';
import { AICommandCenter } from './components/AICommandCenter';
import { AlertSystem } from './components/AlertSystem';
import { WorkerDetailPanel } from './components/WorkerDetailPanel';
import { PostProcessing } from './components/PostProcessing';
import { SpatialAudioTracker } from './components/SpatialAudioTracker';
import { FPSTracker } from './components/FPSMonitor';
import { EmergencyOverlay } from './components/EmergencyOverlay';
import { CameraController, useCameraStore, CAMERA_PRESETS, CameraPresetIndicator } from './components/CameraController';
import { SecurityCameraViews } from './components/SecurityCameraViews';
import { MachineData, WorkerData } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { audioManager } from './utils/audioManager';
import { initializeAIEngine } from './utils/aiEngine';
import { useMillStore, GraphicsQuality } from './store';

const App: React.FC = () => {
  const [productionSpeed, setProductionSpeed] = useState(0.8);
  const [showZones, setShowZones] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [qualityNotification, setQualityNotification] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  // Graphics quality shortcuts
  const setGraphicsQuality = useMillStore((state) => state.setGraphicsQuality);
  const currentQuality = useMillStore((state) => state.graphics.quality);

  // Emergency stop state
  const forkliftEmergencyStop = useMillStore((state) => state.forkliftEmergencyStop);
  const setForkliftEmergencyStop = useMillStore((state) => state.setForkliftEmergencyStop);
  const addSafetyIncident = useMillStore((state) => state.addSafetyIncident);

  // Camera presets
  const setCameraPreset = useCameraStore((state) => state.setPreset);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  // Initialize audio on first user interaction (required by Web Audio API)
  const initializeAudio = useCallback(() => {
    if (!audioInitialized) {
      audioManager.resume().then(() => {
        audioManager.startAmbientSounds();
        audioManager.startOutdoorAmbient();  // Birds, wind, distant traffic
        audioManager.startRadioChatter();     // Radio static/beeps from workers
        audioManager.startWorkerVoices();     // Distant shouts/whistles from workers
        audioManager.startPASystem();         // PA announcements and shift bells
        audioManager.startCompressorCycling(); // Industrial air compressor cycling
        audioManager.startMetalClanks();       // Random metal clanks from factory floor
        setAudioInitialized(true);
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

  // Initialize AI Engine observers (shift change detection, outcome tracking)
  useEffect(() => {
    const cleanup = initializeAIEngine();
    return cleanup;
  }, []);

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const qualityKeys: Record<string, GraphicsQuality> = {
      'F1': 'low',
      'F2': 'medium',
      'F3': 'high',
      'F4': 'ultra',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Emergency stop on Spacebar
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const newState = !forkliftEmergencyStop;
        setForkliftEmergencyStop(newState);
        if (newState) {
          audioManager.playEmergencyStop();
          addSafetyIncident({
            type: 'emergency',
            description: 'Emergency stop activated via keyboard (Spacebar)'
          });
          setQualityNotification('EMERGENCY STOP');
        } else {
          setQualityNotification('E-STOP RELEASED');
        }
        setTimeout(() => setQualityNotification(null), 2000);
        return;
      }

      // Close panels on escape
      if (e.key === 'Escape') {
        if (showAIPanel || selectedMachine || selectedWorker) {
          audioManager.playPanelClose();
        }
        setShowAIPanel(false);
        setSelectedMachine(null);
        setSelectedWorker(null);
        return;
      }

      // Graphics quality shortcuts (F1-F4)
      if (qualityKeys[e.key]) {
        e.preventDefault();
        const quality = qualityKeys[e.key];
        setGraphicsQuality(quality);
        audioManager.playClick();
        setQualityNotification(quality);
        setTimeout(() => setQualityNotification(null), 2000);
        return;
      }

      // Additional shortcuts (case-insensitive)
      const key = e.key.toLowerCase();

      // P - Toggle pause (set production speed to 0 or restore)
      if (key === 'p') {
        e.preventDefault();
        audioManager.playClick();
        if (productionSpeed > 0) {
          setProductionSpeed(0);
          setQualityNotification('PAUSED');
        } else {
          setProductionSpeed(0.8);
          setQualityNotification('RESUMED');
        }
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // Z - Toggle safety zones
      if (key === 'z') {
        e.preventDefault();
        audioManager.playClick();
        setShowZones(!showZones);
        setQualityNotification(showZones ? 'ZONES OFF' : 'ZONES ON');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // I - Toggle AI panel (changed from A to avoid conflict with WASD movement)
      if (key === 'i') {
        e.preventDefault();
        if (!showAIPanel) {
          audioManager.playPanelOpen();
        } else {
          audioManager.playPanelClose();
        }
        setShowAIPanel(!showAIPanel);
        return;
      }

      // H - Toggle heat map
      if (key === 'h') {
        e.preventDefault();
        audioManager.playClick();
        const currentHeatMap = useMillStore.getState().showHeatMap;
        useMillStore.getState().setShowHeatMap(!currentHeatMap);
        setQualityNotification(currentHeatMap ? 'HEATMAP OFF' : 'HEATMAP ON');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // +/= - Increase production speed
      if (key === '+' || key === '=') {
        e.preventDefault();
        audioManager.playClick();
        const newSpeed = Math.min(2, productionSpeed + 0.1);
        setProductionSpeed(newSpeed);
        return;
      }

      // - - Decrease production speed
      if (key === '-') {
        e.preventDefault();
        audioManager.playClick();
        const newSpeed = Math.max(0, productionSpeed - 0.1);
        setProductionSpeed(newSpeed);
        return;
      }

      // M - Toggle panel minimize
      if (key === 'm') {
        e.preventDefault();
        audioManager.playClick();
        const currentMinimized = useMillStore.getState().panelMinimized;
        useMillStore.getState().setPanelMinimized(!currentMinimized);
        return;
      }

      // T - Toggle theme
      if (key === 't') {
        e.preventDefault();
        audioManager.playClick();
        useMillStore.getState().toggleTheme();
        const newTheme = useMillStore.getState().theme;
        setQualityNotification(newTheme === 'dark' ? 'DARK MODE' : 'LIGHT MODE');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // ? - Toggle keyboard shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        audioManager.playClick();
        const currentShow = useMillStore.getState().showShortcuts;
        useMillStore.getState().setShowShortcuts(!currentShow);
        return;
      }

      // R - Toggle auto-rotation
      if (key === 'r') {
        e.preventDefault();
        audioManager.playClick();
        setAutoRotate((prev) => !prev);
        setQualityNotification(autoRotate ? 'ROTATION OFF' : 'ROTATION ON');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // F - Toggle fullscreen
      if (key === 'f') {
        e.preventDefault();
        audioManager.playClick();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          setQualityNotification('FULLSCREEN');
        } else {
          document.exitFullscreen().catch(() => {});
          setQualityNotification('WINDOWED');
        }
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // G - Toggle GPS mini-map
      if (key === 'g') {
        e.preventDefault();
        audioManager.playClick();
        const current = useMillStore.getState().showMiniMap;
        useMillStore.getState().setShowMiniMap(!current);
        setQualityNotification(current ? 'GPS OFF' : 'GPS ON');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // C - Toggle security cameras
      if (key === 'c') {
        e.preventDefault();
        audioManager.playClick();
        const current = useMillStore.getState().showSecurityCameras;
        useMillStore.getState().setShowSecurityCameras(!current);
        setQualityNotification(current ? 'CAMERAS OFF' : 'CAMERAS ON');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // 0 - Reset camera to default overview
      if (e.key === '0') {
        e.preventDefault();
        audioManager.playClick();
        setCameraPreset(0); // Overview preset
        setQualityNotification('RESET VIEW');
        setTimeout(() => setQualityNotification(null), 1500);
        return;
      }

      // 1-5 - Camera presets
      const presetIndex = parseInt(e.key) - 1;
      if (presetIndex >= 0 && presetIndex < CAMERA_PRESETS.length) {
        e.preventDefault();
        audioManager.playClick();
        setCameraPreset(presetIndex);
        const preset = CAMERA_PRESETS[presetIndex];
        setQualityNotification(preset.name.toUpperCase());
        setTimeout(() => setQualityNotification(null), 2000);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAIPanel, selectedMachine, selectedWorker, setGraphicsQuality, productionSpeed, showZones, forkliftEmergencyStop, setForkliftEmergencyStop, addSafetyIncident, setCameraPreset, autoRotate]);

  // Panel open/close sounds
  const prevShowAIPanelRef = React.useRef(showAIPanel);
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
        selectedMachine={selectedMachine}
        onCloseSelection={() => setSelectedMachine(null)}
      />

      {/* Alert System */}
      <AlertSystem />

      {/* Emergency Overlay - flashing red border */}
      <EmergencyOverlay />

      {/* AI Command Center Slide-out */}
      <AnimatePresence>
        {showAIPanel && (
          <AICommandCenter isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} />
        )}
      </AnimatePresence>

      {/* Worker Detail Panel */}
      <AnimatePresence>
        {selectedWorker && (
          <WorkerDetailPanel worker={selectedWorker} onClose={() => setSelectedWorker(null)} />
        )}
      </AnimatePresence>

      {/* 3D Canvas */}
      <Canvas
        shadows={currentQuality !== 'low' ? { type: THREE.PCFShadowMap } : false}
        camera={{ position: [40, 25, 40], fov: 45, near: 0.5, far: 300 }}
        gl={{ antialias: currentQuality !== 'low', alpha: false, toneMappingExposure: 1.1 }}
        dpr={1}
      >
        <color attach="background" args={['#0a0f1a']} />
        <fog attach="fog" args={['#0a0f1a', 120, 280]} />

        <Suspense fallback={null}>
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

          <MillScene
            productionSpeed={productionSpeed}
            showZones={showZones}
            onSelectMachine={setSelectedMachine}
            onSelectWorker={setSelectedWorker}
          />

          {/* Spatial audio tracking - updates audio volume based on camera distance */}
          <SpatialAudioTracker />

          {/* FPS tracking for performance monitoring */}
          <FPSTracker />

          {/* Camera preset controller for smooth transitions */}
          <CameraController
            orbitControlsRef={orbitControlsRef}
            autoRotateEnabled={autoRotate && !selectedMachine && !selectedWorker && !showAIPanel}
            targetSpeed={0.15}
          />

          {/* Security camera feeds - renders to DOM containers */}
          <SecurityCameraViews />

          <PostProcessing />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      <div className="fixed bottom-4 left-4 text-slate-600 text-xs pointer-events-none">
        MillOS Digital Twin v0.10 | Powered by AI
      </div>

      {/* Camera preset indicator */}
      <CameraPresetIndicator />

      {/* Quality/Status change notification */}
      <AnimatePresence>
        {qualityNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className={`px-6 py-4 rounded-xl backdrop-blur-xl border shadow-2xl ${
              qualityNotification === 'EMERGENCY STOP' ? 'bg-red-900/95 border-red-500 text-red-100 animate-pulse' :
              qualityNotification === 'E-STOP RELEASED' ? 'bg-green-900/90 border-green-600 text-green-300' :
              qualityNotification === 'low' ? 'bg-slate-800/90 border-slate-600 text-slate-300' :
              qualityNotification === 'medium' ? 'bg-yellow-900/90 border-yellow-600 text-yellow-300' :
              qualityNotification === 'high' ? 'bg-cyan-900/90 border-cyan-600 text-cyan-300' :
              qualityNotification === 'ultra' ? 'bg-purple-900/90 border-purple-600 text-purple-300' :
              'bg-slate-800/90 border-slate-600 text-slate-300'
            }`}>
              <div className="text-center">
                <div className="text-3xl font-bold uppercase tracking-wider">{qualityNotification}</div>
                <div className="text-xs opacity-70 mt-1">
                  {qualityNotification.includes('EMERGENCY') || qualityNotification.includes('E-STOP') ? 'Safety System' :
                   ['low', 'medium', 'high', 'ultra'].includes(qualityNotification) ? 'Graphics Quality' : 'Status'}
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
