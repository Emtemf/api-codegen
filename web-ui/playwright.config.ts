import { defineConfig, devices } from '@playwright/test';

const DEFAULT_PORT = process.env.PORT || '18080';
const BASE_URL = `http://localhost:${DEFAULT_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The local suite drives Monaco + YAML examples heavily; capping workers keeps
  // the browser/server pair stable and avoids timeout-only flakes.
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Use existing server if running
  webServer: {
    command: `PORT=${DEFAULT_PORT} node server.js`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
