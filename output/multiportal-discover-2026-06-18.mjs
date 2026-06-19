import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const outPath = resolve(ROOT, 'output/multiportal-discovered-2026-06-18.json');
const limitPerPortal = Number(process.env.MULTIPORTAL_LIMIT || 8);

const portals = [
  {
    name: 'LinkedIn',
    urls: [
      'https://www.linkedin.com/jobs/search/?keywords=analista%20programador&location=Chile&f_AL=true&sortBy=DD',
      'https://www.linkedin.com/jobs/search/?keywords=desarrollador%20junior&location=Chile&f_AL=true&sortBy=DD',
      'https://www.linkedin.com/jobs/search/?keywords=data%20analyst%20junior&location=Chile&f_AL=true&sortBy=DD',
    ],
    anchor: 'a[href*="/jobs/view/"]',
  },
  {
    name: 'Get on Board',
    urls: [
      'https://www.getonbrd.com/empleos/programacion?seniority=junior&remote=true',
      'https://www.getonbrd.com/empleos/programacion?remote=true',
      'https://www.getonbrd.com/misempleos',
    ],
    anchor: 'a[href*="/jobs/"]',
  },
  {
    name: 'Chiletrabajos',
    urls: [
      'https://www.chiletrabajos.cl/trabajo/programador-junior',
      'https://www.chiletrabajos.cl/trabajo/analista-programador',
      'https://www.chiletrabajos.cl/trabajo/desarrollador-junior',
    ],
    anchor: 'a[href*="/trabajo/"], a[href*="/empleo/"], a[href*="/oferta/"]',
  },
  {
    name: 'Trabajando',
    urls: [
      'https://www.trabajando.cl/trabajo-programador-junior',
      'https://www.trabajando.cl/trabajo-analista-programador',
      'https://www.trabajando.cl/trabajo-desarrollador-junior',
    ],
    anchor: 'a[href*="/trabajo/"], a[href*="/empleo/"], a[href*="/oferta/"]',
  },
];

const positive = /programador|desarrollador|developer|software|frontend|front-end|backend|back-end|full.?stack|python|javascript|typescript|react|node|sql|qa|testing|automatizaci[oó]n|soporte ti|datos|data analyst|bi|cloud|apis?/i;
const negative = /pr[aá]ctica|practicante|intern|senior principal|lead|jefe|manager comercial|business developer|ventas|vendedor|chofer|conductor|operario|bodega|taller|minera|faena|prevenci[oó]n de riesgos|cad\/cam|electr[oó]nico/i;

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function knownText() {
  return ['data/applications.md', 'data/pipeline.md']
    .filter((file) => existsSync(resolve(ROOT, file)))
    .map((file) => readFileSync(resolve(ROOT, file), 'utf8'))
    .join('\n');
}

function knownMatch(known, item) {
  const id = item.url.match(/(?:jobs\/view\/|oi=|oferta-|trabajo-)([A-Za-z0-9_-]{6,})/)?.[1] || '';
  if (id && known.includes(id)) return true;
  const haystack = normalize(known);
  const title = normalize(item.title).replace(/\s+/g, ' ').trim();
  return title.length > 18 && haystack.includes(title);
}

async function extract(page, portal) {
  return page.evaluate(({ anchor, name }) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const anchors = [...document.querySelectorAll(anchor)];
    const out = [];
    const seen = new Set();
    for (const a of anchors) {
      const href = new URL(a.href, location.href).toString().replace(/[?#].*$/, '');
      if (seen.has(href)) continue;
      seen.add(href);
      const card = a.closest('article, li, div[data-job-id], .job-card-container, .jobs-search-results__list-item, div') || a;
      const text = clean(card.innerText || a.textContent || '');
      const title = clean(a.textContent || text.split(/\n| {2,}/)[0] || '');
      if (!title || title.length < 4) continue;
      out.push({ portal: name, title, url: href, text: text.slice(0, 700) });
    }
    return out;
  }, { anchor: portal.anchor, name: portal.name });
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();
  const known = knownText();
  const all = [];
  const diagnostics = [];

  for (const portal of portals) {
    const portalItems = [];
    for (const url of portal.urls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(4000);
      const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      diagnostics.push({ portal: portal.name, url, title: await page.title().catch(() => ''), sample: body.slice(0, 260) });
      const items = await extract(page, portal).catch(() => []);
      for (const item of items) {
        const blob = `${item.title} ${item.text}`;
        if (!positive.test(blob)) continue;
        if (negative.test(blob)) continue;
        if (knownMatch(known, item)) continue;
        if (portalItems.some((seen) => seen.url === item.url || normalize(seen.title) === normalize(item.title))) continue;
        portalItems.push(item);
        if (portalItems.length >= limitPerPortal) break;
      }
      if (portalItems.length >= limitPerPortal) break;
    }
    all.push(...portalItems);
  }

  const result = { scannedAt: new Date().toISOString(), diagnostics, jobs: all };
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
