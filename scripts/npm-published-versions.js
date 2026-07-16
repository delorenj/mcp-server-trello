#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { formatThrowable } from './format-throwable.js';

function isNotFoundError(error) {
  const output = `${error?.stdout ?? ''}\n${error?.stderr ?? ''}`;
  return /(?:E404|404 Not Found|is not in this registry)/i.test(output);
}

export function getPublishedVersions(packageName, execute = execFileSync) {
  let output;
  try {
    output = execute('npm', ['view', packageName, 'versions', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }

  const parsed = JSON.parse(output);
  return (Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed]).filter(
    version => typeof version === 'string'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(JSON.stringify(getPublishedVersions(process.argv[2] ?? '')));
  } catch (error) {
    console.error(formatThrowable(error));
    process.exit(1);
  }
}
