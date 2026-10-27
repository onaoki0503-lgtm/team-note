import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: ['app.spec.ts', 'home-reference.spec.ts'], timeout: 30000, expect: { timeout: 8000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['json', { outputFile: '/private/tmp/teamnote-glass-playwright.json' }]],
  outputDir: '/private/tmp/teamnote-glass-test-results',
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 390, height: 844 }, launchOptions: { executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npx wrangler dev --config tests/wrangler.test.jsonc --local --ip 127.0.0.1 --port 8788 --inspector-port 9238 --persist-to /private/tmp/teamnote-test-worker', url: 'http://127.0.0.1:8788/ready', ignoreHTTPSErrors: true, reuseExistingServer: false, timeout: 30000 },
    { command: 'VITE_TEAMNOTE_SUPABASE_URL= VITE_TEAMNOTE_SUPABASE_PUBLISHABLE_KEY= AI_WORKER_TARGET=http://127.0.0.1:8788 npm run dev -- --port 5174', url: 'http://127.0.0.1:5174/', reuseExistingServer: false, timeout: 30000 }
  ]
});
