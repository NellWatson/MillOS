import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Thermometer, Activity, MessageSquare, User, Settings, Shield } from 'lucide-react';
import { DockMode } from '../dock/Dock';
import { MachineData, WorkerData } from '../../../types';

// Lazy load the heavy panels
const AICommandCenter = lazy(() =>
  import('../../AICommandCenter').then((m) => ({ default: m.AICommandCenter }))
);
const SCADAPanel = lazy(() => import('../../SCADAPanel').then((m) => ({ default: m.SCADAPanel })));
const WorkerDetailPanel = lazy(() =>
  import('../../WorkerDetailPanel').then((m) => ({ default: m.WorkerDetailPanel }))
);

// New Inspector Components
import { MachineInspector } from './MachineInspector';
import { SettingsPanel } from '../panels/SettingsPanel';
import { SafetyPanel } from '../panels/SafetyPanel';
import { OverviewPanel } from '../panels/OverviewPanel';

interface ContextSidebarProps {
  mode: DockMode;
  isVisible: boolean;
  onClose: () => void;
  selectedMachine: MachineData | null;
  selectedWorker: WorkerData | null;
  productionSpeed: number;
  setProductionSpeed: (v: number) => void;
  showZones?: boolean;
  setShowZones?: (v: boolean) => void;
}

export const ContextSidebar: React.FC<ContextSidebarProps> = ({
  mode,
  isVisible,
  onClose,
  selectedMachine,
  selectedWorker,
  productionSpeed,
  setProductionSpeed,
  showZones,
  setShowZones,
}) => {
  // Determine effective content type
  let content = null;
  let headerTitle = 'Inspector';
  let HeaderIcon = Thermometer; // Default concrete icon

  if (selectedMachine) {
    headerTitle = selectedMachine.name;
    HeaderIcon = Thermometer;
    content = <MachineInspector machine={selectedMachine} />;
  } else if (selectedWorker) {
    headerTitle = selectedWorker.name;
    HeaderIcon = User;
    content = (
      <Suspense fallback={<LoadingPlaceholder />}>
        <div className="h-full overflow-y-auto">
          <WorkerDetailPanel worker={selectedWorker} onClose={onClose} embedded={true} />
        </div>
      </Suspense>
    );
  } else if (mode === 'ai') {
    headerTitle = 'AI Command Center';
    HeaderIcon = MessageSquare;
    content = (
      <Suspense fallback={<LoadingPlaceholder />}>
        <div className="h-full flex flex-col">
          <AICommandCenter isOpen={true} onClose={onClose} embedded={true} />
        </div>
      </Suspense>
    );
  } else if (mode === 'scada') {
    headerTitle = 'SCADA Monitor';
    HeaderIcon = Activity;
    content = (
      <Suspense fallback={<LoadingPlaceholder />}>
        <SCADAPanel isOpen={true} onClose={onClose} embedded={true} />
      </Suspense>
    );
  } else if (mode === 'settings') {
    headerTitle = 'System Settings';
    HeaderIcon = Settings;
    content = (
      <SettingsPanel
        productionSpeed={productionSpeed}
        setProductionSpeed={setProductionSpeed}
        showZones={showZones}
        setShowZones={setShowZones}
      />
    );
  } else if (mode === 'safety') {
    headerTitle = 'Safety & Emergency';
    HeaderIcon = Shield;
    content = <SafetyPanel />;
  } else {
    // Overview or workforce mode without selection - show production overview
    headerTitle = 'Mill Overview';
    HeaderIcon = Activity;
    content = <OverviewPanel />;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 bottom-24 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2 text-cyan-400">
              <HeaderIcon size={18} />
              <h2 className="font-bold tracking-wide text-sm uppercase truncate max-w-[200px]">
                {headerTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">{content}</div>

          {/* Footer with branding */}
          <div className="p-3 border-t border-white/10 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-sm border border-slate-600">
                  🏭
                </div>
                <div>
                  <span className="text-xs font-bold text-white">
                    Mill<span className="text-orange-500">OS</span>
                  </span>
                  <select
                    className="text-[9px] ml-1 bg-transparent border-none cursor-pointer text-slate-500 hover:text-orange-400 transition-colors"
                    value="v0.20"
                    onChange={(e) => {
                      window.location.href = `/${e.target.value}/`;
                    }}
                    title="Switch version"
                  >
                    <option value="v0.20">v0.20</option>
                    <option value="v0.10">v0.10</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-cyan-400/70 italic">Nell Watson</span>
                <a
                  href="https://github.com/NellWatson/MillOS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Source
                </a>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

// --- Sub-components ---
const LoadingPlaceholder = () => (
  <div className="flex items-center justify-center h-full text-cyan-500 animate-pulse">
    <Activity size={24} />
  </div>
);
