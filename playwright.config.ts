import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  workers: 1,
  use: {
    baseURL: process.env.LANDING_TEST_URL ?? 'https://giant-platypus-592.convex.site',
    browserName: 'chromium',
    launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  },
});
