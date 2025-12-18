#!/usr/bin/env node

import fs from 'fs';
import { execFileSync } from 'child_process';

// Get the version bump type from command line arguments
const args = process.argv.slice(2);
const bumpType = args[0]?.replace('--', '');

if (!bumpType || !['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: bun versionbump --[patch|minor|major]');
  process.exit(1);
}

// Read package.json
const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Parse current version
const versionRegex = /^(\d+)\.(\d+)\.(\d+)(.*)$/;
const match = packageJson.version.match(versionRegex);

if (!match) {
  console.error('Invalid version format in package.json');
  process.exit(1);
}

const [, major, minor, patch, suffix] = match;
let [newMajor, newMinor, newPatch] = [parseInt(major), parseInt(minor), parseInt(patch)];

// Bump version based on type
switch (bumpType) {
  case 'major':
    newMajor++;
    newMinor = 0;
    newPatch = 0;
    break;
  case 'minor':
    newMinor++;
    newPatch = 0;
    break;
  case 'patch':
    newPatch++;
    break;
}

// Create new version string
const newVersion = `${newMajor}.${newMinor}.${newPatch}${suffix || ''}`;

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped to ${newVersion}`);

// Commit the change if git is available
try {
  execSync('git add package.json');
  execSync(`git commit -m "Bump version to ${newVersion}"`);
  console.log(`Committed version bump to ${newVersion}`);
} catch (error) {
  console.log('Git commit skipped or failed:', error.message);
}
