/**
 * Comprehensive Tests for AICommandCenter Component
 *
 * Tests cover:
 * - Component rendering and initial state
 * - Decision management (generation, intervals, cleanup)
 * - System status calculations (CPU, memory, success rate)
 * - UI interactions (tab switching, expand/collapse)
 * - Memory management (cleanup on unmount)
 * - Alert reactions
 * - Predictions and impact stats
 * - Decision feed display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AICommandCenter } from '../AICommandCenter';
import { useMillStore } from '../../store';
import * as aiEngine from '../../utils/aiEngine';
import * as audioManager from '../../utils/audioManager';
import { AIDecision, AlertData, MachineData } from '../../types';

// Mock Framer Motion to avoid animation complications in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the Zustand store
vi.mock('../../store', () => ({
  useMillStore: vi.fn(),
}));

// Mock AI Engine utilities
vi.mock('../../utils/aiEngine', () => ({
  generateContextAwareDecision: vi.fn(),
  applyDecisionEffects: vi.fn(),
  reactToAlert: vi.fn(),
  getPredictedEvents: vi.fn(() => []),
  getImpactStats: vi.fn(() => null),
  getSparklineData: vi.fn(() => [0.2, 0.4, 0.6, 0.5, 0.7]),
  shouldTriggerAudioCue: vi.fn(() => false),
  getConfidenceAdjustmentForType: vi.fn(() => 0),
}));

// Mock Audio Manager
vi.mock('../../utils/audioManager', () => ({
  audioManager: {
    playAIDecision: vi.fn(),
    playAICriticalAlert: vi.fn(),
    playAIAnomaly: vi.fn(),
  },
}));

describe('AICommandCenter', () => {
  // Default mock store state
  const mockStoreState = {
    aiDecisions: [] as AIDecision[],
    alerts: [] as AlertData[],
    machines: [] as MachineData[],
    metrics: {
      throughput: 1240,
      efficiency: 87.5,
      quality: 94.2,
      uptime: 98.1,
    },
    weather: 'sunny',
    currentShift: 'day',
    gameTime: 8.5,
    workerSatisfaction: {
      averageEnergy: 75,
      averageSatisfaction: 80,
    },
    emergencyDrillMode: false,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default store mock
    (useMillStore as any).mockImplementation((selector: any) => {
      return selector(mockStoreState);
    });

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <AICommandCenter isOpen={false} onClose={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('AI Command Center')).toBeInTheDocument();
    });

    it('should display initial system status', () => {
      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // System status cards should be present
      expect(screen.getByText('CPU')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('Decisions')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should display context information (weather, time, shift)', () => {
      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/sunny/i)).toBeInTheDocument();
      expect(screen.getByText(/day shift/i)).toBeInTheDocument();
      expect(screen.getByText('08:30')).toBeInTheDocument(); // gameTime 8.5
    });

    it('should show emergency drill banner when drill mode is active', () => {
      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, emergencyDrillMode: true });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('EMERGENCY DRILL IN PROGRESS')).toBeInTheDocument();
    });

    it('should display monitoring summary', () => {
      const storeWithMachines = {
        ...mockStoreState,
        machines: [
          { id: 'm1', name: 'Test Machine' },
          { id: 'm2', name: 'Test Machine 2' },
        ] as MachineData[],
        alerts: [{ id: 'a1', type: 'warning' }] as AlertData[],
      };

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector(storeWithMachines);
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/2 machines/i)).toBeInTheDocument();
      expect(screen.getByText(/1 alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/87.5%/i)).toBeInTheDocument(); // efficiency
    });
  });

  describe('Decision Management', () => {
    it('should generate initial decision after 2 seconds', async () => {
      const mockDecision: AIDecision = {
        id: 'decision-1',
        timestamp: new Date(),
        type: 'optimization',
        action: 'Optimize production',
        reasoning: 'Efficiency below target',
        confidence: 85,
        impact: 'Increase throughput by 5%',
        status: 'pending',
        priority: 'medium',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Fast-forward past initial delay (2000ms) and decision timeout (up to 1400ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      // Should call generateContextAwareDecision
      expect(aiEngine.generateContextAwareDecision).toHaveBeenCalled();
    });

    it('should generate decisions on 6-second interval', async () => {
      const mockDecision: AIDecision = {
        id: 'decision-interval',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Schedule maintenance',
        reasoning: 'Preventive care',
        confidence: 90,
        impact: 'Prevent failures',
        status: 'pending',
        priority: 'high',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Fast-forward past initial decision (2000ms + 1500ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      // Clear initial call
      vi.clearAllMocks();

      // Fast-forward through interval + decision timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000); // First interval
        await vi.advanceTimersByTimeAsync(1500); // Decision timeout
      });

      expect(aiEngine.generateContextAwareDecision).toHaveBeenCalledTimes(1);

      // Second interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(aiEngine.generateContextAwareDecision).toHaveBeenCalledTimes(2);
    });

    it('should prevent overlapping decision generation', async () => {
      const mockDecision: AIDecision = {
        id: 'test-decision',
        timestamp: new Date(),
        type: 'optimization',
        action: 'Test',
        reasoning: 'Test',
        confidence: 75,
        impact: 'Test',
        status: 'pending',
        priority: 'low',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Let initial decision complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      // Clear initial calls
      vi.clearAllMocks();

      // Trigger decision and let it complete fully
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      // Should be called once per interval
      expect(aiEngine.generateContextAwareDecision).toHaveBeenCalledTimes(1);
    });

    it('should apply decision effects when decision is generated', async () => {
      const mockDecision: AIDecision = {
        id: 'decision-effects',
        timestamp: new Date(),
        type: 'assignment',
        action: 'Assign worker',
        reasoning: 'Task needs attention',
        confidence: 80,
        impact: 'Complete task faster',
        status: 'pending',
        priority: 'medium',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        // Wait for decision timeout (600-1400ms)
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(aiEngine.applyDecisionEffects).toHaveBeenCalledWith(mockDecision);
    });

    it('should update system status decision count when decision is generated', async () => {
      const mockDecision: AIDecision = {
        id: 'count-test',
        timestamp: new Date(),
        type: 'safety',
        action: 'Safety check',
        reasoning: 'Routine',
        confidence: 95,
        impact: 'Ensure safety',
        status: 'pending',
        priority: 'high',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Initial decisions count should be 0
      expect(screen.getByText('0')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      // Decision count should increment
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should clear all intervals and timeouts on unmount', async () => {
      const { unmount } = render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Advance timers to create timeouts/intervals
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Spy on clearTimeout and clearInterval
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // Unmount component
      unmount();

      // Should clean up timers
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should reset decisionOutcomesRef on unmount', async () => {
      const { unmount, rerender } = render(
        <AICommandCenter isOpen={true} onClose={vi.fn()} />
      );

      // Simulate some decisions being processed
      const storeWithDecisions = {
        ...mockStoreState,
        aiDecisions: [
          {
            id: 'd1',
            timestamp: new Date(),
            type: 'optimization',
            action: 'Test',
            reasoning: 'Test',
            confidence: 80,
            impact: 'Test',
            status: 'completed',
            priority: 'medium',
            outcome: 'Success',
          },
        ] as AIDecision[],
      };

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector(storeWithDecisions);
      });

      rerender(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Unmount and remount
      unmount();

      // Reset store mock
      (useMillStore as any).mockImplementation((selector: any) => {
        return selector(mockStoreState);
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Success rate should start at 0 after unmount/remount
      expect(screen.getByText(/0.0%/)).toBeInTheDocument();
    });

    it('should reset isGeneratingDecisionRef on unmount', () => {
      const { unmount } = render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Unmount
      unmount();

      // Remount and verify it can generate decisions immediately
      const mockDecision: AIDecision = {
        id: 'reset-test',
        timestamp: new Date(),
        type: 'prediction',
        action: 'Predict failure',
        reasoning: 'Pattern detected',
        confidence: 70,
        impact: 'Early warning',
        status: 'pending',
        priority: 'medium',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Should be able to generate decisions after remount
      act(() => {
        vi.advanceTimersByTime(2000);
        vi.advanceTimersByTime(1500);
      });

      expect(aiEngine.generateContextAwareDecision).toHaveBeenCalled();
    });
  });

  describe('UI Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onCloseMock = vi.fn();

      render(<AICommandCenter isOpen={true} onClose={onCloseMock} />);

      const closeButton = screen.getByText(/ESC to close/i);
      fireEvent.click(closeButton);

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should switch between decisions and predictions tabs', () => {
      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Initially on decisions tab
      expect(screen.getByText('Live Decision Feed')).toBeInTheDocument();

      // Click predictions tab
      const predictionsTab = screen.getByRole('button', { name: /Predictions/i });
      fireEvent.click(predictionsTab);

      // Should show predictions content
      expect(screen.getByText('Predictive Schedule')).toBeInTheDocument();

      // Click back to decisions tab
      const decisionsTab = screen.getByRole('button', { name: /Live Decisions/i });
      fireEvent.click(decisionsTab);

      // Should show decisions content again
      expect(screen.getByText('Live Decision Feed')).toBeInTheDocument();
    });
  });

  describe('Decision Display', () => {
    it('should display AI decisions from store', () => {
      const mockDecisions: AIDecision[] = [
        {
          id: 'display-1',
          timestamp: new Date(),
          type: 'optimization',
          action: 'Optimize Line 1',
          reasoning: 'Low efficiency detected',
          confidence: 85,
          impact: 'Increase throughput by 10%',
          status: 'in_progress',
          priority: 'high',
          machineId: 'RM-101',
        },
        {
          id: 'display-2',
          timestamp: new Date(),
          type: 'maintenance',
          action: 'Schedule maintenance for Silo A',
          reasoning: 'Preventive care window',
          confidence: 92,
          impact: 'Prevent downtime',
          status: 'completed',
          priority: 'medium',
        },
      ];

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Optimize Line 1')).toBeInTheDocument();
      expect(screen.getByText('Schedule maintenance for Silo A')).toBeInTheDocument();
      expect(screen.getByText('Low efficiency detected')).toBeInTheDocument();
    });

    it('should display decision status icons correctly', () => {
      const mockDecisions: AIDecision[] = [
        {
          id: 'status-pending',
          timestamp: new Date(),
          type: 'assignment',
          action: 'Pending task',
          reasoning: 'Test',
          confidence: 75,
          impact: 'Test',
          status: 'pending',
          priority: 'low',
        },
        {
          id: 'status-progress',
          timestamp: new Date(),
          type: 'assignment',
          action: 'In progress task',
          reasoning: 'Test',
          confidence: 75,
          impact: 'Test',
          status: 'in_progress',
          priority: 'medium',
        },
        {
          id: 'status-completed',
          timestamp: new Date(),
          type: 'assignment',
          action: 'Completed task',
          reasoning: 'Test',
          confidence: 75,
          impact: 'Test',
          status: 'completed',
          priority: 'high',
        },
      ];

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('in_progress')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should show empty state when no decisions exist', () => {
      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/AI is analyzing factory state/i)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for machine data/i)).toBeInTheDocument();
    });

    it('should limit displayed decisions to 20', () => {
      const mockDecisions: AIDecision[] = Array.from({ length: 30 }, (_, i) => ({
        id: `decision-${i}`,
        timestamp: new Date(),
        type: 'optimization',
        action: `Action ${i}`,
        reasoning: `Reasoning ${i}`,
        confidence: 75,
        impact: `Impact ${i}`,
        status: 'pending' as const,
        priority: 'low' as const,
      }));

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Should only display first 20
      expect(screen.getByText('Action 0')).toBeInTheDocument();
      expect(screen.getByText('Action 19')).toBeInTheDocument();
      expect(screen.queryByText('Action 20')).not.toBeInTheDocument();
    });

    it('should display sparklines for machine-related maintenance decisions', () => {
      const mockDecisions: AIDecision[] = [
        {
          id: 'sparkline-test',
          timestamp: new Date(),
          type: 'maintenance',
          action: 'Check temperature',
          reasoning: 'Rising trend',
          confidence: 88,
          impact: 'Prevent overheating',
          status: 'pending',
          priority: 'high',
          machineId: 'RM-101',
        },
      ];

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      const { container } = render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Sparklines should be rendered (look for SVG elements)
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);

      // Should call getSparklineData for temperature, vibration, and load
      expect(aiEngine.getSparklineData).toHaveBeenCalledWith('RM-101', 'temperature');
      expect(aiEngine.getSparklineData).toHaveBeenCalledWith('RM-101', 'vibration');
      expect(aiEngine.getSparklineData).toHaveBeenCalledWith('RM-101', 'load');
    });
  });

  describe('Alert Reactions', () => {
    it('should react to new alerts', async () => {
      const mockAlert: AlertData = {
        id: 'alert-1',
        type: 'critical',
        title: 'Machine Failure',
        message: 'RM-101 has stopped',
        machineId: 'RM-101',
        timestamp: new Date(),
        acknowledged: false,
      };

      const mockDecision: AIDecision = {
        id: 'reaction-decision',
        timestamp: new Date(),
        type: 'maintenance',
        action: 'Emergency maintenance',
        reasoning: 'Machine failure detected',
        confidence: 95,
        impact: 'Restore operation',
        status: 'pending',
        priority: 'critical',
        triggeredBy: 'alert',
      };

      vi.mocked(aiEngine.reactToAlert).mockReturnValue(mockDecision);

      const { rerender } = render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Update store with new alert
      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, alerts: [mockAlert] });
      });

      rerender(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Should react to alert after delay (1500ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(aiEngine.reactToAlert).toHaveBeenCalledWith(mockAlert);
    });

    it('should apply effects of alert reaction decision', async () => {
      const mockAlert: AlertData = {
        id: 'alert-2',
        type: 'warning',
        title: 'High Temperature',
        message: 'Temperature spike',
        machineId: 'RM-102',
        timestamp: new Date(),
        acknowledged: false,
      };

      const mockDecision: AIDecision = {
        id: 'alert-reaction',
        timestamp: new Date(),
        type: 'safety',
        action: 'Reduce load',
        reasoning: 'High temperature alert',
        confidence: 90,
        impact: 'Lower temperature',
        status: 'pending',
        priority: 'high',
      };

      vi.mocked(aiEngine.reactToAlert).mockReturnValue(mockDecision);

      const { rerender } = render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, alerts: [mockAlert] });
      });

      rerender(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(aiEngine.applyDecisionEffects).toHaveBeenCalledWith(mockDecision);
    });
  });

  describe('System Status Calculations', () => {
    it('should calculate success rate from completed decisions', async () => {
      const mockDecisions: AIDecision[] = [
        {
          id: 'd1',
          timestamp: new Date(),
          type: 'optimization',
          action: 'Test',
          reasoning: 'Test',
          confidence: 80,
          impact: 'Test',
          status: 'completed',
          priority: 'medium',
          outcome: 'Success',
        },
        {
          id: 'd2',
          timestamp: new Date(),
          type: 'optimization',
          action: 'Test',
          reasoning: 'Test',
          confidence: 80,
          impact: 'Test',
          status: 'completed',
          priority: 'medium',
          outcome: 'Resolved',
        },
        {
          id: 'd3',
          timestamp: new Date(),
          type: 'optimization',
          action: 'Test',
          reasoning: 'Test',
          confidence: 80,
          impact: 'Test',
          status: 'completed',
          priority: 'medium',
          outcome: 'Failed',
        },
      ];

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Wait for metrics interval to update (1500ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      // Success rate should be 66.7% (2 successful out of 3)
      const successRateText = screen.getByText(/66\.7%/);
      expect(successRateText).toBeInTheDocument();
    });

    it('should calculate CPU usage based on active work', async () => {
      const mockDecisions: AIDecision[] = [
        {
          id: 'd1',
          timestamp: new Date(),
          type: 'optimization',
          action: 'Test',
          reasoning: 'Test',
          confidence: 80,
          impact: 'Test',
          status: 'in_progress',
          priority: 'high',
        },
        {
          id: 'd2',
          timestamp: new Date(),
          type: 'optimization',
          action: 'Test',
          reasoning: 'Test',
          confidence: 80,
          impact: 'Test',
          status: 'pending',
          priority: 'medium',
        },
      ];

      const mockAlerts: AlertData[] = [
        {
          id: 'a1',
          type: 'critical',
          title: 'Alert',
          message: 'Test',
          timestamp: new Date(),
          acknowledged: false,
        },
      ];

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({
          ...mockStoreState,
          aiDecisions: mockDecisions,
          alerts: mockAlerts,
        });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Wait for metrics update
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      // CPU should be calculated as:
      // base (12) + active (1*8) + pending (1*2, capped at 10) + alerts (1*4) = 12 + 8 + 2 + 4 = 26
      const cpuValue = screen.getByText(/26\.0%/);
      expect(cpuValue).toBeInTheDocument();
    });

    it('should update metrics periodically', async () => {
      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Initial CPU value
      expect(screen.getByText(/15\.0%/)).toBeInTheDocument();

      // Update store with more load
      const mockDecisions: AIDecision[] = Array.from({ length: 5 }, (_, i) => ({
        id: `d${i}`,
        timestamp: new Date(),
        type: 'optimization',
        action: 'Test',
        reasoning: 'Test',
        confidence: 80,
        impact: 'Test',
        status: 'in_progress' as const,
        priority: 'high' as const,
      }));

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      // Wait for metrics interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      // CPU should be higher now
      const cpuElement = screen.queryByText(/15\.0%/);
      expect(cpuElement).not.toBeInTheDocument();
    });
  });

  describe('Predictions', () => {
    it('should display predicted events', async () => {
      const mockPredictions = [
        {
          id: 'pred-1',
          type: 'maintenance' as const,
          description: 'Scheduled maintenance for RM-101',
          predictedTime: new Date(Date.now() + 3600000), // 1 hour from now
          confidence: 85,
          machineId: 'RM-101',
          priority: 'medium' as const,
        },
        {
          id: 'pred-2',
          type: 'shift_change' as const,
          description: 'Day shift ending',
          predictedTime: new Date(Date.now() + 7200000), // 2 hours from now
          confidence: 95,
          priority: 'low' as const,
        },
      ];

      vi.mocked(aiEngine.getPredictedEvents).mockReturnValue(mockPredictions);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Wait for initial decision generation which triggers getPredictedEvents (2000ms + up to 1400ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      // Switch to predictions tab
      const predictionsTab = screen.getByRole('button', { name: /Predictions/i });
      fireEvent.click(predictionsTab);

      // Should show predictions
      expect(screen.getByText('Scheduled maintenance for RM-101')).toBeInTheDocument();
      expect(screen.getByText('Day shift ending')).toBeInTheDocument();
    });

    it('should update predictions periodically', async () => {
      const initialPredictions = [
        {
          id: 'pred-initial',
          type: 'weather' as const,
          description: 'Storm approaching',
          predictedTime: new Date(),
          confidence: 70,
          priority: 'medium' as const,
        },
      ];

      vi.mocked(aiEngine.getPredictedEvents).mockReturnValue(initialPredictions);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Clear initial calls
      vi.clearAllMocks();

      // Fast-forward prediction update interval (5000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should update predictions
      expect(aiEngine.getPredictedEvents).toHaveBeenCalled();
    });
  });

  describe('Impact Stats', () => {
    it('should display impact statistics when available', async () => {
      const mockImpactStats = {
        totalDecisions: 15,
        successfulDecisions: 12,
        preventedShutdowns: 3,
        estimatedSavings: 15000,
        shiftStart: Date.now(),
        byType: {
          maintenance: { count: 5, successRate: 80 },
          optimization: { count: 10, successRate: 85 },
        },
      };

      vi.mocked(aiEngine.getImpactStats).mockReturnValue(mockImpactStats as any);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Wait for initial decision generation which triggers getImpactStats (2000ms + up to 1400ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      expect(screen.getByText('Shift Impact')).toBeInTheDocument();
      expect(screen.getByText(/shutdowns/i)).toBeInTheDocument();
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
      expect(screen.getByText('12/15')).toBeInTheDocument(); // successful/total
    });

    it('should not display impact section when no decisions exist', () => {
      vi.mocked(aiEngine.getImpactStats).mockReturnValue({
        totalDecisions: 0,
        successfulDecisions: 0,
        preventedShutdowns: 0,
        estimatedSavings: 0,
        shiftStart: Date.now(),
        byType: {
          maintenance: { count: 0, successRate: 0 },
          optimization: { count: 0, successRate: 0 },
          assignment: { count: 0, successRate: 0 },
          safety: { count: 0, successRate: 0 },
          prediction: { count: 0, successRate: 0 },
        },
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      expect(screen.queryByText('Shift Impact')).not.toBeInTheDocument();
    });
  });

  describe('Audio Cues', () => {
    it('should play audio cue for critical decisions', async () => {
      const mockDecision: AIDecision = {
        id: 'critical-audio',
        timestamp: new Date(),
        type: 'safety',
        action: 'Emergency shutdown',
        reasoning: 'Critical failure',
        confidence: 100,
        impact: 'Prevent catastrophic failure',
        status: 'pending',
        priority: 'critical',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);
      vi.mocked(aiEngine.shouldTriggerAudioCue).mockReturnValue(true);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(audioManager.audioManager.playAICriticalAlert).toHaveBeenCalled();
    });

    it('should play anomaly audio for anomaly decisions', async () => {
      const mockDecision: AIDecision = {
        id: 'anomaly-audio',
        timestamp: new Date(),
        type: 'prediction',
        action: 'Detected anomaly in vibration pattern',
        reasoning: 'Statistical deviation',
        confidence: 88,
        impact: 'Investigate potential issue',
        status: 'pending',
        priority: 'high',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);
      vi.mocked(aiEngine.shouldTriggerAudioCue).mockReturnValue(true);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(audioManager.audioManager.playAIAnomaly).toHaveBeenCalled();
    });

    it('should play standard audio for regular decisions', async () => {
      const mockDecision: AIDecision = {
        id: 'standard-audio',
        timestamp: new Date(),
        type: 'optimization',
        action: 'Adjust production rate',
        reasoning: 'Optimize efficiency',
        confidence: 75,
        impact: 'Improve throughput',
        status: 'pending',
        priority: 'medium',
      };

      vi.mocked(aiEngine.generateContextAwareDecision).mockReturnValue(mockDecision);
      vi.mocked(aiEngine.shouldTriggerAudioCue).mockReturnValue(true);

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(audioManager.audioManager.playAIDecision).toHaveBeenCalled();
    });
  });

  describe('Confidence Adjustments', () => {
    it('should display confidence adjustments when significant', () => {
      const mockDecisions: AIDecision[] = [
        {
          id: 'adjusted-decision',
          timestamp: new Date(),
          type: 'maintenance',
          action: 'Schedule maintenance',
          reasoning: 'Historical pattern',
          confidence: 85,
          impact: 'Prevent failure',
          status: 'pending',
          priority: 'medium',
        },
      ];

      // Mock a significant adjustment (+5%)
      vi.mocked(aiEngine.getConfidenceAdjustmentForType).mockReturnValue(5);

      (useMillStore as any).mockImplementation((selector: any) => {
        return selector({ ...mockStoreState, aiDecisions: mockDecisions });
      });

      render(<AICommandCenter isOpen={true} onClose={vi.fn()} />);

      // Should display confidence with adjustment indicator
      expect(screen.getByText('85% conf')).toBeInTheDocument();
    });
  });
});
