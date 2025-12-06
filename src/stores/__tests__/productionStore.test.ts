/**
 * Comprehensive Tests for Production Store AI-Related Functions
 *
 * Tests the Zustand store functions related to AI decisions:
 * - addAIDecision - Adds decision to store with size limits
 * - updateDecisionStatus - Updates decision status and outcome
 * - clearOldAnnouncements - Clears expired announcements
 * - Decision array limits (max 50)
 * - Index rebuilding for efficient lookups
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useProductionStore } from '../productionStore';
import { AIDecision } from '../../types';

describe('ProductionStore - AI Decision Management', () => {
  beforeEach(() => {
    // Reset store to initial state before each test

    // Clear all state
    useProductionStore.setState({
      aiDecisions: [],
      _indices: {
        aiDecisionsByMachine: new Map(),
        aiDecisionsByWorker: new Map(),
        heatMapIndex: new Map(),
        machinesById: new Map(),
        workersById: new Map(),
      },
      machines: [],
      workers: [],
      selectedWorker: null,
      selectedMachine: null,
      announcements: [],
    });
  });

  afterEach(() => {
    // Clean up after each test
    useProductionStore.setState({
      aiDecisions: [],
      _indices: {
        aiDecisionsByMachine: new Map(),
        aiDecisionsByWorker: new Map(),
        heatMapIndex: new Map(),
        machinesById: new Map(),
        workersById: new Map(),
      },
    });
  });

  describe('addAIDecision', () => {
    it('should add a decision to the store', () => {
      const decision: AIDecision = {
        id: 'test-decision-1',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Perform scheduled maintenance',
        reasoning: 'Routine maintenance due',
        confidence: 85,
        impact: 'Prevents future failures',
        status: 'pending',
        priority: 'medium',
        machineId: 'RM-101',
      };

      const { addAIDecision } = useProductionStore.getState();

      addAIDecision(decision);

      const updatedDecisions = useProductionStore.getState().aiDecisions;
      expect(updatedDecisions).toHaveLength(1);
      expect(updatedDecisions[0]).toEqual(decision);
    });

    it('should add decisions to the front of the array', () => {
      const { addAIDecision } = useProductionStore.getState();

      const decision1: AIDecision = {
        id: 'test-decision-1',
        timestamp: new Date(Date.now() - 1000),
        type: 'maintenance',
        action: 'First decision',
        reasoning: 'Test',
        confidence: 75,
        impact: 'Test',
        status: 'pending',
        priority: 'low',
      };

      const decision2: AIDecision = {
        id: 'test-decision-2',
        timestamp: new Date(),
        type: 'optimization',
        action: 'Second decision',
        reasoning: 'Test',
        confidence: 80,
        impact: 'Test',
        status: 'pending',
        priority: 'medium',
      };

      addAIDecision(decision1);
      addAIDecision(decision2);

      const decisions = useProductionStore.getState().aiDecisions;
      expect(decisions[0].id).toBe('test-decision-2');
      expect(decisions[1].id).toBe('test-decision-1');
    });

    it('should enforce maximum decision limit of 50', () => {
      const { addAIDecision } = useProductionStore.getState();

      // Add 60 decisions
      for (let i = 0; i < 60; i++) {
        const decision: AIDecision = {
          id: `test-decision-${i}`,
          timestamp: new Date(),
          type: 'optimization',
          action: `Decision ${i}`,
          reasoning: 'Test',
          confidence: 75,
          impact: 'Test',
          status: 'pending',
          priority: 'low',
        };
        addAIDecision(decision);
      }

      const decisions = useProductionStore.getState().aiDecisions;
      expect(decisions.length).toBe(50);

      // Most recent decision should be first
      expect(decisions[0].id).toBe('test-decision-59');

      // Oldest decisions should be removed
      expect(decisions.find((d) => d.id === 'test-decision-0')).toBeUndefined();
    });

    it('should rebuild machine index when adding decisions with machineId', () => {
      const { addAIDecision } = useProductionStore.getState();

      const decision: AIDecision = {
        id: 'test-decision-machine',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Machine maintenance',
        reasoning: 'High temperature',
        confidence: 90,
        impact: 'Prevents shutdown',
        status: 'pending',
        priority: 'high',
        machineId: 'RM-101',
      };

      addAIDecision(decision);

      const { _indices } = useProductionStore.getState();
      const machineDecisions = _indices.aiDecisionsByMachine.get('RM-101');

      expect(machineDecisions).toBeDefined();
      expect(machineDecisions).toHaveLength(1);
      expect(machineDecisions![0].id).toBe('test-decision-machine');
    });

    it('should rebuild worker index when adding decisions with workerId', () => {
      const { addAIDecision } = useProductionStore.getState();

      const decision: AIDecision = {
        id: 'test-decision-worker',
        timestamp: new Date(),
        type: 'assignment',
        action: 'Assign worker to task',
        reasoning: 'Best qualified worker',
        confidence: 85,
        impact: 'Faster completion',
        status: 'pending',
        priority: 'medium',
        workerId: 'W-001',
      };

      addAIDecision(decision);

      const { _indices } = useProductionStore.getState();
      const workerDecisions = _indices.aiDecisionsByWorker.get('W-001');

      expect(workerDecisions).toBeDefined();
      expect(workerDecisions).toHaveLength(1);
      expect(workerDecisions![0].id).toBe('test-decision-worker');
    });

    it('should only index active decisions (pending or in_progress)', () => {
      const { addAIDecision } = useProductionStore.getState();

      const pendingDecision: AIDecision = {
        id: 'test-pending',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Pending action',
        reasoning: 'Test',
        confidence: 75,
        impact: 'Test',
        status: 'pending',
        priority: 'medium',
        machineId: 'RM-101',
      };

      const completedDecision: AIDecision = {
        id: 'test-completed',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Completed action',
        reasoning: 'Test',
        confidence: 75,
        impact: 'Test',
        status: 'completed',
        priority: 'medium',
        machineId: 'RM-101',
      };

      addAIDecision(pendingDecision);
      addAIDecision(completedDecision);

      const { _indices } = useProductionStore.getState();
      const machineDecisions = _indices.aiDecisionsByMachine.get('RM-101');

      // Only pending decision should be indexed
      expect(machineDecisions).toBeDefined();
      expect(machineDecisions).toHaveLength(1);
      expect(machineDecisions![0].status).toBe('pending');
    });
  });

  describe('updateDecisionStatus', () => {
    beforeEach(() => {
      // Add some test decisions
      const { addAIDecision } = useProductionStore.getState();

      addAIDecision({
        id: 'decision-to-update',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Test action',
        reasoning: 'Test reasoning',
        confidence: 80,
        impact: 'Test impact',
        status: 'pending',
        priority: 'medium',
        machineId: 'RM-101',
      });
    });

    it('should update decision status', () => {
      const { updateDecisionStatus } = useProductionStore.getState();

      updateDecisionStatus('decision-to-update', 'in_progress');

      const decisions = useProductionStore.getState().aiDecisions;
      const updated = decisions.find((d) => d.id === 'decision-to-update');

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('in_progress');
    });

    it('should update decision outcome when provided', () => {
      const { updateDecisionStatus } = useProductionStore.getState();

      updateDecisionStatus('decision-to-update', 'completed', 'Successfully completed maintenance');

      const decisions = useProductionStore.getState().aiDecisions;
      const updated = decisions.find((d) => d.id === 'decision-to-update');

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('completed');
      expect(updated!.outcome).toBe('Successfully completed maintenance');
    });

    it('should preserve existing outcome if not provided', () => {
      const { updateDecisionStatus } = useProductionStore.getState();

      // First update with outcome
      updateDecisionStatus('decision-to-update', 'in_progress', 'In progress');

      // Second update without outcome
      updateDecisionStatus('decision-to-update', 'completed');

      const decisions = useProductionStore.getState().aiDecisions;
      const updated = decisions.find((d) => d.id === 'decision-to-update');

      expect(updated).toBeDefined();
      expect(updated!.outcome).toBe('In progress');
    });

    it('should rebuild indices after status update', () => {
      const { updateDecisionStatus } = useProductionStore.getState();

      // Decision starts as pending (should be in index)
      let indices = useProductionStore.getState()._indices;
      expect(indices.aiDecisionsByMachine.get('RM-101')).toHaveLength(1);

      // Update to completed (should be removed from index)
      updateDecisionStatus('decision-to-update', 'completed');

      indices = useProductionStore.getState()._indices;
      const machineDecisions = indices.aiDecisionsByMachine.get('RM-101');

      // Completed decisions are not indexed
      expect(machineDecisions).toBeUndefined();
    });

    it('should handle non-existent decision IDs gracefully', () => {
      const { updateDecisionStatus } = useProductionStore.getState();

      const decisionsBefore = useProductionStore.getState().aiDecisions;

      updateDecisionStatus('non-existent-id', 'completed');

      const decisionsAfter = useProductionStore.getState().aiDecisions;

      // Should not modify the array
      expect(decisionsAfter).toEqual(decisionsBefore);
    });
  });

  describe('getActiveDecisionsForMachine', () => {
    beforeEach(() => {
      const { addAIDecision } = useProductionStore.getState();

      // Add active decision
      addAIDecision({
        id: 'active-machine-1',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Active maintenance',
        reasoning: 'Test',
        confidence: 80,
        impact: 'Test',
        status: 'pending',
        priority: 'high',
        machineId: 'RM-101',
      });

      // Add another active decision
      addAIDecision({
        id: 'active-machine-2',
        timestamp: new Date(),
        type: 'optimization',
        action: 'Active optimization',
        reasoning: 'Test',
        confidence: 75,
        impact: 'Test',
        status: 'in_progress',
        priority: 'medium',
        machineId: 'RM-101',
      });

      // Add completed decision (should not be returned)
      addAIDecision({
        id: 'completed-machine',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Completed maintenance',
        reasoning: 'Test',
        confidence: 80,
        impact: 'Test',
        status: 'completed',
        priority: 'medium',
        machineId: 'RM-101',
      });
    });

    it('should return active decisions for a specific machine', () => {
      const { getActiveDecisionsForMachine } = useProductionStore.getState();

      const activeDecisions = getActiveDecisionsForMachine('RM-101');

      expect(activeDecisions).toHaveLength(2);
      expect(
        activeDecisions.every((d) => d.status === 'pending' || d.status === 'in_progress')
      ).toBe(true);
    });

    it('should return empty array for machine with no decisions', () => {
      const { getActiveDecisionsForMachine } = useProductionStore.getState();

      const activeDecisions = getActiveDecisionsForMachine('NONEXISTENT');

      expect(activeDecisions).toEqual([]);
    });
  });

  describe('getActiveDecisionsForWorker', () => {
    beforeEach(() => {
      const { addAIDecision } = useProductionStore.getState();

      // Add active decision
      addAIDecision({
        id: 'active-worker-1',
        timestamp: new Date(),
        type: 'assignment',
        action: 'Worker assignment',
        reasoning: 'Test',
        confidence: 85,
        impact: 'Test',
        status: 'pending',
        priority: 'high',
        workerId: 'W-001',
      });

      // Add completed decision (should not be returned)
      addAIDecision({
        id: 'completed-worker',
        timestamp: new Date(),
        type: 'assignment',
        action: 'Completed assignment',
        reasoning: 'Test',
        confidence: 80,
        impact: 'Test',
        status: 'completed',
        priority: 'medium',
        workerId: 'W-001',
      });
    });

    it('should return active decisions for a specific worker', () => {
      const { getActiveDecisionsForWorker } = useProductionStore.getState();

      const activeDecisions = getActiveDecisionsForWorker('W-001');

      expect(activeDecisions).toHaveLength(1);
      expect(activeDecisions[0].status).toBe('pending');
    });

    it('should return empty array for worker with no decisions', () => {
      const { getActiveDecisionsForWorker } = useProductionStore.getState();

      const activeDecisions = getActiveDecisionsForWorker('NONEXISTENT');

      expect(activeDecisions).toEqual([]);
    });
  });

  describe('clearOldAnnouncements', () => {
    beforeEach(() => {
      // Clear announcements first
      useProductionStore.setState({ announcements: [] });
    });

    it('should remove announcements older than their duration', () => {
      const { clearOldAnnouncements } = useProductionStore.getState();

      // Add an old announcement (timestamp in the past, short duration)
      const oldTimestamp = Date.now() - 10000; // 10 seconds ago

      useProductionStore.setState({
        announcements: [
          {
            id: 'old-announcement',
            message: 'Old message',
            type: 'general',
            timestamp: oldTimestamp,
            duration: 5, // 5 seconds duration (expired)
            priority: 'low',
          },
        ],
      });

      clearOldAnnouncements();

      const announcements = useProductionStore.getState().announcements;
      expect(announcements).toHaveLength(0);
    });

    it('should keep recent announcements', () => {
      const { clearOldAnnouncements } = useProductionStore.getState();

      const recentTimestamp = Date.now() - 1000; // 1 second ago

      useProductionStore.setState({
        announcements: [
          {
            id: 'recent-announcement',
            message: 'Recent message',
            type: 'general',
            timestamp: recentTimestamp,
            duration: 10, // 10 seconds duration (still valid)
            priority: 'low',
          },
        ],
      });

      clearOldAnnouncements();

      const announcements = useProductionStore.getState().announcements;
      expect(announcements).toHaveLength(1);
      expect(announcements[0].id).toBe('recent-announcement');
    });

    it('should keep multiple valid announcements and remove expired ones', () => {
      const { clearOldAnnouncements } = useProductionStore.getState();

      const now = Date.now();

      useProductionStore.setState({
        announcements: [
          {
            id: 'recent-1',
            message: 'Recent 1',
            type: 'general',
            timestamp: now - 1000,
            duration: 10, // Valid
            priority: 'low',
          },
          {
            id: 'old-1',
            message: 'Old 1',
            type: 'safety',
            timestamp: now - 20000,
            duration: 10, // Expired
            priority: 'medium',
          },
          {
            id: 'recent-2',
            message: 'Recent 2',
            type: 'production',
            timestamp: now - 2000,
            duration: 15, // Valid
            priority: 'low',
          },
          {
            id: 'old-2',
            message: 'Old 2',
            type: 'general',
            timestamp: now - 30000,
            duration: 5, // Expired
            priority: 'low',
          },
        ],
      });

      clearOldAnnouncements();

      const announcements = useProductionStore.getState().announcements;
      expect(announcements).toHaveLength(2);
      expect(announcements.find((a) => a.id === 'recent-1')).toBeDefined();
      expect(announcements.find((a) => a.id === 'recent-2')).toBeDefined();
      expect(announcements.find((a) => a.id === 'old-1')).toBeUndefined();
      expect(announcements.find((a) => a.id === 'old-2')).toBeUndefined();
    });

    it('should not update state if no announcements expired', () => {
      const { clearOldAnnouncements } = useProductionStore.getState();

      const recentTimestamp = Date.now() - 1000;
      const initialAnnouncements = [
        {
          id: 'recent-announcement',
          message: 'Recent',
          type: 'general' as const,
          timestamp: recentTimestamp,
          duration: 10,
          priority: 'low' as const,
        },
      ];

      useProductionStore.setState({
        announcements: initialAnnouncements,
      });

      clearOldAnnouncements();

      const announcements = useProductionStore.getState().announcements;

      // State should not have changed (same reference)
      expect(announcements.length).toBe(1);
    });

    it('should handle empty announcements array', () => {
      const { clearOldAnnouncements } = useProductionStore.getState();

      useProductionStore.setState({ announcements: [] });

      expect(() => clearOldAnnouncements()).not.toThrow();

      const announcements = useProductionStore.getState().announcements;
      expect(announcements).toEqual([]);
    });
  });

  describe('Announcement Management', () => {
    it('should add announcements with auto-generated ID and timestamp', () => {
      const { addAnnouncement } = useProductionStore.getState();

      addAnnouncement({
        message: 'Test announcement',
        type: 'general',
        duration: 5,
        priority: 'low',
      });

      const announcements = useProductionStore.getState().announcements;
      expect(announcements).toHaveLength(1);
      expect(announcements[0]).toHaveProperty('id');
      expect(announcements[0]).toHaveProperty('timestamp');
      expect(announcements[0].message).toBe('Test announcement');
    });

    it('should limit announcements to 10 items', () => {
      const { addAnnouncement } = useProductionStore.getState();

      for (let i = 0; i < 15; i++) {
        addAnnouncement({
          message: `Announcement ${i}`,
          type: 'general',
          duration: 5,
          priority: 'low',
        });
      }

      const announcements = useProductionStore.getState().announcements;
      expect(announcements.length).toBe(10);
    });

    it('should dismiss specific announcements', () => {
      const { addAnnouncement, dismissAnnouncement } = useProductionStore.getState();

      addAnnouncement({
        message: 'Announcement 1',
        type: 'general',
        duration: 5,
        priority: 'low',
      });

      addAnnouncement({
        message: 'Announcement 2',
        type: 'safety',
        duration: 5,
        priority: 'medium',
      });

      const announcementsBefore = useProductionStore.getState().announcements;
      const idToDismiss = announcementsBefore[0].id;

      dismissAnnouncement(idToDismiss);

      const announcementsAfter = useProductionStore.getState().announcements;
      expect(announcementsAfter).toHaveLength(1);
      expect(announcementsAfter[0].id).not.toBe(idToDismiss);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle rapid decision additions efficiently', () => {
      const { addAIDecision } = useProductionStore.getState();

      const startTime = performance.now();

      // Add 100 decisions rapidly
      for (let i = 0; i < 100; i++) {
        addAIDecision({
          id: `rapid-${i}`,
          timestamp: new Date(),
          type: 'optimization',
          action: `Action ${i}`,
          reasoning: 'Test',
          confidence: 75,
          impact: 'Test',
          status: 'pending',
          priority: 'low',
          machineId: `MACHINE-${i % 10}`,
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);

      // Should still respect the 50-item limit
      const decisions = useProductionStore.getState().aiDecisions;
      expect(decisions.length).toBe(50);
    });

    it('should maintain index consistency across multiple operations', () => {
      const { addAIDecision, updateDecisionStatus } = useProductionStore.getState();

      // Add multiple decisions
      for (let i = 0; i < 10; i++) {
        addAIDecision({
          id: `consistency-${i}`,
          timestamp: new Date(),
          type: 'maintenance',
          action: `Action ${i}`,
          reasoning: 'Test',
          confidence: 80,
          impact: 'Test',
          status: 'pending',
          priority: 'medium',
          machineId: 'RM-101',
        });
      }

      // Update some to completed
      updateDecisionStatus('consistency-0', 'completed');
      updateDecisionStatus('consistency-5', 'completed');

      const { _indices } = useProductionStore.getState();
      const machineDecisions = _indices.aiDecisionsByMachine.get('RM-101') || [];

      // Should only have 8 active decisions
      expect(machineDecisions.length).toBe(8);

      // Completed ones should not be in index
      expect(machineDecisions.find((d) => d.id === 'consistency-0')).toBeUndefined();
      expect(machineDecisions.find((d) => d.id === 'consistency-5')).toBeUndefined();
    });

    it('should handle decisions with both machineId and workerId', () => {
      const { addAIDecision } = useProductionStore.getState();

      addAIDecision({
        id: 'dual-index',
        timestamp: new Date(),
        type: 'assignment',
        action: 'Assign worker to machine',
        reasoning: 'Test',
        confidence: 85,
        impact: 'Test',
        status: 'pending',
        priority: 'high',
        machineId: 'RM-101',
        workerId: 'W-001',
      });

      const { _indices } = useProductionStore.getState();

      // Should be indexed under both machine and worker
      expect(_indices.aiDecisionsByMachine.get('RM-101')).toHaveLength(1);
      expect(_indices.aiDecisionsByWorker.get('W-001')).toHaveLength(1);
    });
  });
});
