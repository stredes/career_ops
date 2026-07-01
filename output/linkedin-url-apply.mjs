import { chromium } from 'playwright';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { answerDynamicQuestions } from './linkedin-question-answerer.mjs';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const cvPath = resolve(process.env.CV_PATH || 'C:/Users/bodega 1/Downloads/Gian_Lucas_San_Martin_Agurto_CV_Tech.pdf_2026_6_5.pdf');
const logPath = resolve(ROOT, 'output/linkedin-url-apply.log');
const autoSubmit = process.env.AUTO_SUBMIT_LINKEDIN !== '0';
const stretchApply = process.env.LINKEDIN_STRETCH_APPLY === '1';
const urls = (process.env.LINKEDIN_JOB_URLS || process.argv.slice(2).join('\n'))
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean);

const finalText = /enviar solicitud|submit application|send application|presentar solicitud|enviar candidatura/i;
const nextText = /siguiente|next|revisar|review|continuar/i;
const hardStop = /assessment|test|prueba|evaluaci[oÃ³]n|payment|pago|certifico|declaro|declaraci[oÃ³]n|background|antecedentes|discapacidad|visa|sponsor|relocation|reubicaci[oÃ³]n/i;
const stretchHardStop = /assessment|test|prueba|evaluaci[oÃ³]n|payment|pago|background|antecedentes|discapacidad/i;
const jdBlockers = /senior|semi senior|semisenior|4\+|5\+|4 aÃ±os|5 aÃ±os|salesforce excluyente|sap excluyente|kubernetes excluyente|mulesoft|\.net 8/i;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function loadProfile() {
  const profile = yaml.load(readFileSync(resolve(ROOT, 'config/profile.yml'), 'utf8'));
  const candidate = profile.candidate || {};
  const compensation = profile.compensation || {};
  const location = profile.location || {};
  return {
    fullName: candidate.full_name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    linkedin: candidate.linkedin || '',
    github: candidate.github || '',
    portfolio: candidate.portfolio_url || candidate.github || '',
    city: location.city || 'Santiago',
    country: location.country || 'Chile',
    salary: compensation.minimum || '800000',
    availability: 'Inmediata o segun coordinacion',
    modality: compensation.location_flexibility || '',
  };
}

async function clickFirst(...locators) {
  for (const locator of locators) {
    try {
      const first = locator.first();
      if (!(await first.count())) continue;
      await first.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
      await first.click({ timeout: 3000 });
      return true;
    } catch {}
  }
  return false;
}

async function modalText(page) {
  return page.locator('.jobs-easy-apply-modal').last().innerText({ timeout: 2000 }).catch(() => '');
}

async function uploadCv(page) {
  if (!existsSync(cvPath)) return 0;
  const fields = page.locator('.jobs-easy-apply-modal input[type="file"]');
  const count = await fields.count().catch(() => 0);
  let uploaded = 0;
  for (let i = 0; i < count; i += 1) {
    try {
      const field = fields.nth(i);
      const label = await field.evaluate((node) => {
        const id = node.id;
        const explicit = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText : '';
        const nearby = node.closest('label, fieldset, section, div')?.innerText || '';
        const attrs = [
          node.getAttribute('name'),
          node.getAttribute('id'),
          node.getAttribute('aria-label'),
          node.getAttribute('accept'),
        ].filter(Boolean).join(' ');
        return `${explicit || ''} ${nearby || ''} ${attrs || ''}`.replace(/\s+/g, ' ').trim();
      }).catch(() => '');
      if (/photo|avatar|picture|image|jpg|jpeg|png|gif/i.test(label)
        && !/resume|cv|curriculum|curr[iÃ­]culum|documento/i.test(label)) {
        continue;
      }
      if (/resume|cv|curriculum|curr[iÃ­]culum|documento|pdf/i.test(label) || count === 1) {
        await field.setInputFiles(cvPath);
        uploaded += 1;
      }
    } catch {}
  }
  return uploaded;
}

async function requiredEmptyDetails(page) {
  return page.locator('.jobs-easy-apply-modal input[required], .jobs-easy-apply-modal textarea[required], .jobs-easy-apply-modal select[required]').evaluateAll((fields) =>
    fields
      .filter((field) => {
        if (field.type === 'file') return !field.files?.length;
        if (field.tagName.toLowerCase() === 'select') return !field.value;
        if (field.type === 'checkbox' || field.type === 'radio') return false;
        return !field.value?.trim();
      })
      .map((field) => {
        const id = field.id;
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText : '';
        const aria = field.getAttribute('aria-label') || '';
        const name = field.getAttribute('name') || '';
        const placeholder = field.getAttribute('placeholder') || '';
        const nearby = field.closest('label, fieldset, section, div')?.innerText || '';
        return [label, aria, name, placeholder, nearby]
          .filter(Boolean)
          .join(' | ')
          .replace(/\s+/g, ' ')
          .slice(0, 260);
      }),
  ).catch(() => []);
}

