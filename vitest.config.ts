import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

const dotenvResult = config();

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    env: dotenvResult.parsed,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/evals/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // Baseline ratchet toward a 70% target. The floor starts at the current
      // watermark so `main` stays green; `autoUpdate` raises these numbers as
      // coverage improves (never lowers them), so CI fails any PR that drops
      // coverage below the best we've ever achieved. Goal: climb all four to 70.
      thresholds: {
        autoUpdate: true,
        lines: 22.58,
        statements: 21.95,
        functions: 33.97,
        branches: 21.76,
      },
    },
  },
});
