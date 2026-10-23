import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'public.spec.ts',workers:1,timeout:60000,expect:{timeout:10000},
 reporter:[['list'],['json',{outputFile:'/private/tmp/teamnote-public-playwright.json'}]],outputDir:'/private/tmp/teamnote-public-results',
 use:{baseURL:'https://onaoki0503-lgtm.github.io/team-note/',viewport:{width:390,height:844},reducedMotion:'reduce',launchOptions:{executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},screenshot:'only-on-failure'}
});
