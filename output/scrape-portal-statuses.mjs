import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const outDir = resolve(ROOT, 'output/status-audits');
mkdirSync(outDir, { recursive: true });

const STATUS_MAP = {
  'POSTULADO': 'Applied',
  'CV VISTO': 'Responded',
  'VISTA': 'Responded',
  'EN PROCESO': 'Interview',
  'FINALISTA': 'Interview',
  'PROCESO FINALIZADO': 'Rejected',
  'ENVIADA': 'Applied',
  'INCOMPLETA': 'Evaluated',
  'POR ENVIAR': 'Evaluated',
  'EXPIRADA': 'Discarded',
  'CV VISTO EL': 'Responded',
  'CV AUN NO VISUALIZADO': 'Applied',
};

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
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((cols) => cols.length >= 9)
    .map((cols) => ({
      number: Number(cols[0]),
      date: cols[1],
      company: cols[2],
      role: cols[3],
      score: cols[4],
      status: cols[5],
      notes: cols.slice(8).join(' | '),
    }));
}

function inferPortal(app) {
  const text = norm(`${app.company} ${app.role} ${app.notes}`);
  if (/get on board|getonbrd/.test(text)) return 'Get on Board';
  if (/computrabajo|pandape/.test(text)) return 'Computrabajo';
  if (/linkedin|solicitud sencilla/.test(text)) return 'LinkedIn';
  if (/chiletrabajos/.test(text)) return 'Chiletrabajos';
  if (/trabajando/.test(text)) return 'Trabajando';
  if (/workable|docme360/.test(text)) return 'Workable';
  return 'Unknown';
}

function tokenScore(app, live) {
  const appCompany = norm(app.company);
  const appRole = norm(app.role);
  const liveCompany = norm(live.company);
  const liveRole = norm(live.role);
  let score = 0;
  if (appCompany && liveCompany) {
    if (appCompany === liveCompany) score += 0.5;
    else if (appCompany.includes(liveCompany) || liveCompany.includes(appCompany)) score += 0.35;
  }
  const ignore = new Set(['junior', 'senior', 'santiago', 'remoto', 'hibrido', 'proyecto', 'desarrollador', 'analista', 'developer', 'engineer', 'full', 'time']);
  const roleTokens = appRole.split(' ').filter((word) => word.length > 2 && !ignore.has(word));
  const liveTokens = new Set(liveRole.split(' ').filter((word) => word.length > 2));
  const overlap = roleTokens.filter((word) => liveTokens.has(word)).length;
  if (roleTokens.length) score += 0.5 * (overlap / Math.max(roleTokens.length, liveTokens.size || 1));
  if (appRole && liveRole && (appRole === liveRole || appRole.includes(liveRole) || liveRole.includes(appRole))) score += 0.25;
  return Math.min(1, score);
}

function bestMatch(app, liveRows, portal) {
  const candidates = liveRows.filter((row) => row.portal === portal || portal === 'Unknown');
  let best = null;
  for (const row of candidates) {
    const score = tokenScore(app, row);
    if (!best || score > best.score) best = { row, score };
  }
  return best && best.score >= 0.58 ? best : null;
}

function dedupe(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.portal}|${norm(row.company)}|${norm(row.role)}|${row.rawStatus}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function autoScroll(page, rounds = 8) {
  for (let i = 0; i < rounds; i += 1) {
    const before = await page.evaluate(() => ({ h: document.body.scrollHeight, t: document.body.innerText.length })).catch(() => ({ h: 0, t: 0 }));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({ h: document.body.scrollHeight, t: document.body.innerText.length })).catch(() => before);
    if (before.h === after.h && before.t === after.t) break;
  }
}

