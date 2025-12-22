import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Bot,
  Brain,
  Shield,
  User,
  Wrench,
  Zap,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  TrendingUp,
  Cloud,
  CloudRain,
  CloudLightning,
  Sun,
  Users,
  Gauge,
  Calendar,
  Target,
  ArrowUp,
  ArrowDown,
  Settings,
} from 'lucide-react';
import { AIDecision } from '../types';
import { useProductionStore } from '../stores/productionStore';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useUIStore } from '../stores/uiStore';
import { useAIConfigStore } from '../stores/aiConfigStore';
import { useShallow } from 'zustand/react/shallow';
import {
  generateContextAwareDecision,
  generateGeminiDecision,
  generateStrategicDecision,
  applyDecisionEffects,
  reactToAlert,
  getPredictedEvents,
  getImpactStats,
  shouldTriggerAudioCue,
  getConfidenceAdjustmentForType,
  isGeminiModeActive,
  isStrategicLayerActive,
  isTacticalLayerActive,
} from '../utils/aiEngine';
import { audioManager } from '../utils/audioManager';
import { GeminiSettingsModal } from './GeminiSettingsModal';
import {
  DecisionHistoryPanel,
  VCLDebugPanel,
  StrategicPriorityCards,
  ActionPlanTimeline,
  VCLDiffPanel
} from './ui';

interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

// Sparkline component for trend visualization
// Note: Currently unused but kept for future feature expansion
 
const _Sparkline: React.FC<{ data: number[]; color?: string; height?: number }> = ({
  data,
  color = '#22d3ee',
  height = 20,
}) => {
  if (data.length < 2) return null;

  const width = 60;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - v * height,
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
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={color}
      />
    </svg>
  );
};

// Confidence adjustment indicator component
// Note: Currently unused but kept for future feature expansion
 
const _ConfidenceIndicator: React.FC<{ type: AIDecision['type']; confidence: number }> = ({
  type,
  confidence,
}) => {
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
          {adjustment > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        </span>
      )}
    </span>
  );
};

