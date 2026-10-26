import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'management.spec.ts', workers: 1, timeout: 30000,
  reporter: [['list'], ['json', { outputFile: '/private/tmp/teamnote-management-tests.json' }]],
  outputDir: '/private/tmp/teamnote-management-test-results',
  use: { baseURL: 'http://127.0.0.1:5178', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }, screenshot: 'only-on-failure' },
  webServer: { command: 'VITE_TEAMNOTE_SUPABASE_URL=https://teamnote-test.invalid VITE_TEAMNOTE_SUPABASE_PUBLISHABLE_KEY=browser-test-public npm run dev -- --port 5178', url: 'http://127.0.0.1:5178', reuseExistingServer: false },
});
