import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

const dotenvResult = config();

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    env: dotenvResult.parsed,
  },
});
