import { describe, expect, it, vi } from 'vitest';
import { getPublishedVersions } from '../../scripts/npm-published-versions.js';

describe('getPublishedVersions', () => {
  it('flattens npm workspace-shaped version output', () => {
    const execute = vi.fn(() => '[["1.0.0", "1.1.0"]]');

    expect(getPublishedVersions('@scope/package', execute)).toEqual(['1.0.0', '1.1.0']);
  });

  it('treats a first-publish npm 404 as no published versions', () => {
    const execute = vi.fn(() => {
      throw Object.assign(new Error('npm view failed'), {
        status: 1,
        stderr: 'npm error code E404\nnpm error 404 Not Found',
      });
    });

    expect(getPublishedVersions('@scope/new-package', execute)).toEqual([]);
  });

  it('fails closed on npm registry and network errors', () => {
    const registryError = Object.assign(new Error('service unavailable'), {
      status: 1,
      stderr: 'npm error code E503',
    });
    const execute = vi.fn(() => {
      throw registryError;
    });

    expect(() => getPublishedVersions('@scope/package', execute)).toThrow(registryError);
  });
});
