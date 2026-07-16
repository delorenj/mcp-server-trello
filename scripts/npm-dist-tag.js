#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-([0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z.-]+)?$/;

export function getNpmDistTag(version) {
  const match = version.match(SEMVER_PATTERN);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  const isPrerelease = match[1] !== undefined;
  const distTag = isPrerelease ? 'next' : 'latest';
  if (isPrerelease && distTag === 'latest') {
    throw new Error('Prerelease versions must never publish under the latest tag');
  }
  return distTag;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(getNpmDistTag(process.argv[2] ?? ''));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
