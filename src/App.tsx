import React, { useState, Suspense } from 'react';
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

const App: React.FC = () => {
  const [productionSpeed, setProductionSpeed] = useState(0.8);
  const [showZones, setShowZones] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<MachineData | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);

  // Close panels on escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAIPanel(false);
        setSelectedMachine(null);
        setSelectedWorker(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        camera={{ position: [45, 35, 45], fov: 32 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0f1a']} />
        <fog attach="fog" args={['#0a0f1a', 30, 150]} />

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
        MILLOS Digital Twin v2.0 | Powered by AI
      </div>
    </div>
  );
};

export default App;
