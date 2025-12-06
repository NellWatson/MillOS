import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Shield, Siren, Bell } from 'lucide-react';
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

interface TimerState {
  timeout: NodeJS.Timeout | null;
  remaining: number;
  startTime: number;
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

// Auto-dismiss duration by alert type (in ms)
const AUTO_DISMISS_DURATION: Record<Alert['type'], number> = {
  info: 5000,
  success: 5000,
  warning: 8000,
  critical: 12000,
  safety: 6000,
};

export const AlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalAlertCount, setTotalAlertCount] = useState(0);
  const isInitialMount = useRef(true);
  const safetyMetrics = useMillStore(state => state.safetyMetrics);
  const prevSafetyStopsRef = useRef(safetyMetrics.safetyStops);
  const timerStates = useRef<Map<string, TimerState>>(new Map());

  // Schedule auto-dismiss for an alert
  const scheduleAutoDismiss = useCallback((alert: Alert, remainingTime?: number) => {
    const duration = remainingTime ?? AUTO_DISMISS_DURATION[alert.type];
    const timeout = setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      timerStates.current.delete(alert.id);
    }, duration);
    timerStates.current.set(alert.id, {
      timeout,
      remaining: duration,
      startTime: Date.now()
    });
  }, []);

  // Pause timer on hover
  const pauseTimer = useCallback((alertId: string) => {
    const state = timerStates.current.get(alertId);
    if (state?.timeout) {
      clearTimeout(state.timeout);
      const elapsed = Date.now() - state.startTime;
      const remaining = Math.max(0, state.remaining - elapsed);
      timerStates.current.set(alertId, {
        timeout: null,
        remaining,
        startTime: 0
      });
    }
  }, []);

  // Resume timer on mouse leave
  const resumeTimer = useCallback((alert: Alert) => {
    const state = timerStates.current.get(alert.id);
    if (state && !state.timeout && state.remaining > 0) {
      scheduleAutoDismiss(alert, state.remaining);
    }
  }, [scheduleAutoDismiss]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timers = timerStates.current;
    return () => {
      timers.forEach(state => {
        if (state.timeout) clearTimeout(state.timeout);
      });
    };
  }, []);

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
      setTotalAlertCount(prev => prev + 1);
      scheduleAutoDismiss(newAlert);
    }
    prevSafetyStopsRef.current = safetyMetrics.safetyStops;
  }, [safetyMetrics.safetyStops, scheduleAutoDismiss]);

  useEffect(() => {
    // Add initial alerts (no sound on mount)
    const initial = SAMPLE_ALERTS.slice(0, 2).map((a, i) => ({
      ...a,
      id: `alert-${i}`,
      timestamp: new Date()
    }));
    setAlerts(initial);
    setTotalAlertCount(2);
    initial.forEach(a => scheduleAutoDismiss(a));

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
      setTotalAlertCount(prev => prev + 1);
      scheduleAutoDismiss(newAlert);
    }, 8000);

    isInitialMount.current = false;
    return () => clearInterval(interval);
  }, [scheduleAutoDismiss]);

  const dismissAlert = useCallback((id: string) => {
    // Clear the auto-dismiss timeout if manually dismissed
    const state = timerStates.current.get(id);
    if (state?.timeout) {
      clearTimeout(state.timeout);
      timerStates.current.delete(id);
    }
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

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
    <div className="fixed top-4 right-4 w-64 sm:w-72 z-30 space-y-1.5 max-h-[35vh] sm:max-h-[40vh] overflow-hidden">
      {/* Alert count badge */}
      {alerts.length === 0 && totalAlertCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-end gap-1.5 text-slate-500 text-[10px] pr-1"
        >
          <Bell className="w-3 h-3" />
          <span>{totalAlertCount} alerts today</span>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {alerts.slice(0, 3).map((alert, index) => {
          const styles = getAlertStyles(alert.type);
          return (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onMouseEnter={() => pauseTimer(alert.id)}
              onMouseLeave={() => resumeTimer(alert)}
              className={`${styles.bg} ${styles.border} border-l-2 sm:border-l-3 rounded-lg p-1.5 sm:p-2 backdrop-blur-xl shadow-lg cursor-default`}
            >
              <div className="flex items-start gap-1.5 sm:gap-2">
                <div className="flex-shrink-0 mt-0.5 hidden sm:block">
                  {React.cloneElement(styles.icon, { className: 'w-4 h-4' })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-semibold text-[11px] sm:text-xs ${styles.accent} truncate`}>{alert.title}</h4>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-slate-500 hover:text-white text-sm leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5 line-clamp-1">{alert.message}</p>
                  <span className="text-[8px] sm:text-[9px] text-slate-600">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {alerts.length > 3 && (
        <div className="text-center text-[9px] sm:text-[10px] text-slate-500 py-1">
          +{alerts.length - 3} more
        </div>
      )}
    </div>
  );
};
