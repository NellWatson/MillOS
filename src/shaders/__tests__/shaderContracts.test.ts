import { describe, expect, it } from 'vitest';
import { ACTIVE_SHADER_CONTRACTS } from '../shaderContracts';

describe('active shader contracts', () => {
  it('has a unique, complete contract for every registered family', () => {
    const ids = ACTIVE_SHADER_CONTRACTS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ACTIVE_SHADER_CONTRACTS.length).toBeGreaterThanOrEqual(10);

    ACTIVE_SHADER_CONTRACTS.forEach((contract) => {
      expect(contract.owner.length).toBeGreaterThan(0);
      expect(contract.coordinateSpaces.length).toBeGreaterThan(0);
      expect(contract.colorSpace.length).toBeGreaterThan(0);
      expect(contract.depthBehavior.length).toBeGreaterThan(0);
      expect(contract.qualityVariants.length).toBeGreaterThan(0);
      expect(contract.uniformOwner.length).toBeGreaterThan(0);
      expect(contract.cacheKey.length).toBeGreaterThan(0);
      expect(contract.disposalOwner.length).toBeGreaterThan(0);
      expect(contract.fallbackMaterial.length).toBeGreaterThan(0);
    });
  });

  it('does not permit nondeterministic shader cache keys', () => {
    ACTIVE_SHADER_CONTRACTS.forEach(({ cacheKey }) => {
      expect(cacheKey).not.toMatch(/Date\.now|Math\.random|performance\.now/);
    });
  });

  it('requires transparent shaders to declare an explicit depth contract', () => {
    ACTIVE_SHADER_CONTRACTS.filter(({ transparency }) => transparency !== 'opaque').forEach(
      ({ depthBehavior }) => {
        expect(depthBehavior).toMatch(/depth/i);
      }
    );
  });
});
