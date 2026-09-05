import { describe, expect, it } from 'vitest';
import {
  formatSemanticUri,
  isSemanticUri,
  parseSemanticUri,
  resolveSemanticAlias,
  semanticUriEquals,
} from '../ontology/semanticUri.js';

describe('MillOS semantic URI', () => {
  it('round-trips every seeded identity shape without changing current IDs', () => {
    const examples = [
      ['machine', 'rm-103'],
      ['order', 'order-002'],
      ['batch', 'batch-00001'],
      ['manifest', 'shipping-0001'],
      ['incident', 'incident-0001'],
      ['alarm', 'RM101.TT001.PV-HI'],
      ['capability', 'operations.activate-order'],
      ['invariant', 'INV.QUALITY.DISPATCH_RELEASE'],
    ] as const;

    for (const [kind, localId] of examples) {
      const uri = formatSemanticUri(kind, localId);
      expect(parseSemanticUri(uri)).toEqual({ uri, kind, localId });
      expect(isSemanticUri(uri)).toBe(true);
    }
  });

  it('uses canonical percent encoding for IDs that contain path characters', () => {
    const uri = formatSemanticUri('manifest', 'supplier/lot 7');
    expect(uri).toBe('millos://manifest/supplier%2Flot%207');
    expect(parseSemanticUri(uri).localId).toBe('supplier/lot 7');
  });

  it('rejects unknown kinds, ambiguous paths, queries, controls, and non-canonical encoding', () => {
    const invalid = [
      'https://machine/rm-103',
      'millos://unknown/rm-103',
      'millos://machine/rm-103/extra',
      'millos://machine/rm-103?fresh=false',
      'millos://machine/%72m-103',
      `millos://machine/${encodeURIComponent('bad\nvalue')}`,
    ];

    for (const value of invalid) {
      expect(isSemanticUri(value), value).toBe(false);
      expect(() => parseSemanticUri(value), value).toThrow();
    }
  });

  it('resolves explicit aliases before equality comparison', () => {
    const aliases = Object.freeze({
      'RM-103': 'millos://machine/rm-103',
    });

    expect(resolveSemanticAlias('RM-103', aliases)).toBe('millos://machine/rm-103');
    expect(semanticUriEquals('RM-103', 'millos://machine/rm-103', aliases)).toBe(true);
    expect(semanticUriEquals('millos://machine/rm-102', 'millos://machine/rm-103')).toBe(false);
  });
});
