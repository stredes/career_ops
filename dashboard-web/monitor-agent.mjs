import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const intervalMs = Number(process.env.MONITOR_INTERVAL_SEC || 60) * 1000;
const portalIntervalMs = Number(process.env.PORTAL_MONITOR_INTERVAL_SEC || 300) * 1000;
const cdpUrl = process.env.CDP_URL || 'http://127.0.0.1:9223';
const statusPath = join(__dirname, 'agent-status.json');
const logPath = join(__dirname, 'agent-monitor.log');
let lastPortalCheckAt = 0;
let lastPortalChecks = [];

function parseApplications() {
  const raw = readFileSync(join(root, 'data', 'applications.md'), 'utf8');
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
      notes: cols.slice(8).join(' | '),
    }));
}

function statusPriority(status) {
  return {
    Evaluated: 0,
    Applied: 1,
    Responded: 2,
    Interview: 3,
    Offer: 4,
    Rejected: 5,
  }[status] ?? -1;
}

function syncTrackerFromPortalChecks(portalChecks) {
  const updates = [];
  const file = join(root, 'data', 'applications.md');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const bestByNumber = new Map();

  const strongSignal = (match) => {
    const source = String(match.source || '');
    const evidence = normalize(match.evidence || '');
    if (match.portalStatus !== 'Responded') return true;
    if (source === 'Computrabajo') return match.companySeen === true;
    if (source === 'LinkedIn') return match.companySeen === true && /solicitud vista|curriculum descargado|resume downloaded|application viewed/.test(evidence);
    if (source.startsWith('Gmail')) {
      return match.companySeen === true && /sigue avanzando|novedades|proceso de seleccion|mensaje|cuestionario|acceso a las preguntas|solicitud vista|curriculum descargado|resume downloaded|application viewed|te invitamos|prueba tecnica/.test(evidence);
    }
    if (source.startsWith('Get on Board')) {
      return match.companySeen === true && /mensaje de|proceso finalizado|vista|cv visto/.test(evidence) && !/\b0 enviada\b/.test(evidence);
    }
    return match.companySeen === true;
  };

  for (const match of portalChecks.flatMap((check) => (check.matches || []).map((item) => ({ ...item, source: check.source })))) {
    if (!['Responded', 'Interview', 'Offer', 'Rejected'].includes(match.portalStatus)) continue;
    if (!strongSignal(match)) continue;
    const existing = bestByNumber.get(match.number);
    if (!existing || statusPriority(match.portalStatus) > statusPriority(existing.portalStatus)) {
      bestByNumber.set(match.number, match);
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|') || line.includes('---') || line.startsWith('| #')) continue;
    const cols = line.slice(1, -1).split('|').map((cell) => cell.trim());
    if (cols.length < 9) continue;
    const number = Number(cols[0]);
    const match = bestByNumber.get(number);
    if (!match) continue;

    const current = cols[5];
    if (['Discarded', 'SKIP', 'Rejected'].includes(current)) continue;
    if (statusPriority(match.portalStatus) <= statusPriority(current)) continue;

    cols[5] = match.portalStatus;
    const stamp = new Date().toISOString().slice(0, 10);
    const evidence = match.portalStatus === 'Responded'
      ? 'portal detecto CV visto/respuesta'
      : `portal detecto ${match.portalStatus}`;
    cols[8] = `${evidence} el ${stamp}. ${cols.slice(8).join(' | ')}`.trim();
    lines[i] = `| ${cols.join(' | ')} |`;
    updates.push({
      number,
      from: current,
      to: match.portalStatus,
      role: cols[3],
      evidence: match.evidence,
    });
  }

  if (updates.length) {
    writeFileSync(file, lines.join('\n'), 'utf8');
    appendFileSync(logPath, `[${new Date().toISOString()}] synced ${updates.length} portal status update(s): ${updates.map((item) => `#${item.number} ${item.from}->${item.to}`).join(', ')}\n`, 'utf8');
  }

  return updates;
}

function summarize(apps) {
  const counts = {};
  for (const app of apps) counts[app.status] = (counts[app.status] || 0) + 1;
  const active = apps.filter((app) => !['Discarded', 'Rejected', 'SKIP'].includes(app.status));
  return {
    total: apps.length,
    active: active.length,
    applied: counts.Applied || 0,
    responded: counts.Responded || 0,
    interviews: counts.Interview || 0,
    offers: counts.Offer || 0,
    discarded: counts.Discarded || 0,
  };
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function statusFromWindow(text, source) {
  const value = normalize(text);
  if (/proceso finalizado|no seleccionado|rechaz|descartad/.test(value)) return 'Rejected';
  if (/entrevista|interview|agenda|coordinar reunion|reunion tecnica/.test(value)) return 'Interview';
  if (/sigue avanzando|avanzando en el proceso|novedades en tu postulacion|candidatura sigue|han visto|te han visto|solicitud vista|application viewed|vista|cv visto|visto por la empresa|curriculum descargado|curriculo descargado|resume downloaded|mensaje|message|contact/.test(value)) return 'Responded';
  if (/enviada|solicitud enviada|te postulaste|ya te postulaste|aplicaste|applied/.test(value)) return 'Applied';
  if (/por enviar|borrador|draft/.test(value)) return 'Evaluated';
  return source === 'Get on Board' && /vista/.test(value) ? 'Responded' : 'Unknown';
}

function computrabajoStatusFromLabel(label) {
  const value = normalize(label);
  if (/proceso finalizado|rechaz/.test(value)) return 'Rejected';
  if (/finalista/.test(value)) return 'Interview';
  if (/cv visto/.test(value)) return 'Responded';
  if (/postulado/.test(value)) return 'Applied';
  return 'Unknown';
}

function computrabajoMatchRows(text, apps) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = [];
  for (let statusLineIndex = 0; statusLineIndex < lines.length; statusLineIndex += 1) {
    if (!/^(Postulado|CV Visto|Finalista|Proceso finalizado)$/i.test(lines[statusLineIndex])) continue;
    const title = lines[statusLineIndex - 3] || '';
    const company = lines[statusLineIndex - 2] || '';
    const location = lines[statusLineIndex - 1] || '';
    const statusLabel = lines[statusLineIndex];
    if (!/R\.Metropolitana|Santiago|Chile|Remoto|Condes|Providencia|Centro|Renca/i.test(location)) continue;
    if (/^(Mis postulaciones|Todas tus postulaciones|Postulado|CV Visto|Proceso finalizado|Finalista)$/i.test(title)) continue;
    rows.push({
      title,
      company,
      location,
      portalStatus: computrabajoStatusFromLabel(statusLabel),
      statusLabel,
      evidence: [title, company, location, statusLabel, ...lines.slice(statusLineIndex + 1, statusLineIndex + 4)].join(' | '),
    });
  }

  const cleanRows = rows.filter((row, index, all) => all.findIndex((item) => normalize(item.title) === normalize(row.title) && normalize(item.company) === normalize(row.company)) === index);
  const matches = [];
  for (const row of cleanRows) {
    const rowTitle = normalize(row.title);
    const rowCompany = normalize(row.company);
    let best = null;
    let bestScore = 0;
    for (const app of apps) {
      const appRole = normalize(app.role);
      const appCompany = normalize(app.company);
      const tokens = appRole.split(' ').filter((word) => word.length > 3 && !['junior', 'santiago', 'vitacura', 'condes', 'proyecto'].includes(word));
      const hits = tokens.filter((word) => rowTitle.includes(word)).length;
      const companyHit = appCompany && (rowCompany.includes(appCompany) || appCompany.includes(rowCompany)) ? 2 : 0;
      const exactTitle = rowTitle === appRole || rowTitle.includes(appRole) || appRole.includes(rowTitle) ? 3 : 0;
      if (app.status === 'Discarded' && exactTitle === 0) continue;
      const score = hits + companyHit + exactTitle;
      if (score > bestScore) {
        bestScore = score;
        best = app;
      }
    }
    if (best && bestScore >= 3) {
      matches.push({
        number: best.number,
        company: best.company,
        role: best.role,
        trackerStatus: best.status,
        portalStatus: row.portalStatus,
        companySeen: true,
        evidence: row.evidence,
      });
    }
  }
  return matches;
}

function matchApplicationsInText(text, apps, source) {
  const clean = normalize(text);
  const isGmail = source.startsWith('Gmail');
  const matches = [];
  for (const app of apps) {
    if (!['Applied', 'Responded', 'Interview', 'Offer', 'Discarded'].includes(app.status)) continue;
    const role = normalize(app.role);
    const company = normalize(app.company);
    const generic = new Set(['junior', 'proyecto', 'santiago', 'vitacura', 'condes', 'tecnico', 'soporte', 'profesional', 'practica']);
    const tokens = role.split(' ').filter((word) => word.length > 3 && !['junior', 'proyecto', 'santiago', 'vitacura', 'condes'].includes(word)).slice(0, 8);
    const hits = tokens.filter((word) => clean.includes(word));
    const distinctHits = hits.filter((word) => !generic.has(word));
    const enoughHits = isGmail ? hits.length >= 3 && distinctHits.length >= 1 : hits.length >= 3;
    if (!tokens.length || !enoughHits) continue;
    const anchor = hits.find((word) => clean.includes(word)) || tokens[0];
    const index = Math.max(0, clean.indexOf(anchor));
    const window = clean.slice(Math.max(0, index - 180), index + 360);
    matches.push({
      number: app.number,
      company: app.company,
      role: app.role,
      trackerStatus: app.status,
      portalStatus: statusFromWindow(window, source),
      companySeen: company ? clean.includes(company) : false,
      tokenHits: hits,
      evidence: window.slice(0, 260),
    });
  }
  return matches;
}

async function clickVisibleByText(page, regex) {
  return page.evaluate((source) => {
    const pattern = new RegExp(source, 'i');
    const normalizeText = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const controls = [...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')];
    const item = controls.find((element) => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || !element.getClientRects().length) return false;
      const text = [element.textContent, element.value, element.getAttribute('aria-label'), element.getAttribute('title')]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      return pattern.test(text) || pattern.test(normalizeText(text));
    });
    if (!item) return '';
    item.scrollIntoView({ block: 'center' });
    item.click();
    return item.textContent || item.value || item.getAttribute('aria-label') || 'clicked';
  }, regex.source).catch(() => '');
}

async function deepReadPage(page, source) {
  const stats = { scrolls: 0, clicks: 0, tabs: 0 };
  const sourceKey = normalize(source);

  if (sourceKey.includes('get on board')) {
    for (const tab of [/todas las fases|todos/i, /enviada|enviadas/i, /vista|vistas/i, /proceso finalizado/i]) {
      const clicked = await clickVisibleByText(page, tab);
      if (clicked) {
        stats.tabs += 1;
        await page.waitForTimeout(1200);
      }
    }
  }

  for (let i = 0; i < 8; i += 1) {
    const before = await page.evaluate(() => ({
      y: window.scrollY,
      h: document.body.scrollHeight,
      text: document.body.innerText.length,
    })).catch(() => ({ y: 0, h: 0, text: 0 }));

    const clickedMore = await clickVisibleByText(page, /ver mas|ver m[aá]s|cargar mas|cargar m[aá]s|mostrar mas|mostrar m[aá]s|siguiente|next|older|m[aá]s resultados|mas resultados/);
    if (clickedMore) {
      stats.clicks += 1;
      await page.waitForTimeout(1500);
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(1200);
    stats.scrolls += 1;

    const after = await page.evaluate(() => ({
      y: window.scrollY,
      h: document.body.scrollHeight,
      text: document.body.innerText.length,
    })).catch(() => before);

    if (!clickedMore && after.h === before.h && after.text === before.text) break;
  }

  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return { text, stats };
}

async function deepReadPageV2(page, source) {
  const stats = { scrolls: 0, clicks: 0, tabs: 0 };
  const sourceKey = normalize(source);
  const snapshots = [];

  const capture = async () => {
    const text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    if (text) snapshots.push(text);
  };

  const scrollAndLoad = async () => {
    for (let i = 0; i < 8; i += 1) {
      const before = await page.evaluate(() => ({
        h: document.body.scrollHeight,
        text: document.body.innerText.length,
      })).catch(() => ({ h: 0, text: 0 }));

      const clickedMore = await clickVisibleByText(page, /ver mas|cargar mas|mostrar mas|siguiente|next|older|mas resultados|load more/);
      if (clickedMore) {
        stats.clicks += 1;
        await page.waitForTimeout(1500);
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await page.waitForTimeout(1200);
      stats.scrolls += 1;
      await capture();

      const after = await page.evaluate(() => ({
        h: document.body.scrollHeight,
        text: document.body.innerText.length,
      })).catch(() => before);

      if (!clickedMore && after.h === before.h && after.text === before.text) break;
    }
  };

  await capture();
  if (sourceKey.includes('get on board')) {
    for (const tab of [/todas las fases|todos/i, /enviada|enviadas/i, /vista|vistas/i, /proceso finalizado/i]) {
      const clicked = await clickVisibleByText(page, tab);
      if (clicked) {
        stats.tabs += 1;
        await page.waitForTimeout(1200);
        await scrollAndLoad();
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      }
    }
  }

  await scrollAndLoad();
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await capture();
  const text = [...new Set(snapshots)].join('\n\n--- snapshot ---\n\n');
  return { text, stats };
}

async function readPortalPage(context, source, url, apps) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(source.startsWith('Gmail') ? 6500 : 2500);
    const { text, stats } = await deepReadPageV2(page, source);
    const loginRequired = /inicia sesi|login|sign in|acceder|no puedes acceder/i.test(text) && !/postul|empleo|solicitud|mis empleos/i.test(text);
    const matches = loginRequired ? [] : (source === 'Computrabajo' ? computrabajoMatchRows(text, apps) : matchApplicationsInText(text, apps, source));
    const portalSummary = source === 'Computrabajo' && !loginRequired ? computrabajoSummary(text, matches) : '';
    const depthSummary = `Lectura profunda: ${stats.scrolls} scroll(s), ${stats.clicks} carga(s), ${stats.tabs} filtro(s).`;
    return {
      source,
      state: loginRequired ? 'needs-login' : 'checked',
      url: page.url(),
      lastCheck: new Date().toISOString(),
      matches,
      matchCount: matches.length,
      summary: loginRequired ? 'Sesion no disponible o login requerido.' : `${portalSummary || `${matches.length} postulacion(es) reconocidas en portal.`} ${depthSummary}`,
    };
  } catch (error) {
    return {
      source,
      state: 'error',
      url,
      lastCheck: new Date().toISOString(),
      matches: [],
      matchCount: 0,
      summary: error.message || String(error),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function gmailSearchUrl(query) {
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

function computrabajoSummary(text, matches = []) {
  const get = (label) => {
    const match = text.match(new RegExp(`${label}\\s+(\\d+)`, 'i')) || text.match(new RegExp(`${label}\\s*\\n\\s*(\\d+)`, 'i'));
    return match ? Number(match[1]) : null;
  };
  const postulado = get('Postulado');
  const visto = get('CV visto');
  const proceso = get('En proceso');
  const finalista = get('Finalista');
  const byStatus = matches.reduce((acc, item) => {
    acc[item.portalStatus] = (acc[item.portalStatus] || 0) + 1;
    return acc;
  }, {});
  if ([postulado, visto, proceso, finalista].every((value) => value === null) && !matches.length) return '';
  if (matches.length) return `Estados visibles: ${matches.length} coincidencia(s), ${byStatus.Applied || 0} postulado(s), ${byStatus.Responded || 0} CV visto(s), ${byStatus.Interview || 0} finalista(s), ${byStatus.Rejected || 0} finalizado(s).`;
  return `Resumen Computrabajo: Postulado ${postulado ?? 0}, CV visto ${visto ?? 0}, En proceso ${proceso ?? 0}, Finalista ${finalista ?? 0}.`;
}

async function checkPortals(apps) {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error('No hay contexto de Chromium disponible para revisar portales.');

  const checks = [];
  checks.push(await readPortalPage(context, 'Computrabajo', 'https://candidato.cl.computrabajo.com/Candidate/Match/?utm_source=auto_cand_MatchVisto&utm_campaign=auto_cand_MatchVisto&utm_medium=email&lc=MailHanVistoTuCV-Over-NoPosition-Button&fgoa=True', apps));
  checks.push(await readPortalPage(context, 'Get on Board', 'https://www.getonbrd.com/applications?ref=sidebar_nav', apps));
  checks.push(await readPortalPage(context, 'Get on Board Empleos', 'https://www.getonbrd.com/misempleos', apps));
  checks.push(await readPortalPage(context, 'LinkedIn', 'https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED', apps));
  checks.push(await readPortalPage(context, 'Chiletrabajos', 'https://www.chiletrabajos.cl/dashboard/postulaciones', apps));
  checks.push(await readPortalPage(context, 'Gmail Computrabajo', gmailSearchUrl('"sigue avanzando" OR "novedades en tu postulacion" OR "Postulaciones Compu"'), apps));
  checks.push(await readPortalPage(context, 'Gmail Get on Board', gmailSearchUrl('"Get on Board" OR getonbrd OR "Solicitud con Get on Board"'), apps));
  checks.push(await readPortalPage(context, 'Gmail LinkedIn', gmailSearchUrl('"solicitud vista" OR "curriculum descargado" OR "currículum descargado" OR "application viewed" OR "resume downloaded"'), apps));
  checks.push(await readPortalPage(context, 'Gmail Cuestionarios', gmailSearchUrl('pandape OR bizneo OR cuestionario OR "Acceso a las preguntas"'), apps));
  checks.push(await readPortalPage(context, 'Gmail Trabajando Chiletrabajos', gmailSearchUrl('trabajando OR chiletrabajos OR "tu postulacion" OR "tu postulación"'), apps));
  return checks;
}

function buildAlerts(apps, verifyOk, portalChecks) {
  const alerts = [];
  const responded = apps.filter((app) => ['Responded', 'Interview', 'Offer'].includes(app.status));
  if (responded.length) {
    alerts.push(`${responded.length} postulacion(es) requieren seguimiento por respuesta/entrevista/oferta.`);
  }
  const pendingEval = apps.filter((app) => app.status === 'Evaluated');
  if (pendingEval.length) {
    alerts.push(`${pendingEval.length} oferta(s) evaluadas pendientes de decision.`);
  }
  if (!verifyOk) {
    alerts.push('El verificador del pipeline detecto un problema. Revisar logs.');
  }
  const portalSignals = portalChecks.flatMap((check) => check.matches || [])
    .filter((match) => ['Responded', 'Interview', 'Rejected', 'Offer'].includes(match.portalStatus));
  if (portalSignals.length) {
    alerts.push(`${portalSignals.length} cambio(s) potencial(es) detectados en portales. Revisar panel Portales.`);
  }
  for (const check of portalChecks) {
    const summary = check.summary || '';
    const cvSeen = Number(summary.match(/CV visto\s+(\d+)/i)?.[1] || 0);
    const inProcess = Number(summary.match(/En proceso\s+(\d+)/i)?.[1] || 0);
    const finalist = Number(summary.match(/Finalista\s+(\d+)/i)?.[1] || 0);
    if (cvSeen || inProcess || finalist) {
      alerts.push(`${check.source}: ${cvSeen} CV visto(s), ${inProcess} en proceso, ${finalist} finalista(s).`);
    }
  }
  const loginIssues = portalChecks.filter((check) => ['needs-login', 'error'].includes(check.state));
  if (loginIssues.length) {
    alerts.push(`${loginIssues.length} portal(es) requieren revision de sesion o acceso.`);
  }
  if (!alerts.length) alerts.push('Sin alertas criticas en el tracker local.');
  return alerts;
}

function writeStatus(payload) {
  writeFileSync(statusPath, JSON.stringify(payload, null, 2), 'utf8');
}

async function checkOnce() {
  const startedAt = new Date();
  let verifyOk = false;
  let verifyOutput = '';

  try {
    const result = await execFileAsync('node', ['verify-pipeline.mjs'], {
      cwd: root,
      timeout: 20000,
      windowsHide: true,
    });
    verifyOk = !/Pipeline Health:\s*[1-9]/.test(result.stdout);
    verifyOutput = result.stdout.slice(-1200);
  } catch (error) {
    verifyOutput = `${error.stdout || ''}\n${error.stderr || ''}\n${error.message || error}`.slice(-1200);
  }

  let apps = parseApplications();
  let portalChecks = lastPortalChecks;
  let portalState = 'cached';
  let trackerUpdates = [];
  if (Date.now() - lastPortalCheckAt >= portalIntervalMs) {
    try {
      portalChecks = await checkPortals(apps);
      trackerUpdates = syncTrackerFromPortalChecks(portalChecks);
      if (trackerUpdates.length) apps = parseApplications();
      lastPortalChecks = portalChecks;
      lastPortalCheckAt = Date.now();
      portalState = 'checked';
    } catch (error) {
      portalChecks = [{
        source: 'Portales',
        state: 'error',
        url: '',
        lastCheck: new Date().toISOString(),
        matches: [],
        matchCount: 0,
        summary: error.message || String(error),
      }];
      lastPortalChecks = portalChecks;
      lastPortalCheckAt = Date.now();
      portalState = 'error';
    }
  }
  const summary = summarize(apps);
  const payload = {
    state: verifyOk && portalState !== 'error' ? 'running' : 'attention',
    pid: process.pid,
    intervalSec: Math.round(intervalMs / 1000),
    portalIntervalSec: Math.round(portalIntervalMs / 1000),
    lastCheck: startedAt.toISOString(),
    nextCheck: new Date(Date.now() + intervalMs).toISOString(),
    lastPortalCheck: lastPortalCheckAt ? new Date(lastPortalCheckAt).toISOString() : null,
    summary,
    alerts: buildAlerts(apps, verifyOk, portalChecks),
    trackerUpdates,
    portalState,
    portalChecks,
    verifyOk,
    verifyTail: verifyOutput,
  };

  writeStatus(payload);
  appendFileSync(logPath, `[${payload.lastCheck}] ${payload.state} total=${summary.total} active=${summary.active} applied=${summary.applied} discarded=${summary.discarded}\n`, 'utf8');
}

async function loop() {
  writeStatus({
    state: 'starting',
    pid: process.pid,
    intervalSec: Math.round(intervalMs / 1000),
    portalIntervalSec: Math.round(portalIntervalMs / 1000),
    lastCheck: null,
    nextCheck: new Date().toISOString(),
    lastPortalCheck: null,
    summary: {},
    portalChecks: [],
    alerts: ['Inicializando monitor.'],
    verifyOk: null,
  });

  await checkOnce();
  setInterval(() => {
    checkOnce().catch((error) => {
      const payload = {
        state: 'error',
        pid: process.pid,
        intervalSec: Math.round(intervalMs / 1000),
        portalIntervalSec: Math.round(portalIntervalMs / 1000),
        lastCheck: new Date().toISOString(),
        nextCheck: new Date(Date.now() + intervalMs).toISOString(),
        lastPortalCheck: lastPortalCheckAt ? new Date(lastPortalCheckAt).toISOString() : null,
        summary: {},
        portalChecks: lastPortalChecks,
        alerts: [`Error del monitor: ${error.message || error}`],
        verifyOk: false,
      };
      writeStatus(payload);
    });
  }, intervalMs);
}

loop();
