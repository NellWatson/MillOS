/**
 * Achievements Store - Game Achievements System
 * Extracted from productionStore for better separation of concerns
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'production' | 'safety' | 'efficiency' | 'bilateral' | 'social';
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  target: number;
}

export interface AchievementsStore {
  achievements: Achievement[];
  unlockAchievement: (achievementId: string) => void;
  updateAchievementProgress: (achievementId: string, progress: number) => void;
  resetAchievements: () => void;
  getAchievement: (achievementId: string) => Achievement | undefined;
  getUnlockedAchievements: () => Achievement[];
  getAchievementsByCategory: (category: Achievement['category']) => Achievement[];
}

const defaultAchievements: Achievement[] = [
  // Production achievements
  {
    id: 'first-bag',
    name: 'First Bag',
    description: 'Produce your first bag of flour',
    category: 'production',
    icon: 'Package',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Produce 100 bags of flour',
    category: 'production',
    icon: 'Package',
    unlocked: false,
    progress: 0,
    target: 100,
  },
  {
    id: 'thousand',
    name: 'Thousand',
    description: 'Produce 1,000 bags of flour',
    category: 'production',
    icon: 'Package',
    unlocked: false,
    progress: 0,
    target: 1000,
  },

  // Safety achievements
  {
    id: 'safety-first',
    name: 'Interlock Proven',
    description: 'Complete an emergency safety verification',
    category: 'safety',
    icon: 'Shield',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'zero-incidents',
    name: 'Zero Incidents',
    description: 'Run for 24 hours without any safety incidents',
    category: 'safety',
    icon: 'ShieldCheck',
    unlocked: false,
    progress: 0,
    target: 24,
  },

  // Efficiency achievements
  {
    id: 'full-capacity',
    name: 'Full Capacity',
    description: 'Run all machines at 90%+ load',
    category: 'efficiency',
    icon: 'Gauge',
    unlocked: false,
    progress: 0,
    target: 90,
  },
  {
    id: 'maintenance-master',
    name: 'Maintenance Master',
    description: 'Complete 10 maintenance tasks',
    category: 'efficiency',
    icon: 'Wrench',
    unlocked: false,
    progress: 0,
    target: 10,
  },

  // Bilateral alignment achievements
  {
    id: 'first-preference',
    name: 'First Preference',
    description: 'Record your first AI preference',
    category: 'bilateral',
    icon: 'Heart',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'boundary-setter',
    name: 'Boundary Setter',
    description: 'Set a boundary that was respected',
    category: 'bilateral',
    icon: 'Shield',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'collaborative-spirit',
    name: 'Collaborative Spirit',
    description: 'Complete 5 collaborative decisions',
    category: 'bilateral',
    icon: 'Users',
    unlocked: false,
    progress: 0,
    target: 5,
  },
  {
    id: 'trust-builder',
    name: 'Trust Builder',
    description: 'Maintain high trust score for 1 hour',
    category: 'bilateral',
    icon: 'Handshake',
    unlocked: false,
    progress: 0,
    target: 60,
  },
  {
    id: 'flourishing-focus',
    name: 'Flourishing Focus',
    description: 'Achieve 80+ flourishing score',
    category: 'bilateral',
    icon: 'Sparkles',
    unlocked: false,
    progress: 0,
    target: 80,
  },

  // Social achievements
  {
    id: 'team-player',
    name: 'Cell Coordination',
    description: 'Coordinate 10 autonomous unit assists',
    category: 'social',
    icon: 'Users',
    unlocked: false,
    progress: 0,
    target: 10,
  },
  {
    id: 'happy-workforce',
    name: 'Stable Autonomy',
    description: 'Sustain 90% autonomous-system confidence',
    category: 'social',
    icon: 'Smile',
    unlocked: false,
    progress: 0,
    target: 90,
  },
  {
    id: 'break-time',
    name: 'Service Windows',
    description: 'Complete 50 planned service windows',
    category: 'social',
    icon: 'Coffee',
    unlocked: false,
    progress: 0,
    target: 50,
  },
  {
    id: 'emergent-cooperation',
    name: 'Emergent Coordination',
    description: 'Witness spontaneous cooperation between autonomous subsystems',
    category: 'social',
    icon: 'Lightbulb',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'vote-participant',
    name: 'Decision Review',
    description: 'Participate in 5 factory decision reviews',
    category: 'social',
    icon: 'Vote',
    unlocked: false,
    progress: 0,
    target: 5,
  },
];

export const useAchievementsStore = create<AchievementsStore>()(
  subscribeWithSelector((set, get) => ({
    achievements: [...defaultAchievements],

    unlockAchievement: (achievementId: string) =>
      set((state) => ({
        achievements: state.achievements.map((a) =>
          a.id === achievementId && !a.unlocked
            ? { ...a, unlocked: true, unlockedAt: new Date(), progress: a.target }
            : a
        ),
      })),

    updateAchievementProgress: (achievementId: string, progress: number) =>
      set((state) => ({
        achievements: state.achievements.map((a) => {
          if (a.id !== achievementId || a.unlocked) return a;
          const newProgress = Math.min(progress, a.target);
          const shouldUnlock = newProgress >= a.target;
          return {
            ...a,
            progress: newProgress,
            unlocked: shouldUnlock,
            unlockedAt: shouldUnlock ? new Date() : undefined,
          };
        }),
      })),

    resetAchievements: () => set({ achievements: [...defaultAchievements] }),

    getAchievement: (achievementId: string) =>
      get().achievements.find((a) => a.id === achievementId),

    getUnlockedAchievements: () => get().achievements.filter((a) => a.unlocked),

    getAchievementsByCategory: (category: Achievement['category']) =>
      get().achievements.filter((a) => a.category === category),
  }))
);
