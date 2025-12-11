import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  FlaskConical,
  HardHat,
  Shield,
  User,
  Wrench,
  Star,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { WorkerData, PerformanceReview, SkillLevel } from '../types';
import { toSkillLevel } from '../utils/typeGuards';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface WorkerDetailPanelProps {
  worker: WorkerData;
  onClose: () => void;
  embedded?: boolean;
}

// Promotion level configuration
const PROMOTION_LEVELS: Record<number, { name: string; color: string }> = {
  0: { name: 'Junior', color: '#eab308' },
  1: { name: 'Regular', color: '#f97316' },
  2: { name: 'Senior', color: '#3b82f6' },
  3: { name: 'Lead', color: '#8b5cf6' },
  4: { name: 'Expert', color: '#dc2626' },
};

// Skill names for display
const SKILL_NAMES: Record<keyof NonNullable<WorkerData['skills']>, string> = {
  machineOperation: 'Machine Operation',
  safetyProtocols: 'Safety Protocols',
  qualityControl: 'Quality Control',
  troubleshooting: 'Troubleshooting',
  teamwork: 'Teamwork',
};

// Cache for generated data - persists across renders
const reviewCache = new Map<string, PerformanceReview[]>();
const skillCache = new Map<string, NonNullable<WorkerData['skills']>>();

// Generate deterministic performance reviews based on worker data (cached)
const generateReviews = (worker: WorkerData): PerformanceReview[] => {
  // Check cache first
  if (reviewCache.has(worker.id)) {
    return reviewCache.get(worker.id)!;
  }

  const reviews: PerformanceReview[] = [];
  const baseScore = 70 + worker.experience * 2;

  // Use worker ID hash for deterministic "randomness"
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const workerHash = hashCode(worker.id);

  // Generate reviews based on years of experience
  for (let i = 0; i < Math.min(worker.experience, 3); i++) {
    const year = new Date().getFullYear() - i - 1;
    // Deterministic score variance based on worker ID and year
    const scoreVariance = ((workerHash + year) % 15) - 5;

    reviews.push({
      id: `review-${worker.id}-${year}`,
      date: `${year}-12-15`,
      reviewer: i === 0 ? 'Sarah Mitchell' : i === 1 ? 'James Chen' : 'Maria Garcia',
      overallScore: Math.min(100, baseScore + scoreVariance),
      strengths: [
        worker.role === 'Safety Officer' ? 'Excellent safety awareness' : 'Strong technical skills',
        'Good communication',
        worker.experience > 3 ? 'Mentoring capabilities' : 'Quick learner',
      ].slice(0, 2 + (i % 2)),
      improvements: ['Time management', 'Documentation'].slice(0, 1 + (i % 2)),
      notes: `${worker.name} has shown consistent improvement throughout the year.`,
    });
  }

  // Cache the result
  reviewCache.set(worker.id, reviews);
  return reviews;
};

// Generate deterministic skills based on worker role and experience (cached)
const generateSkills = (worker: WorkerData): NonNullable<WorkerData['skills']> => {
  // Check cache first
  if (skillCache.has(worker.id)) {
    return skillCache.get(worker.id)!;
  }

  const baseLevel = toSkillLevel(Math.floor(worker.experience / 2) + 1);

  const roleBonus: Record<
    string,
    Partial<Record<keyof NonNullable<WorkerData['skills']>, number>>
  > = {
    Supervisor: { teamwork: 1, machineOperation: 0 },
    Engineer: { troubleshooting: 1, machineOperation: 1 },
    Operator: { machineOperation: 1 },
    'Safety Officer': { safetyProtocols: 2 },
    'Quality Control': { qualityControl: 2 },
    Maintenance: { troubleshooting: 1, machineOperation: 1 },
  };

  const bonus = roleBonus[worker.role] || {};

  const skills = {
    machineOperation: toSkillLevel(baseLevel + (bonus.machineOperation || 0)),
    safetyProtocols: toSkillLevel(baseLevel + (bonus.safetyProtocols || 0)),
    qualityControl: toSkillLevel(baseLevel + (bonus.qualityControl || 0)),
    troubleshooting: toSkillLevel(baseLevel + (bonus.troubleshooting || 0)),
    teamwork: toSkillLevel(baseLevel + (bonus.teamwork || 0)),
  };

  // Cache the result
  skillCache.set(worker.id, skills);
  return skills;
};

// Skill bar component
const SkillBar: React.FC<{ name: string; level: SkillLevel }> = ({ name, level }) => (
  <div className="flex items-center gap-2">
    <div className="w-24 text-xs text-slate-400 truncate">{name}</div>
    <div className="flex-1 flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i: number) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-sm ${i <= level ? 'bg-cyan-500' : 'bg-slate-700'}`}
        />
      ))}
    </div>
    <div className="w-4 text-xs text-slate-500 text-right">{level}</div>
  </div>
);

