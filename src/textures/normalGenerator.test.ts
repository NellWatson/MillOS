import { describe, expect, it } from 'vitest';
import { generateMachinePanelNormal, generateProceduralNormal } from './normalGenerator';

function channels(texture: ReturnType<typeof generateProceduralNormal>) {
  const data = texture.image.data as Uint8Array;
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    red.push(data[index]);
    green.push(data[index + 1]);
    blue.push(data[index + 2]);
  }
  return { red, green, blue };
}

describe('normalGenerator', () => {
  it('caches identical procedural normal requests', () => {
    expect(generateProceduralNormal(32, 0.5, 12)).toBe(generateProceduralNormal(32, 0.5, 12));
  });

  it('produces signed, normalized procedural relief', () => {
    const { red, green, blue } = channels(generateProceduralNormal(64, 1, 10));
    expect(Math.min(...red)).toBeLessThan(127);
    expect(Math.max(...red)).toBeGreaterThan(127);
    expect(Math.min(...green)).toBeLessThan(127);
    expect(Math.max(...green)).toBeGreaterThan(127);
    expect(Math.min(...blue)).toBeGreaterThan(220);
  });

  it('keeps machine bevels while adding unbiased face relief', () => {
    const { red, green, blue } = channels(generateMachinePanelNormal(64, 4, 6));
    expect(Math.min(...red)).toBeLessThan(90);
    expect(Math.max(...red)).toBeGreaterThan(165);
    expect(Math.min(...green)).toBeLessThan(90);
    expect(Math.max(...green)).toBeGreaterThan(165);
    expect(Math.min(...blue)).toBeGreaterThan(190);
  });
});
