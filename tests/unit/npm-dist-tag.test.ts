import { describe, expect, it } from 'vitest';
import { getNpmDistTag } from '../../scripts/npm-dist-tag.js';
import { formatThrowable } from '../../scripts/format-throwable.js';

describe('getNpmDistTag', () => {
  it('publishes stable versions under latest', () => {
    expect(getNpmDistTag('1.2.3')).toBe('latest');
  });

  it.each(['1.2.3-beta.1', '1.2.3-rc.2', '1.2.3-latest', '1.2.3-next'])(
    'publishes prerelease %s under next',
    version => {
      expect(getNpmDistTag(version)).toBe('next');
    }
  );

  it('rejects invalid versions', () => {
    expect(() => getNpmDistTag('latest')).toThrow('Invalid semantic version');
  });

  it('formats non-Error CLI throwables safely', () => {
    expect(formatThrowable({ code: 'INVALID_VERSION' })).toBe('{"code":"INVALID_VERSION"}');
    expect(formatThrowable('plain failure')).toBe('plain failure');
  });
});
