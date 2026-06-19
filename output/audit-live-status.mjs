import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const MAX_LINKEDIN_PAGES = Number(process.env.MAX_LINKEDIN_PAGES || 6);
const outDir = resolve(ROOT, 'output/status-audits');
mkdirSync(outDir, { recursive: true });

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function norm(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseTracker() {
  const raw = readFileSync(resolve(ROOT, 'data/applications.md'), 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.startsWith('| #'))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((cols) => cols.length >= 9 && /^\d+$/.test(cols[0]))
    .map((cols) => ({
      number: Number(cols[0]),
      date: cols[1],
      company: cols[2],
      role: cols[3],
      score: cols[4],
      status: cols[5],
      pdf: cols[6],
      report: cols[7],
      notes: cols.slice(8).join(' | '),
      key: `${norm(cols[2])}|${norm(cols[3])}`,
    }));
}

function trackerMatch(apps, company, role) {
  const c = norm(company);
  const r = norm(role);
  let best = null;
  for (const app of apps) {
    const ac = norm(app.company);
    const ar = norm(app.role);
    let score = 0;
    if (ac === c) score += 0.55;
    else if (ac.includes(c) || c.includes(ac)) score += 0.4;
    const roleTokens = new Set(r.split(' ').filter((x) => x.length > 2));
    const appTokens = new Set(ar.split(' ').filter((x) => x.length > 2));
    let overlap = 0;
    for (const token of roleTokens) if (appTokens.has(token)) overlap += 1;
    if (roleTokens.size && appTokens.size) score += 0.45 * (overlap / Math.max(roleTokens.size, appTokens.size));
    if (!best || score > best.score) best = { app, score };
  }
  return best && best.score >= 0.55 ? best : null;
}

async function collectLinkedIn(context) {
  const page = await context.newPage();
  const results = [];
  const sections = [
    { name: 'Solicitados', url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED', status: 'Applied' },
    { name: 'En curso', url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=IN_PROGRESS', status: 'Evaluated' },
    { name: 'Archivado', url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=ARCHIVED', status: 'Discarded' },
  ];

  for (const section of sections) {
    await page.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3500);
    for (let pageNo = 1; pageNo <= MAX_LINKEDIN_PAGES; pageNo += 1) {
      const items = await page.evaluate((sectionStatus) => {
        const text = document.body.innerText;
        const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        const out = [];
        for (let i = 0; i < lines.length - 2; i += 1) {
          const line = lines[i];
          const company = lines[i + 1];
          const location = lines[i + 2] || '';
          const meta = lines.slice(i + 3, i + 8).join(' ');
          if (!/(Solicitado|Última modificación|Ya no se aceptan|Solicitud sencilla|Evaluando solicitudes)/i.test(meta)) continue;
          if (/^(Inicio|Mi red|Empleos|Mensajes|Notificaciones|Yo|Para negocios|Mis cosas|Registro de empleos|Guardado|En curso|Solicitados|Archivado|Página|Anterior|Siguiente|Acerca de)$/i.test(line)) continue;
          if (/^(, Verificado|Verificado|Solicitud sencilla|Solicitado hace|Última modificación|Ya no se aceptan)/i.test(line)) continue;
          if (!company || /^(, Verificado|Verificado|Santiago|Chile|Latin America|Página|Solicitado hace)/i.test(company)) continue;
          out.push({
            platform: 'LinkedIn',
            company: company.replace(/^, Verificado\s*/i, ''),
            role: line.replace(/\s+, Verificado$/i, ''),
            location,
            status: /Ya no se aceptan solicitudes/i.test(meta) ? 'Discarded' : sectionStatus,
            evidence: meta.slice(0, 240),
          });
        }
        const seen = new Set();
        return out.filter((item) => {
          const key = `${item.company}|${item.role}|${item.status}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, section.status).catch(() => []);
      results.push(...items);

      const next = page.getByRole('button', { name: /Siguiente/i }).first();
      const enabled = await next.isEnabled().catch(() => false);
      if (!enabled) break;
      await next.click({ timeout: 7000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
  }
  await page.close().catch(() => {});
  return results;
}

async function collectGetOnBoard(context) {
  const page = await context.newPage();
  await page.goto('https://www.getonbrd.com/applications?ref=sidebar_nav', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const items = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const statuses = ['ENVIADA', 'VISTA', 'INCOMPLETA', 'PROCESO FINALIZADO', 'POR ENVIAR', 'EXPIRADA'];
    const out = [];
    for (let i = 0; i < lines.length - 4; i += 1) {
      const title = lines[i];
      const company = lines[i + 1];
      const window = lines.slice(i, i + 10).join(' ');
      const found = statuses.find((status) => window.includes(status));
      if (!found || !/Full time|Part time|Developer|Desarrollador|Engineer|Analista|Soporte|Junior|Back-end|Front-end|Full-Stack/i.test(title)) continue;
      const statusMap = {
        ENVIADA: 'Applied',
        VISTA: 'Responded',
        INCOMPLETA: 'Evaluated',
        'PROCESO FINALIZADO': 'Rejected',
        'POR ENVIAR': 'Evaluated',
        EXPIRADA: 'Discarded',
      };
      out.push({
        platform: 'Get on Board',
        company,
        role: title.replace(/\s+(Full time|Part time).*$/i, '').trim(),
        status: statusMap[found] || 'Applied',
        evidence: window.slice(0, 260),
      });
    }
    const seen = new Set();
    return out.filter((item) => {
      const key = `${item.company}|${item.role}|${item.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }).catch(() => []);
  await page.close().catch(() => {});
  return items;
}

async function collectGmail(context) {
  const page = context.pages().find((p) => p.url().includes('mail.google.com')) || await context.newPage();
  await page.bringToFront().catch(() => {});
  await page.goto('https://mail.google.com/mail/u/0/#search/' + encodeURIComponent('newer:2026/6/8 (from:linkedin OR from:computrabajo OR from:chiletrabajos OR from:(Postulaciones))'), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('tr')]
    .map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())
    .filter((text) => /LinkedIn|Computrabajo|Chiletrabajos|Postulaciones|ha visto|se ha enviado|actualizaci[oó]n|Seguimiento|postulaci[oó]n/i.test(text))
    .slice(0, 120)).catch(() => []);
  const items = [];
  for (const text of rows) {
    let match = text.match(/LinkedIn.*?se ha enviado tu solicitud a ([^-–,]+).*? -/i);
    if (match) items.push({ platform: 'Gmail', company: clean(match[1]), role: '', status: 'Applied', evidence: text.slice(0, 260) });
    match = text.match(/LinkedIn.*?([^,]+) ha visto tu solicitud/i);
    if (match) items.push({ platform: 'Gmail', company: clean(match[1].replace(/^.*LinkedIn/i, '')), role: '', status: 'Responded', evidence: text.slice(0, 260) });
    match = text.match(/Seguimiento de tu postulaci[oó]n para el puesto ([^-–,]+).*?Tu CV est[aá] a la espera/i);
    if (match) items.push({ platform: 'Gmail', company: '', role: clean(match[1]), status: 'Applied', evidence: text.slice(0, 260) });
    match = text.match(/actualizaci[oó]n en tu solicitud de empleo ([^-–,]+).*?Nuevo estado/i);
    if (match) items.push({ platform: 'Gmail', company: '', role: clean(match[1]), status: 'Responded', evidence: text.slice(0, 260) });
    match = text.match(/no olvides rellenar tu solicitud para ([^-–,]+).*?Hemos guardado tu solicitud/i);
    if (match) items.push({ platform: 'Gmail', company: clean(match[1]), role: '', status: 'Evaluated', evidence: text.slice(0, 260) });
  }
  return items;
}

function compare(live, tracker) {
  return live.map((item) => {
    const match = trackerMatch(tracker, item.company, item.role);
    return {
      ...item,
      trackerNumber: match?.app.number || null,
      trackerCompany: match?.app.company || '',
      trackerRole: match?.app.role || '',
      trackerStatus: match?.app.status || 'Missing',
      matchScore: match?.score || 0,
      mismatch: !match || match.app.status !== item.status,
    };
  });
}

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] || await browser.newContext();
const tracker = parseTracker();
const live = [
  ...(await collectLinkedIn(context)),
  ...(await collectGetOnBoard(context)),
  ...(await collectGmail(context)),
];

const seen = new Set();
const deduped = live.filter((item) => {
  const key = `${item.platform}|${norm(item.company)}|${norm(item.role)}|${item.status}|${norm(item.evidence).slice(0, 60)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return item.company || item.role;
});

const compared = compare(deduped, tracker);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = resolve(outDir, `${stamp}.json`);
writeFileSync(file, JSON.stringify({
  generatedAt: new Date().toISOString(),
  trackerTotal: tracker.length,
  liveTotal: deduped.length,
  mismatches: compared.filter((item) => item.mismatch).length,
  live: compared,
}, null, 2), 'utf8');

console.log(JSON.stringify({
  file,
  trackerTotal: tracker.length,
  liveTotal: deduped.length,
  mismatches: compared.filter((item) => item.mismatch).length,
  byPlatform: deduped.reduce((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1;
    return acc;
  }, {}),
}, null, 2));
await browser.close();
