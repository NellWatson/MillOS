import React from 'react';
import { Home, Brain, Activity, Users, Shield, Settings, Eye, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../../stores/uiStore';
import { useIsMultiplayerActive } from '../../../stores/multiplayerStore';
import { useMobileDetection } from '../../../hooks/useMobileDetection';
import { useMobileControlStore } from '../../../stores/mobileControlStore';

export type DockMode =
  | 'overview'
  | 'ai'
  | 'scada'
  | 'workforce'
  | 'safety'
  | 'settings'
  | 'multiplayer';

interface DockProps {
  activeMode: DockMode;
  onModeChange: (mode: DockMode) => void;
}

export const Dock: React.FC<DockProps> = ({ activeMode, onModeChange }) => {
  const fpsMode = useUIStore((state) => state.fpsMode);
  const toggleFpsMode = useUIStore((state) => state.toggleFpsMode);
  const isMultiplayerActive = useIsMultiplayerActive();
  const { isMobile } = useMobileDetection();
  const openMobilePanel = useMobileControlStore((state) => state.openMobilePanel);

  // On mobile, clicking a dock item opens the mobile panel instead of sidebar
  const handleModeChange = (mode: DockMode) => {
    if (isMobile) {
      openMobilePanel(mode);
    } else {
      onModeChange(mode);
    }
  };

  return (
    <nav
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center shadow-2xl z-50 pointer-events-auto ${
        isMobile ? 'px-2 py-2 gap-1' : 'px-4 py-3 gap-4'
      }`}
      aria-label="Main Navigation"
      style={
        isMobile
          ? {
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
              marginLeft: 'env(safe-area-inset-left)',
              marginRight: 'env(safe-area-inset-right)',
            }
          : undefined
      }
    >
      <DockItem
        mode="overview"
        icon={<Home />}
        label="Overview"
        isActive={activeMode === 'overview'}
        onClick={() => handleModeChange('overview')}
        isMobile={isMobile}
      />
      <DockItem
        mode="ai"
        icon={<Brain />}
        label="AI Command"
        isActive={activeMode === 'ai'}
        onClick={() => handleModeChange('ai')}
        isMobile={isMobile}
      />
      <DockItem
        mode="scada"
        icon={<Activity />}
        label="SCADA System"
        isActive={activeMode === 'scada'}
        onClick={() => handleModeChange('scada')}
        isMobile={isMobile}
      />
      <DockItem
        mode="workforce"
        icon={<Users />}
        label="Workforce"
        isActive={activeMode === 'workforce'}
        onClick={() => handleModeChange('workforce')}
        isMobile={isMobile}
      />
      <DockItem
        mode="multiplayer"
        icon={<Radio />}
        label="Multiplayer"
        isActive={activeMode === 'multiplayer'}
        onClick={() => handleModeChange('multiplayer')}
        badge={isMultiplayerActive}
        isMobile={isMobile}
      />
      <DockItem
        mode="safety"
        icon={<Shield />}
        label="Safety & Emergency"
        isActive={activeMode === 'safety'}
        onClick={() => handleModeChange('safety')}
        isMobile={isMobile}
      />
      <DockItem
        mode="settings"
        icon={<Settings />}
        label="Settings"
        isActive={activeMode === 'settings'}
        onClick={() => handleModeChange('settings')}
        isMobile={isMobile}
      />

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* First Person Mode Toggle */}
      <button
        onClick={toggleFpsMode}
        aria-label="First Person Mode (V)"
        aria-pressed={fpsMode}
        title="First Person Mode (V)"
        className={`relative rounded-xl transition-all ${
          isMobile ? 'p-2 min-w-[44px] min-h-[44px]' : 'p-3'
        } ${
          fpsMode
            ? 'bg-violet-500/20 text-violet-400'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Eye />
        {fpsMode && (
          <motion.div
            layoutId="fps-active"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full"
          />
        )}
      </button>
    </nav>
  );
};

const DockItem: React.FC<{
  mode: DockMode;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: boolean;
  isMobile?: boolean;
}> = ({ icon, label, isActive, onClick, badge, isMobile }) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`relative rounded-xl transition-all ${
        isMobile ? 'p-2 min-w-[44px] min-h-[44px]' : 'p-3'
      } ${isActive ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
      {badge && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      )}
      {isActive && (
        <motion.div
          layoutId="dock-active"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
        />
      )}
    </button>
  );
};
