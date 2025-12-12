import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  Brain,
  Activity,
  Users,
  Shield,
  Settings,
  Play,
  Pause,
  AlertTriangle,
  Zap,
  TrendingUp,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  UserPlus,
  Copy,
  Gauge,
} from 'lucide-react';
import type { DockMode } from '../ui-new/dock/Dock';
import { useProductionStore } from '../../stores/productionStore';
import { useUIStore } from '../../stores/uiStore';
import { useMultiplayerStore } from '../../stores/multiplayerStore';

interface MobilePanelProps {
  isVisible: boolean;
  content: DockMode | null;
  onClose: () => void;
}

// Animation variants for the panel
const panelVariants = {
  hidden: {
    opacity: 0,
    y: '100%',
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    y: '50%',
    transition: { duration: 0.2 },
  },
};

// Get icon for panel header
const getPanelIcon = (mode: DockMode) => {
  const iconClass = 'w-5 h-5';
  switch (mode) {
    case 'overview':
      return <Home className={iconClass} />;
    case 'ai':
      return <Brain className={iconClass} />;
    case 'scada':
      return <Activity className={iconClass} />;
    case 'workforce':
      return <Users className={iconClass} />;
    case 'safety':
      return <Shield className={iconClass} />;
    case 'settings':
      return <Settings className={iconClass} />;
    default:
      return <Home className={iconClass} />;
  }
};

// Get title for panel header
const getPanelTitle = (mode: DockMode) => {
  switch (mode) {
    case 'overview':
      return 'Overview';
    case 'ai':
      return 'AI Command';
    case 'scada':
      return 'SCADA System';
    case 'workforce':
      return 'Workforce';
    case 'safety':
      return 'Safety';
    case 'settings':
      return 'Settings';
    case 'multiplayer':
      return 'Multiplayer';
    default:
      return 'Panel';
  }
};

