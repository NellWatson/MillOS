import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Brain, Shield, User, Wrench, Zap, Eye } from 'lucide-react';
import { AIDecision, AlertData, WORKER_ROSTER } from '../types';

interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const AI_ACTIONS = [
  { type: 'assignment', action: 'Dispatching {worker} to {machine}', reasoning: 'Detected elevated vibration levels requiring immediate inspection', impact: 'Preventing potential equipment failure' },
  { type: 'optimization', action: 'Adjusting roller gap on Mill #3 by 0.2mm', reasoning: 'Flour particle size trending above optimal range', impact: '+2.1% extraction rate improvement' },
  { type: 'prediction', action: 'Scheduling maintenance for Sifter #1 in 48 hours', reasoning: 'Bearing wear pattern indicates 72-hour remaining life', impact: 'Avoiding unplanned 4-hour downtime' },
  { type: 'safety', action: 'Alerting {worker} about Zone 3 congestion', reasoning: 'Forklift traffic pattern creating potential collision risk', impact: 'Maintaining zero-incident record' },
  { type: 'optimization', action: 'Rebalancing silo draw sequence', reasoning: 'Grain moisture variance detected across storage units', impact: 'Maintaining consistent flour quality' },
  { type: 'assignment', action: 'Routing quality sample to Lab Station 2', reasoning: 'Lab Station 1 queue exceeds 15-minute threshold', impact: 'Reducing QC turnaround by 8 minutes' },
  { type: 'prediction', action: 'Pre-ordering replacement belt for Conveyor C', reasoning: 'Belt elongation trending toward replacement threshold', impact: 'Ensuring zero supply chain delay' },
  { type: 'maintenance', action: 'Initiating auto-lubrication cycle on Packer #2', reasoning: 'Operating hours exceeded lubrication interval', impact: 'Extending component lifespan by 15%' },
];

const MACHINE_NAMES = ['Roller Mill #2', 'Sifter #1', 'Packer #3', 'Silo #4', 'Conveyor B'];

export const AICommandCenter: React.FC<AICommandCenterProps> = ({ isOpen, onClose }) => {
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [systemStatus, setSystemStatus] = useState({ cpu: 23, memory: 45, decisions: 0 });
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate AI making decisions
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setIsThinking(true);

      setTimeout(() => {
        const template = AI_ACTIONS[Math.floor(Math.random() * AI_ACTIONS.length)];
        const worker = WORKER_ROSTER[Math.floor(Math.random() * WORKER_ROSTER.length)];
        const machine = MACHINE_NAMES[Math.floor(Math.random() * MACHINE_NAMES.length)];

        const newDecision: AIDecision = {
          id: `decision-${Date.now()}`,
          timestamp: new Date(),
          type: template.type as AIDecision['type'],
          action: template.action.replace('{worker}', worker.name).replace('{machine}', machine),
          reasoning: template.reasoning,
          confidence: 85 + Math.random() * 14,
          impact: template.impact,
          workerId: worker.id,
        };

        setDecisions(prev => [newDecision, ...prev].slice(0, 15));
        setSystemStatus(prev => ({ ...prev, decisions: prev.decisions + 1 }));
        setIsThinking(false);
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Fluctuate system metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        cpu: Math.max(15, Math.min(35, prev.cpu + (Math.random() - 0.5) * 5)),
        memory: Math.max(40, Math.min(55, prev.memory + (Math.random() - 0.5) * 3)),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className="fixed right-0 top-0 h-full w-[420px] bg-slate-950/98 backdrop-blur-xl border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/50 to-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              {isThinking && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Command Center
                {isThinking && <span className="text-xs text-cyan-400 animate-pulse">thinking...</span>}
              </h2>
              <p className="text-xs text-cyan-400/70">Autonomous Operations Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="text-[10px] text-slate-500 uppercase">CPU</div>
            <div className="text-sm font-mono text-cyan-400">{systemStatus.cpu.toFixed(1)}%</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${systemStatus.cpu}%` }} />
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="text-[10px] text-slate-500 uppercase">Memory</div>
            <div className="text-sm font-mono text-green-400">{systemStatus.memory.toFixed(1)}%</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${systemStatus.memory}%` }} />
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
            <div className="text-[10px] text-slate-500 uppercase">Decisions</div>
            <div className="text-sm font-mono text-purple-400">{systemStatus.decisions}</div>
            <div className="text-[10px] text-slate-600">this session</div>
          </div>
        </div>
      </div>

      {/* Decision Feed */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Live Decision Feed</span>
          <span className="text-xs text-cyan-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            Real-time
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          <AnimatePresence>
            {decisions.map((decision, index) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-900/80 rounded-lg border border-slate-700/50 overflow-hidden hover:border-cyan-500/30 transition-colors"
              >
                <div className={`h-1 bg-gradient-to-r ${getTypeColor(decision.type)}`} />
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    {getTypeIcon(decision.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                          {decision.type}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {decision.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-cyan-400 ml-auto">
                          {decision.confidence.toFixed(1)}% conf
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium mb-1">{decision.action}</p>
                      <p className="text-xs text-slate-400 mb-2">{decision.reasoning}</p>
                      <div className="flex items-center gap-1 text-[10px] text-green-400">
                        <span>↗</span>
                        <span>{decision.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {decisions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Bot className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">AI is analyzing operations...</p>
              <p className="text-xs text-slate-600">Decisions will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Model: MillOS-AI v0.10</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            All systems nominal
          </span>
        </div>
      </div>
    </motion.div>
  );
};
