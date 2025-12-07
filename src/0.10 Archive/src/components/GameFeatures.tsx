import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Trophy, Medal, Users, TrendingUp, Package,
  Shield, Award, Clock, Volume2, Map, Camera, X,
  ChevronUp, ChevronDown, Play, Pause, SkipBack, SkipForward,
  Download, Image, Star, Zap, AlertTriangle
} from 'lucide-react';
import { useMillStore } from '../store';
import { positionRegistry } from '../utils/positionRegistry';
import { audioManager } from '../utils/audioManager';

// Context to share camera feed container refs between DOM and Canvas
interface CameraFeedContextType {
  feedRefs: Map<string, React.RefObject<HTMLDivElement>>;
  registerFeedRef: (id: string, ref: React.RefObject<HTMLDivElement>) => void;
}

export const CameraFeedContext = createContext<CameraFeedContextType | null>(null);

export const useCameraFeedRefs = () => {
  const context = useContext(CameraFeedContext);
  return context;
};

// PA announcement messages for shift changes
const SHIFT_ANNOUNCEMENTS = [
  'Shift change in 5 minutes. Please complete current tasks.',
  'Day shift ending. Evening crew, please report to stations.',
  'Break time. Workers may proceed to break areas.',
  'Production target reached! Great work, team.',
  'Safety reminder: Wear PPE in all production zones.',
  'Maintenance crew to Roller Mill RM-103.',
  'Quality check required at Packer Line 2.',
];

// Hook to trigger periodic PA announcements
const usePAScheduler = () => {
  const addAnnouncement = useMillStore(state => state.addAnnouncement);

  useEffect(() => {
    // Trigger a random announcement every 45-90 seconds
    const scheduleNext = () => {
      const delay = 45000 + Math.random() * 45000;
      return setTimeout(() => {
        const message = SHIFT_ANNOUNCEMENTS[Math.floor(Math.random() * SHIFT_ANNOUNCEMENTS.length)];
        const types: Array<'shift_change' | 'safety' | 'production' | 'general'> = ['shift_change', 'safety', 'production', 'general'];
        addAnnouncement({
          type: types[Math.floor(Math.random() * types.length)],
          message,
          duration: 8,
          priority: Math.random() > 0.8 ? 'high' : 'medium',
        });
        timeoutRef = scheduleNext();
      }, delay);
    };

    let timeoutRef = scheduleNext();
    return () => clearTimeout(timeoutRef);
  }, [addAnnouncement]);
};

