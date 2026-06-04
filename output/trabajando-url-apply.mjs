import { chromium } from 'playwright';
import { appendFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const logPath = resolve(ROOT, 'output/trabajando-url-apply.log');
const autoSubmit = process.env.AUTO_SUBMIT_TRABAJANDO !== '0';
const urls = (process.env.TRABAJANDO_URLS || process.argv.slice(2).join('\n'))
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean);

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function answer(question, pageText = '') {
  const q = normalize(`${question} ${pageText.slice(0, 1200)}`);
  if (/renta|sueldo|pretensi|expectativa/.test(q)) {
    return 'Mis pretensiones de renta liquida estan en torno a $900.000 CLP, conversable segun beneficios, condiciones del cargo, aprendizaje y proyeccion dentro del equipo.';
  }
  if (/providencia|presencial|disponibilidad.*trabajar|comuna/.test(q)) {
    return 'Si, tengo disponibilidad para trabajar presencialmente en Providencia, RM. Puedo coordinar traslado dentro de Santiago y adaptarme a la modalidad indicada para el cargo.';
  }
  if (/qa|prueba|testing|automatizaci/.test(q)) {
    return 'Tengo experiencia practica en pruebas y validaciones desde proyectos propios y academicos. En AMILAB Frontend/Backend trabaje con validaciones, endpoints REST, TypeScript, Zod, logging y pruebas; en Inventario App y Exelcior Apolo realice validaciones de datos, reportes, flujos automatizados y revision de resultados. Manejo conceptos de pruebas funcionales, documentacion de defectos, Postman/APIs, SQL basico-intermedio y automatizacion con Python. Selenium lo manejo a nivel basico/en aprendizaje.';
  }
  if (/programaci|desarrollo|codigo|lenguaje|java|python|javascript|typescript|react|sql/.test(q)) {
    return 'He desarrollado proyectos practicos con Python, JavaScript, TypeScript, React, SQL y APIs REST. AMILAB Frontend usa React, TypeScript y Vite; AMILAB Backend usa TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, validaciones y tests. Inventario App esta desarrollado en Python con SQLite/PostgreSQL, reportes PDF y arquitectura por capas. Tambien manejo Git/GitHub para versionamiento y documentacion.';
  }
  if (/formacion|profesional|estudios|experiencia.*cargo|funciones similares/.test(q)) {
    return 'Actualmente curso Analista Programador en Duoc UC y soy titulado de Tecnico en Laboratorio Clinico y Banco de Sangre. Estoy orientando mi carrera al area TI, con base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, testing, documentacion y automatizacion. Mi experiencia previa en laboratorio clinico y logistica me aporta orden, trazabilidad, control de calidad, manejo de registros y trabajo con procesos regulados.';
  }
  if (/soporte|ticket|usuario|mesa/.test(q)) {
    return 'Tengo experiencia en soporte a usuarios, uso de sistemas operativos/administrativos, documentacion de incidencias, seguimiento de casos, manejo de datos y coordinacion con equipos operativos. Como Analista Programador en formacion, tengo base en SQL, Python, Git/GitHub, APIs y resolucion de problemas tecnicos.';
  }
  return 'Estoy orientando mi carrera al area TI como Analista Programador en formacion. Cuento con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion y documentacion. Mi experiencia previa en laboratorio y logistica me aporta orden, trazabilidad y criterio para trabajar con procesos reales.';
}

async function controls(page) {
  return page.evaluate(() => [...document.querySelectorAll('button,a,input[type=submit],input[type=button]')]
    .map((element, i) => ({
      i,
      text: (element.textContent || element.value || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
      visible: getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && !!element.getClientRects().length,
    }))
    .filter((item) => item.visible));
}

async function clickVisible(page, regex) {
  return page.evaluate((source) => {
    const pattern = new RegExp(source, 'i');
    const items = [...document.querySelectorAll('button,a,input[type=submit],input[type=button]')];
    const item = items.find((element) => {
      const text = (element.textContent || element.value || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const visible = getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && !!element.getClientRects().length;
      return visible && pattern.test(text);
    });
    if (!item) return '';
    item.scrollIntoView({ block: 'center' });
    item.click();
    return item.textContent || item.value || '';
  }, regex.source).catch(() => '');
}

async function submitOne(context, url) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  let text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  const role = (text.match(/\n([^\n]+)\nPublicada hace/) || text.match(/Estás postulando a\n([^\n]+)/) || [])[1]?.trim()
    || (await page.title().catch(() => 'Trabajando'));
  const company = (text.match(/Publicada hace [^\n]+ por\n([^\n]+)/) || text.match(/\n([^\n]+)\n1 Vacante/) || [])[1]?.trim() || 'Trabajando';

  if (/oferta de empleo no disponible|dejo de recibir postulantes/i.test(text)) {
    return { status: 'skipped', reason: 'closed', role, company, url: page.url() };
  }
  if (/has postulado|ya postulaste|mis postulaciones/i.test(text) && /Revisa el estado|Has postulado/i.test(text)) {
    return { status: 'submitted', reason: 'already/confirmation', role, company, url: page.url() };
  }

  await clickVisible(page, /^Postular$/);
  await page.waitForTimeout(2500);
  text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');

  const areas = await page.locator('textarea').all();
  for (let i = 0; i < areas.length; i += 1) {
    const area = areas[i];
    const current = await area.inputValue().catch(() => '');
    if (current.trim()) continue;
    const question = await area.evaluate((node) => {
      const parent = node.closest('label, div, section, fieldset')?.textContent || '';
      return parent.replace(/\s+/g, ' ').trim();
    }).catch(() => '');
    await area.fill(answer(question, text), { timeout: 3000 }).catch(() => {});
  }

  if (!autoSubmit) return { status: 'prepared', reason: 'autoSubmit off', role, company, url: page.url() };
  const clicked = await clickVisible(page, /^Postular$|Enviar|Finalizar/);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(4500);
  const after = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  if (/has postulado al empleo|postulacion enviada|postulaste|mis postulaciones/i.test(after)) {
    return { status: 'submitted', reason: `confirmation: ${clicked.trim()}`, role, company, url: page.url() };
  }
  return { status: 'paused', reason: 'no confirmation', role, company, url: page.url(), controls: await controls(page) };
}

async function main() {
  if (!urls.length) throw new Error('Usage: node output/trabajando-url-apply.mjs <url> [more urls...]');
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const results = [];
  for (const url of urls) {
    log(`Trabajando apply: ${url}`);
    const result = await submitOne(context, url);
    log(`${result.status}: ${result.company} - ${result.role} (${result.reason})`);
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
  // Keep the shared CDP browser/session alive for the next application batch.
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});
