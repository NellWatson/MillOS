/**
 * Achievement Tracker Hook
 *
 * Bridges live simulation stores to the achievements store, which previously
 * had zero producers. Subscribes to production and equipment-safety state and
 * drives useAchievementsStore progress/unlocks for:
 *
 * - first-bag / century / thousand  (productionStore.totalBagsProduced)
 * - zero-incidents                  (24 game hours without a safety incident)
 * - full-capacity                   (all machines running at 90%+ load)
 *
 * Also watches the achievements store itself and fires a success toast +
 * celebration whenever ANY achievement unlocks (including ones driven from
 * elsewhere, e.g. the bilateral achievements updated by aiEngine).
 *
 */

import { useEffect, useRef } from 'react';
import { useAchievementsStore } from '../stores/achievementsStore';
import { useProductionStore } from '../stores/productionStore';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useSafetyStore } from '../stores/safetyStore';
import { useUIStore } from '../stores/uiStore';

/** Polling cadence for aggregate checks (full-capacity and safety streaks). */
const POLL_INTERVAL_MS = 5000;

export const useAchievementTracker = (): void => {
  // Game-hours elapsed without a safety incident (for zero-incidents)
  const incidentFreeHoursRef = useRef(0);
  const lastGameTimeRef = useRef<number | null>(null);
  const lastIncidentCountRef = useRef<number | null>(null);

  // --- Unlock notifications (toast + celebration) for ALL achievements ------
  useEffect(() => {
    const initiallyUnlocked = new Set(
      useAchievementsStore
        .getState()
        .achievements.filter((a) => a.unlocked)
        .map((a) => a.id)
    );

    const unsubscribe = useAchievementsStore.subscribe(
      (state) => state.achievements,
      (achievements) => {
        achievements.forEach((a) => {
          if (!a.unlocked || initiallyUnlocked.has(a.id)) return;
          initiallyUnlocked.add(a.id);

          useUIStore.getState().addAlert({
            id: `achievement-${a.id}-${Date.now()}`,
            type: 'success',
            title: 'Achievement Unlocked',
            message: `${a.name} - ${a.description}`,
            timestamp: new Date(),
            acknowledged: false,
          });

          useGameSimulationStore.getState().triggerCelebration('milestone', {
            message: `Achievement unlocked: ${a.name}`,
          });
        });
      }
    );

    return unsubscribe;
  }, []);

  // --- Production milestones (first-bag / century / thousand) ---------------
  useEffect(() => {
    const applyBagProgress = (total: number) => {
      if (!Number.isFinite(total) || total <= 0) return;
      const store = useAchievementsStore.getState();
      store.updateAchievementProgress('first-bag', total);
      store.updateAchievementProgress('century', total);
      store.updateAchievementProgress('thousand', total);
    };

    applyBagProgress(useProductionStore.getState().totalBagsProduced);

    const unsubscribe = useProductionStore.subscribe(
      (state) => state.totalBagsProduced,
      applyBagProgress
    );
    return unsubscribe;
  }, []);

  // --- Polled aggregates: zero-incidents and full-capacity -------------------
  useEffect(() => {
    const intervalId = setInterval(() => {
      const achievements = useAchievementsStore.getState();

      // zero-incidents: accumulate game hours without a new safety incident
      const gameTime = useGameSimulationStore.getState().gameTime;
      const incidentCount = useSafetyStore.getState().safetyIncidents.length;

      if (lastIncidentCountRef.current === null) {
        lastIncidentCountRef.current = incidentCount;
      } else if (incidentCount > lastIncidentCountRef.current) {
        // New incident - reset the streak
        incidentFreeHoursRef.current = 0;
        lastIncidentCountRef.current = incidentCount;
        achievements.updateAchievementProgress('zero-incidents', 0);
      }

      if (lastGameTimeRef.current !== null) {
        let deltaHours = gameTime - lastGameTimeRef.current;
        if (deltaHours < 0) deltaHours += 24; // gameTime wraps at midnight
        if (Number.isFinite(deltaHours) && deltaHours > 0 && deltaHours < 24) {
          incidentFreeHoursRef.current += deltaHours;
          achievements.updateAchievementProgress(
            'zero-incidents',
            Math.floor(incidentFreeHoursRef.current)
          );
        }
      }
      lastGameTimeRef.current = gameTime;

      // full-capacity: all machines running at 90%+ load
      const machines = useProductionStore.getState().machines;
      if (machines.length > 0 && machines.every((m) => m.status === 'running')) {
        const minLoad = machines.reduce(
          (min, m) => Math.min(min, m.metrics?.load ?? 0),
          Number.POSITIVE_INFINITY
        );
        if (Number.isFinite(minLoad)) {
          achievements.updateAchievementProgress('full-capacity', Math.floor(minLoad));
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);
};

/**
 * Tiny always-rendered mount point for the tracker.
 * Render once anywhere in the React tree (DOM or R3F).
 */
export const AchievementTracker = (): null => {
  useAchievementTracker();
  return null;
};
