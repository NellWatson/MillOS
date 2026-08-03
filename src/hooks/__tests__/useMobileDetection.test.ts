import { afterEach, describe, expect, it } from 'vitest';
import { getMobileDetection } from '../useMobileDetection';

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

afterEach(() => setViewport(originalWidth, originalHeight));

describe('mobile and compact viewport detection', () => {
  it('classifies a narrow viewport as compact independently of touch capability', () => {
    setViewport(390, 844);

    expect(getMobileDetection().isSmallScreen).toBe(true);
  });

  it('does not treat a short desktop viewport as narrow', () => {
    setViewport(1280, 720);

    expect(getMobileDetection().isSmallScreen).toBe(false);
  });
});
