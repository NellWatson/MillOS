import { describe, expect, it } from 'vitest';
import { GEMINI_MODEL_CANDIDATES } from './geminiClient';

describe('Gemini model fallback policy', () => {
  it('prefers the current stable model and retains distinct fallbacks', () => {
    expect(GEMINI_MODEL_CANDIDATES[0]).toBe('gemini-3.6-flash');
    expect(GEMINI_MODEL_CANDIDATES).toContain('gemini-3.5-flash');
    expect(new Set(GEMINI_MODEL_CANDIDATES).size).toBe(GEMINI_MODEL_CANDIDATES.length);
  });
});