async function scrapeGetOnBoard(context) {
  const page = await context.newPage();
  await page.goto('https://www.getonbrd.com/applications?ref=sidebar_nav', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await autoScroll(page, 4);
  const rows = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const out = [];
    const items = [...document.querySelectorAll('tr, article, li, .gb-results-list__item')];
    for (const item of items) {
      const text = clean(item.innerText || item.textContent);
      if (!/(ENVIADA|VISTA|INCOMPLETA|PROCESO FINALIZADO|POR ENVIAR|EXPIRADA)/.test(text)) continue;
      const status = (text.match(/PROCESO FINALIZADO|POR ENVIAR|ENVIADA|VISTA|INCOMPLETA|EXPIRADA/) || [])[0];
      const compact = text.replace(/\t/g, ' ');
      const titleCompany = compact.match(/^(.*?)\s+(?:Full time|Part time|Freelance|Contract).*?\s+([^0-9]+?)\s+\d+\s+(?:ENVIADA|VISTA|INCOMPLETA|PROCESO FINALIZADO|POR ENVIAR|EXPIRADA)/i);
      if (titleCompany) {
        out.push({ role: clean(titleCompany[1]), company: clean(titleCompany[2]), rawStatus: status, evidence: compact.slice(0, 320) });
      }
    }
    if (out.length) return out;
    const lines = document.body.innerText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const statuses = ['ENVIADA', 'VISTA', 'INCOMPLETA', 'PROCESO FINALIZADO', 'POR ENVIAR', 'EXPIRADA'];
    for (let i = 0; i < lines.length - 3; i += 1) {
      const window = lines.slice(i, i + 9).join(' ');
      const status = statuses.find((item) => window.includes(item));
      if (!status) continue;
      if (!/Full time|Part time|Developer|Desarrollador|Engineer|Analista|Soporte|Junior|Back-end|Front-end|Full-Stack/i.test(lines[i])) continue;
      out.push({ role: lines[i].replace(/\s+(Full time|Part time).*$/i, '').trim(), company: lines[i + 1], rawStatus: status, evidence: window.slice(0, 320) });
    }
    return out;
  }).catch(() => []);
  await page.close().catch(() => {});
  return dedupe(rows.map((row) => ({ ...row, portal: 'Get on Board', status: STATUS_MAP[row.rawStatus] || 'Unknown' })));
}

