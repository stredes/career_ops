import { chromium } from 'playwright';
import { appendFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const logPath = resolve(ROOT, 'output/computrabajo-url-apply.log');
const autoSubmit = process.env.AUTO_SUBMIT_COMPUTRABAJO !== '0';
const autoAnswerQuestions = process.env.AUTO_ANSWER_COMPUTRABAJO_QUESTIONS === '1';
const urls = (process.env.COMPUTRABAJO_URLS || process.argv.slice(2).join('\n'))
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

function answer(question) {
  const q = normalize(question);
  if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
  if (/itil/.test(q)) return 'Tengo conocimiento basico de practicas ITIL para registro, priorizacion, seguimiento y escalamiento de incidentes. No cuento con certificacion ITIL vigente.';
  if (/microinformatica|hardware|software|redes basicas|redes b[aá]sicas/.test(q)) return 'Experiencia junior/en formacion en microinformatica: soporte a usuarios, sistemas operativos, software administrativo, revision inicial de hardware, redes basicas, documentacion y escalamiento.';
  if (/renovacion tecnologica|renovaci[oó]n tecnol[oó]gica|pcs|servidores/.test(q)) return 'He participado a nivel de apoyo junior en soporte, revision y configuracion basica de equipos, documentacion y seguimiento de casos. Puedo apoyar proyectos de renovacion tecnologica bajo procedimientos definidos.';
  if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No cuento actualmente con zapatos de seguridad.';
  if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No cuento con vehiculo propio; puedo coordinar traslado segun ubicacion y horario.';
  if (/pretensiones de renta|pretensi|renta|sueldo/.test(q)) {
    return 'Mis pretensiones de renta estan en torno a $900.000 CLP liquidos, conversable segun modalidad, beneficios y proyeccion.';
  }
  if (/comuna de residencia|residencia|comuna/.test(q)) {
    return 'Santiago, Region Metropolitana.';
  }
  if (/titulo profesional|t[ií]tulo profesional|formacion|formaci[oó]n|estudios/.test(q)) {
    return 'Estudiante de Analista Programador en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
  }
  if (/numero de contacto|n[uú]mero de contacto|correo electronico|correo electr[oó]nico|telefono|tel[eé]fono|contacto/.test(q)) {
    return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
  }
  if (/experiencia reciente|funciones desempenadas|funciones desempeñadas|anos de experiencia|a[nñ]os de experiencia/.test(q)) {
    return 'Tengo experiencia practica reciente en desarrollo web mediante proyectos propios y academicos. He trabajado con React, TypeScript, JavaScript, APIs REST, SQL, validaciones, documentacion, Git/GitHub y pruebas funcionales basicas. Mi experiencia laboral formal en TI aun es junior/en formacion, pero cuento con proyectos concretos y buena base para aprender rapido.';
  }
  if (/python.*entornos laborales|anos.*python/.test(q)) {
    return 'Tengo experiencia practica con Python en proyectos propios y academicos durante mi formacion como Analista Programador, especialmente en automatizacion, manejo de datos, reportes, SQL y aplicaciones de escritorio. No cuento con 2 anos laborales formales dedicados exclusivamente a Python, pero si con proyectos concretos como Inventario App y Exelcior Apolo, y buena base para aprender rapido.';
  }
  if (/soporte|cargo|experiencia/.test(q)) {
    return 'Tengo experiencia en soporte a usuarios, uso de sistemas operativos/administrativos, documentacion de incidencias, seguimiento de casos, manejo de datos y coordinacion con equipos operativos. Como Analista Programador en formacion tengo base en SQL, Python, Git/GitHub, APIs y resolucion de problemas tecnicos.';
  }
  if (/disponibilidad/.test(q)) return 'Disponibilidad inmediata.';
  if (/ingles|english/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
  return '';
}

async function clickText(page, regex) {
  return page.evaluate((source) => {
    const pattern = new RegExp(source, 'i');
    const items = [...document.querySelectorAll('a,button,input[type=button],input[type=submit]')];
    const candidates = items.filter((element) => {
      const text = (element.textContent || element.value || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const visible = getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && !!element.getClientRects().length;
      return visible && pattern.test(text);
    });
    const item = candidates.at(-1);
    if (!item) return '';
    item.scrollIntoView({ block: 'center' });
    item.click();
    return item.textContent || item.value || '';
  }, regex.source).catch(() => '');
}

function offerIdFromUrl(url) {
  return String(url || '').match(/[A-F0-9]{32}/i)?.[0]?.toUpperCase() || '';
}

async function resolveComputrabajoOffer(page, offerId) {
  if (!offerId) return '';
  return page.evaluate((id) => {
    const upperId = id.toUpperCase();
    const visible = (element) => getComputedStyle(element).display !== 'none'
      && getComputedStyle(element).visibility !== 'hidden'
      && !!element.getClientRects().length;
    const applyControl = [...document.querySelectorAll('a,button,input[type=button],input[type=submit]')]
      .find((element) => {
        const raw = `${element.getAttribute('data-href-offer-apply') || ''} ${element.href || ''}`.toUpperCase();
        return raw.includes(upperId) && visible(element);
      });
    if (applyControl) {
      const target = applyControl.getAttribute('data-href-offer-apply');
      if (target) {
        location.href = target;
        return `apply-url:${target}`;
      }
      applyControl.scrollIntoView({ block: 'center' });
      applyControl.click();
      return 'apply-click';
    }

    const offerLink = [...document.querySelectorAll('a[href]')]
      .find((element) => element.href.toUpperCase().includes(upperId) && visible(element));
    if (offerLink) {
      offerLink.scrollIntoView({ block: 'center' });
      offerLink.click();
      return `offer-link:${offerLink.href}`;
    }

    const recover = [...document.querySelectorAll('a,button,input[type=button],input[type=submit]')]
      .find((element) => /Recuperar oferta|Mostrar oferta/i.test(element.textContent || element.value || '') && visible(element));
    if (recover) {
      recover.scrollIntoView({ block: 'center' });
      recover.click();
      return 'recover-click';
    }
    return '';
  }, offerId).catch(() => '');
}

async function fillVisibleTextareas(page, pageText) {
  return page.evaluate((pageText) => {
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const answer = (question) => {
      const q = normalize(`${question} ${pageText.slice(0, 1600)}`);
      if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
      if (/itil/.test(q)) return 'Tengo conocimiento basico de practicas ITIL para registro, priorizacion, seguimiento y escalamiento de incidentes. No cuento con certificacion ITIL vigente.';
      if (/microinformatica|hardware|software|redes basicas|redes b[aá]sicas/.test(q)) return 'Experiencia junior/en formacion en microinformatica: soporte a usuarios, sistemas operativos, software administrativo, revision inicial de hardware, redes basicas, documentacion y escalamiento.';
      if (/renovacion tecnologica|renovaci[oó]n tecnol[oó]gica|pcs|servidores/.test(q)) return 'He participado a nivel de apoyo junior en soporte, revision y configuracion basica de equipos, documentacion y seguimiento de casos. Puedo apoyar proyectos de renovacion tecnologica bajo procedimientos definidos.';
      if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No cuento actualmente con zapatos de seguridad.';
      if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No cuento con vehiculo propio; puedo coordinar traslado segun ubicacion y horario.';
      if (/pretensiones de renta|pretensi|renta|sueldo/.test(q)) return 'Mis pretensiones de renta estan en torno a $900.000 CLP liquidos, conversable segun modalidad, beneficios y proyeccion.';
      if (/comuna de residencia|residencia|comuna/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/titulo profesional|t[ií]tulo profesional|formacion|formaci[oó]n|estudios/.test(q)) return 'Estudiante de Analista Programador en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
      if (/numero de contacto|n[uú]mero de contacto|correo electronico|correo electr[oó]nico|telefono|tel[eé]fono|contacto/.test(q)) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
      if (/experiencia reciente|funciones desempenadas|funciones desempeñadas|anos de experiencia|a[nñ]os de experiencia/.test(q)) return 'Tengo experiencia practica reciente en desarrollo web mediante proyectos propios y academicos. He trabajado con React, TypeScript, JavaScript, APIs REST, SQL, validaciones, documentacion, Git/GitHub y pruebas funcionales basicas. Mi experiencia laboral formal en TI aun es junior/en formacion, pero cuento con proyectos concretos y buena base para aprender rapido.';
      if (/python.*entornos laborales|anos.*python/.test(q)) return 'Tengo experiencia practica con Python en proyectos propios y academicos durante mi formacion como Analista Programador, especialmente en automatizacion, manejo de datos, reportes, SQL y aplicaciones de escritorio. No cuento con 2 anos laborales formales dedicados exclusivamente a Python, pero si con proyectos concretos como Inventario App y Exelcior Apolo, y buena base para aprender rapido.';
      if (/soporte|cargo|experiencia/.test(q)) return 'Tengo experiencia en soporte a usuarios, uso de sistemas operativos/administrativos, documentacion de incidencias, seguimiento de casos, manejo de datos y coordinacion con equipos operativos. Como Analista Programador en formacion tengo base en SQL, Python, Git/GitHub, APIs y resolucion de problemas tecnicos.';
      return '';
    };
    let filled = 0;
    for (const area of [...document.querySelectorAll('textarea')]) {
      if (area.value.trim()) continue;
      const visible = getComputedStyle(area).display !== 'none' && getComputedStyle(area).visibility !== 'hidden' && !!area.getClientRects().length;
      if (!visible) continue;
      const parent = area.closest('label, div, section, fieldset')?.textContent || document.body.innerText;
      const value = answer(parent).slice(0, 500);
      if (!value) continue;
      area.value = value;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      area.dispatchEvent(new Event('change', { bubbles: true }));
      filled += 1;
    }
    return filled;
  }, pageText).catch(() => 0);
}

async function fillComputrabajoQuestions(page) {
  return page.evaluate(() => {
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const setValue = (field, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(field, value);
      else field.value = value;
      for (const eventName of ['input', 'change', 'keyup', 'blur']) {
        field.dispatchEvent(new Event(eventName, { bubbles: true }));
      }
    };
    const labelFor = (field) => {
      const explicit = field.getAttribute('aria-label') || field.getAttribute('placeholder') || '';
      const block = field.closest('li, .form-group, .mb20, .question, section, fieldset, div');
      return (explicit || block?.innerText || '')
        .replace(/\s+/g, ' ')
        .replace(/\(m[aá]ximo .*?caracteres\)/i, '')
        .trim();
    };
    const risky = (label) => /discapacidad|compin|antecedentes|background|visa|patrocinio|honorarios|eirl|licencia de conducir|vehiculo propio|zapatos de seguridad|traslado inmediato|movilizacion propia|senior|5 anos|5 a[nñ]os|3 anos profesionales|3 a[nñ]os profesionales/.test(normalize(label));
    const answerFor = (label) => {
      const q = normalize(label);
      if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
      if (/itil/.test(q)) return 'Tengo conocimiento basico de practicas ITIL para registro, priorizacion, seguimiento y escalamiento de incidentes. No cuento con certificacion ITIL vigente.';
      if (/microinformatica|hardware|software|redes basicas|redes b[aá]sicas/.test(q)) return 'Experiencia junior/en formacion en microinformatica: soporte a usuarios, sistemas operativos, software administrativo, revision inicial de hardware, redes basicas, documentacion y escalamiento.';
      if (/renovacion tecnologica|renovaci[oó]n tecnol[oó]gica|pcs|servidores/.test(q)) return 'He participado a nivel de apoyo junior en soporte, revision y configuracion basica de equipos, documentacion y seguimiento de casos. Puedo apoyar proyectos de renovacion tecnologica bajo procedimientos definidos.';
      if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No cuento actualmente con zapatos de seguridad.';
      if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No cuento con vehiculo propio; puedo coordinar traslado segun ubicacion y horario.';
      if (/numero de contacto|contacto|correo|telefono/.test(q)) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
      if (/pretensiones de renta|pretensi|renta|sueldo/.test(q)) return 'Mis pretensiones de renta estan en torno a $900.000 CLP liquidos, conversable segun modalidad, beneficios y proyeccion.';
      if (/comuna de residencia|residencia|comuna/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/titulo profesional|formacion academica|formacion|estudios/.test(q)) return 'Estudiante de Analista Programador en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
      if (/power automate/.test(q)) return 'He usado Power Automate a nivel basico/en aprendizaje. Mi experiencia principal en automatizacion ha sido con Python, scripts, validaciones de datos y flujos con Excel. Puedo adaptarme a Power Automate y aplicar la misma logica de procesos, condiciones y seguimiento.';
      if (/azure ai foundry|azure/.test(q)) return 'No cuento con experiencia laboral directa en Azure AI Foundry. Si tengo base en IA aplicada, APIs, automatizacion y proyectos con Python/JavaScript. Estoy disponible para aprender la herramienta y aportar desde mi base tecnica junior.';
      if (/python.*scripting|python.*automatizaci|python.*integraci|python.*apis|python/.test(q)) return 'Si, tengo experiencia practica con Python en proyectos academicos y propios para automatizacion, scripting, manejo de datos, reportes, SQL e integracion con APIs. Destaco Inventario App y Exelcior Apolo, donde use Python para procesos, validaciones y generacion de reportes.';
      if (/ingles|english/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
      if (/experiencia reciente|funciones desempenadas|anos de experiencia|experiencia en el cargo|cargo/.test(q)) return 'Estoy orientando mi carrera a desarrollo e IA como Analista Programador en formacion. Tengo proyectos practicos con Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, documentacion y validaciones. Mi experiencia laboral formal en TI aun es junior/en formacion, pero cuento con proyectos concretos y aprendizaje rapido.';
      if (/soporte|mesa de ayuda|usuario/.test(q)) return 'Tengo experiencia en soporte a usuarios, uso de sistemas operativos/administrativos, documentacion de incidencias, seguimiento de casos, manejo de datos y coordinacion con equipos operativos. Como Analista Programador en formacion tengo base en SQL, Python, Git/GitHub, APIs y resolucion de problemas tecnicos.';
      return 'Estoy orientando mi carrera al area TI como Analista Programador en formacion. Cuento con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion y documentacion.';
    };

    const result = { filled: [], paused: [] };
    for (const field of [...document.querySelectorAll('textarea')]) {
      const visible = getComputedStyle(field).display !== 'none'
        && getComputedStyle(field).visibility !== 'hidden'
        && !!field.getClientRects().length;
      if (!visible) continue;
      const label = labelFor(field);
      const knownSensitive = /licencia.*clase b|clase b|licencia de conducir|zapatos? de seguridad|calzado de seguridad|vehiculo propio|movilizacion propia|transporte propio|itil|microinformatica|hardware|software|redes basicas|redes b[aá]sicas|renovacion tecnologica|renovaci[oó]n tecnol[oó]gica|pcs|servidores/.test(normalize(label));
      if (risky(label) && !knownSensitive) {
        result.paused.push(label);
        continue;
      }
      const value = answerFor(label).slice(0, 500);
      if (!value) {
        result.paused.push(`unrecognized: ${label}`);
        continue;
      }
      setValue(field, value);
      result.filled.push({ label, value });
    }
    return result;
  }).catch((error) => ({ filled: [], paused: [`fill-error: ${error.message || error}`] }));
}

async function extractComputrabajoQuestions(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\(m[aÃ¡]ximo .*?caracteres\)/i, '')
      .trim();
    const fields = [...document.querySelectorAll('textarea, input[type=radio]')]
      .filter((field) => getComputedStyle(field).display !== 'none'
        && getComputedStyle(field).visibility !== 'hidden'
        && !!field.getClientRects().length);
    const seen = new Set();
    const questions = [];
    for (const field of fields) {
      const block = field.closest('li, .form-group, .mb20, .question, section, fieldset, div');
      const label = clean(block?.innerText || field.getAttribute('aria-label') || field.getAttribute('placeholder') || '');
      if (!label || seen.has(label)) continue;
      seen.add(label);
      questions.push(label);
    }
    return questions;
  }).catch(() => []);
}

async function submitOne(context, url) {
  const offerId = offerIdFromUrl(url);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500);
  for (let i = 0; i < 3; i += 1) {
    const resolved = await resolveComputrabajoOffer(page, offerId);
    if (!resolved) break;
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    if (/Preguntas de selecci|Te postulaste correctamente|Postularme|Enviar mi CV/i.test(body)) break;
  }
  let text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  const role = (text.match(/\n([^\n]+)\n\n[^ \n].+\n\n[^ \n].+\n\nPostularme/) || text.match(/\n([^\n]+)\n\n[^ \n]+,\s*R\.Metropolitana/) || [])[1]?.trim()
    || (await page.title().catch(() => 'Computrabajo'));
  const company = (text.match(/\n([^\n]+)\n\n[^ \n]+,\s*R\.Metropolitana/) || [])[1]?.trim() || 'Computrabajo';

  if (/oferta ya no esta disponible|ya no esta disponible/i.test(text)) {
    return { status: 'skipped', reason: 'closed', role, company, url: page.url() };
  }

  await clickText(page, /Postularme|Postular/);
  await page.waitForTimeout(2500);
  text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  if (/Preguntas de selecci/i.test(text) && !autoAnswerQuestions) {
    const questions = await extractComputrabajoQuestions(page);
    return { status: 'paused', reason: 'questions require manual reading', role, company, url: page.url(), questions };
  }
  const filledQuestions = await fillComputrabajoQuestions(page);
  if (filledQuestions.paused?.length) {
    return { status: 'paused', reason: `needs review: ${filledQuestions.paused.join(' | ')}`, role, company, url: page.url() };
  }
  await page.waitForTimeout(800);

  if (!autoSubmit) return { status: 'prepared', reason: 'autoSubmit off', role, company, url: page.url() };
  const sentClick = await page.evaluate(() => {
    const item = document.querySelector('[data-apply-ac-kq]') || [...document.querySelectorAll('a,button,input')].find((element) => /Enviar mi CV|Postularme/i.test(element.textContent || element.value || ''));
    if (!item) return '';
    item.scrollIntoView({ block: 'center' });
    item.click();
    return item.textContent || item.value || 'clicked';
  }).catch(() => '');

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(6000);
  const after = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  if (/error al realizar la postulaci/i.test(after)) return { status: 'paused', reason: 'platform error', role, company, url: page.url() };
  if (/Te postulaste correctamente|¡Enhorabuena! Te postulaste con éxito|Tu CV está a la espera de revisión|Tu CV ya está en manos/i.test(after)) {
    return { status: 'submitted', reason: `confirmation: ${sentClick.trim()}`, role, company, url: page.url() };
  }
  return { status: 'paused', reason: 'no confirmation', role, company, url: page.url() };
}

async function main() {
  if (!urls.length) throw new Error('Usage: node output/computrabajo-url-apply.mjs <url> [more urls...]');
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const results = [];
  for (const url of urls) {
    log(`Computrabajo apply: ${url}`);
    const result = await submitOne(context, url);
    log(`${result.status}: ${result.company} - ${result.role} (${result.reason})`);
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
  // Keep the shared CDP browser/session alive for the next application batch.
  process.exit(0);
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});
