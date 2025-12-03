import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Brain, Shield, User, Wrench, Zap, Eye,
  CheckCircle, Clock, AlertTriangle, ChevronRight,
  Activity, Cpu, HardDrive, TrendingUp, TrendingDown, Cloud, CloudRain,
  CloudLightning, Sun, Users, Gauge, Calendar, DollarSign,
  ShieldCheck, Target, BarChart3, ArrowUp, ArrowDown
} from 'lucide-react';
import { AIDecision } from '../types';
import { useMillStore } from '../store';
import {
  generateContextAwareDecision,
  applyDecisionEffects,
  reactToAlert,
  getPredictedEvents,
  getCongestionHotspots,
  getImpactStats,
  getSparklineData,
  shouldTriggerAudioCue,
  getConfidenceAdjustmentForType
} from '../utils/aiEngine';
import { audioManager } from '../utils/audioManager';

interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sparkline component for trend visualization
const Sparkline: React.FC<{ data: number[]; color?: string; height?: number }> = ({
  data,
  color = '#22d3ee',
  height = 20
}) => {
  if (data.length < 2) return null;

  const width = 60;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - v * height
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="opacity-80">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </svg>
  );
};

// Confidence adjustment indicator component
const ConfidenceIndicator: React.FC<{ type: AIDecision['type']; confidence: number }> = ({ type, confidence }) => {
  const adjustment = getConfidenceAdjustmentForType(type);
  const hasAdjustment = Math.abs(adjustment) >= 1; // Only show if adjustment is >= 1%

  return (
    <span className="text-cyan-400 inline-flex items-center gap-0.5">
      {confidence.toFixed(0)}% conf
      {hasAdjustment && (
        <span
          className={`inline-flex items-center ${adjustment > 0 ? 'text-green-400' : 'text-orange-400'}`}
          title={`AI learning: ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)}% adjustment based on historical accuracy`}
        >
          {adjustment > 0 ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
        </span>
      )}
    </span>
  );
};

export const AICommandCenter: React.FC<AICommandCenterProps> = ({ isOpen, onClose }) => {
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<'decisions' | 'predictions'>('decisions');
  const [predictedEvents, setPredictedEvents] = useState<ReturnType<typeof getPredictedEvents>>([]);
  const [impactStats, setImpactStats] = useState<ReturnType<typeof getImpactStats> | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    cpu: 23,
    memory: 45,
    decisions: 0,
    successRate: 94.2
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAlertCountRef = useRef(0);
  const lastDecisionIdRef = useRef<string | null>(null);

  // Get state from store
  const aiDecisions = useMillStore(state => state.aiDecisions);
  const alerts = useMillStore(state => state.alerts);
  const machines = useMillStore(state => state.machines);
  const metrics = useMillStore(state => state.metrics);
  const weather = useMillStore(state => state.weather);
  const currentShift = useMillStore(state => state.currentShift);
  const gameTime = useMillStore(state => state.gameTime);
  const workerSatisfaction = useMillStore(state => state.workerSatisfaction);
  const emergencyDrillMode = useMillStore(state => state.emergencyDrillMode);

  // Generate context-aware decisions
  const generateDecision = useCallback(() => {
    setIsThinking(true);

    setTimeout(() => {
      const decision = generateContextAwareDecision();

      if (decision) {
        applyDecisionEffects(decision);
        setSystemStatus(prev => ({
          ...prev,
          decisions: prev.decisions + 1
        }));

        // Play appropriate audio cue based on decision type/priority
        if (shouldTriggerAudioCue(decision)) {
          if (decision.priority === 'critical') {
            audioManager.playAICriticalAlert();
          } else if (decision.action.includes('anomaly')) {
            audioManager.playAIAnomaly();
          } else {
            audioManager.playAIDecision();
          }
        }

        lastDecisionIdRef.current = decision.id;
      }

      // Update predicted events and impact stats
      setPredictedEvents(getPredictedEvents());
      setImpactStats(getImpactStats());

      setIsThinking(false);
    }, 600 + Math.random() * 800);
  }, []);

  // React to new alerts
  useEffect(() => {
    if (!isOpen) return;

    if (alerts.length > lastAlertCountRef.current) {
      const newAlert = alerts[0];
      if (newAlert && newAlert.machineId) {
        setTimeout(() => {
          const decision = reactToAlert(newAlert);
          if (decision) {
            applyDecisionEffects(decision);
            setSystemStatus(prev => ({
              ...prev,
              decisions: prev.decisions + 1
            }));
          }
        }, 1500);
      }
    }
    lastAlertCountRef.current = alerts.length;
  }, [alerts, isOpen]);

  // Generate decisions periodically
  useEffect(() => {
    if (!isOpen) return;

    const initialTimeout = setTimeout(generateDecision, 2000);
    const interval = setInterval(generateDecision, 6000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isOpen, generateDecision]);

  // Update predictions periodically
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPredictedEvents(getPredictedEvents());
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fluctuate system metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const decisionLoad = Math.min(aiDecisions.length * 2, 15);
      const alertLoad = alerts.length * 3;

      setSystemStatus(prev => ({
        ...prev,
        cpu: Math.max(15, Math.min(55, 20 + decisionLoad + alertLoad + (Math.random() - 0.5) * 8)),
        memory: Math.max(35, Math.min(65, 42 + decisionLoad + (Math.random() - 0.5) * 5)),
        successRate: Math.max(88, Math.min(99, prev.successRate + (Math.random() - 0.45) * 2))
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [aiDecisions.length, alerts.length]);

  const getTypeIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'assignment': return <User className={iconClass} />;
      case 'optimization': return <Zap className={iconClass} />;
      case 'prediction': return <Eye className={iconClass} />;
      case 'maintenance': return <Wrench className={iconClass} />;
      case 'safety': return <Shield className={iconClass} />;
      default: return <Bot className={iconClass} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'from-blue-500 to-blue-600';
      case 'optimization': return 'from-green-500 to-green-600';
      case 'prediction': return 'from-purple-500 to-purple-600';
      case 'maintenance': return 'from-yellow-500 to-yellow-600';
      case 'safety': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusIcon = (status: AIDecision['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'in_progress': return <Activity className="w-3 h-3 text-blue-400 animate-pulse" />;
      case 'pending': return <Clock className="w-3 h-3 text-yellow-400" />;
      case 'superseded': return <AlertTriangle className="w-3 h-3 text-slate-400" />;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: AIDecision['priority']) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[priority] || colors.medium;
  };

  const getWeatherIcon = () => {
    switch (weather) {
      case 'storm': return <CloudLightning className="w-4 h-4 text-purple-400" />;
      case 'rain': return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'cloudy': return <Cloud className="w-4 h-4 text-slate-400" />;
      default: return <Sun className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatGameTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTimeUntil = (date: Date) => {
    const diff = date.getTime() - Date.now();
    if (diff < 0) return 'now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className="fixed right-0 top-0 h-full w-[440px] bg-slate-950/98 backdrop-blur-xl border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/50 to-slate-950">
        <div className="flex items-center justify-between bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="w-6 h-6 text-white/90" strokeWidth={1.5} />
              {isThinking && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Command Center
                {isThinking && <span className="text-xs text-white/70 animate-pulse">analyzing...</span>}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-sm font-medium">ESC to close</button>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">CPU</span>
            </div>
            <div className="text-sm font-mono text-cyan-400">{systemStatus.cpu.toFixed(1)}%</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${systemStatus.cpu}%` }} />
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Memory</span>
            </div>
            <div className="text-sm font-mono text-green-400">{systemStatus.memory.toFixed(1)}%</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${systemStatus.memory}%` }} />
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Decisions</span>
            </div>
            <div className="text-sm font-mono text-purple-400">{systemStatus.decisions}</div>
            <div className="text-[10px] text-slate-600">this session</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase">Success</span>
            </div>
            <div className="text-sm font-mono text-emerald-400">{systemStatus.successRate.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-600">accuracy</div>
          </div>
        </div>

        {/* Enhanced Context Bar */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="px-2 py-1.5 bg-slate-900/30 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                {getWeatherIcon()}
                <span className="text-slate-400 capitalize">{weather}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-cyan-400 font-mono">{formatGameTime(gameTime)}</span>
              </div>
            </div>
          </div>
          <div className="px-2 py-1.5 bg-slate-900/30 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-slate-500" />
                <span className="text-slate-400 capitalize">{currentShift} shift</span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-3 h-3 text-slate-500" />
                <span className={`${workerSatisfaction.averageEnergy > 50 ? 'text-green-400' : 'text-orange-400'}`}>
                  Energy: {workerSatisfaction.averageEnergy.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drill Mode Banner */}
        {emergencyDrillMode && (
          <div className="mt-3 px-3 py-2 bg-red-500/20 rounded-lg border border-red-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
              <Shield className="w-4 h-4" />
              EMERGENCY DRILL IN PROGRESS
            </div>
          </div>
        )}

        {/* Monitoring Summary */}
        <div className="mt-2 px-2 py-1.5 bg-slate-900/30 rounded-lg border border-slate-700/30">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Monitoring:</span>
            <span className="text-cyan-400">
              {machines.length} machines | {alerts.length} alerts | Eff: {metrics.efficiency.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 py-2 border-b border-slate-800 flex gap-2">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'decisions'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3 h-3 inline mr-1" />
          Live Decisions ({aiDecisions.length})
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'predictions'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3 h-3 inline mr-1" />
          Predictions ({predictedEvents.length})
        </button>
      </div>

      {/* Impact Summary */}
      {impactStats && impactStats.totalDecisions > 0 && (
        <div className="px-4 py-2 border-b border-slate-800 bg-gradient-to-r from-emerald-950/30 to-slate-950">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Shift Impact</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900/50 rounded-lg p-2 border border-emerald-500/20">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-slate-500">Prevented</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {impactStats.preventedShutdowns}
              </div>
              <div className="text-[10px] text-slate-500">shutdowns</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 border border-emerald-500/20">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-slate-500">Saved</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                ${(impactStats.estimatedSavings / 1000).toFixed(1)}K
              </div>
              <div className="text-[10px] text-slate-500">est. this shift</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 border border-emerald-500/20">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-slate-500">Success</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {impactStats.totalDecisions > 0
                  ? Math.round((impactStats.successfulDecisions / impactStats.totalDecisions) * 100)
                  : 0}%
              </div>
              <div className="text-[10px] text-slate-500">{impactStats.successfulDecisions}/{impactStats.totalDecisions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'decisions' ? (
          <>
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Live Decision Feed</span>
              <span className="text-xs text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Context-Aware
              </span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              <AnimatePresence>
                {aiDecisions.slice(0, 20).map((decision) => (
                  <motion.div
                    key={decision.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`bg-slate-900/80 rounded-lg border overflow-hidden hover:border-cyan-500/30 transition-colors ${
                      decision.status === 'completed' ? 'border-green-500/20' :
                      decision.status === 'in_progress' ? 'border-blue-500/30' :
                      'border-slate-700/50'
                    }`}
                  >
                    <div className={`h-1 bg-gradient-to-r ${getTypeColor(decision.type)}`} />
                    <div className="p-3">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md bg-gradient-to-br ${getTypeColor(decision.type)} bg-opacity-20`}>
                          {getTypeIcon(decision.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                              {decision.type}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityBadge(decision.priority)}`}>
                              {decision.priority}
                            </span>
                            <div className="flex items-center gap-1 ml-auto">
                              {getStatusIcon(decision.status)}
                              <span className="text-[10px] text-slate-500 capitalize">{decision.status}</span>
                            </div>
                          </div>

                          <p className="text-sm text-white font-medium mb-1">{decision.action}</p>
                          <p className="text-xs text-slate-400 mb-2">{decision.reasoning}</p>

                          <div className="flex items-center gap-3 text-[10px] flex-wrap">
                            <ConfidenceIndicator type={decision.type} confidence={decision.confidence} />
                            {decision.machineId && (
                              <span className="text-slate-500 flex items-center gap-1">
                                <ChevronRight className="w-3 h-3" />
                                {decision.machineId}
                              </span>
                            )}
                            {decision.workerId && (
                              <span className="text-blue-400 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                assigned
                              </span>
                            )}
                            <span className="text-slate-600 ml-auto">
                              {decision.timestamp.toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Trend Sparklines for machine-related decisions */}
                          {decision.machineId && (decision.type === 'maintenance' || decision.type === 'prediction') && (
                            <div className="mt-2 flex items-center gap-3 px-2 py-1.5 bg-slate-800/50 rounded border border-slate-700/30">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-500">Temp</span>
                                <Sparkline
                                  data={getSparklineData(decision.machineId, 'temperature')}
                                  color="#f97316"
                                  height={16}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-500">Vib</span>
                                <Sparkline
                                  data={getSparklineData(decision.machineId, 'vibration')}
                                  color="#a855f7"
                                  height={16}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-500">Load</span>
                                <Sparkline
                                  data={getSparklineData(decision.machineId, 'load')}
                                  color="#22d3ee"
                                  height={16}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-[10px] text-green-400 mt-2">
                            <TrendingUp className="w-3 h-3" />
                            <span>{decision.impact}</span>
                          </div>

                          {decision.uncertainty && (
                            <div className="mt-2 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                              <div className="flex items-start gap-1.5 text-[10px] text-amber-400">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{decision.uncertainty}</span>
                              </div>
                            </div>
                          )}

                          {decision.alternatives && decision.alternatives.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="text-[9px] text-slate-500 uppercase">Alternatives:</div>
                              {decision.alternatives.map((alt, idx) => (
                                <div key={idx} className="text-[10px] text-slate-500 flex items-start gap-1">
                                  <span className="text-slate-600">-</span>
                                  <span>{alt.action}</span>
                                  <span className="text-slate-600">({alt.tradeoff})</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {decision.parentDecisionId && (
                            <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              <span>Follow-up to previous decision</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {aiDecisions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Bot className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">AI is analyzing factory state...</p>
                  <p className="text-xs text-slate-600">
                    {machines.length > 0 ? 'Context-aware decisions will appear here' : 'Waiting for machine data...'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Predictive Schedule</span>
              <span className="text-xs text-purple-400 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Looking Ahead
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {predictedEvents.length > 0 ? (
                predictedEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900/80 rounded-lg border border-slate-700/50 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${
                          event.type === 'maintenance' ? 'bg-yellow-500/20' :
                          event.type === 'shift_change' ? 'bg-blue-500/20' :
                          event.type === 'weather' ? 'bg-purple-500/20' :
                          event.type === 'fatigue' ? 'bg-orange-500/20' :
                          'bg-green-500/20'
                        }`}>
                          {event.type === 'maintenance' && <Wrench className="w-4 h-4 text-yellow-400" />}
                          {event.type === 'shift_change' && <Users className="w-4 h-4 text-blue-400" />}
                          {event.type === 'weather' && <Cloud className="w-4 h-4 text-purple-400" />}
                          {event.type === 'fatigue' && <Gauge className="w-4 h-4 text-orange-400" />}
                          {event.type === 'optimization' && <Zap className="w-4 h-4 text-green-400" />}
                        </div>
                        <div>
                          <div className="text-sm text-white font-medium">{event.description}</div>
                          <div className="text-[10px] text-slate-500 capitalize">{event.type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-cyan-400">{formatTimeUntil(event.predictedTime)}</div>
                        <div className="text-[10px] text-slate-500">{event.confidence}% conf</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityBadge(event.priority)}`}>
                        {event.priority}
                      </span>
                      {event.machineId && (
                        <span className="text-[10px] text-slate-500">{event.machineId}</span>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No upcoming predictions</p>
                  <p className="text-xs text-slate-600">Events will appear as patterns are detected</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>MillOS-AI v2.0 (Enhanced)</span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${machines.length > 0 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {machines.length > 0 ? 'All systems nominal' : 'Initializing...'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
