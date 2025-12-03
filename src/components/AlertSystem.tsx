import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Shield, Siren } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { useMillStore } from '../store';

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success' | 'safety';
  title: string;
  message: string;
  timestamp: Date;
  machine?: string;
}

const SAMPLE_ALERTS: Omit<Alert, 'id' | 'timestamp'>[] = [
  { type: 'info', title: 'Shift Change', message: 'Night shift crew arriving in 30 minutes' },
  { type: 'success', title: 'Maintenance Complete', message: 'Roller Mill #3 back online', machine: 'mill-1.5' },
  { type: 'warning', title: 'Temperature Rising', message: 'Plansifter #2 bearing temperature elevated', machine: 'sifter-0' },
  { type: 'info', title: 'Quality Check', message: 'Hourly sample collection in progress' },
  { type: 'success', title: 'Target Met', message: 'Daily production target achieved at 94%' },
  { type: 'warning', title: 'Low Stock', message: 'Packaging supplies below reorder threshold' },
];

const NEAR_MISS_MESSAGES = [
  'Forklift stopped for pedestrian - safety protocol activated',
  'Worker detected in forklift path - collision averted',
  'Emergency stop triggered - all clear',
  'Proximity alert - forklift yielded to personnel',
  'Safety system engaged - near-miss avoided',
];

export const AlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const isInitialMount = useRef(true);
  const safetyMetrics = useMillStore(state => state.safetyMetrics);
  const prevSafetyStopsRef = useRef(safetyMetrics.safetyStops);

  // Watch for safety stops and create near-miss alerts
  useEffect(() => {
    if (isInitialMount.current) return;

    if (safetyMetrics.safetyStops > prevSafetyStopsRef.current) {
      const message = NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)];
      const newAlert: Alert = {
        id: `safety-${Date.now()}`,
        type: 'safety',
        title: 'Near-Miss Avoided',
        message,
        timestamp: new Date()
      };

      // Play distinct safety alert sound
      audioManager.playAlert();

      setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    }
    prevSafetyStopsRef.current = safetyMetrics.safetyStops;
  }, [safetyMetrics.safetyStops]);

  useEffect(() => {
    // Add initial alerts (no sound on mount)
    const initial = SAMPLE_ALERTS.slice(0, 2).map((a, i) => ({
      ...a,
      id: `alert-${i}`,
      timestamp: new Date()
    }));
    setAlerts(initial);

    // Periodically add new alerts
    const interval = setInterval(() => {
      const template = SAMPLE_ALERTS[Math.floor(Math.random() * SAMPLE_ALERTS.length)];
      const newAlert: Alert = {
        ...template,
        id: `alert-${Date.now()}`,
        timestamp: new Date()
      };

      // Play alert sound for new alerts
      if (newAlert.type === 'critical' || newAlert.type === 'warning') {
        audioManager.playAlert();
      }

      setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    }, 8000);

    isInitialMount.current = false;
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-950/90',
          border: 'border-red-500',
          icon: <Siren className="w-5 h-5 text-red-400" />,
          accent: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-950/90',
          border: 'border-yellow-500',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
          accent: 'text-yellow-400'
        };
      case 'success':
        return {
          bg: 'bg-green-950/90',
          border: 'border-green-500',
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          accent: 'text-green-400'
        };
      case 'safety':
        return {
          bg: 'bg-emerald-950/90',
          border: 'border-emerald-500',
          icon: <Shield className="w-5 h-5 text-emerald-400" />,
          accent: 'text-emerald-400'
        };
      default:
        return {
          bg: 'bg-blue-950/90',
          border: 'border-blue-500',
          icon: <Info className="w-5 h-5 text-blue-400" />,
          accent: 'text-blue-400'
        };
    }
  };

  return (
    <div className="fixed top-72 right-6 w-80 z-30 space-y-2">
      <AnimatePresence>
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`${styles.bg} ${styles.border} border-l-4 rounded-lg p-3 backdrop-blur-xl shadow-xl`}
            >
              <div className="flex items-start gap-2">
                {styles.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-semibold text-sm ${styles.accent}`}>{alert.title}</h4>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-slate-500 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{alert.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    {alert.machine && (
                      <span className="text-[10px] text-slate-500">@ {alert.machine}</span>
                    )}
                    <span className="text-[10px] text-slate-600">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