async function closeMessageOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[aria-label*="Minimiza"], [aria-label*="Cerrar tu conversaciÃ³n"], .msg-overlay-bubble-header__control')
      .forEach((item) => item.click());
  }).catch(() => {});
}

async function applyLinkedInUrl(context, rawUrl, profile) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(rawUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await closeMessageOverlays(page);

  const body = await page.locator('body').innerText().catch(() => '');
  const jd = (body.match(/Acerca del empleo[\s\S]*?(?:Establecer una alerta|Acerca de la empresa|BÃºsqueda de empleo)/i) || ['', body])[0];
  const title = (await page.locator('h1,.jobs-unified-top-card__job-title').first().innerText({ timeout: 1000 }).catch(() => 'este cargo')).trim() || 'este cargo';
  const company = (await page.locator('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name').first().innerText({ timeout: 1000 }).catch(() => '')).trim();

  if (/ya no se aceptan solicitudes/i.test(body)) return { status: 'skipped', reason: 'closed', title, company, url: page.url() };
  if (!stretchApply && jdBlockers.test(jd)) return { status: 'skipped', reason: 'jd blocker', title, company, url: page.url() };

  const opened = await clickFirst(
    page.getByRole('button', { name: /solicitud sencilla|easy apply/i }),
    page.getByRole('link', { name: /solicitud sencilla|easy apply/i }),
    page.locator('a[href*="openSDUIApplyFlow"]'),
  );
  if (!opened) return { status: 'skipped', reason: 'no easy apply', title, company, url: page.url() };
  await page.waitForTimeout(2500);

  for (let step = 0; step < 7; step += 1) {
    if (!(await page.locator('.jobs-easy-apply-modal').count().catch(() => 0))) {
      return { status: 'paused', reason: 'modal not found after opening', title, company, url: page.url() };
    }

    const answered = await answerDynamicQuestions(page, profile, title, { company });
    const uploaded = await uploadCv(page);
    const text = await modalText(page);
    const activeHardStop = stretchApply ? stretchHardStop : hardStop;
    if (activeHardStop.test(text)) return { status: 'paused', reason: 'hard-stop modal', title, company, answered, uploaded, url: page.url(), text: text.slice(0, 900) };

    const empty = await requiredEmptyDetails(page);
    if (empty.length > 0) {
      const detail = empty.map((item, index) => `${index + 1}. ${item || 'campo sin etiqueta'}`).join(' || ');
      return { status: 'paused', reason: `${empty.length} required empty: ${detail}`, title, company, answered, uploaded, url: page.url(), text: text.slice(0, 900) };
    }

    const final = page.locator('.jobs-easy-apply-modal').last().getByRole('button', { name: finalText }).first();
    if (await final.count().catch(() => 0)) {
      if (!autoSubmit) return { status: 'prepared', reason: 'final visible', title, company, answered, uploaded, url: page.url() };
      await final.click({ timeout: 3000 });
      await page.waitForTimeout(3000);
      const after = await page.locator('body').innerText().catch(() => '');
      const sent = /solicitud enviada|application sent|se ha enviado/i.test(after);
      return { status: sent ? 'submitted' : 'clicked-final', title, company, answered, uploaded, url: page.url(), after: after.slice(0, 900) };
    }

    const advanced = await clickFirst(page.locator('.jobs-easy-apply-modal').last().getByRole('button', { name: nextText }));
    if (!advanced) return { status: 'paused', reason: 'no next/final', title, company, answered, uploaded, url: page.url(), text: text.slice(0, 900) };
    await page.waitForTimeout(1800);
  }

  return { status: 'paused', reason: 'max steps', title, company, url: page.url() };
}

async function main() {
  if (!urls.length) throw new Error('Usage: node output/linkedin-url-apply.mjs <linkedin-job-url> [more urls...]');
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const profile = loadProfile();
  const results = [];
  for (const url of urls) {
    log(`LinkedIn URL apply: ${url}`);
    const result = await applyLinkedInUrl(context, url, profile);
    log(`${result.status}: ${result.company || ''} ${result.title} (${result.reason || 'ok'})`);
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
  // Keep the shared CDP browser/session alive for the next application batch.
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});

