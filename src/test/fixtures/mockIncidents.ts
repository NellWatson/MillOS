/**
 * Mock Safety Incident Fixtures
 *
 * Sample incident data for testing safety store.
 */

export interface MockIncident {
  type: 'stop' | 'evasion' | 'near_miss' | 'emergency';
  description: string;
  location?: { x: number; z: number };
  forkliftId?: string;
  workerId?: string;
}

export const mockIncidents: MockIncident[] = [
  {
    type: 'stop',
    description: 'Forklift emergency stop - worker in path',
    location: { x: 5, z: 10 },
    forkliftId: 'forklift-1',
    workerId: 'w3',
  },
  {
    type: 'evasion',
    description: 'Worker evasive action near conveyor',
    location: { x: -10, z: -6 },
    workerId: 'w2',
  },
  {
    type: 'near_miss',
    description: 'Near miss at Zone 4 intersection',
    location: { x: 0, z: 18 },
    forkliftId: 'forklift-2',
    workerId: 'w4',
  },
  {
    type: 'emergency',
    description: 'Emergency response drill activated',
    location: { x: 0, z: 0 },
  },
  {
    type: 'stop',
    description: 'Speed zone violation - forklift slowed',
    location: { x: 0, z: 28 },
    forkliftId: 'forklift-1',
  },
];

// Mock speed zones for testing
export const mockSpeedZones = [
  { id: 'zone-test-1', x: 0, z: 0, radius: 5, name: 'Test Central' },
  { id: 'zone-test-2', x: 10, z: 10, radius: 3, name: 'Test Corner' },
  { id: 'zone-test-3', x: -15, z: 20, radius: 4, name: 'Test Loading' },
];

// Generate batch incidents for stress testing
export const generateBatchIncidents = (count: number): MockIncident[] => {
  const types: MockIncident['type'][] = ['stop', 'evasion', 'near_miss', 'emergency'];

  return Array.from({ length: count }, (_, i) => ({
    type: types[i % types.length],
    description: `Batch incident ${i}`,
    location: {
      x: (Math.random() - 0.5) * 60,
      z: (Math.random() - 0.5) * 60,
    },
    forkliftId: i % 2 === 0 ? `forklift-${(i % 3) + 1}` : undefined,
    workerId: i % 3 === 0 ? `w${(i % 8) + 1}` : undefined,
  }));
};
