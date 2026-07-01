const { defineConfig, devices } = require('@playwright/test');

// Offline static app: no webServer, tests load the page over file://.
// See test/helpers.js for APP_URL. Use headed Chromium for PDF/download flows.
module.exports = defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // list for the terminal; html for a browsable report (the main review
  // artifact); github adds inline PR annotations when running in Actions.
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ...(process.env.CI ? [['github']] : []),
  ],
  use: {
    // Diagnostics for reviewing failures: a trace to scrub through, the failing
    // screenshot, and a video. Kept lean - traces/videos only on retry/failure.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
