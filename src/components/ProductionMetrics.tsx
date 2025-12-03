import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricsData {
  time: string;
  throughput: number;
  efficiency: number;
  quality: number;
}

export const ProductionMetrics: React.FC = () => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({
    throughput: 1240,
    efficiency: 98.2,
    quality: 99.9,
    uptime: 99.7,
    bagsPerMinute: 42,
    energyUsage: 847
  });

  // Generate initial data
  useEffect(() => {
    const initialData: MetricsData[] = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      initialData.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        throughput: 1200 + Math.random() * 100,
        efficiency: 96 + Math.random() * 4,
        quality: 99 + Math.random() * 1
      });
    }
    setData(initialData);
  }, []);

  // Update data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newPoint: MetricsData = {
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        throughput: 1200 + Math.random() * 100,
        efficiency: 96 + Math.random() * 4,
        quality: 99 + Math.random() * 1
      };

      setData(prev => [...prev.slice(-29), newPoint]);

      setLiveMetrics(prev => ({
        throughput: Math.round(1200 + Math.random() * 100),
        efficiency: +(96 + Math.random() * 4).toFixed(1),
        quality: +(99 + Math.random() * 1).toFixed(1),
        uptime: +(99.5 + Math.random() * 0.5).toFixed(1),
        bagsPerMinute: Math.round(40 + Math.random() * 5),
        energyUsage: Math.round(830 + Math.random() * 40)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {/* Live KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <motion.div
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Throughput</div>
          <div className="text-xl font-bold text-white font-mono">{liveMetrics.throughput}</div>
          <div className="text-[10px] text-slate-500">tonnes/hour</div>
        </motion.div>
        <motion.div
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Efficiency</div>
          <div className="text-xl font-bold text-green-400 font-mono">{liveMetrics.efficiency}%</div>
          <div className="text-[10px] text-green-500/50">+2.1% vs target</div>
        </motion.div>
        <motion.div
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Quality</div>
          <div className="text-xl font-bold text-purple-400 font-mono">{liveMetrics.quality}%</div>
          <div className="text-[10px] text-purple-500/50">Grade A</div>
        </motion.div>
      </div>

      {/* Mini Charts */}
      <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Production Trend (30 min)</span>
          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div className="h-20">
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
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-800/30 rounded p-2">
          <div className="text-lg font-bold text-orange-400 font-mono">{liveMetrics.bagsPerMinute}</div>
          <div className="text-[9px] text-slate-500">bags/min</div>
        </div>
        <div className="bg-slate-800/30 rounded p-2">
          <div className="text-lg font-bold text-blue-400 font-mono">{liveMetrics.uptime}%</div>
          <div className="text-[9px] text-slate-500">uptime</div>
        </div>
        <div className="bg-slate-800/30 rounded p-2">
          <div className="text-lg font-bold text-yellow-400 font-mono">{liveMetrics.energyUsage}</div>
          <div className="text-[9px] text-slate-500">kWh</div>
        </div>
      </div>
    </div>
  );
};
