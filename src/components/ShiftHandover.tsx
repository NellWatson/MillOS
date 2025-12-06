import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft,
  User,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Briefcase,
} from 'lucide-react';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useProductionStore } from '../stores/productionStore';
import { audioManager } from '../utils/audioManager';

export const ShiftHandover: React.FC = () => {
  const { shiftData, completeShiftHandover } = useGameSimulationStore();
  const machines = useProductionStore((state) => state.machines);
  const [phase, setPhase] = useState<'intro' | 'outgoing' | 'incoming' | 'summary'>('intro');
  const [handoverPoints, setHandoverPoints] = useState<string[]>([]);

  // Auto-progress through handover phases
  useEffect(() => {
    if (shiftData.handoverPhase !== 'handover') return;

    // Play shift change bell
    if (audioManager.initialized) {
      audioManager.playShiftBell?.();
    }

    const timers: NodeJS.Timeout[] = [];

    // Intro -> Outgoing (2s)
    timers.push(
      setTimeout(() => {
        setPhase('outgoing');
      }, 2000)
    );

    // Outgoing -> Incoming (5s)
    timers.push(
      setTimeout(() => {
        setPhase('incoming');
      }, 7000)
    );

    // Incoming -> Summary (5s)
    timers.push(
      setTimeout(() => {
        setPhase('summary');
      }, 12000)
    );

    return () => timers.forEach((t) => clearTimeout(t));
  }, [shiftData.handoverPhase]);

  // Generate handover points
  useEffect(() => {
    const points: string[] = [];

    // Production status
    const efficiency = shiftData.shiftProduction.efficiency;
    if (efficiency >= 100) {
      points.push('Exceeded production targets - excellent work');
    } else if (efficiency >= 90) {
      points.push('Met production targets successfully');
    } else if (efficiency >= 75) {
      points.push('Production slightly behind target - monitor closely');
    } else {
      points.push('Production significantly below target - investigate causes');
    }

    // Machine status
    const criticalMachines = machines.filter((m) => m.status === 'critical');
    const warningMachines = machines.filter((m) => m.status === 'warning');

    if (criticalMachines.length > 0) {
      points.push(
        `${criticalMachines.length} machine(s) in critical state: ${criticalMachines.map((m) => m.id).join(', ')}`
      );
    }
    if (warningMachines.length > 0) {
      points.push(`${warningMachines.length} machine(s) require attention`);
    }
    if (criticalMachines.length === 0 && warningMachines.length === 0) {
      points.push('All equipment operating normally');
    }

    // Unresolved incidents
    const unresolvedCount = shiftData.shiftIncidents.filter((inc) => !inc.resolved).length;
    if (unresolvedCount > 0) {
      points.push(`${unresolvedCount} unresolved incident(s) - follow up required`);
    }

    // Shift-specific notes
    if (shiftData.currentShift === 'night') {
      points.push('Night crew: Maintenance window available 02:00-04:00');
    } else if (shiftData.currentShift === 'afternoon') {
      points.push('Peak production hours ahead - all hands on deck');
    }

    setHandoverPoints(points);
  }, [shiftData, machines]);

  if (shiftData.handoverPhase !== 'handover') return null;

  const getNextShift = () => {
    const shifts = ['morning', 'afternoon', 'night'];
    const currentIndex = shifts.indexOf(shiftData.currentShift);
    return shifts[(currentIndex + 1) % shifts.length];
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6">
            <div className="flex items-center gap-3 mb-2">
              <ArrowRightLeft className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-bold text-white">Shift Handover</h2>
            </div>
            <p className="text-amber-100 text-sm">
              {shiftData.currentShift.charAt(0).toUpperCase() + shiftData.currentShift.slice(1)}{' '}
              shift → {getNextShift().charAt(0).toUpperCase() + getNextShift().slice(1)} shift
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* Phase 1: Intro */}
              {phase === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-2xl font-bold text-white mb-2">Shift Change in Progress</h3>
                  <p className="text-slate-400">Preparing handover documentation...</p>
                </motion.div>
              )}

              {/* Phase 2: Outgoing Supervisor */}
              {phase === 'outgoing' && (
                <motion.div
                  key="outgoing"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-white">
                          {shiftData.outgoingSupervisor}
                        </h4>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          Outgoing
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {shiftData.currentShift.charAt(0).toUpperCase() +
                          shiftData.currentShift.slice(1)}{' '}
                        Shift Supervisor
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-slate-400" />
                      <h5 className="text-sm font-semibold text-white uppercase tracking-wide">
                        Handover Report
                      </h5>
                    </div>
                    <div className="space-y-3">
                      {handoverPoints.map((point, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.15 }}
                          className="flex items-start gap-3"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-slate-300 text-sm flex-1">{point}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-slate-400 uppercase">Production</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {shiftData.shiftProduction.actual}
                      </p>
                      <p className="text-xs text-slate-500">
                        {shiftData.shiftProduction.efficiency.toFixed(1)}% efficiency
                      </p>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-slate-400 uppercase">Incidents</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {shiftData.shiftIncidents.filter((inc) => !inc.resolved).length}
                      </p>
                      <p className="text-xs text-slate-500">unresolved</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 3: Incoming Supervisor */}
              {phase === 'incoming' && (
                <motion.div
                  key="incoming"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-white">
                          {shiftData.incomingSupervisor}
                        </h4>
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Incoming
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {getNextShift().charAt(0).toUpperCase() + getNextShift().slice(1)} Shift
                        Supervisor
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <h5 className="text-sm font-semibold text-white uppercase tracking-wide">
                        Handover Acknowledged
                      </h5>
                    </div>
                    <p className="text-slate-300 text-sm mb-4">
                      "Understood.{' '}
                      {getNextShift().charAt(0).toUpperCase() + getNextShift().slice(1)} shift crew
                      is ready to take over operations. We'll prioritize the following:"
                    </p>

                    <div className="space-y-2">
                      {shiftData.priorities.slice(0, 3).map((priority, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.15 }}
                          className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <p className="text-slate-300 text-sm">{priority}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 4: Summary */}
              {phase === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Handover Complete</h3>
                  <p className="text-slate-400 mb-6">
                    {getNextShift().charAt(0).toUpperCase() + getNextShift().slice(1)} shift is now
                    in control
                  </p>

                  <button
                    onClick={completeShiftHandover}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Continue Operations
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Indicator */}
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Handover Progress</span>
              <span className="text-xs text-slate-400">
                {phase === 'intro' && '25%'}
                {phase === 'outgoing' && '50%'}
                {phase === 'incoming' && '75%'}
                {phase === 'summary' && '100%'}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width:
                    phase === 'intro'
                      ? '25%'
                      : phase === 'outgoing'
                        ? '50%'
                        : phase === 'incoming'
                          ? '75%'
                          : '100%',
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
