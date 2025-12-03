import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success';
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

export const AlertSystem: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Add initial alerts
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
      setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    }, 8000);

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
          icon: '🚨',
          accent: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-950/90',
          border: 'border-yellow-500',
          icon: '⚠️',
          accent: 'text-yellow-400'
        };
      case 'success':
        return {
          bg: 'bg-green-950/90',
          border: 'border-green-500',
          icon: '✅',
          accent: 'text-green-400'
        };
      default:
        return {
          bg: 'bg-blue-950/90',
          border: 'border-blue-500',
          icon: 'ℹ️',
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
                <span className="text-lg">{styles.icon}</span>
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
