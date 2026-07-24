#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { formatThrowable } from './format-throwable.js';

const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-([0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z.-]+)?$/;

export function getNpmDistTag(version) {
  const match = version.match(SEMVER_PATTERN);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return match[1] !== undefined ? 'next' : 'latest';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(getNpmDistTag(process.argv[2] ?? ''));
  } catch (error) {
    console.error(formatThrowable(error));
    process.exit(1);
  }
}
