import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/landlord-*.spec.js',
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 30000,
  reporter: 'line',
  outputDir: path.join(os.tmpdir(), 'roomify-landlord-e2e-results'),
  use: {
    baseURL: 'http://127.0.0.1:5175',
    browserName: 'chromium',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: true,
  },
});