// Performance review card component
const ReviewCard: React.FC<{ review: PerformanceReview }> = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  const scoreColor =
    review.overallScore >= 85
      ? 'text-green-400'
      : review.overallScore >= 70
        ? 'text-cyan-400'
        : 'text-amber-400';

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-white">{new Date(review.date).getFullYear()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${scoreColor}`}>{review.overallScore}</span>
          <span className="text-xs text-slate-500">/100</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
              <div className="text-[10px] text-slate-500">Reviewed by: {review.reviewer}</div>

              {/* Strengths */}
              <div>
                <div className="text-[10px] text-green-400 uppercase tracking-wider mb-1">
                  Strengths
                </div>
                <div className="flex flex-wrap gap-1">
                  {review.strengths.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-green-500/20 text-green-300 text-[10px] rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">
                  Areas for Growth
                </div>
                <div className="flex flex-wrap gap-1">
                  {review.improvements.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex items-start gap-2 mt-2">
                <MessageSquare className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-slate-400 italic">{review.notes}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const getWorkerIcon = (role: WorkerData['role']) => {
  const iconClass = 'w-8 h-8 text-white';
  switch (role) {
    case 'Supervisor':
      return <Briefcase className={iconClass} />;
    case 'Engineer':
      return <Wrench className={iconClass} />;
    case 'Operator':
      return <HardHat className={iconClass} />;
    case 'Safety Officer':
      return <Shield className={iconClass} />;
    case 'Quality Control':
      return <FlaskConical className={iconClass} />;
    case 'Maintenance':
      return <Wrench className={iconClass} />;
    default:
      return <User className={iconClass} />;
  }
};

export const WorkerDetailPanel: React.FC<WorkerDetailPanelProps> = ({
  worker,
  onClose,
  embedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'reviews'>('overview');
  const panelRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap(panelRef as React.RefObject<HTMLElement>, !embedded, onClose);

  // Derive promotion level from experience
  const promotionLevel = useMemo(() => {
    const exp = worker.experience || 0;
    if (exp >= 10) return 4;
    if (exp >= 5) return 3;
    if (exp >= 3) return 2;
    if (exp >= 1) return 1;
    return 0;
  }, [worker.experience]);

  const promotion = PROMOTION_LEVELS[promotionLevel];

  // Generate or use existing skills/reviews (cached for consistency)
  const skills = useMemo(() => worker.skills || generateSkills(worker), [worker]);
  const reviews = useMemo(() => worker.performanceReviews || generateReviews(worker), [worker]);

  // Calculate progress to next level based on experience (deterministic, not random)
  const progressToNextLevel = useMemo(() => {
    const exp = worker.experience || 0;
    // Each level requires ~2 years, progress within current level
    const yearsInLevel = exp % 2;
    return Math.round((yearsInLevel / 2) * 100);
  }, [worker.experience]);

  const getStatusColor = () => {
    switch (worker.status) {
      case 'working':
        return 'bg-green-500';
      case 'responding':
        return 'bg-yellow-500';
      case 'break':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getRoleColor = () => {
    switch (worker.role) {
      case 'Supervisor':
        return 'from-blue-500 to-blue-700';
      case 'Engineer':
        return 'from-purple-500 to-purple-700';
      case 'Operator':
        return 'from-orange-500 to-orange-700';
      case 'Safety Officer':
        return 'from-green-500 to-green-700';
      case 'Quality Control':
        return 'from-pink-500 to-pink-700';
      case 'Maintenance':
        return 'from-yellow-500 to-yellow-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  const containerClasses = embedded
    ? 'w-full h-full flex flex-col bg-slate-900/50'
    : 'absolute bottom-6 left-6 w-96 z-20 max-h-[85vh] flex flex-col';

  const animationProps = embedded
    ? {}
    : {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.95 },
      };

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal={!embedded}
      aria-labelledby="worker-detail-title"
      className={containerClasses}
      {...animationProps}
    >
      <div
        className={`rounded-xl overflow-hidden flex flex-col ${embedded ? 'h-full bg-transparent' : 'bg-slate-900/95 backdrop-blur-xl border border-slate-600 shadow-2xl'}`}
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${getRoleColor()} p-4 relative flex-shrink-0`}>
          {!embedded && (
            <button
              onClick={onClose}
              aria-label={`Close ${worker.name} details`}
              className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              ×
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center relative">
              {getWorkerIcon(worker.role)}
              {/* Promotion badge */}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white/30"
                style={{ backgroundColor: promotion.color }}
                aria-label={`${promotion.name} level`}
              >
                {promotion.name[0]}
              </div>
            </div>
            <div>
              <h2 id="worker-detail-title" className="text-xl font-bold text-white">
                {worker.name}
              </h2>
              <p className="text-white/80 text-sm">
                {promotion.name} {worker.role}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}
                  aria-hidden="true"
                />
                <span className="text-white/70 text-xs capitalize">{worker.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          className="flex border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50"
        >
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'skills', label: 'Skills', icon: TrendingUp },
            { id: 'reviews', label: 'Reviews', icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500 ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900/30">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                role="tabpanel"
                id="overview-panel"
                aria-labelledby="overview-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                {/* Current Task */}
                <div className="p-4 border-b border-slate-700/50">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Current Task
                  </div>
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
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Certifications
                  </div>
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
              </motion.div>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <motion.div
                key="skills"
                role="tabpanel"
                id="skills-panel"
                aria-labelledby="skills-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-4 space-y-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">
                    Skill Levels
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs text-cyan-400">Level {promotionLevel + 1}</span>
                  </div>
                </div>

                {Object.entries(skills).map(([key, level]) => (
                  <SkillBar
                    key={key}
                    name={SKILL_NAMES[key as keyof typeof SKILL_NAMES]}
                    level={level}
                  />
                ))}

                {/* Skill Points / XP Progress */}
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Progress to next level</span>
                    <span className="text-cyan-400">{progressToNextLevel}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${progressToNextLevel}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <motion.div
                key="reviews"
                role="tabpanel"
                id="reviews-panel"
                aria-labelledby="reviews-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-4 space-y-2"
              >
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Performance Reviews
                </div>

                {reviews.length > 0 ? (
                  reviews.map((review) => <ReviewCard key={review.id} review={review} />)
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No performance reviews yet
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700/50 flex gap-2 flex-shrink-0">
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
