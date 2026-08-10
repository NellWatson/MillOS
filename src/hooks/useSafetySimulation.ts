import { useEffect, useRef } from 'react';
import { useGameSimulationStore } from '../stores/gameSimulationStore';
import { useSafetyStore } from '../stores/safetyStore';
import { useProductionStore } from '../stores/productionStore';

/**
 * Hook that simulates realistic safety metrics:
 * - Syncs game days to "days since incident" counter
 * - Generates occasional random safety events during operations
 */
export function useSafetySimulation() {
  const gameDay = useGameSimulationStore((state) => state.gameDay);
  const gameSpeed = useGameSimulationStore((state) => state.gameSpeed);
  const incrementDaysSafe = useSafetyStore((state) => state.incrementDaysSafe);
  const recordRouteConflict = useSafetyStore((state) => state.recordRouteConflict);
  const recordNearMiss = useSafetyStore((state) => state.recordNearMiss);
  const addSafetyIncident = useSafetyStore((state) => state.addSafetyIncident);

  const prevGameDayRef = useRef(gameDay);
  const lastEventCheckRef = useRef(Date.now());

  // Sync game days to days since incident
  useEffect(() => {
    if (gameDay > prevGameDayRef.current) {
      // A new day has passed - increment days safe counter
      const daysElapsed = gameDay - prevGameDayRef.current;
      for (let i = 0; i < daysElapsed; i++) {
        incrementDaysSafe();
      }
    }
    prevGameDayRef.current = gameDay;
  }, [gameDay, incrementDaysSafe]);

  // Generate random safety events during active simulation
  useEffect(() => {
    if (gameSpeed === 0) return; // Paused - no events

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastEventCheckRef.current;
      lastEventCheckRef.current = now;

      // Only check every ~30 real seconds to avoid spam
      if (timeSinceLastCheck < 25000) return;

      // Count running machines - more activity = more chance of events.
      // Read fresh machine state each tick via getState() so the interval is
      // not torn down and recreated every time the machines array changes.
      const machines = useProductionStore.getState().machines;
      const runningMachines = machines.filter((m) => m.status === 'running').length;
      if (runningMachines === 0) return; // No activity, no events

      // Base probability: ~1% per check, scaled by activity level
      const activityMultiplier = Math.min(1.5, runningMachines / 10);
      const eventChance = 0.01 * activityMultiplier;

      const roll = Math.random();

      if (roll < eventChance * 0.3) {
        // Rare: Near miss event (~0.3% base chance)
        recordNearMiss();
        addSafetyIncident({
          type: 'near_miss',
          description: getRandomNearMissDescription(),
        });
      } else if (roll < eventChance) {
        // More common: mobile-equipment route conflict (~0.7% base chance)
        recordRouteConflict();
        addSafetyIncident({
          type: 'evasion',
          description: getRandomEvasionDescription(),
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [gameSpeed, recordRouteConflict, recordNearMiss, addSafetyIncident]);
}

// Random descriptions for variety
function getRandomNearMissDescription(): string {
  const descriptions = [
    'Forklift controller stopped before a blocked aisle',
    'Loose material triggered conveyor containment isolation',
    'Service rover entered a protected machine envelope',
    'Pallet shift was contained by load-stability control',
    'Floor spill triggered an automatic route closure',
    'Machine guard interlock opened during operation',
    'Conveyor clearance sensor detected an unexpected obstruction',
    'Crane load monitor detected excessive lateral movement',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getRandomEvasionDescription(): string {
  const descriptions = [
    'Forklift yielded to an approaching service rover',
    'Material tug yielded at a shared route merge',
    'Service rover cleared the loading-zone envelope',
    'Forklift paused until the conveyor crossing cleared',
    'Mobile equipment rerouted around an active machine',
    'Pallet mover cleared the packer output area',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}
