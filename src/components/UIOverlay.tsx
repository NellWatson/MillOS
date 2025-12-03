import React from 'react';
import { motion } from 'framer-motion';
import { MachineData, WorkerData } from '../types';
import { ProductionMetrics } from './ProductionMetrics';

interface UIOverlayProps {
  productionSpeed: number;
  setProductionSpeed: (v: number) => void;
  showZones: boolean;
  setShowZones: (v: boolean) => void;
  showAIPanel: boolean;
  setShowAIPanel: (v: boolean) => void;
  selectedMachine: MachineData | null;
  onCloseSelection: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  productionSpeed,
  setProductionSpeed,
  showZones,
  setShowZones,
  showAIPanel,
  setShowAIPanel,
  selectedMachine,
  onCloseSelection
}) => {
  return (
    <div className="absolute top-0 left-0 z-10 w-full h-full pointer-events-none">
      {/* Header */}
      <div className="p-4 flex justify-between items-start">
        {/* Main Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-950/95 backdrop-blur-xl p-5 rounded-2xl text-white pointer-events-auto border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 min-w-[340px]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-2xl font-bold">
                M
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                MILL<span className="text-orange-500">OS</span>
                <span className="text-slate-500 text-sm ml-2">v2.0</span>
              </h1>
              <p className="text-slate-500 text-xs uppercase tracking-widest">
                Digital Twin Operations
              </p>
              <p className="text-cyan-400/70 text-[10px] mt-1 italic">
                An Agentic AI Experiment by Nell Watson
              </p>
            </div>
          </div>

          {/* Production Metrics */}
          <ProductionMetrics />

          {/* Controls */}
          <div className="space-y-4 border-t border-slate-700/50 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Safety Zones</span>
              <button
                onClick={() => setShowZones(!showZones)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                  showZones
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {showZones ? 'VISIBLE' : 'HIDDEN'}
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Production Speed</span>
                <span className="text-orange-400 font-mono font-bold">{(productionSpeed * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={productionSpeed}
                onChange={(e) => setProductionSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                showAIPanel
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-lg">🧠</span>
              AI Command Center
              {showAIPanel && <span className="ml-auto text-xs opacity-70">ESC to close</span>}
            </button>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block bg-slate-950/90 backdrop-blur-xl p-4 rounded-xl text-white pointer-events-auto border border-slate-700/50 shadow-xl"
        >
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-3">Equipment</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-br from-slate-300 to-slate-400" />
              <span className="text-slate-300">Silos (Storage)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-br from-blue-400 to-blue-600" />
              <span className="text-slate-300">Roller Mills</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-br from-white to-slate-200" />
              <span className="text-slate-300">Plansifters</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-orange-600" />
              <span className="text-slate-300">Packers</span>
            </li>
          </ul>
          <div className="border-t border-slate-700/50 mt-3 pt-3">
            <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2">Interaction</h3>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>Click machines to inspect</li>
              <li>Click workers for profiles</li>
              <li>Drag to rotate view</li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Machine Detail Panel */}
      {selectedMachine && (
        <MachineDetailPanel machine={selectedMachine} onClose={onCloseSelection} />
      )}
    </div>
  );
};

const MachineDetailPanel: React.FC<{ machine: MachineData; onClose: () => void }> = ({ machine, onClose }) => {
  const [metrics, setMetrics] = React.useState(machine.metrics);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        rpm: machine.metrics.rpm + (Math.random() - 0.5) * 10,
        temperature: machine.metrics.temperature + (Math.random() - 0.5) * 2,
        vibration: machine.metrics.vibration + (Math.random() - 0.5) * 0.5,
        load: Math.min(100, Math.max(0, machine.metrics.load + (Math.random() - 0.5) * 3))
      });
    }, 500);
    return () => clearInterval(interval);
  }, [machine]);

  const statusColor = machine.status === 'running' ? 'text-green-400' : machine.status === 'warning' ? 'text-yellow-400' : 'text-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="absolute bottom-6 right-6 w-96 pointer-events-auto z-20"
    >
      <div className="bg-slate-950/98 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Animated top border */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-pulse" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{machine.name}</h2>
              <p className="text-cyan-400 text-sm">{machine.type.replace('_', ' ')}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none">×</button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-slate-900/50 rounded-xl">
            <div className={`w-3 h-3 rounded-full animate-pulse ${machine.status === 'running' ? 'bg-green-500' : machine.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className={`font-bold uppercase tracking-wider ${statusColor}`}>{machine.status}</span>
            <span className="text-slate-500 text-sm ml-auto">ID: {machine.id}</span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <MetricCard label="RPM" value={metrics.rpm.toFixed(0)} unit="" color="blue" />
            <MetricCard label="Temperature" value={metrics.temperature.toFixed(1)} unit="°C" color="orange" />
            <MetricCard label="Vibration" value={metrics.vibration.toFixed(2)} unit="mm/s" color="purple" />
            <MetricCard label="Load" value={metrics.load.toFixed(1)} unit="%" color="green" />
          </div>

          {/* Maintenance */}
          <div className="text-xs text-slate-500 space-y-1 border-t border-slate-700/50 pt-4">
            <div className="flex justify-between">
              <span>Last Maintenance</span>
              <span className="text-slate-300">{machine.lastMaintenance}</span>
            </div>
            <div className="flex justify-between">
              <span>Next Scheduled</span>
              <span className="text-cyan-400">{machine.nextMaintenance}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
              View Logs
            </button>
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
              Schedule Maintenance
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; unit: string; color: string }> = ({ label, value, unit, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    cyan: 'text-cyan-400'
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold font-mono ${colorClasses[color]}`}>
        {value}
        <span className="text-xs text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  );
};
