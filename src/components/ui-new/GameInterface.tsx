import React, { useEffect } from 'react';
import { Dock, DockMode } from './dock/Dock';
import { MissionControl } from './sidebar/MissionControl';
import { ContextSidebar } from './sidebar/ContextSidebar';
import { StatusHUD } from './hud/StatusHUD';
import { EmergencyOverlay } from '../EmergencyOverlay';
import { AlertSystem } from '../AlertSystem';
import { MachineData, WorkerData } from '../../types';
import { PAAnnouncementSystem, GamificationBar, MiniMap } from '../GameFeatures';

interface GameInterfaceProps {
  productionSpeed: number;
  setProductionSpeed: (v: number) => void;
  showZones: boolean;
  setShowZones: (v: boolean) => void;
  selectedMachine: MachineData | null;
  selectedWorker: WorkerData | null;
  onCloseSelection: () => void;
}

export const GameInterface: React.FC<GameInterfaceProps> = ({
  productionSpeed,
  setProductionSpeed,
  showZones,
  setShowZones,
  selectedMachine,
  selectedWorker,
  onCloseSelection,
}) => {
  // Local state for the Dock
  const [activeMode, setActiveMode] = React.useState<DockMode>('overview');
  const [sidebarVisible, setSidebarVisible] = React.useState(true);

  // Sync external selection with Dock/Sidebar state
  useEffect(() => {
    if (selectedMachine || selectedWorker) {
      // Show sidebar when something is selected
      setSidebarVisible(true);
    }
  }, [selectedMachine, selectedWorker]);

  // Handler for Dock interactions
  const handleModeChange = (mode: DockMode) => {
    if (
      activeMode === mode &&
      (mode === 'ai' || mode === 'settings' || mode === 'scada' || mode === 'safety')
    ) {
      // Toggle off if clicking the same active mode for panels
      setActiveMode('overview');
    } else {
      setActiveMode(mode);
      // Show sidebar when changing modes
      setSidebarVisible(true);
    }

    // Clear 3D selection when switching modes to show the correct panel
    // This ensures Home/Overview shows the OverviewPanel, not a stale selection
    onCloseSelection();
  };

  const handleSidebarClose = () => {
    // Clear any selection first
    onCloseSelection();

    // If we are in a modal mode, go back to overview
    if (
      activeMode === 'ai' ||
      activeMode === 'scada' ||
      activeMode === 'settings' ||
      activeMode === 'safety'
    ) {
      setActiveMode('overview');
    } else {
      // If already in overview/workforce mode with no selection, hide the sidebar
      setSidebarVisible(false);
    }
  };

  // Determine if Sidebar should be visible
  const isSidebarVisible = sidebarVisible;

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* 1. Top HUD Layer */}
      <StatusHUD />

      {/* 2. Emergency Flasher */}
      <EmergencyOverlay />

      {/* 3. Toast Notifications */}
      <AlertSystem />

      {/* 4. Immersion Overlays */}
      <PAAnnouncementSystem />
      <GamificationBar />
      <MiniMap />

      {/* 5. Left Sidebar: Mission Control */}
      <MissionControl />

      {/* 6. Bottom Dock */}
      <Dock activeMode={activeMode} onModeChange={handleModeChange} />

      {/* 7. Right Context Sidebar */}
      <ContextSidebar
        mode={activeMode}
        isVisible={isSidebarVisible}
        onClose={handleSidebarClose}
        selectedMachine={selectedMachine}
        selectedWorker={selectedWorker}
        productionSpeed={productionSpeed}
        setProductionSpeed={setProductionSpeed}
        showZones={showZones}
        setShowZones={setShowZones}
      />
    </div>
  );
};
