import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OctagonX, Shield } from 'lucide-react';
import { useMillStore } from '../store';

// Calculate safety score based on incident history
const useSafetyScore = () => {
  const safetyIncidents = useMillStore((state) => state.safetyIncidents);
  const safetyMetrics = useMillStore((state) => state.safetyMetrics);

  // Calculate score (100 = perfect, decreases with incidents)
  const recentIncidents = safetyIncidents.filter(
    (i) => Date.now() - i.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
  );

  // Weight different incident types
  const incidentWeight: Record<string, number> = {
    emergency: 15,
    near_miss: 8,
    stop: 3,
    evasion: 2,
  };

  const totalPenalty = recentIncidents.reduce((acc, incident) => {
    return acc + (incidentWeight[incident.type] || 5);
  }, 0);

  // Bonus for days without incidents
  const dayBonus = Math.min(20, safetyMetrics.daysSinceIncident * 0.5);

  const score = Math.max(0, Math.min(100, 100 - totalPenalty + dayBonus));

  // Rating based on score
  let rating: 'A' | 'B' | 'C' | 'D' | 'F';
  let color: string;
  let label: string;

  if (score >= 90) {
    rating = 'A';
    color = 'text-green-400';
    label = 'Excellent';
  } else if (score >= 80) {
    rating = 'B';
    color = 'text-cyan-400';
    label = 'Good';
  } else if (score >= 70) {
    rating = 'C';
    color = 'text-yellow-400';
    label = 'Fair';
  } else if (score >= 60) {
    rating = 'D';
    color = 'text-orange-400';
    label = 'Poor';
  } else {
    rating = 'F';
    color = 'text-red-400';
    label = 'Critical';
  }

  return { score, rating, color, label, recentIncidents: recentIncidents.length };
};

// Safety Score Badge Component
export const SafetyScoreBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { score, rating, color, label, recentIncidents } = useSafetyScore();

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Shield className="w-3.5 h-3.5" />
        <span className="font-bold text-sm">{rating}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Shield className={`w-4 h-4 ${color}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Safety Score
          </span>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{rating}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                score >= 90
                  ? 'bg-green-500'
                  : score >= 80
                    ? 'bg-cyan-500'
                    : score >= 70
                      ? 'bg-yellow-500'
                      : score >= 60
                        ? 'bg-orange-500'
                        : 'bg-red-500'
              }`}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className={`text-[9px] font-medium ${color}`}>{label}</span>
            <span className="text-[9px] text-slate-500">{score.toFixed(0)}%</span>
          </div>
        </div>
      </div>
      {recentIncidents > 0 && (
        <div className="mt-1 text-[9px] text-slate-500">
          {recentIncidents} incident{recentIncidents !== 1 ? 's' : ''} in last 24h
        </div>
      )}
    </div>
  );
};

// Emergency Overlay Component - shows flashing red border
export const EmergencyOverlay: React.FC = () => {
  const forkliftEmergencyStop = useMillStore((state) => state.forkliftEmergencyStop);
  const emergencyActive = useMillStore((state) => state.emergencyActive);
  const [flash, setFlash] = useState(true);

  // Either emergency type triggers the overlay
  const isEmergency = forkliftEmergencyStop || emergencyActive;

  // Flash effect
  useEffect(() => {
    if (!isEmergency) return;

    const interval = setInterval(() => {
      setFlash((f) => !f);
    }, 300);

    return () => clearInterval(interval);
  }, [isEmergency]);

  return (
    <AnimatePresence>
      {isEmergency && (
        <>
          {/* Flashing red border */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: flash ? 1 : 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              boxShadow:
                'inset 0 0 0 4px rgba(239, 68, 68, 0.8), inset 0 0 60px rgba(239, 68, 68, 0.3)',
            }}
          />

          {/* Corner warning triangles */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: flash ? 1 : 0.5, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-red-400 shadow-lg shadow-red-500/50">
              <OctagonX className="w-5 h-5 text-white animate-pulse" />
              <span className="text-white font-bold text-sm uppercase tracking-wider">
                Emergency Stop Active
              </span>
              <OctagonX className="w-5 h-5 text-white animate-pulse" />
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs">
              Press <kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono mx-1">SPACE</kbd>{' '}
              to release
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
