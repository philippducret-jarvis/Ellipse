import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const studioUrl = process.argv[2] ?? 'http://127.0.0.1:4277/';
const screenshotPath = path.resolve('generated/studio-navigation-smoke.png');

async function loadPlaywright() {
  const localRuntime = path.resolve('generated/browser-runtime/node_modules/playwright/index.mjs');
  try {
    return await import(`file://${localRuntime.replace(/\\/g, '/')}`);
  } catch {
    return await import('playwright');
  }
}

const { chromium } = await loadPlaywright();
await mkdir(path.dirname(screenshotPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

await page.goto(studioUrl, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: /Echoes of the Mushroom Realm/i }).waitFor();

const checks = [
  {
    tab: 'Documents',
    verify: async () => page.getByRole('heading', { name: /Project Pitch/i }).waitFor(),
  },
  {
    tab: 'Assets',
    verify: async () => page.getByRole('heading', { name: /Usine assets/i }).waitFor(),
  },
  {
    tab: 'Production',
    verify: async () => page.getByRole('heading', { name: /Production cockpit/i }).waitFor(),
  },
  {
    tab: 'Build',
    verify: async () => page.getByRole('heading', { name: /Build targets/i }).waitFor(),
  },
  {
    tab: 'Workspace',
    verify: async () => page.getByRole('heading', { name: /Workspace explorer/i }).waitFor(),
  },
  {
    tab: 'Agents',
    verify: async () => page.getByText(/Factory agents/i, { exact: true }).waitFor(),
  },
];

for (const { tab, verify } of checks) {
  await page.getByRole('button', { name: new RegExp(tab, 'i') }).click();
  await verify();
}

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      studioUrl,
      checkedTabs: checks.map((item) => item.tab),
      screenshotPath,
    },
    null,
    2,
  ),
);
