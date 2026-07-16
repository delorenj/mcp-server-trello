import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { bumpVersion, createVersionUpdate, runVersionBump } from '../../scripts/versionbump.js';

const temporaryDirectories: string[] = [];

function createFixture() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'versionbump-'));
  temporaryDirectories.push(cwd);
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    `${JSON.stringify({ name: '@scope/server', version: '1.2.3' }, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(cwd, 'server.json'),
    `${JSON.stringify(
      {
        version: '1.2.3',
        packages: [
          { registryType: 'npm', identifier: '@scope/server', version: '1.2.3' },
          { registryType: 'oci', identifier: 'example/server', version: '9.9.9' },
        ],
      },
      null,
      2
    )}\n`
  );
  execFileSync('git', ['init', '--quiet'], { cwd });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd });
  execFileSync('git', ['add', 'package.json', 'server.json'], { cwd });
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd });
  return cwd;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('version bumping', () => {
  it.each([
    ['patch', '1.2.4-beta.1'],
    ['minor', '1.3.0-beta.1'],
    ['major', '2.0.0-beta.1'],
  ])('preserves suffixes for a %s bump', (bumpType, expected) => {
    expect(bumpVersion('1.2.3-beta.1', bumpType)).toBe(expected);
  });

  it('updates only the matching npm Registry package entry', () => {
    const update = createVersionUpdate(
      { name: '@scope/server', version: '1.2.3' },
      {
        version: '1.2.3',
        packages: [
          { registryType: 'npm', identifier: '@scope/server', version: '1.2.3' },
          { registryType: 'npm', identifier: 'another-package', version: '4.5.6' },
        ],
      },
      'minor'
    );

    expect(update.packageJson.version).toBe('1.3.0');
    expect(update.serverManifest.version).toBe('1.3.0');
    expect(update.serverManifest.packages.map(entry => entry.version)).toEqual(['1.3.0', '4.5.6']);
  });

  it('supports a dry run without writing or staging files', () => {
    const cwd = createFixture();
    const beforePackage = fs.readFileSync(path.join(cwd, 'package.json'), 'utf8');
    const beforeServer = fs.readFileSync(path.join(cwd, 'server.json'), 'utf8');

    expect(runVersionBump({ cwd, bumpType: 'patch', dryRun: true })).toBe('1.2.4');
    expect(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).toBe(beforePackage);
    expect(fs.readFileSync(path.join(cwd, 'server.json'), 'utf8')).toBe(beforeServer);
    expect(execFileSync('git', ['status', '--short'], { cwd, encoding: 'utf8' })).not.toContain(
      'package.json'
    );
  });

  it('atomically updates and stages both manifests in no-commit mode', () => {
    const cwd = createFixture();

    expect(runVersionBump({ cwd, bumpType: 'patch', noCommit: true })).toBe('1.2.4');
    expect(JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).version).toBe(
      '1.2.4'
    );
    const manifest = JSON.parse(fs.readFileSync(path.join(cwd, 'server.json'), 'utf8'));
    expect(manifest.version).toBe('1.2.4');
    expect(manifest.packages[0].version).toBe('1.2.4');
    expect(
      execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' })
    ).toBe(`package.json\nserver.json\n`);
  });

  it('preserves the default behavior of committing both manifests', () => {
    const cwd = createFixture();

    runVersionBump({ cwd, bumpType: 'minor' });

    expect(
      execFileSync('git', ['log', '-1', '--pretty=%s'], { cwd, encoding: 'utf8' }).trim()
    ).toBe('Bump version to 1.3.0');
    expect(execFileSync('git', ['status', '--short'], { cwd, encoding: 'utf8' })).toBe('');
  });

  it('propagates a git commit failure', () => {
    const cwd = createFixture();
    const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
    fs.writeFileSync(hookPath, '#!/bin/sh\nexit 1\n', { mode: 0o755 });

    expect(() => runVersionBump({ cwd, bumpType: 'patch' })).toThrow();
    expect(
      execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' })
    ).toBe(`package.json\nserver.json\n`);
    expect(
      execFileSync('git', ['log', '-1', '--pretty=%s'], { cwd, encoding: 'utf8' }).trim()
    ).toBe('fixture');
  });
});
