import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const OUT_DIR = resolve(ROOT, 'output/email-audits');
const LIMIT = Number(process.env.GMAIL_LIMIT || 35);
const QUERY = process.env.GMAIL_QUERY
  || 'newer_than:14d (postulacion OR postulación OR candidatura OR solicitud OR empleo OR entrevista OR LinkedIn OR Computrabajo OR Getonbrd OR "Get on Board" OR Trabajando OR Chiletrabajos)';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function openGmail(context) {
  const pages = context.pages();
  const page = pages.find((p) => p.url().includes('mail.google.com')) || await context.newPage();
  await page.goto(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(QUERY)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  }).catch(() => {});
  await page.waitForTimeout(6000);
  return page;
}

async function scrapeList(page) {
  return page.evaluate((limit) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('tr[role="row"]')]
      .filter((row) => row.querySelector('[email], .yW, .bog, .y6'))
      .slice(0, limit);
    return rows.map((row, index) => {
      const from = clean(row.querySelector('[email]')?.getAttribute('email')
        || row.querySelector('.yW, .zF')?.textContent);
      const subject = clean(row.querySelector('.bog')?.textContent
        || row.querySelector('[data-thread-id]')?.textContent);
      const snippet = clean(row.querySelector('.y2, .y6')?.textContent);
      const date = clean(row.querySelector('.xW, .xW span, .xW time')?.getAttribute('title')
        || row.querySelector('.xW, .xW span, .xW time')?.textContent);
      const unread = row.className.includes('zE') || row.getAttribute('aria-label')?.toLowerCase().includes('unread');
      return { index, from, subject, snippet, date, unread };
    }).filter((item) => item.subject || item.snippet || item.from);
  }, LIMIT);
}

async function scrapeBodies(page, count) {
  const items = [];
  const rows = page.locator('tr[role="row"]').filter({ has: page.locator('.bog, .y6, [email]') });
  const rowCount = Math.min(await rows.count().catch(() => 0), count);
  for (let i = 0; i < rowCount; i += 1) {
    try {
      const row = rows.nth(i);
      const before = page.url();
      await row.click({ timeout: 5000 });
      await page.waitForTimeout(2500);
      const body = await page.evaluate(() => {
        const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const subject = clean(document.querySelector('h2.hP')?.textContent);
        const from = clean(document.querySelector('.gD[email]')?.getAttribute('email')
          || document.querySelector('.gD')?.textContent);
        const date = clean(document.querySelector('.g3')?.getAttribute('title')
          || document.querySelector('.g3')?.textContent);
        const text = clean([...document.querySelectorAll('.a3s, [role="listitem"]')]
          .map((node) => node.innerText || node.textContent || '')
          .join('\n'));
        return { subject, from, date, text: text.slice(0, 3500) };
      });
      if (body.subject || body.text) items.push(body);
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(async () => {
        await page.goto(before, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      });
      await page.waitForTimeout(1500);
    } catch {}
  }
  return items;
}

function classify(item) {
  const blob = clean(`${item.from} ${item.subject} ${item.snippet || ''} ${item.text || ''}`).toLowerCase();
  let status = 'Unknown';
  if (/entrevista|interview|agendada|agendad[ao]|agenda tu|coordinar entrevista|avanza.*proceso|sigue avanzando|siguiente etapa|continuar.*proceso/.test(blob)) {
    status = 'Interview';
  } else if (/no continuar|no avanzaremos|proceso finalizado|hemos decidido avanzar sin|no ha sido seleccionad|rechazad|descartad|not selected|unfortunately/.test(blob)) {
    status = 'Rejected';
  } else if (/han visto tu cv|vieron tu cv|cv visto|curriculum descargado|solicitud vista|candidatura sigue avanzando|novedades en tu postulaci/.test(blob)) {
    status = 'Responded';
  } else if (/gracias por postular|recibimos tu postulaci|solicitud recibida|application received|tu solicitud para el puesto/.test(blob)) {
    status = 'Applied';
  }
  const companyMatch = blob.match(/(?:en|para|de)\s+([a-z0-9 .&áéíóúñ-]{3,55})(?:\s+-|\s+\.|\s+tu|\s+hay|\s*$)/i);
  return { ...item, inferredStatus: status, inferredCompany: clean(companyMatch?.[1] || '') };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await openGmail(context);
  const list = await scrapeList(page);
  const bodies = await scrapeBodies(page, Math.min(12, LIMIT));
  const bodyBySubject = new Map(bodies.map((item) => [item.subject, item]));
  const merged = list.map((item) => classify({ ...item, ...(bodyBySubject.get(item.subject) || {}) }));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = resolve(OUT_DIR, `${timestamp}-gmail-status.json`);
  const mdPath = resolve(OUT_DIR, `${timestamp}-gmail-status.md`);
  writeFileSync(jsonPath, JSON.stringify({ query: QUERY, scannedAt: new Date().toISOString(), items: merged, bodies }, null, 2), 'utf8');
  writeFileSync(mdPath, [
    '# Gmail Application Status Scan',
    '',
    `- Query: ${QUERY}`,
    `- Scanned: ${new Date().toISOString()}`,
    '',
    '| # | Date | From | Subject | Inferred | Snippet |',
    '|---|------|------|---------|----------|---------|',
    ...merged.map((item, idx) => `| ${idx + 1} | ${clean(item.date)} | ${clean(item.from)} | ${clean(item.subject)} | ${item.inferredStatus} | ${clean(item.snippet || item.text).slice(0, 220)} |`),
    '',
  ].join('\n'), 'utf8');
  console.log(JSON.stringify({ jsonPath, mdPath, count: merged.length, statuses: merged.reduce((acc, item) => {
    acc[item.inferredStatus] = (acc[item.inferredStatus] || 0) + 1;
    return acc;
  }, {}) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
