#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { formatThrowable } from './format-throwable.js';

const BUMP_TYPES = new Set(['patch', 'minor', 'major']);
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(.*)$/;

export function bumpVersion(version, bumpType) {
  const match = version.match(VERSION_PATTERN);
  if (!match) throw new Error('Invalid version format');
  if (!BUMP_TYPES.has(bumpType)) throw new Error(`Invalid bump type: ${bumpType}`);

  const [, major, minor, patch, suffix] = match;
  let nextMajor = Number(major);
  let nextMinor = Number(minor);
  let nextPatch = Number(patch);

  if (bumpType === 'major') {
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (bumpType === 'minor') {
    nextMinor += 1;
    nextPatch = 0;
  } else {
    nextPatch += 1;
  }

  return `${nextMajor}.${nextMinor}.${nextPatch}${suffix}`;
}

export function createVersionUpdate(packageJson, serverManifest, bumpType) {
  const npmPackage = serverManifest.packages?.find(
    entry => entry.registryType === 'npm' && entry.identifier === packageJson.name
  );
  if (!npmPackage) {
    throw new Error(`server.json has no npm package entry for ${packageJson.name}`);
  }

  const newVersion = bumpVersion(packageJson.version, bumpType);
  return {
    newVersion,
    packageJson: { ...packageJson, version: newVersion },
    serverManifest: {
      ...serverManifest,
      version: newVersion,
      packages: serverManifest.packages.map(entry =>
        entry === npmPackage ? { ...entry, version: newVersion } : entry
      ),
    },
  };
}

export function replaceFilesAtomically(files, fileSystem = fs) {
  const nonce = `${process.pid}-${Date.now()}`;
  const prepared = files.map(({ filePath, content }) => ({
    filePath,
    content,
    temporaryPath: `${filePath}.${nonce}.tmp`,
    backupPath: `${filePath}.${nonce}.bak`,
  }));
  const backedUp = [];

  try {
    for (const file of prepared) fileSystem.writeFileSync(file.temporaryPath, file.content);
    for (const file of prepared) {
      fileSystem.renameSync(file.filePath, file.backupPath);
      backedUp.push(file);
    }
    for (const file of prepared) {
      fileSystem.renameSync(file.temporaryPath, file.filePath);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const file of backedUp) {
      try {
        if (fileSystem.existsSync(file.backupPath)) {
          fileSystem.renameSync(file.backupPath, file.filePath);
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          new Error(`Failed to restore backup ${file.backupPath}`, { cause: rollbackError })
        );
      }
    }
    for (const file of prepared) {
      try {
        fileSystem.rmSync(file.temporaryPath, { force: true });
      } catch (cleanupError) {
        rollbackErrors.push(
          new Error(`Failed to remove temporary file ${file.temporaryPath}`, {
            cause: cleanupError,
          })
        );
      }
    }

    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        'Version update failed and one or more backups could not be restored; backups were preserved'
      );
    }
    throw error;
  }

  for (const file of prepared) {
    fileSystem.rmSync(file.temporaryPath, { force: true });
    fileSystem.rmSync(file.backupPath, { force: true });
  }
}

export function runVersionBump({
  cwd = process.cwd(),
  bumpType,
  dryRun = false,
  noCommit = false,
}) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const serverManifestPath = path.join(cwd, 'server.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const serverManifest = JSON.parse(fs.readFileSync(serverManifestPath, 'utf8'));
  const update = createVersionUpdate(packageJson, serverManifest, bumpType);

  if (dryRun) {
    console.log(`Version would be bumped to ${update.newVersion}`);
    return update.newVersion;
  }

  replaceFilesAtomically([
    { filePath: packageJsonPath, content: `${JSON.stringify(update.packageJson, null, 2)}\n` },
    {
      filePath: serverManifestPath,
      content: `${JSON.stringify(update.serverManifest, null, 2)}\n`,
    },
  ]);
  console.log(`Version bumped to ${update.newVersion}`);

  execFileSync('git', ['add', 'package.json', 'server.json'], { cwd });
  if (!noCommit) {
    execFileSync('git', ['commit', '-m', `Bump version to ${update.newVersion}`], { cwd });
    console.log(`Committed version bump to ${update.newVersion}`);
  }

  return update.newVersion;
}

function parseArguments(args) {
  const bumpType = args.find(argument => /^--(patch|minor|major)$/.test(argument))?.slice(2);
  if (!bumpType) {
    throw new Error('Usage: bun versionbump --[patch|minor|major] [--no-commit|--dry-run]');
  }
  return {
    bumpType,
    dryRun: args.includes('--dry-run'),
    noCommit: args.includes('--no-commit'),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runVersionBump(parseArguments(process.argv.slice(2)));
  } catch (error) {
    console.error(formatThrowable(error));
    process.exit(1);
  }
}