async function scrapeComputrabajo(context) {
  const page = await context.newPage();
  const all = [];
  const statuses = [
    { st: 1, label: 'POSTULADO' },
    { st: 2, label: 'CV VISTO' },
    { st: 3, label: 'EN PROCESO' },
    { st: 4, label: 'FINALISTA' },
    { st: 5, label: 'PROCESO FINALIZADO' },
  ];
  for (const status of statuses) {
    for (let pageNo = 1; pageNo <= 12; pageNo += 1) {
      const url = `https://candidato.cl.computrabajo.com/candidate/match?st=${status.st}${pageNo > 1 ? `&p=${pageNo}` : ''}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
      await page.waitForTimeout(1800);
      const rows = await page.evaluate((fallbackStatus) => {
        const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const lines = document.body.innerText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        const out = [];
        for (let i = 0; i < lines.length; i += 1) {
          if (!/^(Postulado|CV Visto|En proceso|Finalista|Proceso finalizado)$/i.test(lines[i])) continue;
          const role = lines[i - 3] || '';
          const company = lines[i - 2] || '';
          const location = lines[i - 1] || '';
          if (!role || !company || /Mis postulaciones|Todas tus postulaciones|Postulado|CV Visto|Proceso finalizado|Finalista/i.test(role)) continue;
          if (!/Chile|R\.Metropolitana|Santiago|Remoto|Condes|Providencia|Centro|Quilicura|Vitacura|Huechuraba|San|Puente|Renca|Pudahuel|Lampa|Talcahuano/i.test(location)) continue;
          out.push({ role: clean(role), company: clean(company.replace(/\s+\d[,.]\d$/, '')), rawStatus: clean(lines[i] || fallbackStatus), evidence: clean([role, company, location, lines[i], ...lines.slice(i + 1, i + 3)].join(' | ')).slice(0, 320) });
        }
        return out;
      }, status.label).catch(() => []);
      const before = all.length;
      all.push(...rows);
      const hasNext = await page.locator('text=/Siguiente/i').count().catch(() => 0);
      if (!rows.length || (!hasNext && pageNo > 1) || (rows.length === 0 && before === all.length)) break;
      if (rows.length < 8 && pageNo > 1) break;
    }
  }
  await page.close().catch(() => {});
  return dedupe(all.map((row) => ({ ...row, portal: 'Computrabajo', status: STATUS_MAP[norm(row.rawStatus).toUpperCase()] || STATUS_MAP[clean(row.rawStatus).toUpperCase()] || (/(cv visto)/i.test(row.rawStatus) ? 'Responded' : 'Applied') })));
}

async function scrapeChiletrabajos(context) {
  const page = await context.newPage();
  await page.goto('https://www.chiletrabajos.cl/dashboard/postulaciones', { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await autoScroll(page, 4);
  const rows = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const out = [];
    for (const item of document.querySelectorAll('.accordion-item')) {
      const header = clean(item.querySelector('.accordion-header, button, h2, h3')?.innerText || item.innerText);
      const statusText = clean(item.innerText);
      const match = header.match(/^(\d+)\s+(.+?)\s+\|\s+(.+)$/);
      if (!match) continue;
      const rawStatus = /CV Visto/i.test(statusText) ? 'CV VISTO' : /CV aún no visualizado|CV aun no visualizado/i.test(statusText) ? 'CV AUN NO VISUALIZADO' : 'POSTULADO';
      out.push({ id: match[1], role: match[2], company: match[3], rawStatus, evidence: statusText.slice(0, 320) });
    }
    return out;
  }).catch(() => []);
  await page.close().catch(() => {});
  return dedupe(rows.map((row) => ({ ...row, portal: 'Chiletrabajos', status: row.rawStatus === 'CV VISTO' ? 'Responded' : 'Applied' })));
}

async function scrapeLinkedInSection(context, section) {
  const page = await context.newPage();
  await page.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const out = [];
  for (let pageNo = 1; pageNo <= 20; pageNo += 1) {
    await autoScroll(page, 2);
    const rows = await page.evaluate((sectionStatus) => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const out = [];
      const lis = [...document.querySelectorAll('li')].map((li) => clean(li.innerText || li.textContent)).filter((text) => /Solicitado|Solicitud vista|Curr[ií]culum descargado|Ya no se aceptan|Evaluando solicitudes|Solicitud sencilla|Última modificación/i.test(text));
      for (const text of lis) {
        if (/^(Inicio|Mi red|Empleos|Mensajes|Notificaciones|Guardado|En curso|Solicitados|Archivado)/i.test(text)) continue;
        const lines = text.split(/\n+/).map(clean).filter(Boolean);
        const compact = clean(text);
        let role = lines[0] || '';
        let company = lines[1] || '';
        let location = lines[2] || '';
        if (lines.length <= 1) {
          const m = compact.match(/^(.+?)\s+(.+?)\s+(Santiago|Chile|Latin America|Las Condes|Viña|Providencia|Huechuraba|Remote|Regi[oó]n|Metropolitan)/i);
          if (m) {
            role = m[1];
            company = m[2];
            location = compact.slice((m[1] + ' ' + m[2]).length, 160);
          }
        }
        role = role.replace(/\s*,\s*Verificado$/i, '').trim();
        company = company.replace(/^,\s*Verificado\s*/i, '').trim();
        if (!role || !company || /Solicitado|Solicitud|Página|Anterior|Siguiente|Verificado|^\d+$/.test(role) || /Solicitado|Solicitud|Página|^\d+$/.test(company)) continue;
        let status = sectionStatus;
        if (/Ya no se aceptan solicitudes/i.test(compact)) status = 'Discarded';
        if (/Solicitud vista|Curr[ií]culum descargado|resume downloaded|application viewed/i.test(compact)) status = 'Responded';
        out.push({ role, company, location, rawStatus: status, status, evidence: compact.slice(0, 320) });
      }
      return out;
    }, section.status).catch(() => []);
    out.push(...rows);
    const next = page.getByRole('button', { name: /Siguiente/i }).first();
    const enabled = await next.isEnabled().catch(() => false);
    if (!enabled) break;
    await next.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1800);
  }
  await page.close().catch(() => {});
  return out;
}

async function scrapeLinkedIn(context) {
  const sections = [
    { url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED', status: 'Applied' },
    { url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=IN_PROGRESS', status: 'Evaluated' },
    { url: 'https://www.linkedin.com/my-items/saved-jobs/?cardType=ARCHIVED', status: 'Discarded' },
  ];
  const all = [];
  for (const section of sections) all.push(...await scrapeLinkedInSection(context, section));
  return dedupe(all.map((row) => ({ ...row, portal: 'LinkedIn' })));
}

async function scrapeTrabajando(context) {
  const page = await context.newPage();
  const urls = [
    'https://www.trabajando.cl/mi-cuenta/postulaciones',
    'https://www.trabajando.cl/postulante/postulaciones',
    'https://www.trabajando.cl/cuenta/postulaciones',
  ];
  const rows = [];
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2200);
    const text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
    if (/mis postulaciones|postulaciones|postulado|enviada/i.test(text) && !/ingresa|inicia sesi/i.test(text.slice(0, 800))) {
      rows.push({ portal: 'Trabajando', role: 'Portal Trabajando', company: 'Trabajando', rawStatus: 'Portal visible', status: 'Unknown', evidence: clean(text).slice(0, 320) });
      break;
    }
  }
  await page.close().catch(() => {});
  return rows;
}

function makeReport(audit) {
  const lines = [];
  lines.push('# Auditoria de estados de postulaciones');
  lines.push('');
  lines.push(`Generado: ${audit.generatedAt}`);
  lines.push(`Tracker: ${audit.trackerTotal} filas`);
  lines.push(`Verificadas por scraping: ${audit.verified} filas`);
  lines.push(`No verificables por portal vivo: ${audit.notVerified} filas`);
  lines.push('');
  lines.push('| # | Portal | Empresa | Cargo | Estado portal | Estado tracker | Confianza | Evidencia |');
  lines.push('|---|--------|---------|-------|---------------|----------------|-----------|-----------|');
  for (const row of audit.results) {
    lines.push(`| ${row.number} | ${row.portal} | ${row.company} | ${row.role} | ${row.liveStatus} | ${row.trackerStatus} | ${row.confidence} | ${clean(row.evidence).replace(/\|/g, '/').slice(0, 180)} |`);
  }
  return lines.join('\n');
}

const tracker = parseTracker().map((app) => ({ ...app, portal: inferPortal(app) }));
const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
if (!context) throw new Error('No hay contexto CDP activo. Abre Chromium con CDP y sesiones logueadas.');

const liveRows = [
  ...(await scrapeGetOnBoard(context)),
  ...(await scrapeComputrabajo(context)),
  ...(await scrapeChiletrabajos(context)),
  ...(await scrapeLinkedIn(context)),
  ...(await scrapeTrabajando(context)),
];
await browser.close().catch(() => {});

const results = tracker
  .map((app) => {
    const match = bestMatch(app, liveRows, app.portal);
    if (!match) {
      return {
        number: app.number,
        portal: app.portal,
        company: app.company,
        role: app.role,
        trackerStatus: app.status,
        liveStatus: 'No verificable',
        confidence: 0,
        evidence: 'No se encontro una fila equivalente en el portal vivo durante este scraping.',
        mismatch: false,
      };
    }
    return {
      number: app.number,
      portal: app.portal,
      company: app.company,
      role: app.role,
      trackerStatus: app.status,
      liveStatus: match.row.status,
      rawStatus: match.row.rawStatus,
      confidence: Number(match.score.toFixed(2)),
      evidence: match.row.evidence,
      liveCompany: match.row.company,
      liveRole: match.row.role,
      mismatch: app.status !== match.row.status,
    };
  })
  .sort((a, b) => b.number - a.number);

const audit = {
  generatedAt: new Date().toISOString(),
  trackerTotal: tracker.length,
  liveRowsCount: liveRows.length,
  verified: results.filter((row) => row.liveStatus !== 'No verificable').length,
  notVerified: results.filter((row) => row.liveStatus === 'No verificable').length,
  mismatches: results.filter((row) => row.mismatch && row.confidence >= 0.7).length,
  liveByPortal: liveRows.reduce((acc, row) => {
    acc[row.portal] = (acc[row.portal] || 0) + 1;
    return acc;
  }, {}),
  trackerByPortal: tracker.reduce((acc, row) => {
    acc[row.portal] = (acc[row.portal] || 0) + 1;
    return acc;
  }, {}),
  results,
  liveRows,
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = resolve(outDir, `${stamp}-portal-statuses.json`);
const mdPath = resolve(outDir, `${stamp}-portal-statuses.md`);
writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');
writeFileSync(mdPath, makeReport(audit), 'utf8');

console.log(JSON.stringify({
  jsonPath,
  mdPath,
  trackerTotal: audit.trackerTotal,
  liveRows: audit.liveRowsCount,
  verified: audit.verified,
  notVerified: audit.notVerified,
  mismatches: audit.mismatches,
  liveByPortal: audit.liveByPortal,
  trackerByPortal: audit.trackerByPortal,
}, null, 2));
