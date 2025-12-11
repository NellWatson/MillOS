import React, { useState } from 'react';
import { Dock, DockMode } from './components/ui-new/dock/Dock';
import { ContextSidebar } from './components/ui-new/sidebar/ContextSidebar';
import { MissionControl } from './components/ui-new/sidebar/MissionControl';

export const NewUIPreview: React.FC = () => {
  const [activeMode, setActiveMode] = useState<DockMode>('overview');
  // In a real app, 'isSidebarOpen' might be controlled by clicking the dock item again
  // For preview, let's keep it open if mode is NOT overview, or maybe just toggled
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleModeChange = (mode: DockMode) => {
    if (activeMode === mode) {
      // Toggle if clicking same icon
      setSidebarOpen(!isSidebarOpen);
    } else {
      setActiveMode(mode);
      setSidebarOpen(true);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center">
      {/* Background visual to simulate the 3D scene */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Simulate a 3D object in the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-500/30 rounded-full animate-pulse-slow"></div>
      </div>

      {/* Left Panel: Mission Control */}
      <MissionControl />

      {/* Bottom Panel: The Dock */}
      <Dock activeMode={activeMode} onModeChange={handleModeChange} />

      {/* Right Panel: Context Sidebar */}
      <ContextSidebar
        mode={activeMode}
        isVisible={isSidebarOpen && activeMode !== 'overview'}
        onClose={() => setSidebarOpen(false)}
        selectedMachine={null}
        selectedWorker={null}
        productionSpeed={1}
        setProductionSpeed={() => {}}
      />
    </div>
  );
};
