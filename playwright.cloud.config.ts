import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests', testMatch: 'cloud.spec.ts', workers: 1, timeout: 30000,
 reporter: [['list'], ['json', {outputFile:'/private/tmp/teamnote-cloud-playwright.json'}]],
 outputDir: '/private/tmp/teamnote-cloud-results',
 use: {baseURL:'http://127.0.0.1:5175',viewport:{width:390,height:844},reducedMotion:'reduce',launchOptions:{executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},screenshot:'only-on-failure'},
 webServer:{command:'VITE_TEAMNOTE_SUPABASE_URL=https://teamnote-test.invalid VITE_TEAMNOTE_SUPABASE_PUBLISHABLE_KEY=browser-test-public npm run dev -- --port 5175',url:'http://127.0.0.1:5175',reuseExistingServer:false}
});
