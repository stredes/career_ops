import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const limit = Number(process.env.DISCOVER_LIMIT || 12);
const outputPath = resolve(ROOT, 'output/computrabajo-discovered.json');

const searches = [
  'https://cl.computrabajo.com/trabajo-de-programador',
  'https://cl.computrabajo.com/trabajo-de-analista-programador',
  'https://cl.computrabajo.com/trabajo-de-python',
  'https://cl.computrabajo.com/trabajo-de-qa-junior',
  'https://cl.computrabajo.com/trabajo-de-soporte-ti',
  'https://cl.computrabajo.com/trabajo-de-desarrollador-junior',
];

const positive = /programador|desarrollador|developer|python|javascript|typescript|react|sql|qa|testing|automatizaci[oó]n|soporte ti|soporte inform[aá]tico|mesa de ayuda|datos|bi|inteligencia/i;
const negative = /pr[aá]ctica|practicante|intern|senior|jefe|leader|lider|arquitecto|vendedor|ventas|comercial|chofer|conductor|bodega|operario|prevenci[oó]n|riesgos|terreno|faena|colina|lampa/i;

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function loadKnown() {
  const files = ['data/applications.md', 'data/pipeline.md'];
  return files
    .filter((file) => existsSync(resolve(ROOT, file)))
    .map((file) => readFileSync(resolve(ROOT, file), 'utf8'))
    .join('\n');
}

function knownMatch(known, item) {
  const urlId = item.url.match(/[A-F0-9]{32}/i)?.[0] || '';
  if (urlId && known.includes(urlId)) return true;
  const haystack = normalize(known);
  const title = normalize(item.title).replace(/\s+/g, ' ').trim();
  const company = normalize(item.company).replace(/\s+/g, ' ').trim();
  return title.length > 12 && company.length > 3 && haystack.includes(title) && haystack.includes(company);
}

async function extract(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const anchors = [...document.querySelectorAll('a[href*="/ofertas-de-trabajo/oferta-de-trabajo-de-"]')];
    const seen = new Set();
    const jobs = [];
    for (const anchor of anchors) {
      const href = new URL(anchor.href, location.href).toString();
      if (seen.has(href)) continue;
      seen.add(href);
      const card = anchor.closest('article, div, li') || anchor;
      const text = clean(card.innerText || anchor.textContent || '');
      const lines = text.split(/\s{2,}|\n/).map(clean).filter(Boolean);
      const title = clean(anchor.textContent || lines[0] || '');
      const company = lines.find((line) => !line.includes(title) && !/hace|postulad|urgente|destacado|mensual/i.test(line)) || '';
      jobs.push({ title, company, url: href, text });
    }
    return jobs;
  });
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages().find((item) => item.url().includes('computrabajo.com')) || await context.newPage();
  const known = loadKnown();
  const found = [];
  const urls = new Set();

  for (const search of searches) {
    await page.goto(search, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const items = await extract(page).catch(() => []);
    for (const item of items) {
      const blob = `${item.title} ${item.company} ${item.text}`;
      if (urls.has(item.url)) continue;
      if (!positive.test(blob)) continue;
      if (negative.test(blob)) continue;
      if (knownMatch(known, item)) continue;
      urls.add(item.url);
      found.push(item);
      if (found.length >= limit) break;
    }
    if (found.length >= limit) break;
  }

  writeFileSync(outputPath, JSON.stringify(found, null, 2), 'utf8');
  console.log(JSON.stringify(found, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