// PA System Announcements Component
export const PAAnnouncementSystem: React.FC = () => {
  const announcements = useMillStore(state => state.announcements);
  const dismissAnnouncement = useMillStore(state => state.dismissAnnouncement);
  const clearOldAnnouncements = useMillStore(state => state.clearOldAnnouncements);

  // Track last spoken announcement to avoid repeats
  const lastSpokenRef = useRef<string>('');
  const lastSpeakTimeRef = useRef<number>(0);

  // Schedule periodic announcements
  usePAScheduler();

  // Auto-clear old announcements
  useEffect(() => {
    const interval = setInterval(clearOldAnnouncements, 1000);
    return () => clearInterval(interval);
  }, [clearOldAnnouncements]);

  // TTS: Speak new announcements
  useEffect(() => {
    if (announcements.length === 0) return;

    const latestAnnouncement = announcements[0];
    const now = Date.now();

    // Speak if this is a new announcement and we have a cooldown (10s between TTS)
    if (
      latestAnnouncement.message !== lastSpokenRef.current &&
      now - lastSpeakTimeRef.current > 10000 &&
      !audioManager.isSpeaking()
    ) {
      lastSpokenRef.current = latestAnnouncement.message;
      lastSpeakTimeRef.current = now;
      audioManager.speakAnnouncement(latestAnnouncement.message);
    }
  }, [announcements]);

  if (announcements.length === 0) return null;

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600/95 border-red-400 text-white animate-pulse';
      case 'high':
        return 'bg-amber-600/95 border-amber-400 text-white';
      case 'medium':
        return 'bg-blue-600/95 border-blue-400 text-white';
      default:
        return 'bg-slate-800/95 border-slate-600 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shift_change':
        return <Clock className="w-5 h-5" />;
      case 'safety':
        return <Shield className="w-5 h-5" />;
      case 'emergency':
        return <AlertTriangle className="w-5 h-5" />;
      case 'production':
        return <Package className="w-5 h-5" />;
      default:
        return <Volume2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] space-y-2 pointer-events-auto max-w-[90vw]">
      <AnimatePresence>
        {announcements.slice(0, 3).map((announcement) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 backdrop-blur-xl shadow-2xl min-w-[300px] max-w-[500px] ${getPriorityStyles(announcement.priority)}`}
          >
            <div className="flex-shrink-0">
              {getTypeIcon(announcement.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{announcement.message}</p>
              <p className="text-xs opacity-70">PA System</p>
            </div>
            <button
              onClick={() => dismissAnnouncement(announcement.id)}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Daily Production Targets Widget
export const ProductionTargetsWidget: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const productionTarget = useMillStore(state => state.productionTarget);
  const totalBagsProduced = useMillStore(state => state.totalBagsProduced);

  if (!productionTarget) return null;

  const progress = (productionTarget.producedBags / productionTarget.targetBags) * 100;
  const isComplete = progress >= 100;
  const isOnTrack = progress >= 50; // Simplified check

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className={`w-5 h-5 ${isComplete ? 'text-green-400' : 'text-cyan-400'}`} />
          <span className="text-white font-medium text-sm">Daily Target</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isComplete ? 'text-green-400' : 'text-cyan-400'}`}>
            {progress.toFixed(0)}%
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Progress bar always visible */}
      <div className="px-3 pb-2">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${isComplete ? 'bg-green-500' : isOnTrack ? 'bg-cyan-500' : 'bg-amber-500'}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-slate-800 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Bags Produced</span>
                <span className="text-white font-mono">
                  {productionTarget.producedBags.toLocaleString()} / {productionTarget.targetBags.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Ever</span>
                <span className="text-cyan-400 font-mono">{totalBagsProduced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${isComplete ? 'text-green-400' : isOnTrack ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {isComplete ? 'Completed!' : isOnTrack ? 'On Track' : 'Behind Schedule'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Achievements Panel
export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const achievements = useMillStore(state => state.achievements);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'safety': return 'text-green-400 bg-green-500/20';
      case 'production': return 'text-blue-400 bg-blue-500/20';
      case 'quality': return 'text-purple-400 bg-purple-500/20';
      case 'teamwork': return 'text-amber-400 bg-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return Shield;
      case 'Package': return Package;
      case 'Award': return Award;
      case 'Users': return Users;
      case 'TrendingUp': return TrendingUp;
      default: return Trophy;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-4 md:inset-auto md:right-4 md:top-20 md:w-96 bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl z-50 flex flex-col max-h-[80vh] pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-bold text-white">Achievements</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Achievement list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {achievements.map((achievement) => {
          const IconComponent = getIconComponent(achievement.icon);
          const isUnlocked = !!achievement.unlockedAt;
          const progress = achievement.progress ?? (achievement.currentValue / achievement.requirement) * 100;

          return (
            <div
              key={achievement.id}
              className={`p-3 rounded-xl border ${isUnlocked ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-slate-700 bg-slate-800/50'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(achievement.category)}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium text-sm">{achievement.name}</h3>
                    {isUnlocked && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{achievement.description}</p>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-slate-400">{achievement.currentValue} / {achievement.requirement}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isUnlocked ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Worker Leaderboard Panel
export const WorkerLeaderboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const workerLeaderboard = useMillStore(state => state.workerLeaderboard);
  const updateWorkerScore = useMillStore(state => state.updateWorkerScore);

  // Populate leaderboard with simulated scores if empty
  useEffect(() => {
    if (workerLeaderboard.length === 0) {
      const workers = [
        { id: 'w1', name: 'Marcus Chen', score: 1250, tasks: 47 },
        { id: 'w2', name: 'Sarah Mitchell', score: 1180, tasks: 42 },
        { id: 'w3', name: 'James Rodriguez', score: 1095, tasks: 38 },
        { id: 'w4', name: 'Elena Kowalski', score: 980, tasks: 35 },
        { id: 'w5', name: 'David Park', score: 920, tasks: 33 },
        { id: 'w6', name: 'Lisa Thompson', score: 875, tasks: 31 },
        { id: 'w7', name: 'Mike Johnson', score: 810, tasks: 28 },
        { id: 'w8', name: 'Anna Schmidt', score: 750, tasks: 26 },
      ];
      workers.forEach(w => updateWorkerScore(w.id, w.name, w.score, w.tasks));
    }
  }, [workerLeaderboard.length, updateWorkerScore]);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 2: return 'bg-slate-400/20 text-slate-300 border-slate-400/50';
      case 3: return 'bg-amber-600/20 text-amber-500 border-amber-600/50';
      default: return 'bg-slate-800/50 text-slate-400 border-slate-700';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Medal className={`w-4 h-4 ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : 'text-amber-500'}`} />;
    }
    return <span className="text-xs font-mono">{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-4 md:inset-auto md:right-4 md:top-20 md:w-80 bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl z-50 flex flex-col max-h-[60vh] pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Leaderboard</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {workerLeaderboard.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            No leaderboard data yet
          </div>
        ) : (
          workerLeaderboard.map((worker, index) => (
            <div
              key={worker.workerId}
              className={`flex items-center gap-3 p-2 rounded-lg border ${getRankStyle(index + 1)}`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                {getRankIcon(index + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{worker.name}</div>
                <div className="text-[10px] text-slate-500">{worker.tasksCompleted} tasks</div>
              </div>
              <div className="text-right">
                <div className="text-cyan-400 font-mono font-bold text-sm">{worker.score}</div>
                <div className="text-[10px] text-slate-500">pts</div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

// Mini-Map Component
export const MiniMap: React.FC = () => {
  const showMiniMap = useMillStore(state => state.showMiniMap);
  const [positions, setPositions] = useState<{ workers: any[]; forklifts: any[] }>({ workers: [], forklifts: [] });

  useEffect(() => {
    if (!showMiniMap) return;

    const interval = setInterval(() => {
      setPositions({
        workers: positionRegistry.getAllWorkers(),
        forklifts: positionRegistry.getAllForklifts()
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showMiniMap]);

  if (!showMiniMap) return null;

  const mapScale = 3; // Pixels per meter
  const mapWidth = 180;
  const mapHeight = 140;
  const offsetX = mapWidth / 2;
  const offsetZ = mapHeight / 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 z-40 pointer-events-auto"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-cyan-500/30 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-800/50">
          <Map className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-white">GPS Tracking</span>
        </div>

        {/* Map area */}
        <div
          className="relative bg-slate-950"
          style={{ width: mapWidth, height: mapHeight }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20">
            {[0, 1, 2, 3].map(i => (
              <React.Fragment key={i}>
                <div
                  className="absolute w-px bg-slate-600"
                  style={{ left: `${(i + 1) * 25}%`, top: 0, bottom: 0 }}
                />
                <div
                  className="absolute h-px bg-slate-600"
                  style={{ top: `${(i + 1) * 25}%`, left: 0, right: 0 }}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Zone indicators */}
          <div className="absolute left-2 top-2 text-[8px] text-slate-500">Silos</div>
          <div className="absolute left-2 top-1/4 text-[8px] text-slate-500">Mills</div>
          <div className="absolute left-2 bottom-1/4 text-[8px] text-slate-500">Sifters</div>
          <div className="absolute left-2 bottom-2 text-[8px] text-slate-500">Packers</div>

          {/* Workers */}
          {positions.workers.map(worker => (
            <div
              key={worker.id}
              className="absolute w-2 h-2 rounded-full bg-green-500 border border-green-300"
              style={{
                left: offsetX + worker.x * mapScale / 2,
                top: offsetZ - worker.z * mapScale / 2,
                transform: 'translate(-50%, -50%)'
              }}
              title={worker.id}
            />
          ))}

          {/* Forklifts */}
          {positions.forklifts.map(forklift => (
            <div
              key={forklift.id}
              className="absolute"
              style={{
                left: offsetX + forklift.x * mapScale / 2,
                top: offsetZ - forklift.z * mapScale / 2,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="w-3 h-3 bg-amber-500 rounded-sm border border-amber-300" />
              {/* Direction indicator */}
              {forklift.dirX !== undefined && (
                <div
                  className="absolute w-0.5 h-2 bg-amber-300"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: 'center top',
                    transform: `translateX(-50%) rotate(${Math.atan2(forklift.dirX, -forklift.dirZ) * (180 / Math.PI)}deg)`
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 px-3 py-1.5 border-t border-slate-800 bg-slate-800/30">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[9px] text-slate-400">Workers</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-amber-500 rounded-sm" />
            <span className="text-[9px] text-slate-400">Forklifts</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Screenshot/Export Button Component
export const ScreenshotButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleScreenshot = async () => {
    setIsExporting(true);

    try {
      // Find the canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.error('No canvas found');
        return;
      }

      // Create a link and download
      const link = document.createElement('a');
      link.download = `millos-screenshot-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReport = () => {
    const store = useMillStore.getState();

    const report = {
      timestamp: new Date().toISOString(),
      metrics: store.metrics,
      safetyMetrics: store.safetyMetrics,
      productionTarget: store.productionTarget,
      totalBagsProduced: store.totalBagsProduced,
      achievements: store.achievements.filter(a => a.unlockedAt),
      safetyIncidents: store.safetyIncidents.slice(0, 20),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `millos-report-${new Date().toISOString().split('T')[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={handleScreenshot}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors disabled:opacity-50"
        title="Take Screenshot"
      >
        <Image className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Screenshot</span>
      </button>
      <button
        onClick={handleExportReport}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
        title="Export Report"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
      </button>
    </div>
  );
};

// Incident Replay Controls
export const IncidentReplayControls: React.FC = () => {
  const replayMode = useMillStore(state => state.replayMode);
  const replayFrames = useMillStore(state => state.replayFrames);
  const currentReplayIndex = useMillStore(state => state.currentReplayIndex);
  const setReplayMode = useMillStore(state => state.setReplayMode);
  const setReplayIndex = useMillStore(state => state.setReplayIndex);
  const clearReplayFrames = useMillStore(state => state.clearReplayFrames);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || !replayMode) return;

    const interval = setInterval(() => {
      setReplayIndex((currentReplayIndex + 1) % replayFrames.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, replayMode, currentReplayIndex, replayFrames.length, setReplayIndex]);

  if (!replayMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-red-500/30 px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-4">
          {/* Label */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-medium text-sm">Replay Mode</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReplayIndex(Math.max(0, currentReplayIndex - 10))}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setReplayIndex(Math.min(replayFrames.length - 1, currentReplayIndex + 10))}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline */}
          <div className="flex-1 min-w-[150px]">
            <input
              type="range"
              min={0}
              max={replayFrames.length - 1}
              value={currentReplayIndex}
              onChange={(e) => setReplayIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>Frame {currentReplayIndex + 1}</span>
              <span>{replayFrames.length} total</span>
            </div>
          </div>

          {/* Exit button */}
          <button
            onClick={() => {
              setReplayMode(false);
              clearReplayFrames();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
          >
            Exit Replay
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Security Camera definitions - exported for use by View components
export const SECURITY_CAMERAS = [
  { id: 'cam-1', name: 'Silo Area', position: [-15, 12, -22] as [number, number, number], lookAt: [0, 0, -22] as [number, number, number] },
  { id: 'cam-2', name: 'Milling Floor', position: [20, 10, -6] as [number, number, number], lookAt: [0, 2, -6] as [number, number, number] },
  { id: 'cam-3', name: 'Sifter Platform', position: [-18, 15, 6] as [number, number, number], lookAt: [0, 9, 6] as [number, number, number] },
  { id: 'cam-4', name: 'Packing Line', position: [15, 8, 20] as [number, number, number], lookAt: [0, 1, 19] as [number, number, number] },
  { id: 'cam-5', name: 'Loading Dock', position: [-20, 6, 25] as [number, number, number], lookAt: [0, 0, 25] as [number, number, number] },
  { id: 'cam-6', name: 'Overview', position: [25, 20, 0] as [number, number, number], lookAt: [0, 5, 0] as [number, number, number] },
];

// Live timestamp display component
const LiveTimestamp: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className={className}>{time}</span>;
};

// Camera feed view container - this div will be tracked by View components in Canvas
export const CameraFeedContainer: React.FC<{
  camId: string;
  camName: string;
  isActive: boolean;
  onClick: () => void;
  size: 'small' | 'large';
}> = ({ camId, camName, isActive, onClick, size }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Register this container ref in the store for the View component to track
  const registerCameraContainer = useMillStore(state => state.registerCameraContainer);
  const unregisterCameraContainer = useMillStore(state => state.unregisterCameraContainer);

  useEffect(() => {
    if (containerRef.current) {
      registerCameraContainer(camId, containerRef.current);
    }
    return () => {
      unregisterCameraContainer(camId);
    };
  }, [camId, registerCameraContainer, unregisterCameraContainer]);

  const isSmall = size === 'small';

  return (
    <button
      onClick={onClick}
      className={`relative rounded overflow-hidden group ${
        isActive ? 'ring-2 ring-cyan-500' : ''
      } ${isSmall ? 'w-full h-full' : 'w-full'}`}
      style={!isSmall ? { height: 120 } : undefined}
    >
      {/* This div will be the target for View component rendering */}
      <div
        ref={containerRef}
        className="absolute inset-0 bg-slate-950"
        data-camera-id={camId}
      />

      {/* Overlay UI elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scan lines effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-30"
             style={{ backgroundSize: '100% 4px' }} />

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Recording indicator */}
        <div className={`absolute ${isSmall ? 'top-1 right-1' : 'top-2 right-2'} flex items-center gap-1 ${!isSmall ? 'bg-black/50 px-1.5 py-0.5 rounded' : ''}`}>
          <span className={`${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-red-500 rounded-full animate-pulse`} />
          <span className={`${isSmall ? 'text-[8px]' : 'text-[10px]'} text-red-400 font-mono`}>
            {isSmall ? 'REC' : 'LIVE'}
          </span>
        </div>

        {/* Timestamp */}
        <div className={`absolute ${isSmall ? 'top-1 left-1' : 'bottom-2 left-2 bg-black/50 px-1.5 py-0.5 rounded'}`}>
          <LiveTimestamp className={`${isSmall ? 'text-[8px]' : 'text-[10px]'} text-green-400 font-mono`} />
        </div>

        {/* Camera name/ID */}
        <div className={`absolute ${isSmall ? 'bottom-1 left-1 right-1' : 'bottom-2 right-2 bg-black/50 px-1.5 py-0.5 rounded'}`}>
          <span className={`${isSmall ? 'text-[9px]' : 'text-[10px]'} text-white font-medium ${isSmall ? 'truncate block' : 'font-mono'}`}>
            {isSmall ? camName : camId.toUpperCase()}
          </span>
        </div>
      </div>
    </button>
  );
};

// Security Cameras Panel
export const SecurityCamerasPanel: React.FC = () => {
  const showSecurityCameras = useMillStore(state => state.showSecurityCameras);
  const setShowSecurityCameras = useMillStore(state => state.setShowSecurityCameras);
  const activeCameraId = useMillStore(state => state.activeCameraId);
  const setActiveCameraId = useMillStore(state => state.setActiveCameraId);
  const [gridView, setGridView] = useState(true);

  if (!showSecurityCameras) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-4 left-4 z-50 pointer-events-auto"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-white">Security Cameras</span>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGridView(!gridView)}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                gridView ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
              title="Grid view"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowSecurityCameras(false)}
              className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Camera Grid */}
        {gridView ? (
          <div className="grid grid-cols-3 gap-1 p-2" style={{ width: 360, height: 240 }}>
            {SECURITY_CAMERAS.slice(0, 6).map((cam) => (
              <CameraFeedContainer
                key={cam.id}
                camId={cam.id}
                camName={cam.name}
                isActive={activeCameraId === cam.id}
                onClick={() => setActiveCameraId(activeCameraId === cam.id ? null : cam.id)}
                size="small"
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="p-2 space-y-1 max-h-60 overflow-y-auto" style={{ width: 200 }}>
            {SECURITY_CAMERAS.map((cam) => (
              <button
                key={cam.id}
                onClick={() => setActiveCameraId(activeCameraId === cam.id ? null : cam.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                  activeCameraId === cam.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="text-xs flex-1 text-left truncate">{cam.name}</span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              </button>
            ))}
          </div>
        )}

        {/* Active camera PiP - larger view */}
        {activeCameraId && (
          <div className="border-t border-slate-800 p-2">
            <CameraFeedContainer
              camId={`${activeCameraId}-pip`}
              camName={SECURITY_CAMERAS.find(c => c.id === activeCameraId)?.name || ''}
              isActive={false}
              onClick={() => {}}
              size="large"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Quick Actions Bar for Gamification
export const GamificationBar: React.FC = () => {
  const [showAchievements, setShowAchievements] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const showMiniMap = useMillStore(state => state.showMiniMap);
  const setShowMiniMap = useMillStore(state => state.setShowMiniMap);
  const showSecurityCameras = useMillStore(state => state.showSecurityCameras);
  const setShowSecurityCameras = useMillStore(state => state.setShowSecurityCameras);
  const showGamificationBar = useMillStore(state => state.showGamificationBar);
  const setShowGamificationBar = useMillStore(state => state.setShowGamificationBar);
  const achievements = useMillStore(state => state.achievements);

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;

  // Show collapsed toggle button when bar is hidden
  if (!showGamificationBar) {
    return (
      <motion.button
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setShowGamificationBar(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-auto w-10 h-10 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Show Quick Actions"
      >
        <Zap className="w-5 h-5" />
      </motion.button>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-auto"
      >
        <div className="flex flex-col gap-2 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-slate-700/50 p-2">
          {/* Close button */}
          <button
            onClick={() => setShowGamificationBar(false)}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Close Quick Actions"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="border-t border-slate-700 my-1" />
          {/* Achievements */}
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative ${
              showAchievements ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
            }`}
            title="Achievements"
          >
            <Trophy className="w-5 h-5" />
            {unlockedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {unlockedCount}
              </span>
            )}
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              showLeaderboard ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
            }`}
            title="Leaderboard"
          >
            <TrendingUp className="w-5 h-5" />
          </button>

          {/* Mini-map toggle */}
          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              showMiniMap ? 'bg-green-600 text-white' : 'bg-slate-800 text-green-400 hover:bg-slate-700'
            }`}
            title="GPS Map"
          >
            <Map className="w-5 h-5" />
          </button>

          {/* Security Cameras toggle */}
          <button
            onClick={() => setShowSecurityCameras(!showSecurityCameras)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative ${
              showSecurityCameras ? 'bg-red-600 text-white' : 'bg-slate-800 text-red-400 hover:bg-slate-700'
            }`}
            title="Security Cameras"
          >
            <Camera className="w-5 h-5" />
            {showSecurityCameras && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            )}
          </button>

          {/* Screenshot/Export */}
          <div className="pt-2 border-t border-slate-700">
            <ScreenshotButton />
          </div>
        </div>
      </motion.div>

      {/* Panels */}
      <AnimatePresence>
        {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
        {showLeaderboard && <WorkerLeaderboard onClose={() => setShowLeaderboard(false)} />}
      </AnimatePresence>

      {/* Security Cameras Panel - managed separately */}
      <SecurityCamerasPanel />
    </>
  );
};
