import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sun, Sunset, Moon } from 'lucide-react';
import { MachineData, WorkerData } from '../types';
import { ProductionMetrics } from './ProductionMetrics';
import { audioManager } from '../utils/audioManager';

// Speed options: 0 = paused, 1 = 1x, 60 = 60x (1 sec = 1 min), 300 = 5 min/sec
const SPEED_OPTIONS = [
  { value: 0, label: 'Paused', display: 'II' },
  { value: 1, label: '1x', display: '1x' },
  { value: 60, label: '60x', display: '60x' },
  { value: 300, label: '300x', display: '5m/s' },
];

function useMillClock() {
  const [time, setTime] = useState(() => {
    const start = new Date();
    start.setHours(6, 0, 0, 0);
    return start;
  });
  const [speedIndex, setSpeedIndex] = useState(2); // Default to 60x

  const speed = SPEED_OPTIONS[speedIndex].value;

  useEffect(() => {
    if (speed === 0) return;
    const interval = setInterval(() => {
      setTime(prev => {
        const next = new Date(prev);
        next.setSeconds(next.getSeconds() + speed);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [speed]);

  const hours = time.getHours();
  const shift = useMemo(() => {
    if (hours >= 6 && hours < 14) return { name: 'Day Shift', color: 'text-yellow-400', Icon: Sun };
    if (hours >= 14 && hours < 22) return { name: 'Evening Shift', color: 'text-orange-400', Icon: Sunset };
    return { name: 'Night Shift', color: 'text-blue-400', Icon: Moon };
  }, [hours]);

  const timeString = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const togglePause = () => setSpeedIndex(i => i === 0 ? 2 : 0);
  const cycleSpeed = () => setSpeedIndex(i => {
    const next = i + 1;
    return next >= SPEED_OPTIONS.length ? 1 : next; // Skip pause when cycling
  });

  return { time, timeString, shift, speed, speedIndex, togglePause, cycleSpeed, speedLabel: SPEED_OPTIONS[speedIndex].label };
}

function useAudioState() {
  const [, forceUpdate] = useState({});
  useEffect(() => {
    return audioManager.subscribe(() => forceUpdate({}));
  }, []);
  return {
    muted: audioManager.muted,
    volume: audioManager.volume,
    setMuted: (v: boolean) => { audioManager.muted = v; },
    setVolume: (v: number) => { audioManager.volume = v; }
  };
}

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
  const { muted, volume, setMuted, setVolume } = useAudioState();
  const { timeString, shift, speed, togglePause, cycleSpeed, speedLabel } = useMillClock();

  return (
    <div className="absolute top-0 left-0 z-10 w-full h-full pointer-events-none">
      {/* Header */}
      <div className="p-4 flex justify-between items-start">
        {/* Main Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-950/95 backdrop-blur-xl p-3 rounded-2xl text-white pointer-events-auto border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 min-w-[300px] max-h-[calc(100vh-100px)] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xl border border-slate-600">
                🏭
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">
                MILL<span className="text-orange-500">OS</span>
                <span className="text-slate-500 text-[10px] ml-1">v0.10</span>
              </h1>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest leading-tight">
                Digital Twin Operations
              </p>
              <p className="text-cyan-400/70 text-[9px] italic flex items-center gap-2 leading-tight">
                Nell Watson
                <a
                  href="https://github.com/NellWatson/MillOS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition-colors not-italic"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Source
                </a>
              </p>
            </div>
          </div>

          {/* Mill Clock */}
          <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-2 py-1.5 mb-2 border border-slate-800">
            <div className="flex items-center gap-1.5">
              <shift.Icon className={`w-5 h-5 ${shift.color}`} />
              <div>
                <div className={`text-lg font-mono font-bold tracking-wider leading-tight ${speed === 0 ? 'text-slate-500' : 'text-white'}`}>
                  {timeString}
                </div>
                <div className={`text-[9px] font-medium uppercase tracking-wider ${shift.color}`}>
                  {shift.name}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={togglePause}
                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                  speed === 0
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title={speed === 0 ? 'Resume' : 'Pause'}
              >
                {speed === 0 ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                  </svg>
                )}
              </button>
              <button
                onClick={cycleSpeed}
                className="px-1.5 h-6 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white text-[9px] font-mono font-bold transition-all min-w-[36px]"
                title="Cycle speed"
              >
                {speedLabel}
              </button>
            </div>
          </div>

          {/* Production Metrics */}
          <ProductionMetrics />

          {/* Controls */}
          <div className="space-y-2 border-t border-slate-700/50 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Safety Zones</span>
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
              <div className="flex justify-between text-xs mb-1">
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

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">Sound</span>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-mono font-bold">{muted ? 'OFF' : `${(volume * 100).toFixed(0)}%`}</span>
                  <button
                    onClick={() => setMuted(!muted)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      muted
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                disabled={muted}
                className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${muted ? 'opacity-50' : ''}`}
              />
            </div>

            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                showAIPanel
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Brain className="w-5 h-5" />
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
