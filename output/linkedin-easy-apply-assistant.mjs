import { chromium } from 'playwright';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { answerDynamicQuestions, answerQuestion } from './linkedin-question-answerer.mjs';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const USER_DATA_DIR = resolve(ROOT, process.env.LINKEDIN_PROFILE || '.recording-browser-profile');
const profilePath = resolve(ROOT, 'config/profile.yml');
const cvPath = process.env.CV_PATH
  ? resolve(ROOT, process.env.CV_PATH)
  : resolve(ROOT, 'output/cv-gian-programador-ti.pdf');

const maxApplications = Number(process.env.MAX_APPLICATIONS || 5);
const autoAdvance = process.env.AUTO_ADVANCE === '1';
const autoSubmit = process.env.AUTO_SUBMIT === '1';
const locationOverride = process.env.LINKEDIN_LOCATION || '';
const queryOverride = process.env.LINKEDIN_QUERY || '';
const logPath = resolve(ROOT, 'output/linkedin-agent.log');
const positiveTitle = /programador|desarrollador|developer|frontend|front-end|backend|back-end|full stack|fullstack|analista programador|soporte ti|soporte sistemas|python|javascript|typescript|react|sql|automatizaci[oó]n|data|datos/i;
const negativeTitle = /residente|obra|construcci[oó]n|civil|tramo|minas|mec[aá]nico|el[eé]ctrico|prevenci[oó]n|vendedor|ventas|comercial|chofer|conductor|bodega|operario|enfermer|kinesi[oó]logo|contador/i;

const applyText = /easy apply|solicitud sencilla|solicitud simple|postulaci[oó]n sencilla|postular/i;
const finalSubmitText = /submit application|enviar solicitud|enviar postulaci[oó]n|send application|presentar solicitud|enviar candidatura/i;
const advanceText = /next|siguiente|review|revisar|continuar/i;
const dismissText = /discard|descartar|cancelar/i;
const blockingText = /assessment|test|prueba|evaluaci[oó]n|payment|pago|certifico|declaro|declaraci[oó]n|background check|antecedentes|consentimiento especial|special consent/i;

