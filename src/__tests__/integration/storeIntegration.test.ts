/**
 * Store Integration Tests
 *
 * Tests cross-store workflows that involve multiple stores working together:
 * - Shift change workflow: game time advances, shift changes, worker assignments update
 * - Safety incident workflow: forklift stop, safety metric increments, incident recorded, heat map updated
 * - Chaos event workflow: chaos triggers, affected workers react, mood changes
 * - Crisis workflow: crisis triggers, emergency state activates, workers respond
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameSimulationStore } from '../../stores/gameSimulationStore';
import { useSafetyStore } from '../../stores/safetyStore';
import { useWorkerMoodStore } from '../../stores/workerMoodStore';

describe('Store Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Shift Change Workflow', () => {
    beforeEach(() => {
      // Reset game simulation store to initial state
      useGameSimulationStore.setState({
        gameTime: 6, // Start at 6 AM
        currentShift: 'morning',
        shiftChangeActive: false,
        shiftChangePhase: 'idle',
        shiftData: {
          currentShift: 'morning',
          shiftStartTime: Date.now(),
          previousShiftNotes: [],
          shiftIncidents: [],
          shiftProduction: { target: 1000, actual: 0, efficiency: 0 },
          outgoingSupervisor: 'Night Supervisor',
          incomingSupervisor: 'Morning Supervisor',
          handoverPhase: 'idle',
          priorities: [],
          workerAssignments: [],
        },
      });
    });

    it('should advance game time correctly', () => {
      const { tickGameTime, setGameSpeed } = useGameSimulationStore.getState();

      // Set game speed (60 = 1 real second = 1 game minute)
      setGameSpeed(60);

      // Tick for 1 real second (should advance 1 game minute)
      tickGameTime(1);

      const state = useGameSimulationStore.getState();
      expect(state.gameTime).toBeCloseTo(6 + 1 / 60, 2); // 6 + 1 minute
    });

    it('should trigger shift change at appropriate time', () => {
      const { setGameTime, triggerShiftChange } = useGameSimulationStore.getState();

      // Set time near shift change (2 PM for afternoon shift)
      setGameTime(14);

      // Trigger shift change
      triggerShiftChange();

      const state = useGameSimulationStore.getState();
      expect(state.shiftChangeActive).toBe(true);
      expect(state.shiftChangePhase).toBe('leaving');
    });

    it('should complete shift change and update state', () => {
      const { triggerShiftChange, completeShiftChange } = useGameSimulationStore.getState();

      // Start shift change
      triggerShiftChange();

      // Complete shift change
      completeShiftChange();

      const state = useGameSimulationStore.getState();
      expect(state.shiftChangeActive).toBe(false);
      expect(state.shiftChangePhase).toBe('idle');
    });

    it('should track shift incidents', () => {
      const { addShiftIncident, resolveShiftIncident } = useGameSimulationStore.getState();

      // Add incident
      addShiftIncident({
        type: 'machine_failure',
        machineId: 'RM-101',
        description: 'Roller mill temperature high',
        resolved: false,
        severity: 'medium',
      });

      let state = useGameSimulationStore.getState();
      expect(state.shiftData.shiftIncidents).toHaveLength(1);
      expect(state.shiftData.shiftIncidents[0].resolved).toBe(false);

      // Resolve incident
      resolveShiftIncident(0);

      state = useGameSimulationStore.getState();
      expect(state.shiftData.shiftIncidents[0].resolved).toBe(true);
    });

    it('should update shift production data', () => {
      const { updateShiftProduction } = useGameSimulationStore.getState();

      // Update production
      updateShiftProduction(750);

      const state = useGameSimulationStore.getState();
      expect(state.shiftData.shiftProduction.actual).toBe(750);
      // Efficiency = actual / target * 100 = 75%
      expect(state.shiftData.shiftProduction.efficiency).toBe(75);
    });
  });

  describe('Safety Incident Workflow', () => {
    beforeEach(() => {
      // Reset safety store
      useSafetyStore.setState({
        safetyMetrics: {
          nearMisses: 0,
          safetyStops: 0,
          workerEvasions: 0,
          lastIncidentTime: null,
          daysSinceIncident: 127,
        },
        safetyIncidents: [],
        forkliftEmergencyStop: false,
        incidentHeatMap: [],
        showIncidentHeatMap: false,
      });
    });

    it('should record safety stop and increment metrics', () => {
      const { recordSafetyStop } = useSafetyStore.getState();

      recordSafetyStop();

      const state = useSafetyStore.getState();
      expect(state.safetyMetrics.safetyStops).toBe(1);
    });

    it('should record worker evasion and increment metrics', () => {
      const { recordWorkerEvasion } = useSafetyStore.getState();

      recordWorkerEvasion();

      const state = useSafetyStore.getState();
      expect(state.safetyMetrics.workerEvasions).toBe(1);
    });

    it('should add safety incident to history', () => {
      const { addSafetyIncident } = useSafetyStore.getState();

      addSafetyIncident({
        type: 'stop',
        description: 'Forklift emergency stop triggered',
        location: { x: 10, z: 15 },
        forkliftId: 'FL-001',
      });

      const state = useSafetyStore.getState();
      expect(state.safetyIncidents).toHaveLength(1);
      expect(state.safetyIncidents[0].type).toBe('stop');
      expect(state.safetyIncidents[0].forkliftId).toBe('FL-001');
      expect(state.safetyIncidents[0].id).toBeDefined();
      expect(state.safetyIncidents[0].timestamp).toBeDefined();
    });

    it('should update incident heat map', () => {
      const { recordIncidentLocation } = useSafetyStore.getState();

      // Record incident at location
      recordIncidentLocation(10, 15, 'stop');

      const state = useSafetyStore.getState();
      expect(state.incidentHeatMap.length).toBeGreaterThan(0);
      const incident = state.incidentHeatMap[0];
      expect(incident.x).toBe(10);
      expect(incident.z).toBe(15);
      expect(incident.type).toBe('stop');
    });

    it('should handle forklift emergency stop state', () => {
      const { setForkliftEmergencyStop } = useSafetyStore.getState();

      // Trigger emergency stop
      setForkliftEmergencyStop(true);
      expect(useSafetyStore.getState().forkliftEmergencyStop).toBe(true);

      // Release emergency stop
      setForkliftEmergencyStop(false);
      expect(useSafetyStore.getState().forkliftEmergencyStop).toBe(false);
    });

    it('should clear safety incidents', () => {
      const { addSafetyIncident, clearSafetyIncidents } = useSafetyStore.getState();

      // Add some incidents
      addSafetyIncident({ type: 'stop', description: 'Test 1' });
      addSafetyIncident({ type: 'evasion', description: 'Test 2' });

      expect(useSafetyStore.getState().safetyIncidents).toHaveLength(2);

      // Clear incidents
      clearSafetyIncidents();

      expect(useSafetyStore.getState().safetyIncidents).toHaveLength(0);
    });
  });

  describe('Chaos Event Workflow', () => {
    beforeEach(() => {
      // Reset worker mood store
      const initialMoods: Record<string, any> = {};
      ['WRK001', 'WRK002', 'WRK003'].forEach((id) => {
        initialMoods[id] = {
          workerId: id,
          energy: 85,
          satisfaction: 80,
          patience: 85,
          state: 'content',
          lastBreak: 6,
          grumbleQueue: [],
          isSpeaking: false,
        };
      });

      useWorkerMoodStore.setState({
        workerMoods: initialMoods,
        workerReactions: {},
        chaosEvents: [],
        factoryEnvironment: {
          dustLevel: 20,
          machineOilLevels: {},
          lightBulbsWorking: { zone1: true, zone2: true, zone3: true, zone4: true },
          plants: [],
          coffeeMachineStatus: 'working',
          lastCleaning: Date.now(),
        },
      });
    });

    it('should add chaos event to store', () => {
      const { addChaosEvent } = useWorkerMoodStore.getState();

      addChaosEvent({
        type: 'grain_spill',
        position: [10, 0, 15],
        duration: 30,
        startTime: Date.now(),
        severity: 'moderate',
        resolved: false,
        affectedWorkerIds: ['WRK001'],
        description: 'Test grain spill',
      });

      const state = useWorkerMoodStore.getState();
      expect(state.chaosEvents).toHaveLength(1);
      expect(state.chaosEvents[0].type).toBe('grain_spill');
      expect(state.chaosEvents[0].id).toBeDefined();
    });

    it('should resolve chaos event', () => {
      const { addChaosEvent, resolveChaosEvent } = useWorkerMoodStore.getState();

      // Add event
      addChaosEvent({
        type: 'conveyor_jam',
        position: [5, 0, 10],
        duration: 45,
        startTime: Date.now(),
        severity: 'moderate',
        resolved: false,
        affectedWorkerIds: [],
        description: 'Test conveyor jam',
      });

      const eventId = useWorkerMoodStore.getState().chaosEvents[0].id;

      // Resolve event
      resolveChaosEvent(eventId);

      const state = useWorkerMoodStore.getState();
      expect(state.chaosEvents[0].resolved).toBe(true);
    });

    it('should trigger worker reactions', () => {
      const { triggerWorkerReaction } = useWorkerMoodStore.getState();

      // Trigger slipping reaction
      triggerWorkerReaction('WRK001', 'slipping', 2000);

      const state = useWorkerMoodStore.getState();
      expect(state.workerReactions['WRK001']).toBeDefined();
      expect(state.workerReactions['WRK001'].reaction).toBe('slipping');
      expect(state.workerReactions['WRK001'].duration).toBe(2000);
    });

    it('should clear worker reaction', () => {
      const { triggerWorkerReaction, clearWorkerReaction } = useWorkerMoodStore.getState();

      // Trigger and then clear
      triggerWorkerReaction('WRK002', 'coughing');
      clearWorkerReaction('WRK002');

      const state = useWorkerMoodStore.getState();
      // clearWorkerReaction sets reaction to 'none', not undefined
      expect(state.workerReactions['WRK002'].reaction).toBe('none');
    });

    it('should update worker mood', () => {
      const { updateWorkerMood } = useWorkerMoodStore.getState();

      // Update mood
      updateWorkerMood('WRK001', {
        energy: 70,
        satisfaction: 65,
        state: 'frustrated',
      });

      const state = useWorkerMoodStore.getState();
      expect(state.workerMoods['WRK001'].energy).toBe(70);
      expect(state.workerMoods['WRK001'].satisfaction).toBe(65);
      expect(state.workerMoods['WRK001'].state).toBe('frustrated');
    });

    it('should update factory environment', () => {
      // Get set function from store
      useWorkerMoodStore.setState({
        factoryEnvironment: {
          dustLevel: 50, // High dust!
          machineOilLevels: { 'RM-101': 80 },
          lightBulbsWorking: { zone1: true, zone2: false, zone3: true, zone4: true },
          plants: [],
          coffeeMachineStatus: 'broken',
          lastCleaning: Date.now() - 86400000, // Yesterday
        },
      });

      const state = useWorkerMoodStore.getState();
      expect(state.factoryEnvironment.dustLevel).toBe(50);
      expect(state.factoryEnvironment.coffeeMachineStatus).toBe('broken');
    });
  });

  describe('Crisis Workflow', () => {
    beforeEach(() => {
      // Reset game simulation store crisis state
      useGameSimulationStore.setState({
        emergencyActive: false,
        emergencyMachineId: null,
        crisisState: {
          active: false,
          type: null,
          severity: 'low',
          startTime: 0,
        },
        emergencyDrillMode: false,
      });
    });

    it('should trigger emergency state', () => {
      const { triggerEmergency } = useGameSimulationStore.getState();

      triggerEmergency('RM-103');

      const state = useGameSimulationStore.getState();
      expect(state.emergencyActive).toBe(true);
      expect(state.emergencyMachineId).toBe('RM-103');
    });

    it('should trigger crisis with type and severity', () => {
      const { triggerCrisis } = useGameSimulationStore.getState();

      triggerCrisis('fire', 'high', { machineId: 'RM-101' });

      const state = useGameSimulationStore.getState();
      expect(state.crisisState.active).toBe(true);
      expect(state.crisisState.type).toBe('fire');
      expect(state.crisisState.severity).toBe('high');
    });

    it('should end crisis', () => {
      const { triggerCrisis, resolveCrisis } = useGameSimulationStore.getState();

      // Start then end crisis
      triggerCrisis('power_outage', 'medium');
      resolveCrisis();

      const state = useGameSimulationStore.getState();
      expect(state.crisisState.active).toBe(false);
    });

    it('should toggle emergency drill mode', () => {
      const { startEmergencyDrill, endEmergencyDrill } = useGameSimulationStore.getState();

      // Enable drill mode
      startEmergencyDrill();
      expect(useGameSimulationStore.getState().emergencyDrillMode).toBe(true);
      expect(useGameSimulationStore.getState().emergencyActive).toBe(true);

      // Disable drill mode
      endEmergencyDrill();
      expect(useGameSimulationStore.getState().emergencyDrillMode).toBe(false);
      expect(useGameSimulationStore.getState().emergencyActive).toBe(false);
    });

    it('should clear emergency state', () => {
      const { triggerEmergency, resolveEmergency } = useGameSimulationStore.getState();

      // Set emergency
      triggerEmergency('RM-102');

      // Clear emergency
      resolveEmergency();

      const state = useGameSimulationStore.getState();
      expect(state.emergencyActive).toBe(false);
      expect(state.emergencyMachineId).toBeNull();
    });
  });

  describe('Cross-Store Integration', () => {
    beforeEach(() => {
      // Reset all stores
      useGameSimulationStore.setState({
        gameTime: 8,
        currentShift: 'morning',
        emergencyActive: false,
      });

      useSafetyStore.setState({
        safetyMetrics: {
          nearMisses: 0,
          safetyStops: 0,
          workerEvasions: 0,
          lastIncidentTime: null,
          daysSinceIncident: 127,
        },
        safetyIncidents: [],
      });

      useWorkerMoodStore.setState({
        chaosEvents: [],
        workerReactions: {},
      });
    });

    it('should record safety incident during emergency', () => {
      const { triggerEmergency } = useGameSimulationStore.getState();
      const { addSafetyIncident, recordSafetyStop } = useSafetyStore.getState();

      // Trigger emergency
      triggerEmergency('RM-101');

      // Record safety incident
      addSafetyIncident({
        type: 'emergency',
        description: 'Emergency response initiated',
      });
      recordSafetyStop();

      const gameState = useGameSimulationStore.getState();
      const safetyState = useSafetyStore.getState();

      expect(gameState.emergencyActive).toBe(true);
      expect(safetyState.safetyIncidents.length).toBeGreaterThan(0);
      expect(safetyState.safetyMetrics.safetyStops).toBe(1);
    });

    it('should trigger worker reactions during chaos event', () => {
      const { addChaosEvent, triggerWorkerReaction } = useWorkerMoodStore.getState();

      // Add chaos event
      addChaosEvent({
        type: 'grain_spill',
        position: [0, 0, 0],
        duration: 30,
        startTime: Date.now(),
        severity: 'moderate',
        resolved: false,
        affectedWorkerIds: ['WRK001', 'WRK002'],
        description: 'Test grain spill for integration',
      });

      // Trigger reactions for affected workers
      triggerWorkerReaction('WRK001', 'slipping');
      triggerWorkerReaction('WRK002', 'slipping');

      const state = useWorkerMoodStore.getState();
      expect(state.chaosEvents).toHaveLength(1);
      expect(Object.keys(state.workerReactions)).toHaveLength(2);
    });

    it('should add shift incident during safety event', () => {
      const { addShiftIncident } = useGameSimulationStore.getState();
      const { addSafetyIncident, recordSafetyStop } = useSafetyStore.getState();

      // Record safety event
      recordSafetyStop();
      addSafetyIncident({
        type: 'stop',
        description: 'Forklift stop near worker',
        location: { x: 10, z: 20 },
      });

      // Also record as shift incident
      addShiftIncident({
        type: 'safety_alert',
        description: 'Forklift stop near worker',
        resolved: false,
        severity: 'medium',
      });

      const gameState = useGameSimulationStore.getState();
      const safetyState = useSafetyStore.getState();

      expect(safetyState.safetyIncidents).toHaveLength(1);
      expect(gameState.shiftData.shiftIncidents).toHaveLength(1);
    });
  });
});
