import React from 'react';
import { Home, Brain, Activity, Users, Shield, Settings, Eye, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../../stores/uiStore';
import { useIsMultiplayerActive } from '../../../stores/multiplayerStore';

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

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-2xl z-50 pointer-events-auto"
      aria-label="Main Navigation"
    >
      <DockItem
        mode="overview"
        icon={<Home />}
        label="Overview"
        isActive={activeMode === 'overview'}
        onClick={() => onModeChange('overview')}
      />
      <DockItem
        mode="ai"
        icon={<Brain />}
        label="AI Command"
        isActive={activeMode === 'ai'}
        onClick={() => onModeChange('ai')}
      />
      <DockItem
        mode="scada"
        icon={<Activity />}
        label="SCADA System"
        isActive={activeMode === 'scada'}
        onClick={() => onModeChange('scada')}
      />
      <DockItem
        mode="workforce"
        icon={<Users />}
        label="Workforce"
        isActive={activeMode === 'workforce'}
        onClick={() => onModeChange('workforce')}
      />
      <DockItem
        mode="multiplayer"
        icon={<Radio />}
        label="Multiplayer"
        isActive={activeMode === 'multiplayer'}
        onClick={() => onModeChange('multiplayer')}
        badge={isMultiplayerActive}
      />
      <DockItem
        mode="safety"
        icon={<Shield />}
        label="Safety & Emergency"
        isActive={activeMode === 'safety'}
        onClick={() => onModeChange('safety')}
      />
      <DockItem
        mode="settings"
        icon={<Settings />}
        label="Settings"
        isActive={activeMode === 'settings'}
        onClick={() => onModeChange('settings')}
      />

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* First Person Mode Toggle */}
      <button
        onClick={toggleFpsMode}
        aria-label="First Person Mode (V)"
        aria-pressed={fpsMode}
        title="First Person Mode (V)"
        className={`relative p-3 rounded-xl transition-all ${
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
}> = ({ icon, label, isActive, onClick, badge }) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`relative p-3 rounded-xl transition-all ${
        isActive ? 'bg-white/10 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
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
