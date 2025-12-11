import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useProductionStore } from '../stores/productionStore';
import { useSafetyStore } from '../stores/safetyStore';

interface MetricsData {
  time: string;
  throughput: number;
  efficiency: number;
  quality: number;
}

export const ProductionMetrics: React.FC = () => {
  const [data, setData] = useState<MetricsData[]>([]);

  // Get real metrics from the stores
  const storeMetrics = useProductionStore((state) => state.metrics);
  const productionSpeed = useProductionStore((state) => state.productionSpeed);
  const machines = useProductionStore((state) => state.machines);
  const safetyMetrics = useSafetyStore((state) => state.safetyMetrics);

  // Calculate real-time metrics based on actual store data
  const liveMetrics = React.useMemo(() => {
    // Calculate active machines for efficiency
    const runningMachines = machines.filter((m) => m.status === 'running').length;
    const totalMachines = machines.length || 1;
    const machineEfficiency = (runningMachines / totalMachines) * 100;

    // Base throughput scales with production speed and machine efficiency
    const baseThroughput = 1000;
    const actualThroughput = Math.round(
      baseThroughput * productionSpeed * (machineEfficiency / 100) + 200
    );

    // Bags per minute from production speed
    const bagsPerMinute = Math.round(35 * productionSpeed + runningMachines * 1.5);

    // Energy usage scales with production
    const energyUsage = Math.round(700 + productionSpeed * 200 + runningMachines * 15);

    return {
      throughput: actualThroughput,
      efficiency: storeMetrics.efficiency,
      quality: storeMetrics.quality,
      uptime: storeMetrics.uptime,
      bagsPerMinute,
      energyUsage,
    };
  }, [storeMetrics, productionSpeed, machines]);

  // Track previous efficiency for trend calculation
  const prevEfficiencyRef = useRef(storeMetrics.efficiency);
  const efficiencyTrend = React.useMemo(() => {
    const diff = storeMetrics.efficiency - prevEfficiencyRef.current;
    prevEfficiencyRef.current = storeMetrics.efficiency;
    return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  }, [storeMetrics.efficiency]);

  // Calculate time since last safety incident
  const getTimeSinceIncident = () => {
    if (!safetyMetrics.lastIncidentTime) return 'No incidents';
    const elapsed = Date.now() - safetyMetrics.lastIncidentTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Generate initial data based on current metrics
  useEffect(() => {
    const initialData: MetricsData[] = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      // Generate historical data with slight variance from current values
      initialData.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        throughput: liveMetrics.throughput * (0.95 + Math.random() * 0.1),
        efficiency: storeMetrics.efficiency * (0.98 + Math.random() * 0.04),
        quality: storeMetrics.quality * (0.99 + Math.random() * 0.02),
      });
    }
    setData(initialData);
  }, []); // Run once on mount - uses initial values to seed historical data

  // Update chart data with real metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: MetricsData = {
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        throughput: liveMetrics.throughput,
        efficiency: storeMetrics.efficiency,
        quality: storeMetrics.quality,
      };

      setData((prev) => [...prev.slice(-29), newPoint]);
    }, 5000); // Increased from 2s to 5s to reduce re-renders

    return () => clearInterval(interval);
  }, [liveMetrics.throughput, storeMetrics.efficiency, storeMetrics.quality]);

  return (
    <div className="space-y-1.5">
      {/* Live KPIs */}
      <div className="grid grid-cols-3 gap-1">
        <div className="bg-slate-800/50 rounded p-1.5 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase">Throughput</div>
          <div className="text-base font-bold text-white font-mono leading-tight">
            {liveMetrics.throughput}
          </div>
          <div className="text-[10px] text-slate-400">t/hr</div>
        </div>
        <div className="bg-slate-800/50 rounded p-1.5 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase">Efficiency</div>
          <div className="text-base font-bold text-green-400 font-mono leading-tight">
            {liveMetrics.efficiency}%
          </div>
          <div
            className={`text-[10px] ${efficiencyTrend.startsWith('+') ? 'text-green-500/50' : 'text-red-500/50'}`}
          >
            {efficiencyTrend}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded p-1.5 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase">Quality</div>
          <div className="text-base font-bold text-purple-400 font-mono leading-tight">
            {liveMetrics.quality}%
          </div>
          <div className="text-[10px] text-purple-500/50">Grade A</div>
        </div>
      </div>

      {/* Mini Charts */}
      <div className="bg-slate-800/30 rounded p-1.5 border border-slate-700/30">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] text-slate-400">Production (30m)</span>
          <span className="text-[8px] text-cyan-400 flex items-center gap-0.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div
          className="h-10"
          role="img"
          aria-label={`Production throughput chart showing current value of ${liveMetrics.throughput} tons per hour over the last 30 minutes`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="throughput"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#throughputGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Accessible data table for screen readers */}
        <table className="sr-only">
          <caption>Production throughput data for the last 30 minutes</caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>Throughput (t/hr)</th>
              <th>Efficiency (%)</th>
              <th>Quality (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-5).map((point, idx) => (
              <tr key={idx}>
                <td>{point.time}</td>
                <td>{point.throughput.toFixed(0)}</td>
                <td>{point.efficiency.toFixed(1)}</td>
                <td>{point.quality.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="bg-slate-800/30 rounded p-1">
          <div className="text-sm font-bold text-orange-400 font-mono leading-tight">
            {liveMetrics.bagsPerMinute}
          </div>
          <div className="text-[10px] text-slate-400">bags/min</div>
        </div>
        <div className="bg-slate-800/30 rounded p-1">
          <div className="text-sm font-bold text-blue-400 font-mono leading-tight">
            {liveMetrics.uptime}%
          </div>
          <div className="text-[10px] text-slate-400">uptime</div>
        </div>
        <div className="bg-slate-800/30 rounded p-1">
          <div className="text-sm font-bold text-yellow-400 font-mono leading-tight">
            {liveMetrics.energyUsage}
          </div>
          <div className="text-[10px] text-slate-400">kWh</div>
        </div>
      </div>

      {/* Safety Metrics */}
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded p-1.5 border border-green-700/30">
        <div className="flex items-center gap-1 mb-1">
          <svg
            className="w-2.5 h-2.5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-[9px] font-medium text-green-400">Safety</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-slate-900/50 rounded p-1">
            <div className="text-sm font-bold text-green-400 font-mono leading-tight">
              {safetyMetrics.safetyStops}
            </div>
            <div className="text-[10px] text-slate-400">stops</div>
          </div>
          <div className="bg-slate-900/50 rounded p-1">
            <div className="text-sm font-bold text-emerald-400 font-mono leading-tight">
              {safetyMetrics.workerEvasions}
            </div>
            <div className="text-[10px] text-slate-400">evasions</div>
          </div>
          <div className="bg-slate-900/50 rounded p-1 min-w-[60px]">
            <div className="text-[10px] font-bold text-teal-400 font-mono leading-tight whitespace-nowrap h-4 flex items-center justify-center">
              {getTimeSinceIncident()}
            </div>
            <div className="text-[10px] text-slate-400">elapsed</div>
          </div>
        </div>
        {safetyMetrics.safetyStops === 0 && (
          <div className="mt-1 text-center">
            <span className="text-[8px] text-green-500/70 flex items-center justify-center gap-0.5">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              All safe
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
