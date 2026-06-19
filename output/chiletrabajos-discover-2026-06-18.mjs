import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const limit = Number(process.env.CHILETRABAJOS_DISCOVER_LIMIT || 12);
const outPath = resolve(ROOT, 'output/chiletrabajos-discovered-2026-06-18.json');

const searches = [
  'https://www.chiletrabajos.cl/trabajo/analista-programador',
  'https://www.chiletrabajos.cl/trabajo/desarrollador',
  'https://www.chiletrabajos.cl/trabajo/programador',
  'https://www.chiletrabajos.cl/trabajo/desarrollador-full-stack',
  'https://www.chiletrabajos.cl/trabajo/soporte-ti',
  'https://www.chiletrabajos.cl/trabajo/qa-junior',
];

const positive = /programador|desarrollador|developer|software|full.?stack|frontend|front-end|backend|back-end|python|javascript|typescript|react|node|sql|qa|testing|automatizaci[oó]n|soporte ti|mesa de ayuda|datos|data|bi|apis?/i;
const negative = /pr[aá]ctica|practicante|intern|senior|lead|lider|jefe|gerente|manager|ventas|vendedor|comercial|chofer|conductor|operario|bodega|taller|minera|faena|prevenci[oó]n de riesgos|cad\/cam|electr[oó]nico|constructor civil/i;

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function known() {
  return ['data/applications.md', 'data/pipeline.md']
    .filter((file) => existsSync(resolve(ROOT, file)))
    .map((file) => readFileSync(resolve(ROOT, file), 'utf8'))
    .join('\n');
}

function isKnown(knownText, item) {
  const id = item.url.match(/(\d{7})/)?.[1] || '';
  if (id && knownText.includes(id)) return true;
  const haystack = normalize(knownText);
  const title = normalize(item.title).replace(/\s+/g, ' ').trim();
  const company = normalize(item.company).replace(/\s+/g, ' ').trim();
  return title.length > 16 && company.length > 3 && haystack.includes(title) && haystack.includes(company);
}

async function extract(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const anchors = [...document.querySelectorAll('a[href*="/trabajo/"]')];
    const seen = new Set();
    const items = [];
    for (const anchor of anchors) {
      const href = new URL(anchor.href, location.href).toString().replace(/[?#].*$/, '');
      if (!/\d{7}/.test(href) || seen.has(href)) continue;
      seen.add(href);
      const card = anchor.closest('article, li, .job, .oferta, .card, div') || anchor;
      const text = clean(card.innerText || anchor.textContent || '');
      const title = clean(anchor.textContent || text.split(/\n| {2,}/)[0] || '');
      const lines = text.split(/\n| {2,}/).map(clean).filter(Boolean);
      const company = lines.find((line) => line !== title && !/hace|junio|postular|full-time|conversable|santiago|remoto|publicad/i.test(line)) || '';
      items.push({ title, company, url: href, text: text.slice(0, 700) });
    }
    return items;
  });
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();
  const knownText = known();
  const found = [];
  const seen = new Set();
  const diagnostics = [];

  for (const url of searches) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    diagnostics.push({ url, title: await page.title().catch(() => ''), sample: body.slice(0, 260) });
    const items = await extract(page).catch(() => []);
    for (const item of items) {
      const blob = `${item.title} ${item.company} ${item.text}`;
      if (seen.has(item.url)) continue;
      if (!positive.test(blob)) continue;
      if (negative.test(blob)) continue;
      if (isKnown(knownText, item)) continue;
      seen.add(item.url);
      found.push(item);
      if (found.length >= limit) break;
    }
    if (found.length >= limit) break;
  }

  const result = { scannedAt: new Date().toISOString(), diagnostics, jobs: found };
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
