import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceWorkerCachePrefix, serviceWorkerScopeKey } from '../serviceWorkerRegistration';

describe('service worker scope isolation', () => {
  it('creates stable keys for root and version paths', () => {
    expect(serviceWorkerScopeKey('/')).toBe('root');
    expect(serviceWorkerScopeKey('/v0.30/')).toBe('v0.30');
    expect(serviceWorkerScopeKey('operator preview')).toBe('operator_preview');
  });

  it('does not share cache prefixes across deployment scopes', () => {
    expect(serviceWorkerCachePrefix('/')).toBe('millos-root-');
    expect(serviceWorkerCachePrefix('/v0.20/')).toBe('millos-v0.20-');
    expect(serviceWorkerCachePrefix('/')).not.toBe(serviceWorkerCachePrefix('/v0.20/'));
  });

  it('limits cache management to the active scope prefix', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'public/sw.js'), 'utf8');
    expect(source).toContain('name.startsWith(CACHE_PREFIX)');
    expect(source).not.toContain("name.startsWith('millos-')");
    expect(source).toContain("type === 'GET_BUILD_INFO'");
  });
});
