#!/usr/bin/env node

/**
 * Validates server.json against basic MCP Registry requirements
 * Used in CI/CD pipeline before publishing
 */

import { readFileSync } from 'fs';

try {
  const serverJson = readFileSync('server.json', 'utf8');
  const parsed = JSON.parse(serverJson);
  
  console.log('✅ server.json is valid JSON');
  console.log('Server name:', parsed.name);
  console.log('Version:', parsed.version);
  console.log('Description:', parsed.description);
  console.log('Package identifier:', parsed.packages?.[0]?.identifier);
  console.log('Environment variables:', parsed.packages?.[0]?.environment_variables?.length || 0);
  
  // Basic validation checks
  if (!parsed.name || !parsed.name.startsWith('io.github.delorenj/')) {
    console.error('❌ Invalid name format. Must start with io.github.delorenj/');
    process.exit(1);
  }
  
  if (!parsed.packages || parsed.packages.length === 0) {
    console.error('❌ Missing packages array');
    process.exit(1);
  }
  
  const npmPackage = parsed.packages.find(p => p.registry_type === 'npm');
  if (!npmPackage) {
    console.error('❌ Missing npm package definition');
    process.exit(1);
  }
  
  if (npmPackage.identifier !== '@delorenj/mcp-server-trello') {
    console.error('❌ Package identifier mismatch');
    process.exit(1);
  }
  
  console.log('✅ All basic validations passed');
  
} catch (error) {
  console.error('❌ server.json validation failed:', error.message);
  process.exit(1);
}