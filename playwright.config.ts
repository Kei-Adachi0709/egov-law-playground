import { defineConfig, devices } from '@playwright/test';

const DEV_SERVER_PORT = 4173;
const DEV_SERVER_HOST = '127.0.0.1';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['line']] : 'list',
  use: {
    baseURL: `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: `npm run dev -- --host ${DEV_SERVER_HOST} --port ${DEV_SERVER_PORT}`,
    url: `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