// Overview panel content
const OverviewContent: React.FC = () => {
  const productionSpeed = useProductionStore((s) => s.productionSpeed);
  const setProductionSpeed = useProductionStore((s) => s.setProductionSpeed);
  const isPaused = productionSpeed === 0;

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-2">Production Speed</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProductionSpeed(isPaused ? 1 : 0)}
            className={`p-3 rounded-lg ${
              isPaused ? 'bg-green-600/80' : 'bg-red-600/80'
            } transition-colors`}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={productionSpeed}
            onChange={(e) => setProductionSpeed(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-mono w-12 text-right">{productionSpeed.toFixed(1)}x</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SpeedButton speed={0.5} label="0.5x" />
        <SpeedButton speed={1} label="1x" />
        <SpeedButton speed={1.5} label="1.5x" />
        <SpeedButton speed={2} label="2x" />
      </div>
    </div>
  );
};

const SpeedButton: React.FC<{ speed: number; label: string }> = ({ speed, label }) => {
  const productionSpeed = useProductionStore((s) => s.productionSpeed);
  const setProductionSpeed = useProductionStore((s) => s.setProductionSpeed);
  const isActive = Math.abs(productionSpeed - speed) < 0.01;

  return (
    <button
      onClick={() => setProductionSpeed(speed)}
      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-cyan-600/80 text-white'
          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
      }`}
    >
      {label}
    </button>
  );
};

// Safety panel content
const SafetyContent: React.FC = () => {
  return (
    <div className="space-y-4">
      <button className="w-full p-4 bg-red-600 hover:bg-red-500 rounded-lg flex items-center justify-center gap-2 text-white font-bold transition-colors">
        <AlertTriangle className="w-6 h-6" />
        EMERGENCY STOP
      </button>
      <div className="text-xs text-slate-400 text-center">
        Tap to halt all production immediately
      </div>
    </div>
  );
};

// Settings panel content
const SettingsContent: React.FC = () => {
  const showZones = useUIStore((s) => s.showZones);
  const setShowZones = useUIStore((s) => s.setShowZones);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm">Safety Zones</span>
          </div>
          <button
            onClick={() => setShowZones(!showZones)}
            className={`w-12 h-6 rounded-full transition-colors ${
              showZones ? 'bg-cyan-600' : 'bg-slate-600'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                showZones ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// AI Command panel content
const AIContent: React.FC = () => {
  const aiDecisions = useProductionStore((s) => s.aiDecisions);
  const recentDecisions = aiDecisions.slice(0, 5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-400 animate-pulse" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Brain className="w-4 h-4" />
        <span>Recent AI Decisions</span>
      </div>
      {recentDecisions.length === 0 ? (
        <div className="text-center py-4 text-slate-500 text-sm">
          No AI decisions yet
        </div>
      ) : (
        <div className="space-y-2">
          {recentDecisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-slate-800/50 rounded-lg p-2 flex items-start gap-2"
            >
              {getStatusIcon(decision.status)}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{decision.action}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {decision.reasoning}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// SCADA System panel content
const SCADAContent: React.FC = () => {
  const metrics = useProductionStore((s) => s.metrics);
  const scadaLive = useProductionStore((s) => s.scadaLive);

  const MetricCard: React.FC<{ label: string; value: string | number; unit: string; icon: React.ReactNode }> = ({
    label,
    value,
    unit,
    icon,
  }) => (
    <div className="bg-slate-800/50 rounded-lg p-2">
      <div className="flex items-center gap-1 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">
        {value}
        <span className="text-xs text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity className="w-4 h-4" />
          <span>System Metrics</span>
        </div>
        <div className={`flex items-center gap-1 text-xs ${scadaLive ? 'text-green-400' : 'text-slate-500'}`}>
          {scadaLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{scadaLive ? 'Live' : 'Offline'}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Throughput"
          value={metrics.throughput}
          unit="bags/hr"
          icon={<Zap className="w-3 h-3" />}
        />
        <MetricCard
          label="Efficiency"
          value={metrics.efficiency.toFixed(1)}
          unit="%"
          icon={<TrendingUp className="w-3 h-3" />}
        />
        <MetricCard
          label="Uptime"
          value={metrics.uptime.toFixed(1)}
          unit="%"
          icon={<Gauge className="w-3 h-3" />}
        />
        <MetricCard
          label="Quality"
          value={metrics.quality.toFixed(1)}
          unit="%"
          icon={<CheckCircle className="w-3 h-3" />}
        />
      </div>
    </div>
  );
};

// Workforce panel content
const WorkforceContent: React.FC = () => {
  const workers = useProductionStore((s) => s.workers);
  const satisfaction = useProductionStore((s) => s.workerSatisfaction);

  const activeWorkers = workers.filter((w) => w.currentTask !== 'idle').length;
  const totalWorkers = workers.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Users className="w-4 h-4" />
        <span>Workforce Status</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{activeWorkers}/{totalWorkers}</div>
          <div className="text-[10px] text-slate-400">Active Workers</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">{satisfaction.overallScore}%</div>
          <div className="text-[10px] text-slate-400">Satisfaction</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Productivity Bonus</span>
          <span className="text-green-400">+{satisfaction.productivityBonus}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, satisfaction.overallScore)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Multiplayer panel content
const MultiplayerContent: React.FC = () => {
  const connectionState = useMultiplayerStore((s) => s.connectionState);
  const roomCode = useMultiplayerStore((s) => s.roomCode);
  const isHost = useMultiplayerStore((s) => s.isHost);
  const remotePlayers = useMultiplayerStore((s) => s._remotePlayersArray);
  const createRoom = useMultiplayerStore((s) => s.createRoom);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
    }
  };

  if (connectionState === 'disconnected') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="w-4 h-4" />
          <span>Multiplayer</span>
        </div>
        <button
          onClick={createRoom}
          className="w-full p-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center gap-2 text-white font-medium transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Create Room
        </button>
        <div className="text-[10px] text-slate-500 text-center">
          Share the room code with friends to play together
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="w-4 h-4" />
          <span>Room: {roomCode}</span>
        </div>
        <button
          onClick={copyRoomCode}
          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
          aria-label="Copy room code"
        >
          <Copy className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-2">
        <div className="text-xs text-slate-400 mb-2">
          {isHost ? 'You are the host' : 'Connected as guest'}
        </div>
        <div className="text-sm text-white">
          {remotePlayers.length + 1} player{remotePlayers.length !== 0 ? 's' : ''} in room
        </div>
        {remotePlayers.length > 0 && (
          <div className="mt-2 space-y-1">
            {remotePlayers.slice(0, 3).map((player) => (
              <div key={player.id} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-slate-300">{player.name}</span>
              </div>
            ))}
            {remotePlayers.length > 3 && (
              <div className="text-[10px] text-slate-500">
                +{remotePlayers.length - 3} more
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={leaveRoom}
        className="w-full p-2 bg-red-600/80 hover:bg-red-500/80 rounded-lg text-white text-sm font-medium transition-colors"
      >
        Leave Room
      </button>
    </div>
  );
};

// Placeholder content for other panels
const PlaceholderContent: React.FC<{ mode: DockMode }> = ({ mode }) => {
  return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <div className="text-center">
        <div className="mb-2">{getPanelIcon(mode)}</div>
        <div className="text-sm">{getPanelTitle(mode)} panel</div>
        <div className="text-xs text-slate-500 mt-1">Coming soon</div>
      </div>
    </div>
  );
};

// Get content based on mode
const getPanelContent = (mode: DockMode | null) => {
  switch (mode) {
    case 'overview':
      return <OverviewContent />;
    case 'ai':
      return <AIContent />;
    case 'scada':
      return <SCADAContent />;
    case 'workforce':
      return <WorkforceContent />;
    case 'multiplayer':
      return <MultiplayerContent />;
    case 'safety':
      return <SafetyContent />;
    case 'settings':
      return <SettingsContent />;
    default:
      return mode ? <PlaceholderContent mode={mode} /> : null;
  }
};

/**
 * Mobile panel component - centered modal at 1/3 screen height
 * Shows simplified versions of sidebar content
 */
export const MobilePanel: React.FC<MobilePanelProps> = ({ isVisible, content, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && content && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 pointer-events-auto"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-4 right-4 z-50 pointer-events-auto"
            style={{
              bottom: 'max(100px, calc(env(safe-area-inset-bottom) + 90px))',
              maxHeight: '33vh',
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-200">
                  {getPanelIcon(content)}
                  <span className="font-medium">{getPanelTitle(content)}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(33vh - 56px)' }}>
                {getPanelContent(content)}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