export const AICommandCenter: React.FC<AICommandCenterProps> = ({
  isOpen,
  onClose: _onClose,
  embedded = false,
}) => {
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<'decisions' | 'predictions' | 'strategic'>('decisions');
  const [predictedEvents, setPredictedEvents] = useState<ReturnType<typeof getPredictedEvents>>([]);
  const [_impactStats, setImpactStats] = useState<ReturnType<typeof getImpactStats> | null>(null);
  // Track actual decision outcomes for real success rate calculation
  const decisionOutcomesRef = useRef<{ successful: number; total: number }>({
    successful: 0,
    total: 0,
  });

  const [systemStatus, setSystemStatus] = useState({
    cpu: 15,
    memory: 35,
    decisions: 0,
    successRate: 0, // Start at 0, will be calculated from actual decisions
  });
  const _scrollRef = useRef<HTMLDivElement>(null);
  const lastAlertCountRef = useRef(0);
  const lastDecisionIdRef = useRef<string | null>(null);
  const decisionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alertReactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const masterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDecisionTime = useRef(0);
  const lastStrategicTime = useRef(0);
  const lastPredictionTime = useRef(0);
  const lastMetricsTime = useRef(0);
  const isGeneratingDecisionRef = useRef(false);
  const isGeneratingStrategicRef = useRef(false);

  // Get state from stores using useShallow to prevent unnecessary re-renders
  const { aiDecisions, machines: _machines, metrics, workerSatisfaction: _workerSatisfaction } = useProductionStore(
    useShallow((state) => ({
      aiDecisions: state.aiDecisions,
      machines: state.machines,
      metrics: state.metrics,
      workerSatisfaction: state.workerSatisfaction,
    }))
  );

  const alerts = useUIStore((state) => state.alerts);

  const { weather, currentShift, gameTime: _gameTime, emergencyDrillMode } = useGameSimulationStore(
    useShallow((state) => ({
      weather: state.weather,
      currentShift: state.currentShift,
      gameTime: state.gameTime,
      emergencyDrillMode: state.emergencyDrillMode,
    }))
  );

  // Gemini AI configuration
  const { aiMode, isGeminiConnected } = useAIConfigStore(
    useShallow((state) => ({
      aiMode: state.aiMode,
      isGeminiConnected: state.isGeminiConnected,
    }))
  );
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);

  // Generate context-aware decisions (Gemini or heuristic)
  const generateDecision = useCallback(async () => {
    // Prevent overlapping decision generation
    if (isGeneratingDecisionRef.current) return;

    isGeneratingDecisionRef.current = true;
    setIsThinking(true);

    if (decisionTimeoutRef.current) clearTimeout(decisionTimeoutRef.current);

    // Small delay for UI responsiveness
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    let decision = null;

    // Try Gemini first if enabled
    if (isGeminiModeActive()) {
      try {
        decision = await generateGeminiDecision();
      } catch (error) {
        console.warn('[AICommandCenter] Gemini decision failed, falling back to heuristic');
      }
    }

    // Fall back to heuristic if no Gemini decision
    if (!decision) {
      decision = generateContextAwareDecision();
    }

    if (decision) {
      applyDecisionEffects(decision);
      setSystemStatus((prev) => ({
        ...prev,
        decisions: prev.decisions + 1,
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
    isGeneratingDecisionRef.current = false;
  }, []);

  // React to new alerts
  useEffect(() => {
    if (!isOpen) return;

    if (alerts.length > lastAlertCountRef.current) {
      const newAlert = alerts[0];
      if (newAlert && newAlert.machineId) {
        if (alertReactionTimeoutRef.current) clearTimeout(alertReactionTimeoutRef.current);
        alertReactionTimeoutRef.current = setTimeout(() => {
          const decision = reactToAlert(newAlert);
          if (decision) {
            applyDecisionEffects(decision);
            setSystemStatus((prev) => ({
              ...prev,
              decisions: prev.decisions + 1,
            }));
          }
        }, 1500);
      }
    }
    lastAlertCountRef.current = alerts.length;
  }, [alerts, isOpen]);

  // Master interval - consolidates all periodic tasks
  useEffect(() => {
    if (!isOpen) return;

    // Initial decision generation after 2 seconds
    if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    initialTimeoutRef.current = setTimeout(generateDecision, 2000);

    // Initialize timestamps
    lastDecisionTime.current = Date.now();
    lastStrategicTime.current = Date.now();
    lastPredictionTime.current = Date.now();
    lastMetricsTime.current = Date.now();

    // Master interval runs every second and checks if each task is due
    if (masterIntervalRef.current) clearInterval(masterIntervalRef.current);
    masterIntervalRef.current = setInterval(() => {
      const now = Date.now();

      // Tactical decision generation every 6 seconds (heuristic or hybrid)
      if (isTacticalLayerActive() && now - lastDecisionTime.current >= 6000) {
        lastDecisionTime.current = now;
        generateDecision();
      }

      // Strategic decision generation every 45 seconds (hybrid mode only)
      if (isStrategicLayerActive() && !isGeneratingStrategicRef.current && now - lastStrategicTime.current >= 45000) {
        lastStrategicTime.current = now;
        isGeneratingStrategicRef.current = true;
        generateStrategicDecision()
          .then((decision) => {
            if (decision) {
              applyDecisionEffects(decision);
              setSystemStatus((prev) => ({
                ...prev,
                decisions: prev.decisions + 1,
              }));
              audioManager.playAIDecision();
            }
          })
          .finally(() => {
            isGeneratingStrategicRef.current = false;
          });
      }

      // Predictions every 5 seconds
      if (now - lastPredictionTime.current >= 5000) {
        lastPredictionTime.current = now;
        setPredictedEvents(getPredictedEvents());
      }

      // Metrics update every 1.5 seconds
      if (now - lastMetricsTime.current >= 1500) {
        lastMetricsTime.current = now;

        // Calculate CPU based on actual work being done
        const activeDecisions = aiDecisions.filter(
          (d: AIDecision) => d.status === 'in_progress'
        ).length;
        const pendingDecisions = aiDecisions.filter(
          (d: AIDecision) => d.status === 'pending'
        ).length;
        const alertLoad = alerts.filter(
          (a: any) => a.type === 'critical' || a.type === 'warning'
        ).length;

        // Base CPU load + active work + pending queue + alert processing
        const baseCpu = 12;
        const activeLoad = activeDecisions * 8;
        const queueLoad = Math.min(pendingDecisions * 2, 10);
        const alertProcessing = alertLoad * 4;
        const cpuUsage = Math.min(baseCpu + activeLoad + queueLoad + alertProcessing, 85);

        // Memory based on stored decisions and history
        const baseMemory = 30;
        const decisionMemory = Math.min(aiDecisions.length * 0.5, 20);
        const alertMemory = alerts.length * 1.5;
        const memoryUsage = Math.min(baseMemory + decisionMemory + alertMemory, 80);

        // Calculate real success rate
        const { successful, total } = decisionOutcomesRef.current;
        const successRate = total > 0 ? (successful / total) * 100 : 0;

        setSystemStatus((prev) => ({
          ...prev,
          cpu: cpuUsage,
          memory: memoryUsage,
          successRate: successRate > 0 ? successRate : prev.successRate,
        }));
      }
    }, 1000); // Check every second

    return () => {
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
      if (masterIntervalRef.current) clearInterval(masterIntervalRef.current);
      if (decisionTimeoutRef.current) clearTimeout(decisionTimeoutRef.current);
      if (alertReactionTimeoutRef.current) clearTimeout(alertReactionTimeoutRef.current);
      // Reset decision generation flag to prevent stuck state
      isGeneratingDecisionRef.current = false;
      // Reset decision outcomes tracking on cleanup
      decisionOutcomesRef.current = { successful: 0, total: 0 };
    };
  }, [isOpen, generateDecision, aiDecisions, alerts]);

  // Calculate real success rate from actual decision outcomes
  useEffect(() => {
    // Count completed and successful decisions from the store
    const completedDecisions = aiDecisions.filter((d: AIDecision) => d.status === 'completed');

    // Track outcomes - successful if completed with positive outcome
    const successful = completedDecisions.filter(
      (d: AIDecision) =>
        d.outcome?.toLowerCase().includes('success') ||
        d.outcome?.toLowerCase().includes('resolved') ||
        d.outcome?.toLowerCase().includes('completed') ||
        d.outcome?.toLowerCase().includes('improved') ||
        !d.outcome // No outcome recorded = assumed success
    ).length;

    decisionOutcomesRef.current = {
      successful,
      total: completedDecisions.length,
    };
  }, [aiDecisions]);

  const getTypeIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'assignment':
        return <User className={iconClass} />;
      case 'optimization':
        return <Zap className={iconClass} />;
      case 'prediction':
        return <Eye className={iconClass} />;
      case 'maintenance':
        return <Wrench className={iconClass} />;
      case 'safety':
        return <Shield className={iconClass} />;
      default:
        return <Bot className={iconClass} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'from-blue-500 to-blue-600';
      case 'optimization':
        return 'from-green-500 to-green-600';
      case 'prediction':
        return 'from-purple-500 to-purple-600';
      case 'maintenance':
        return 'from-yellow-500 to-yellow-600';
      case 'safety':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusIcon = (status: AIDecision['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'in_progress':
        return <Activity className="w-3 h-3 text-blue-400 animate-pulse" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-400" />;
      case 'superseded':
        return <AlertTriangle className="w-3 h-3 text-slate-400" />;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: AIDecision['priority']) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[priority] || colors.medium;
  };

  // Weather icon helper - kept for future UI expansion
   
  const _getWeatherIcon = () => {
    switch (weather) {
      case 'storm':
        return <CloudLightning className="w-4 h-4 text-purple-400" />;
      case 'rain':
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'cloudy':
        return <Cloud className="w-4 h-4 text-slate-400" />;
      default:
        return <Sun className="w-4 h-4 text-yellow-400" />;
    }
  };

  // Time formatter - kept for future UI expansion
   
  const _formatGameTime = (time: number) => {
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

  // Embedded mode: render content without fixed wrapper for use inside ContextSidebar
  if (embedded) {
    return (
      <>
        <div className="h-full flex flex-col bg-transparent">
          {/* Compact Header for embedded mode */}
          <div className="p-3 border-b border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Brain className="w-5 h-5" />
              <span className="font-bold text-sm">AI Engine</span>
              {/* Fixed width container prevents layout jitter */}
              <span className={`text-xs ml-1 w-16 ${isThinking ? 'animate-pulse' : 'invisible'}`}>
                analyzing...
              </span>
              {/* Gemini Settings Button */}
              <button
                onClick={() => setShowGeminiSettings(true)}
                className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
                title={
                  aiMode === 'gemini' ? 'Gemini AI Active - Click to configure' :
                    aiMode === 'hybrid' ? 'Hybrid Mode Active - Click to configure' :
                      'Heuristic Mode - Click to configure Gemini'
                }
              >
                {aiMode === 'gemini' && isGeminiConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-green-400 font-medium">Gemini</span>
                  </>
                ) : aiMode === 'hybrid' && isGeminiConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-[10px] text-purple-400 font-medium">Hybrid</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[10px] text-amber-400 font-medium">Heuristic</span>
                  </>
                )}
                <Settings className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            {/* System Status - compact */}
            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
              <div className="bg-slate-800/50 rounded px-2 py-1">
                <span className="text-slate-500">CPU</span>
                <span className="text-cyan-400 ml-1">{systemStatus.cpu.toFixed(0)}%</span>
              </div>
              <div className="bg-slate-800/50 rounded px-2 py-1">
                <span className="text-slate-500">MEM</span>
                <span className="text-green-400 ml-1">{systemStatus.memory.toFixed(0)}%</span>
              </div>
              <div className="bg-slate-800/50 rounded px-2 py-1">
                <span className="text-slate-500">DEC</span>
                <span className="text-purple-400 ml-1">{systemStatus.decisions}</span>
              </div>
              <div className="bg-slate-800/50 rounded px-2 py-1">
                {(aiMode === 'gemini' || aiMode === 'hybrid') && isGeminiConnected ? (
                  <>
                    <span className="text-slate-500">$</span>
                    <span className="text-emerald-400 ml-1">{useAIConfigStore.getState().getFormattedCost()}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">$</span>
                    <span className="text-emerald-400 ml-1">FREE</span>
                  </>
                )}
              </div>
            </div>
            {/* Emergency Drill Banner */}
            {emergencyDrillMode && (
              <div className="mt-2 px-2 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30 animate-pulse">
                <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold">
                  <Shield className="w-3 h-3" />
                  EMERGENCY DRILL IN PROGRESS
                </div>
              </div>
            )}
            {/* Context: Weather & Shift */}
            <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">
              <span className="capitalize">{weather} | {currentShift} shift</span>
              <span>Eff: {metrics.efficiency.toFixed(0)}%</span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="px-3 py-2 border-b border-slate-800 flex gap-2">
            <button
              onClick={() => setActiveTab('decisions')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'decisions'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
            >
              <Activity className="w-3 h-3 inline mr-1" />
              Decisions ({aiDecisions.length})
            </button>
            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'predictions'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Predictions ({predictedEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('strategic')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'strategic'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
            >
              <Target className="w-3 h-3 inline mr-1" />
              Strategic
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'decisions' ? (
              <>
                {aiDecisions.slice(0, 15).map((decision: AIDecision) => (
                  <div
                    key={decision.id}
                    className={`bg-slate-800/50 rounded-lg border p-2 ${decision.status === 'completed'
                      ? 'border-green-500/20'
                      : decision.status === 'in_progress'
                        ? 'border-blue-500/30'
                        : 'border-slate-700/50'
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`p-1 rounded bg-gradient-to-br ${getTypeColor(decision.type)}`}>
                        {getTypeIcon(decision.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-700 text-slate-400 uppercase">
                            {decision.type}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.5 rounded border ${getPriorityBadge(decision.priority)}`}
                          >
                            {decision.priority}
                          </span>
                          <div className="flex items-center gap-1 ml-auto">
                            {getStatusIcon(decision.status)}
                          </div>
                        </div>
                        <p className="text-xs text-white font-medium">{decision.action}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{decision.reasoning}</p>
                        <div className="flex items-center gap-2 text-[9px] text-green-400 mt-1">
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>{decision.impact}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {aiDecisions.length === 0 && (
                  <div className="text-center py-6 text-slate-500">
                    <Bot className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-xs">AI analyzing factory state...</p>
                  </div>
                )}
              </>
            ) : activeTab === 'predictions' ? (
              <>
                {predictedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1 rounded ${event.type === 'maintenance'
                            ? 'bg-yellow-500/20'
                            : event.type === 'shift_change'
                              ? 'bg-blue-500/20'
                              : event.type === 'weather'
                                ? 'bg-purple-500/20'
                                : event.type === 'fatigue'
                                  ? 'bg-orange-500/20'
                                  : 'bg-green-500/20'
                            }`}
                        >
                          {event.type === 'maintenance' && (
                            <Wrench className="w-3 h-3 text-yellow-400" />
                          )}
                          {event.type === 'shift_change' && (
                            <Users className="w-3 h-3 text-blue-400" />
                          )}
                          {event.type === 'weather' && <Cloud className="w-3 h-3 text-purple-400" />}
                          {event.type === 'fatigue' && <Gauge className="w-3 h-3 text-orange-400" />}
                          {event.type === 'optimization' && (
                            <Zap className="w-3 h-3 text-green-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-white font-medium">{event.description}</div>
                          <div className="text-[9px] text-slate-500 capitalize">
                            {event.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-cyan-400">
                          {formatTimeUntil(event.predictedTime)}
                        </div>
                        <div className="text-[9px] text-slate-500">{event.confidence}%</div>
                      </div>
                    </div>
                  </div>
                ))}
                {predictedEvents.length === 0 && (
                  <div className="text-center py-6 text-slate-500">
                    <Calendar className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-xs">No upcoming predictions</p>
                  </div>
                )}
              </>
            ) : (
              /* Strategic Tab Content */
              <div className="space-y-3">
                <VCLDebugPanel />
                <StrategicPriorityCards />
                <ActionPlanTimeline />
                <DecisionHistoryPanel />
                <VCLDiffPanel />
              </div>
            )}
          </div>
        </div>
        {/* Gemini Settings Modal - rendered for embedded mode */}
        <GeminiSettingsModal
          isOpen={showGeminiSettings}
          onClose={() => setShowGeminiSettings(false)}
        />
      </>
    );
  }

  // NOTE: Standalone mode removed - all access is via embedded mode in ContextSidebar
  // The embedded={true} prop is always passed, so we never reach here
  return null;
};
