import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const OUT_DIR = resolve(ROOT, 'output/email-audits');
const LIMIT = Number(process.env.GMAIL_LIMIT || 25);
const BODY_LIMIT = Number(process.env.GMAIL_BODY_LIMIT || 8);
const QUERY = process.env.GMAIL_QUERY || 'newer_than:14d (postulacion OR postulacion OR candidatura OR solicitud OR empleo OR entrevista OR LinkedIn OR Computrabajo OR Getonbrd OR "Get on Board" OR Trabajando OR Chiletrabajos)';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function classify(item) {
  const blob = clean(String(item.from || '') + ' ' + String(item.subject || '') + ' ' + String(item.snippet || '') + ' ' + String(item.text || '')).toLowerCase();
  let status = 'Unknown';
  if (/no continuar|no avanzaremos|proceso finalizado|hemos decidido avanzar sin|no ha sido seleccionad|rechazad|descartad|not selected|unfortunately/.test(blob)) status = 'Rejected';
  else if (/han visto tu cv|vieron tu cv|cv visto|curriculum descargado|solicitud vista|ha visto tu solicitud|han visto tu solicitud|candidatura sigue avanzando|novedades en tu postulaci|hay un cambio en tu candidatura|nuevo estado/.test(blob)) status = 'Responded';
  else if (/entrevista|interview|agendada|agendad[ao]|agenda tu|coordinar entrevista|avanza.*proceso|sigue avanzando|siguiente etapa|continuar.*proceso/.test(blob)) status = 'Interview';
  else if (/completa tu candidatura|completa tu aplicaci|acceso a las preguntas|responder.*preguntas/.test(blob)) status = 'Evaluated';
  else if (/gracias por postular|recibimos tu postulaci|solicitud recibida|application received|tu solicitud para el puesto|hemos recibido tu candidatura/.test(blob)) status = 'Applied';
  return { ...item, inferredStatus: status };
}

async function gotoSearch(page, searchUrl) {
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
}

async function listRows(page) {
  return page.evaluate((limit) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('tr[role="row"]')]
      .filter((row) => row.querySelector('[email], .yW, .bog, .y6'))
      .slice(0, limit);
    return rows.map((row, index) => ({
      index,
      from: clean(row.querySelector('[email]')?.getAttribute('email') || row.querySelector('.yW, .zF')?.textContent),
      subject: clean(row.querySelector('.bog')?.textContent || row.querySelector('[data-thread-id]')?.textContent),
      snippet: clean(row.querySelector('.y2, .y6')?.textContent),
      date: clean(row.querySelector('.xW, .xW span, .xW time')?.getAttribute('title') || row.querySelector('.xW, .xW span, .xW time')?.textContent),
      unread: row.className.includes('zE') || row.getAttribute('aria-label')?.toLowerCase().includes('unread'),
    })).filter((item) => item.subject || item.snippet || item.from);
  }, LIMIT);
}

async function readBodyAt(page, index, searchUrl) {
  const started = Date.now();
  const clicked = await page.evaluate((targetIndex) => {
    const rows = [...document.querySelectorAll('tr[role="row"]')]
      .filter((row) => row.querySelector('[email], .yW, .bog, .y6'));
    const row = rows[targetIndex];
    if (!row) return { ok: false, reason: 'row-not-found', count: rows.length };
    row.scrollIntoView({ block: 'center' });
    row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    row.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    row.click();
    return { ok: true, count: rows.length };
  }, index);
  if (!clicked.ok) return { error: clicked.reason || 'click-failed' };
  await page.waitForTimeout(2200);
  const body = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      subject: clean(document.querySelector('h2.hP')?.textContent),
      from: clean(document.querySelector('.gD[email]')?.getAttribute('email') || document.querySelector('.gD')?.textContent),
      date: clean(document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.textContent),
      text: clean([...document.querySelectorAll('.a3s, [role="listitem"]')].map((node) => node.innerText || node.textContent || '').join('\n')).slice(0, 4500),
    };
  }).catch((error) => ({ error: 'body-failed: ' + error.message }));
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(async () => gotoSearch(page, searchUrl));
  await page.waitForTimeout(900);
  return { ...body, readMs: Date.now() - started };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages().find((p) => p.url().includes('mail.google.com')) || await context.newPage();
  page.setDefaultTimeout(6000);
  const searchUrl = 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(QUERY);
  await gotoSearch(page, searchUrl);
  const list = await listRows(page);
  const bodies = [];
  for (let i = 0; i < Math.min(BODY_LIMIT, list.length); i += 1) {
    try {
      const body = await readBodyAt(page, i, searchUrl);
      bodies.push({ index: i, ...body });
    } catch (error) {
      bodies.push({ index: i, error: error.message || String(error) });
      await gotoSearch(page, searchUrl);
    }
  }
  const byIndex = new Map(bodies.map((body) => [body.index, body]));
  const items = list.map((item, index) => classify({ ...item, ...(byIndex.get(index) || {}) }));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = resolve(OUT_DIR, timestamp + '-gmail-safe-read.json');
  const mdPath = resolve(OUT_DIR, timestamp + '-gmail-safe-read.md');
  writeFileSync(jsonPath, JSON.stringify({ query: QUERY, scannedAt: new Date().toISOString(), bodyLimit: BODY_LIMIT, items, bodies }, null, 2), 'utf8');
  const lines = [
    '# Gmail Safe Read Scan', '',
    '- Query: ' + QUERY,
    '- Scanned: ' + new Date().toISOString(),
    '- Bodies read: ' + bodies.filter((b) => b.text).length + '/' + BODY_LIMIT,
    '',
    '| # | Date | From | Subject | Inferred | Read | Snippet / body |',
    '|---|------|------|---------|----------|------|----------------|',
    ...items.map((item, idx) => '| ' + (idx + 1) + ' | ' + clean(item.date) + ' | ' + clean(item.from) + ' | ' + clean(item.subject) + ' | ' + item.inferredStatus + ' | ' + (item.text ? 'body' : (item.error || 'list')) + ' | ' + clean(item.text || item.snippet || '').slice(0, 260) + ' |'),
    '',
  ];
  writeFileSync(mdPath, lines.join('\n'), 'utf8');
  const statuses = items.reduce((acc, item) => { acc[item.inferredStatus] = (acc[item.inferredStatus] || 0) + 1; return acc; }, {});
  console.log(JSON.stringify({ jsonPath, mdPath, listed: list.length, bodiesRead: bodies.filter((b) => b.text).length, statuses }, null, 2));
  process.exit(0);
}

main().catch((error) => { console.error(error.stack || error.message || String(error)); process.exit(1); });