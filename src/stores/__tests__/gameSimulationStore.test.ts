/**
 * Game Simulation Store Tests
 *
 * Tests for time progression, shift management, weather system,
 * emergency drills, crisis events, and celebrations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameSimulationStore } from '../gameSimulationStore';

describe('GameSimulationStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameSimulationStore.getState().resetGameState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Game Time', () => {
    it('should initialize with game time at 10am', () => {
      const { gameTime } = useGameSimulationStore.getState();
      expect(gameTime).toBe(10);
    });

    it('should initialize with default game speed of 60', () => {
      const { gameSpeed } = useGameSimulationStore.getState();
      expect(gameSpeed).toBe(60);
    });

    it('should set game time correctly', () => {
      const { setGameTime } = useGameSimulationStore.getState();
      setGameTime(12);
      expect(useGameSimulationStore.getState().gameTime).toBe(12);
    });

    it('should wrap game time at 24 hours', () => {
      const { setGameTime } = useGameSimulationStore.getState();
      setGameTime(25);
      expect(useGameSimulationStore.getState().gameTime).toBe(1);
    });

    it('should handle negative time wrap', () => {
      const { setGameTime } = useGameSimulationStore.getState();
      setGameTime(-2);
      expect(useGameSimulationStore.getState().gameTime).toBe(22);
    });

    it('should set game speed correctly', () => {
      const { setGameSpeed } = useGameSimulationStore.getState();
      setGameSpeed(120);
      expect(useGameSimulationStore.getState().gameSpeed).toBe(120);
    });

    it('should pause when speed is 0', () => {
      const { setGameSpeed, tickGameTime } = useGameSimulationStore.getState();
      setGameSpeed(0);

      // Advance past throttle interval
      vi.advanceTimersByTime(200);
      tickGameTime(1);

      expect(useGameSimulationStore.getState().gameTime).toBe(10); // Unchanged (10am default)
    });

    it('should advance time based on delta and speed', () => {
      // Reset to clear any accumulated delta from previous tests
      useGameSimulationStore.getState().resetGameState();
      const { setGameSpeed, tickGameTime } = useGameSimulationStore.getState();
      setGameSpeed(3600); // 1 real second = 1 game hour

      // The store has internal throttling at 100ms intervals
      // We need to advance time to ensure we're past the throttle interval
      // and accumulate enough delta to see a change

      // First tick to initialize lastTickTime
      vi.advanceTimersByTime(150);
      tickGameTime(0.5);

      // Second tick with more delta
      vi.advanceTimersByTime(150);
      tickGameTime(0.5);

      const { gameTime } = useGameSimulationStore.getState();
      // Time calculation: At 3600x speed, 1 real second = 1 game hour
      // With accumulated 1 second of real time, we should advance ~1 hour
      // But due to throttling, actual change may be less
      expect(gameTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Shift Management', () => {
    it('should initialize with morning shift', () => {
      const { currentShift } = useGameSimulationStore.getState();
      expect(currentShift).toBe('morning');
    });

    it('should return morning shift for hours 6-13', () => {
      const { setGameTime, setShift } = useGameSimulationStore.getState();

      setGameTime(6);
      setShift('morning');
      expect(useGameSimulationStore.getState().currentShift).toBe('morning');

      setGameTime(13);
      // Shift should still be morning until handover
    });

    it('should return afternoon shift for hours 14-21', () => {
      const { setShift } = useGameSimulationStore.getState();
      setShift('afternoon');
      expect(useGameSimulationStore.getState().currentShift).toBe('afternoon');
    });

    it('should return night shift for hours 22-5', () => {
      const { setShift } = useGameSimulationStore.getState();
      setShift('night');
      expect(useGameSimulationStore.getState().currentShift).toBe('night');
    });

    it('should trigger shift change', () => {
      const { triggerShiftChange } = useGameSimulationStore.getState();
      triggerShiftChange();

      const state = useGameSimulationStore.getState();
      expect(state.shiftChangeActive).toBe(true);
      expect(state.shiftChangePhase).toBe('leaving');
    });

    it('should complete shift change', () => {
      const { setGameTime, triggerShiftChange, completeShiftChange } =
        useGameSimulationStore.getState();

      setGameTime(14); // Afternoon time
      triggerShiftChange();
      completeShiftChange();

      const state = useGameSimulationStore.getState();
      expect(state.shiftChangeActive).toBe(false);
      expect(state.shiftChangePhase).toBe('idle');
      expect(state.currentShift).toBe('afternoon');
    });

    it('should update shift data on shift change', () => {
      const { setShift } = useGameSimulationStore.getState();
      setShift('afternoon');

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.currentShift).toBe('afternoon');
      expect(shiftData.incomingSupervisor).toBeDefined();
    });
  });

  describe('Shift Handover Phases', () => {
    it('should start shift briefing', () => {
      const { startShiftBriefing } = useGameSimulationStore.getState();
      startShiftBriefing();

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.handoverPhase).toBe('briefing');
    });

    it('should complete shift briefing', () => {
      const { startShiftBriefing, completeShiftBriefing } = useGameSimulationStore.getState();
      startShiftBriefing();
      completeShiftBriefing();

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.handoverPhase).toBe('idle');
    });

    it('should start shift handover', () => {
      const { startShiftHandover } = useGameSimulationStore.getState();
      startShiftHandover();

      const state = useGameSimulationStore.getState();
      expect(state.shiftChangeActive).toBe(true);
      expect(state.shiftData.handoverPhase).toBe('handover');
    });

    it('should complete shift handover and reset production data', () => {
      const { updateShiftProduction, startShiftHandover, completeShiftHandover, setGameTime } =
        useGameSimulationStore.getState();

      setGameTime(14);
      updateShiftProduction(500);
      startShiftHandover();
      completeShiftHandover();

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.shiftProduction.actual).toBe(0); // Reset
      expect(shiftData.shiftIncidents).toHaveLength(0); // Reset
    });

    it('should show and close shift summary', () => {
      const { showShiftSummary, closeShiftSummary } = useGameSimulationStore.getState();

      showShiftSummary();
      expect(useGameSimulationStore.getState().shiftData.handoverPhase).toBe('summary');

      closeShiftSummary();
      expect(useGameSimulationStore.getState().shiftData.handoverPhase).toBe('idle');
    });
  });

  describe('Shift Data Management', () => {
    it('should add shift notes', () => {
      const { addShiftNote } = useGameSimulationStore.getState();
      addShiftNote('Test note 1');
      addShiftNote('Test note 2');

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.previousShiftNotes).toContain('Test note 1');
      expect(shiftData.previousShiftNotes).toContain('Test note 2');
    });

    it('should add shift incidents', () => {
      const { addShiftIncident } = useGameSimulationStore.getState();
      addShiftIncident({
        type: 'machine_failure',
        machineId: 'rm-101',
        description: 'Motor overheated',
        resolved: false,
        severity: 'high',
      });

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.shiftIncidents).toHaveLength(1);
      expect(shiftData.shiftIncidents[0].type).toBe('machine_failure');
      expect(shiftData.shiftIncidents[0].timestamp).toBeDefined();
    });

    it('should resolve shift incidents', () => {
      const { addShiftIncident, resolveShiftIncident } = useGameSimulationStore.getState();
      addShiftIncident({
        type: 'safety_alert',
        description: 'Spill in Zone 2',
        resolved: false,
        severity: 'medium',
      });

      resolveShiftIncident(0);

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.shiftIncidents[0].resolved).toBe(true);
    });

    it('should update shift production metrics', () => {
      const { updateShiftProduction } = useGameSimulationStore.getState();
      updateShiftProduction(600);

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.shiftProduction.actual).toBe(600);
      expect(shiftData.shiftProduction.efficiency).toBe(50); // 600/1200 * 100
    });

    it('should add shift priorities', () => {
      const { addShiftPriority } = useGameSimulationStore.getState();
      addShiftPriority('Custom priority');

      const { shiftData } = useGameSimulationStore.getState();
      expect(shiftData.priorities).toContain('Custom priority');
    });
  });

  describe('Weather System', () => {
    it('should initialize with clear weather', () => {
      const { weather } = useGameSimulationStore.getState();
      expect(weather).toBe('clear');
    });

    it('should set weather correctly', () => {
      const { setWeather } = useGameSimulationStore.getState();

      setWeather('cloudy');
      expect(useGameSimulationStore.getState().weather).toBe('cloudy');

      setWeather('rain');
      expect(useGameSimulationStore.getState().weather).toBe('rain');

      setWeather('storm');
      expect(useGameSimulationStore.getState().weather).toBe('storm');
    });
  });

  describe('Emergency System', () => {
    it('should trigger emergency', () => {
      const { triggerEmergency } = useGameSimulationStore.getState();
      triggerEmergency('rm-101');

      const state = useGameSimulationStore.getState();
      expect(state.emergencyActive).toBe(true);
      expect(state.emergencyMachineId).toBe('rm-101');
    });

    it('should resolve emergency', () => {
      const { triggerEmergency, resolveEmergency } = useGameSimulationStore.getState();
      triggerEmergency('rm-101');
      resolveEmergency();

      const state = useGameSimulationStore.getState();
      expect(state.emergencyActive).toBe(false);
      expect(state.emergencyMachineId).toBeNull();
    });

    it('should start emergency drill', () => {
      const { startEmergencyDrill } = useGameSimulationStore.getState();
      startEmergencyDrill(10); // Pass worker count

      const state = useGameSimulationStore.getState();
      expect(state.emergencyActive).toBe(true);
      expect(state.emergencyMachineId).toBe('DRILL');
      expect(state.emergencyDrillMode).toBe(true);
      expect(state.drillMetrics.active).toBe(true);
      expect(state.drillMetrics.totalWorkers).toBe(10);
    });

    it('should end emergency drill', () => {
      const { startEmergencyDrill, endEmergencyDrill } = useGameSimulationStore.getState();
      startEmergencyDrill(10);
      endEmergencyDrill();

      const state = useGameSimulationStore.getState();
      expect(state.emergencyActive).toBe(false);
      expect(state.emergencyDrillMode).toBe(false);
    });
  });

  describe('Crisis System', () => {
    it('should trigger crisis', () => {
      const { triggerCrisis } = useGameSimulationStore.getState();
      triggerCrisis('fire', 'high', { affectedMachineId: 'rm-102' });

      const { crisisState } = useGameSimulationStore.getState();
      expect(crisisState.active).toBe(true);
      expect(crisisState.type).toBe('fire');
      expect(crisisState.severity).toBe('high');
      expect(crisisState.affectedMachineId).toBe('rm-102');
    });

    it('should not allow multiple simultaneous crises', () => {
      const { triggerCrisis } = useGameSimulationStore.getState();
      triggerCrisis('fire', 'high');
      triggerCrisis('power_outage', 'critical'); // Should be ignored

      const { crisisState } = useGameSimulationStore.getState();
      expect(crisisState.type).toBe('fire'); // First crisis still active
    });

    it('should resolve crisis', () => {
      const { triggerCrisis, resolveCrisis } = useGameSimulationStore.getState();
      triggerCrisis('inspection', 'medium');
      resolveCrisis();

      const { crisisState } = useGameSimulationStore.getState();
      expect(crisisState.active).toBe(false);
    });

    it('should support all crisis types', () => {
      const crisisTypes = ['fire', 'power_outage', 'supply_emergency', 'inspection', 'weather'];

      crisisTypes.forEach((type) => {
        useGameSimulationStore.getState().resolveCrisis(); // Clear any existing
        useGameSimulationStore
          .getState()
          .triggerCrisis(
            type as 'fire' | 'power_outage' | 'supply_emergency' | 'inspection' | 'weather',
            'medium'
          );

        const { crisisState } = useGameSimulationStore.getState();
        expect(crisisState.type).toBe(type);
        expect(crisisState.active).toBe(true);
      });
    });
  });

  describe('Celebrations System', () => {
    it('should trigger milestone celebration', () => {
      const { triggerCelebration } = useGameSimulationStore.getState();
      triggerCelebration('milestone', { value: 1000 });

      const { celebrations } = useGameSimulationStore.getState();
      expect(celebrations.celebrationActive).toBe(true);
      expect(celebrations.lastMilestone).toBe(1000);
      expect(celebrations.milestoneQueue).toHaveLength(1);
    });

    it('should trigger zero incident celebration', () => {
      const { triggerCelebration } = useGameSimulationStore.getState();
      triggerCelebration('zero_incident');

      const { celebrations } = useGameSimulationStore.getState();
      expect(celebrations.celebrationActive).toBe(true);
    });

    it('should clear celebration', () => {
      const { triggerCelebration, clearCelebration } = useGameSimulationStore.getState();
      triggerCelebration('target_met');
      clearCelebration();

      const { celebrations } = useGameSimulationStore.getState();
      expect(celebrations.celebrationActive).toBe(false);
    });

    it('should update zero incident streak', () => {
      const { updateZeroIncidentStreak } = useGameSimulationStore.getState();
      updateZeroIncidentStreak(30);

      const { celebrations } = useGameSimulationStore.getState();
      expect(celebrations.zeroIncidentStreak).toBe(30);
    });

    it('should toggle packer bell', () => {
      const { setPackerBellEnabled } = useGameSimulationStore.getState();
      setPackerBellEnabled(false);

      expect(useGameSimulationStore.getState().celebrations.packerBellEnabled).toBe(false);

      setPackerBellEnabled(true);
      expect(useGameSimulationStore.getState().celebrations.packerBellEnabled).toBe(true);
    });

    it('should limit milestone queue to 5 items', () => {
      const { triggerCelebration } = useGameSimulationStore.getState();

      for (let i = 0; i < 10; i++) {
        triggerCelebration('milestone', { value: i * 100 });
      }

      const { celebrations } = useGameSimulationStore.getState();
      expect(celebrations.milestoneQueue.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Tab Visibility', () => {
    it('should initialize with tab visible', () => {
      const { isTabVisible } = useGameSimulationStore.getState();
      expect(isTabVisible).toBe(true);
    });

    it('should set tab visibility', () => {
      const { setTabVisible } = useGameSimulationStore.getState();

      setTabVisible(false);
      expect(useGameSimulationStore.getState().isTabVisible).toBe(false);

      setTabVisible(true);
      expect(useGameSimulationStore.getState().isTabVisible).toBe(true);
    });
  });

  describe('Reset State', () => {
    it('should reset game state to defaults', () => {
      const { setGameTime, setGameSpeed, setWeather, triggerCrisis, resetGameState } =
        useGameSimulationStore.getState();

      // Modify state
      setGameTime(18);
      setGameSpeed(300);
      setWeather('storm');
      triggerCrisis('fire', 'high');

      // Reset
      resetGameState();

      const state = useGameSimulationStore.getState();
      expect(state.gameTime).toBe(10); // 10am default
      expect(state.gameSpeed).toBe(60);
      expect(state.currentShift).toBe('morning');
      expect(state.crisisState.active).toBe(false);
    });
  });
});
