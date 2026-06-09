import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // env vars the app reads at import time (config/env.ts). The real DB URI is
    // irrelevant — tests connect mongoose to an in-memory server in setup.ts.
    env: {
      MONGODB_URI: 'mongodb://localhost:27017/fitsphere-test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL: '7d',
    },
    testTimeout: 30_000,
    hookTimeout: 60_000, // first run downloads the in-memory mongod binary
  },
});