function titleFits(title) {
  return positiveTitle.test(title || '') && !negativeTitle.test(title || '');
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function loadProfile() {
  const profile = yaml.load(readFileSync(profilePath, 'utf8'));
  const candidate = profile.candidate || {};
  const targetRoles = profile.target_roles || {};
  const narrative = profile.narrative || {};
  const compensation = profile.compensation || {};
  const location = profile.location || {};
  const roles = [
    ...(targetRoles.primary || []),
    ...((targetRoles.archetypes || []).map((item) => item.name).filter(Boolean)),
  ];

  return {
    fullName: candidate.full_name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    linkedin: candidate.linkedin || '',
    github: candidate.github || '',
    portfolio: candidate.portfolio_url || candidate.github || '',
    city: location.city || candidate.location || 'Chile',
    country: location.country || 'Chile',
    salary: compensation.minimum || compensation.target_range || '',
    availability: 'Inmediata o segun coordinacion',
    modality: compensation.location_flexibility || '',
    headline: narrative.headline || '',
    exitStory: narrative.exit_story || '',
    superpowers: (narrative.superpowers || []).join('; '),
    roles: [...new Set(roles)].filter(Boolean),
  };
}

function buildApplicationText(profile, title = 'este cargo') {
  return `Hola:

Me interesa postular a ${title}. Estoy orientando mi carrera hacia programacion en el area TI y cuento con base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion y manejo de datos.

Mis proyectos principales son AMILAB Frontend, AMILAB Backend, Inventario App y Exelcior Apolo. En ellos he trabajado con frontend, backend serverless, Firebase/Firestore, SQL, generacion de reportes, validaciones, tests y automatizacion de procesos.

Ademas, mi experiencia previa en laboratorio clinico y logistica me dio disciplina con datos, trazabilidad, documentacion, inventario y trabajo con usuarios reales. Esa combinacion me ayuda a entender procesos operativos y convertirlos en soluciones digitales utiles.

Quedo atento.
${profile.fullName}`;
}

async function safeClick(locator, timeout = 2500) {
  try {
    const first = locator.first();
    if (!(await first.count())) return false;
    await first.scrollIntoViewIfNeeded({ timeout }).catch(() => {});
    await first.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function fillByLabelOrPlaceholder(page, patterns, value) {
  if (!value) return false;
  for (const pattern of patterns) {
    const locators = [
      page.getByLabel(pattern),
      page.getByPlaceholder(pattern),
      page.locator('input,textarea').filter({ hasText: pattern }),
    ];
    for (const locator of locators) {
      try {
        const field = locator.first();
        if (!(await field.count())) continue;
        const tag = await field.evaluate((node) => node.tagName.toLowerCase());
        if (tag !== 'input' && tag !== 'textarea') continue;
        const current = await field.inputValue({ timeout: 500 }).catch(() => '');
        if (!current || current.length < 4) await field.fill(value, { timeout: 1500 });
        return true;
      } catch {}
    }
  }
  return false;
}

async function fillVisibleForm(page, profile, title) {
  await fillByLabelOrPlaceholder(page, [/first name|nombre/i], profile.fullName.split(' ')[0] || profile.fullName);
  await fillByLabelOrPlaceholder(page, [/last name|apellido/i], profile.fullName.split(' ').slice(1).join(' '));
  await fillByLabelOrPlaceholder(page, [/full name|nombre completo/i], profile.fullName);
  await fillByLabelOrPlaceholder(page, [/email|correo/i], profile.email);
  await fillByLabelOrPlaceholder(page, [/phone|tel[eé]fono|celular|mobile/i], profile.phone);
  await fillByLabelOrPlaceholder(page, [/city|ciudad|location|ubicaci[oó]n/i], `${profile.city}, ${profile.country}`);
  await fillByLabelOrPlaceholder(page, [/linkedin/i], profile.linkedin);
  await fillByLabelOrPlaceholder(page, [/github/i], profile.github);
  await fillByLabelOrPlaceholder(page, [/portfolio|portafolio|website|sitio/i], profile.portfolio);
  await fillByLabelOrPlaceholder(
    page,
    [/salary|sueldo|renta|pretensi[oó]n/i],
    answerQuestion('pretension de renta liquida', profile) || profile.salary,
  );
  await fillByLabelOrPlaceholder(page, [/availability|disponibilidad/i], profile.availability);

  const message = buildApplicationText(profile, title);
  const textareas = page.locator('textarea');
  const textareaCount = await textareas.count().catch(() => 0);
  for (let i = 0; i < textareaCount; i += 1) {
    try {
      const field = textareas.nth(i);
      const current = await field.inputValue({ timeout: 500 }).catch(() => '');
      if (!current || current.length < 30) await field.fill(message, { timeout: 1500 });
    } catch {}
  }

  if (existsSync(cvPath)) {
    const fileInputs = page.locator('input[type="file"]');
    const fileCount = await fileInputs.count().catch(() => 0);
    for (let i = 0; i < fileCount; i += 1) {
      try {
        await fileInputs.nth(i).setInputFiles(cvPath);
      } catch {}
    }
  }

  await answerDynamicQuestions(page, profile, title);
}

async function stopBeforeFinalSubmit(page) {
  const finalButtons = page.getByRole('button', { name: finalSubmitText });
  if (await finalButtons.count().catch(() => 0)) {
    log('Final submit detected. Stopping here for manual review.');
    return true;
  }
  return false;
}

async function hasBlockingSignals(page) {
  const dialog = page.locator('.jobs-easy-apply-modal, [role="dialog"]').last();
  const text = await dialog.innerText({ timeout: 1000 }).catch(() => '');
  if (blockingText.test(text)) return 'blocking text detected';

  const requiredEmpty = await dialog.locator('input[required], textarea[required], select[required]').evaluateAll((fields) =>
    fields.filter((field) => {
      if (field.type === 'file') return !field.files?.length;
      if (field.tagName.toLowerCase() === 'select') return !field.value;
      if (field.type === 'checkbox' || field.type === 'radio') return false;
      return !field.value?.trim();
    }).length,
  ).catch(() => 0);
  if (requiredEmpty > 0) return `${requiredEmpty} required field(s) still empty`;

  return '';
}

async function maybeSubmitFinal(page) {
  const finalButton = page.getByRole('button', { name: finalSubmitText }).first();
  if (!(await finalButton.count().catch(() => 0))) return false;

  if (!autoSubmit) {
    log('Final submit detected. Stopping here for manual review.');
    return false;
  }

  const blocker = await hasBlockingSignals(page);
  if (blocker) {
    log(`Final submit skipped: ${blocker}. Waiting for manual review.`);
    return false;
  }

  const disabled = await finalButton.isDisabled().catch(() => false);
  if (disabled) {
    log('Final submit skipped: submit button is disabled.');
    return false;
  }

  await finalButton.click({ timeout: 3000 });
  await page.waitForTimeout(2500);
  log('Submitted application.');
  return true;
}

async function prepareEasyApply(page, profile, title) {
  await fillVisibleForm(page, profile, title);
  if (await maybeSubmitFinal(page)) return 'submitted';
  if (!autoAdvance) return 'prepared';

  for (let step = 0; step < 4; step += 1) {
    if (await maybeSubmitFinal(page)) return 'submitted';
    if (await stopBeforeFinalSubmit(page)) return 'review';
    const advanced = await safeClick(page.getByRole('button', { name: advanceText }), 2500);
    if (!advanced) return 'prepared';
    await page.waitForTimeout(1500);
    await fillVisibleForm(page, profile, title);
    if (await maybeSubmitFinal(page)) return 'submitted';
  }
  return 'prepared';
}

async function scrollJobResults(page) {
  const scrolled = await page.evaluate(() => {
    const selectors = [
      '.jobs-search-results-list',
      '.scaffold-layout__list',
      '.scaffold-layout__list-container',
      '[aria-label*="Jobs"]',
      '[aria-label*="Empleos"]',
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.scrollHeight > element.clientHeight) {
        element.scrollTop += Math.max(900, element.clientHeight);
        return true;
      }
    }
    const cards = document.querySelectorAll('.job-card-container, li.jobs-search-results__list-item, li.scaffold-layout__list-item');
    const last = cards[cards.length - 1];
    if (last) {
      last.scrollIntoView({ block: 'end', behavior: 'instant' });
      return true;
    }
    return false;
  }).catch(() => false);

  if (!scrolled) await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(2500);
}

async function main() {
  if (!existsSync(profilePath)) throw new Error(`Profile not found: ${profilePath}`);
  const profile = loadProfile();
  const query = queryOverride || profile.roles.slice(0, 3).join(' OR ') || 'Programador Junior';
  const location = locationOverride || `${profile.city}, ${profile.country}`;

  log('Opening visible browser with persistent session...');
  log(`LinkedIn query: ${query}`);
  log(`Location: ${location}`);
  log(`CV: ${existsSync(cvPath) ? cvPath : 'not found, upload skipped'}`);
  log(`AUTO_ADVANCE: ${autoAdvance ? 'on' : 'off'}`);
  log(`AUTO_SUBMIT: ${autoSubmit ? 'on' : 'off'}`);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1365, height: 900 },
  });

  const page = await context.newPage();
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

  log('Log in to LinkedIn in the visible browser if needed.');
  log('After login, this script will continue when LinkedIn feed/jobs is reachable.');

  for (let i = 0; i < 120; i += 1) {
    const url = page.url();
    if (/linkedin\.com\/(feed|jobs|in)\b/.test(url)) break;
    await page.waitForTimeout(1000);
  }

  const searchUrl = new URL('https://www.linkedin.com/jobs/search/');
  searchUrl.searchParams.set('keywords', query);
  searchUrl.searchParams.set('location', location);
  searchUrl.searchParams.set('f_AL', 'true');
  searchUrl.searchParams.set('sortBy', 'DD');
  await page.goto(searchUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  let prepared = 0;
  const seen = new Set();

  for (let round = 0; round < 8 && prepared < maxApplications; round += 1) {
    const cards = page.locator('.job-card-container, li.jobs-search-results__list-item, li.scaffold-layout__list-item');
    const count = await cards.count().catch(() => 0);
    log(`Round ${round + 1}: found ${count} job cards`);
    for (let i = 0; i < count && prepared < maxApplications; i += 1) {
      const card = cards.nth(i);
      const text = (await card.innerText({ timeout: 1000 }).catch(() => '')).trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);

      await safeClick(card, 3000);
      await page.waitForTimeout(2000);

      const title = (await page.locator('.jobs-unified-top-card__job-title, h1').first().innerText({ timeout: 1500 }).catch(() => 'este cargo')).trim();
      if (!titleFits(title)) {
        log(`Skipped by title filter: ${title}`);
        continue;
      }
      const easyApplyButton = page.getByRole('button', { name: applyText });
      if (!(await easyApplyButton.count().catch(() => 0))) {
        log(`Skipped without Easy Apply: ${title}`);
        continue;
      }

      const opened = await safeClick(easyApplyButton, 3000);
      if (!opened) continue;
      await page.waitForTimeout(2000);
      const result = await prepareEasyApply(page, profile, title);
      prepared += 1;
      log(`${result === 'submitted' ? 'Submitted' : 'Prepared'} ${prepared}/${maxApplications}: ${title}`);
    }

    await scrollJobResults(page);
  }

  log(`Prepared ${prepared} LinkedIn Easy Apply process(es).`);
  log(autoSubmit
    ? 'Auto-submit was enabled. Review the log for submitted and skipped applications.'
    : 'Review every open modal/tab manually. The script never clicks final submit.');
  log('Leave this process open while you review. Press Ctrl+C in this terminal when done.');
  await new Promise(() => {});
}

main().catch((error) => {
  appendFileSync(logPath, `[${new Date().toISOString()}] ERROR ${error.stack || error.message || error}\n`, 'utf8');
  console.error(error);
  process.exit(1);
});
