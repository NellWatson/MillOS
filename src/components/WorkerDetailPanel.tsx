import React from 'react';
import { motion } from 'framer-motion';
import { WorkerData } from '../types';

interface WorkerDetailPanelProps {
  worker: WorkerData;
  onClose: () => void;
}

export const WorkerDetailPanel: React.FC<WorkerDetailPanelProps> = ({ worker, onClose }) => {
  const getStatusColor = () => {
    switch (worker.status) {
      case 'working': return 'bg-green-500';
      case 'responding': return 'bg-yellow-500';
      case 'break': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getRoleColor = () => {
    switch (worker.role) {
      case 'Supervisor': return 'from-blue-500 to-blue-700';
      case 'Engineer': return 'from-purple-500 to-purple-700';
      case 'Operator': return 'from-orange-500 to-orange-700';
      case 'Safety Officer': return 'from-green-500 to-green-700';
      case 'Quality Control': return 'from-pink-500 to-pink-700';
      case 'Maintenance': return 'from-yellow-500 to-yellow-700';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-6 left-6 w-80 z-20"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-600 shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${getRoleColor()} p-4 relative`}>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            ×
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              {worker.avatar}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{worker.name}</h2>
              <p className="text-white/80 text-sm">{worker.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
                <span className="text-white/70 text-xs capitalize">{worker.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Task */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Task</div>
          <div className="text-white font-medium">{worker.currentTask}</div>
          {worker.targetMachine && (
            <div className="text-xs text-cyan-400 mt-1">@ {worker.targetMachine}</div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase">Experience</div>
            <div className="text-lg font-bold text-white">{worker.experience} years</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase">Shift Start</div>
            <div className="text-lg font-bold text-white">{worker.shiftStart}</div>
          </div>
        </div>

        {/* Certifications */}
        <div className="px-4 pb-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Certifications</div>
          <div className="flex flex-wrap gap-1">
            {worker.certifications.map((cert, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700/50 flex gap-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg font-medium transition-colors">
            Assign Task
          </button>
          <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-lg font-medium transition-colors">
            View History
          </button>
        </div>
      </div>
    </motion.div>
  );
};
