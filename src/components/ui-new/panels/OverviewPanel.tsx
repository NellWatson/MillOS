import React from 'react';
import {
  Activity,
  Package,
  Thermometer,
  TrendingUp,
  Clock,
  Truck,
  AlertTriangle,
  Pause,
  Play,
  FastForward,
} from 'lucide-react';
import { useProductionStore } from '../../../stores/productionStore';
import { useGameSimulationStore } from '../../../stores/gameSimulationStore';
import { useSafetyStore } from '../../../stores/safetyStore';

export const OverviewPanel: React.FC = () => {
  const metrics = useProductionStore((state) => state.metrics);
  const totalBagsProduced = useProductionStore((state) => state.totalBagsProduced);
  const productionTarget = useProductionStore((state) => state.productionTarget);
  const machines = useProductionStore((state) => state.machines);
  const workers = useProductionStore((state) => state.workers);
  const dockStatus = useProductionStore((state) => state.dockStatus);

  const weather = useGameSimulationStore((state) => state.weather);
  const currentShift = useGameSimulationStore((state) => state.currentShift);
  const gameTime = useGameSimulationStore((state) => state.gameTime);
  const gameSpeed = useGameSimulationStore((state) => state.gameSpeed);
  const setGameSpeed = useGameSimulationStore((state) => state.setGameSpeed);

  const safetyMetrics = useSafetyStore((state) => state.safetyMetrics);

  // Calculate machine status counts
  const machineStats = {
    running: machines.filter((m) => m.status === 'running').length,
    warning: machines.filter((m) => m.status === 'warning').length,
    critical: machines.filter((m) => m.status === 'critical').length,
    idle: machines.filter((m) => m.status === 'idle').length,
  };

  // Calculate safety score
  const safetyScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        (safetyMetrics?.nearMisses ?? 0) * 5 -
        (safetyMetrics?.safetyStops ?? 0) * 2 -
        (safetyMetrics?.workerEvasions ?? 0)
    )
  );

  // Format time
  const formatGameTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Progress to target
  const targetProgress = productionTarget
    ? Math.min(100, (productionTarget.producedBags / productionTarget.targetBags) * 100)
    : 0;

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto custom-scrollbar">
      {/* Production Summary */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity size={14} className="text-cyan-400" />
          Production Summary
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Throughput"
            value={`${metrics.throughput}`}
            unit="bags/hr"
            icon={<Package size={14} />}
            color="cyan"
          />
          <StatCard
            label="Efficiency"
            value={`${metrics.efficiency.toFixed(1)}`}
            unit="%"
            icon={<TrendingUp size={14} />}
            color="green"
          />
          <StatCard
            label="Uptime"
            value={`${metrics.uptime.toFixed(1)}`}
            unit="%"
            icon={<Clock size={14} />}
            color="blue"
          />
          <StatCard
            label="Quality"
            value={`${metrics.quality.toFixed(1)}`}
            unit="%"
            icon={<Thermometer size={14} />}
            color="purple"
          />
        </div>
      </section>

      {/* Daily Target */}
      {productionTarget && (
        <section className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">Daily Target</span>
            <span className="text-xs font-mono text-cyan-400">
              {productionTarget.producedBags.toLocaleString()} /{' '}
              {productionTarget.targetBags.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                targetProgress >= 100 ? 'bg-green-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <div className="text-right text-[10px] text-slate-500 mt-1">
            {targetProgress.toFixed(1)}% complete
          </div>
        </section>
      )}

      {/* Machine Status */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity size={14} className="text-orange-400" />
          Machine Status
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Running" value={machineStats.running} color="green" />
          <MiniStat label="Warning" value={machineStats.warning} color="yellow" />
          <MiniStat label="Critical" value={machineStats.critical} color="red" />
          <MiniStat label="Idle" value={machineStats.idle} color="slate" />
        </div>
      </section>

      {/* Shift & Time Control */}
      <section className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Current Shift</div>
            <div className="text-sm font-bold text-white capitalize">{currentShift}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-white">{formatGameTime(gameTime)}</div>
            <div
              className={`text-[10px] font-bold ${gameSpeed === 0 ? 'text-red-400' : 'text-green-400'}`}
            >
              {gameSpeed === 0
                ? 'PAUSED'
                : gameSpeed === 1
                  ? '1x'
                  : gameSpeed === 60
                    ? '60x'
                    : '3000x'}
            </div>
          </div>
        </div>
        {/* Fast Forward Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setGameSpeed(0)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              gameSpeed === 0
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Pause"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setGameSpeed(1)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              gameSpeed === 1
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Normal (1x)"
          >
            <Play className="w-3.5 h-3.5" />
            1x
          </button>
          <button
            onClick={() => setGameSpeed(60)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              gameSpeed === 60
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Fast (60x)"
          >
            <FastForward className="w-3.5 h-3.5" />
            60x
          </button>
          <button
            onClick={() => setGameSpeed(3000)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              gameSpeed === 3000
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title="Ultra (3000x)"
          >
            <FastForward className="w-3.5 h-3.5" />
            <FastForward className="w-3.5 h-3.5 -ml-2" />
          </button>
        </div>
      </section>

      {/* Weather & Workers */}
      <section className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Weather</div>
          <div className="text-sm font-bold text-white capitalize">{weather}</div>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Workers</div>
          <div className="text-sm font-bold text-white">{workers.length} on shift</div>
        </div>
      </section>

      {/* Safety Overview */}
      <section className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={14}
              className={
                safetyScore > 90
                  ? 'text-green-400'
                  : safetyScore > 70
                    ? 'text-yellow-400'
                    : 'text-red-500'
              }
            />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Safety Score
            </span>
          </div>
          <span
            className={`text-lg font-bold font-mono ${safetyScore > 90 ? 'text-green-400' : safetyScore > 70 ? 'text-yellow-400' : 'text-red-500'}`}
          >
            {safetyScore}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-slate-300">{safetyMetrics?.nearMisses ?? 0}</div>
            <div className="text-[10px] text-slate-500">Near Misses</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-300">
              {safetyMetrics?.safetyStops ?? 0}
            </div>
            <div className="text-[10px] text-slate-500">Safety Stops</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-300">
              {safetyMetrics?.daysSinceIncident ?? 0}
            </div>
            <div className="text-[10px] text-slate-500">Days Safe</div>
          </div>
        </div>
      </section>

      {/* Dock Status */}
      <section>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Truck size={14} className="text-amber-400" />
          Dock Status
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <DockCard
            label="Receiving"
            status={dockStatus.receiving.status}
            eta={dockStatus.receiving.etaMinutes}
          />
          <DockCard
            label="Shipping"
            status={dockStatus.shipping.status}
            eta={dockStatus.shipping.etaMinutes}
          />
        </div>
      </section>

      {/* Total Production */}
      <div className="text-center py-3 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-xl border border-cyan-500/20">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
          Total Bags Produced
        </div>
        <div className="text-2xl font-bold font-mono text-cyan-400">
          {totalBagsProduced.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// Sub-components
const StatCard: React.FC<{
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, unit, icon, color }) => {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400 border-cyan-500/20',
    green: 'text-green-400 border-green-500/20',
    blue: 'text-blue-400 border-blue-500/20',
    purple: 'text-purple-400 border-purple-500/20',
    orange: 'text-orange-400 border-orange-500/20',
  };

  return (
    <div className={`bg-slate-800/30 border ${colorClasses[color]} rounded-lg p-3`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        <span className={colorClasses[color].split(' ')[0]}>{icon}</span>
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-mono font-bold ${colorClasses[color].split(' ')[0]}`}>
          {value}
        </span>
        <span className="text-[10px] text-slate-600">{unit}</span>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const colorClasses: Record<string, string> = {
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    red: 'text-red-400 bg-red-500/10',
    slate: 'text-slate-400 bg-slate-500/10',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-2 text-center`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
};

const DockCard: React.FC<{ label: string; status: string; eta: number }> = ({
  label,
  status,
  eta,
}) => {
  const statusColors: Record<string, { bg: string; text: string }> = {
    clear: { bg: 'bg-slate-600/20', text: 'text-slate-400' },
    arriving: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    loading: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    departing: { bg: 'bg-green-500/20', text: 'text-green-400' },
  };

  const colors = statusColors[status] || statusColors.clear;

  return (
    <div className={`${colors.bg} border border-white/5 rounded-lg p-3`}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-bold capitalize ${colors.text}`}>{status}</div>
      {status !== 'clear' && eta > 0 && (
        <div className="text-[10px] text-slate-500">ETA: {eta} min</div>
      )}
    </div>
  );
};
