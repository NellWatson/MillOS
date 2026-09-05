import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { buildDirectStoreCallInventory } from './agent-mutation-inventory.mjs';

describe('agent direct store call inventory', () => {
  const inventory = buildDirectStoreCallInventory(resolve(import.meta.dirname, '../..'));

  it('classifies every detected direct call and separates reads from mutations', () => {
    expect(inventory.directCallCount).toBeGreaterThan(0);
    expect(inventory.directMutationCount).toBeGreaterThan(0);
    expect(inventory.calls).toHaveLength(inventory.directCallCount);
    expect(inventory.calls.some((call) => call.classification === 'unclassified')).toBe(false);
    expect(
      inventory.calls
        .filter((call) => call.classification === 'read-only')
        .every((call) => call.mutation === false)
    ).toBe(true);
    expect(
      inventory.calls
        .filter((call) => call.classification !== 'read-only')
        .every((call) => call.mutation === true)
    ).toBe(true);
  });

  it('recognizes current coordinator, compatibility, presentation, and command surfaces', () => {
    expect(inventory.classificationCounts).toMatchObject({
      compatibility: expect.any(Number),
      'cross-domain-coordination': expect.any(Number),
      diagnostic: expect.any(Number),
      'operational-command-candidate': expect.any(Number),
      'ui-preference': expect.any(Number),
    });
    for (const count of Object.values(inventory.classificationCounts)) {
      expect(count).toBeGreaterThan(0);
    }
  });
});
