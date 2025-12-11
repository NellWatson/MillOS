/**
 * Mock AI Decision Fixtures
 *
 * Sample AI decisions for testing decision management.
 */

import { AIDecision } from '../../types';

export const createMockDecision = (overrides: Partial<AIDecision> = {}): AIDecision => ({
  id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  timestamp: new Date(),
  type: 'optimization',
  action: 'Optimize production flow',
  reasoning: 'Production efficiency can be improved',
  confidence: 85,
  impact: 'Increases throughput by 5%',
  status: 'pending',
  priority: 'medium',
  ...overrides,
});

export const mockDecisions: AIDecision[] = [
  {
    id: 'decision-maint-1',
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    type: 'maintenance',
    action: 'Schedule preventive maintenance for RM-102',
    reasoning: 'High vibration levels detected, approaching maintenance threshold',
    confidence: 92,
    impact: 'Prevents potential breakdown',
    status: 'pending',
    priority: 'high',
    machineId: 'rm-102',
    triggeredBy: 'metric',
  },
  {
    id: 'decision-assign-1',
    timestamp: new Date(Date.now() - 1800000), // 30 min ago
    type: 'assignment',
    action: 'Assign Sarah Mitchell to Plansifter B inspection',
    reasoning: 'Critical status requires immediate engineer attention',
    confidence: 88,
    impact: 'Resolves critical alert faster',
    status: 'in_progress',
    priority: 'critical',
    machineId: 'sifter-b',
    workerId: 'w2',
    triggeredBy: 'alert',
  },
  {
    id: 'decision-opt-1',
    timestamp: new Date(Date.now() - 900000), // 15 min ago
    type: 'optimization',
    action: 'Increase feed rate on Roller Mill RM-101',
    reasoning: 'Current load at 85%, capacity for 10% increase',
    confidence: 75,
    impact: 'Improves throughput by 8%',
    status: 'completed',
    priority: 'low',
    machineId: 'rm-101',
    outcome: 'Successfully increased production rate',
  },
  {
    id: 'decision-predict-1',
    timestamp: new Date(Date.now() - 600000), // 10 min ago
    type: 'prediction',
    action: 'Prepare for temperature spike in Zone 2',
    reasoning: 'Historical patterns indicate likely temperature increase in 2 hours',
    confidence: 70,
    impact: 'Proactive cooling prevents shutdowns',
    status: 'pending',
    priority: 'medium',
    uncertainty: 'Weather conditions may affect prediction accuracy',
  },
  {
    id: 'decision-safety-1',
    timestamp: new Date(Date.now() - 300000), // 5 min ago
    type: 'safety',
    action: 'Reduce forklift speed in Packing Zone',
    reasoning: 'Multiple workers detected in the area',
    confidence: 95,
    impact: 'Prevents potential collision',
    status: 'completed',
    priority: 'high',
    triggeredBy: 'prediction',
    outcome: 'Speed reduction applied successfully',
  },
];

// Generate a batch of decisions for stress testing
export const generateBatchDecisions = (count: number): AIDecision[] => {
  const types: AIDecision['type'][] = [
    'assignment',
    'optimization',
    'prediction',
    'maintenance',
    'safety',
  ];
  const priorities: AIDecision['priority'][] = ['low', 'medium', 'high', 'critical'];
  const statuses: AIDecision['status'][] = ['pending', 'in_progress', 'completed', 'superseded'];

  return Array.from({ length: count }, (_, i) => ({
    id: `batch-decision-${i}`,
    timestamp: new Date(Date.now() - i * 60000),
    type: types[i % types.length],
    action: `Batch action ${i}`,
    reasoning: `Batch reasoning ${i}`,
    confidence: 60 + Math.floor(Math.random() * 40),
    impact: `Impact ${i}`,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    machineId: i % 3 === 0 ? `rm-10${(i % 6) + 1}` : undefined,
    workerId: i % 4 === 0 ? `w${(i % 8) + 1}` : undefined,
  }));
};
