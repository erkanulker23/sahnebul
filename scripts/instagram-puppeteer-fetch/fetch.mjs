#!/usr/bin/env node
/**
 * Sahnebul: PHP EventMediaImportFromUrlService tarafından çağrılır.
 * Kurulum: cd scripts/instagram-puppeteer-fetch && npm install
 * .env: INSTAGRAM_PUPPETEER_ENABLED=true, INSTAGRAM_PUPPETEER_SCRIPT=.../fetch.mjs
 */
import puppeteer from 'puppeteer';

const url = process.argv[2];
if (!url || !url.startsWith('https://')) {
  process.stderr.write('usage: node fetch.mjs <https://www.instagram.com/...>\n');
  process.exit(2);
}
const host = new URL(url).hostname.toLowerCase();
if (!host.includes('instagram.com')) {
  process.stderr.write('only instagram.com URLs\n');
  process.exit(2);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  const html = await page.content();
  process.stdout.write(html);
} finally {
  await browser.close();
}
