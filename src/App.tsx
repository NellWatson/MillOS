import React, { useState, Suspense, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Preload } from '@react-three/drei';
import { MillScene } from './components/MillScene';
import { UIOverlay } from './components/UIOverlay';
import { AICommandCenter } from './components/AICommandCenter';
import { AlertSystem } from './components/AlertSystem';
import { WorkerDetailPanel } from './components/WorkerDetailPanel';
import { PostProcessing } from './components/PostProcessing';
import { MachineData, WorkerData } from './types';
import { AnimatePresence } from 'framer-motion';
import { audioManager } from './utils/audioManager';

const App: React.FC = () => {
  const [productionSpeed, setProductionSpeed] = useState(0.8);
  const [showZones, setShowZones] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Initialize audio on first user interaction (required by Web Audio API)
  const initializeAudio = useCallback(() => {
    if (!audioInitialized) {
      audioManager.resume().then(() => {
        audioManager.startAmbientSounds();
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

  // Close panels on escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAIPanel || selectedMachine || selectedWorker) {
          audioManager.playPanelClose();
        }
        setShowAIPanel(false);
        setSelectedMachine(null);
        setSelectedWorker(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAIPanel, selectedMachine, selectedWorker]);

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
        shadows
        camera={{ position: [40, 25, 40], fov: 45, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0f1a']} />
        <fog attach="fog" args={['#0a0f1a', 150, 500]} />

        <Suspense fallback={null}>
          <OrbitControls
            maxPolarAngle={Math.PI / 2 - 0.05}
            minPolarAngle={0.2}
            minDistance={15}
            maxDistance={100}
            autoRotate={!selectedMachine && !selectedWorker && !showAIPanel}
            autoRotateSpeed={0.3}
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

          <PostProcessing />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      <div className="fixed bottom-4 left-4 text-slate-600 text-xs pointer-events-none">
        MILLOS Digital Twin v0.10 | Powered by AI
      </div>
    </div>
  );
};

export default App;
