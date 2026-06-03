import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const USER_DATA_DIR = resolve(ROOT, process.env.RECORDING_PROFILE || '.recording-browser-profile');
const recordingPath = resolve(ROOT, process.argv[2] || process.env.RECORDING_PATH || '');
const finalSubmitText = /submit application|enviar solicitud|enviar postulaci[oó]n|send application|presentar solicitud|enviar candidatura|finalizar postulaci[oó]n/i;

async function clickByLabel(page, label) {
  if (!label) return false;
  const pattern = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const locators = [
    page.getByRole('button', { name: pattern }),
    page.getByRole('link', { name: pattern }),
    page.getByLabel(pattern),
    page.locator('button,a,[role="button"],label').filter({ hasText: pattern }),
  ];
  for (const locator of locators) {
    try {
      const first = locator.first();
      if (!(await first.count())) continue;
      await first.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
      await first.click({ timeout: 2500 });
      return true;
    } catch {}
  }
  return false;
}

async function fillByLabel(page, label, value) {
  if (!label || !value) return false;
  const pattern = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const locators = [
    page.getByLabel(pattern),
    page.getByPlaceholder(pattern),
    page.locator('input,textarea').filter({ hasText: pattern }),
  ];
  for (const locator of locators) {
    try {
      const first = locator.first();
      if (!(await first.count())) continue;
      await first.fill(value, { timeout: 2000 });
      return true;
    } catch {}
  }
  return false;
}

async function act(page, action) {
  if (action.blockedOnReplay || finalSubmitText.test(action.label || '')) {
    console.log(`Stopped before final submit: ${action.label}`);
    return 'blocked';
  }

  if (action.url && page.url() !== action.url && /linkedin\.com/.test(action.url)) {
    await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  if (action.type === 'click') {
    let clicked = false;
    if (action.selector) {
      clicked = await page.locator(action.selector).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
    }
    if (!clicked) clicked = await clickByLabel(page, action.label);
    return clicked ? 'ok' : 'missed';
  }

  if (action.type === 'fill') {
    if (action.redacted) {
      console.log(`Skipped redacted field: ${action.label}`);
      return 'skipped';
    }
    let filled = false;
    if (action.selector) {
      filled = await page.locator(action.selector).first().fill(action.value || '', { timeout: 2500 }).then(() => true).catch(() => false);
    }
    if (!filled) filled = await fillByLabel(page, action.label, action.value);
    return filled ? 'ok' : 'missed';
  }

  return 'skipped';
}

async function main() {
  if (!recordingPath || !existsSync(recordingPath)) {
    throw new Error('Usage: node output\\linkedin-interaction-replay.mjs output\\linkedin-recording-YYYY-MM-DD.json');
  }

  const actions = JSON.parse(readFileSync(recordingPath, 'utf8'));
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1365, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/jobs/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log(`Replaying ${actions.length} recorded actions from ${recordingPath}`);
  for (const [index, action] of actions.entries()) {
    const result = await act(page, action);
    console.log(`${index + 1}/${actions.length} ${action.type} ${result}: ${action.label || action.selector || ''}`);
    if (result === 'blocked') break;
    await page.waitForTimeout(700);
  }

  console.log('Replay finished or paused. Review the browser manually.');
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
