import { chromium } from 'playwright';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  adaptAnswerToQuestion,
  findSimilarQuestionAnswer,
  recordApplicationQuestions,
} from './application-question-bank.mjs';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const logPath = resolve(ROOT, 'output/getonboard-url-apply.log');
const cvPath = resolve(process.env.CV_PATH || 'C:/Users/bodega 1/Downloads/Gian_Lucas_San_Martin_Agurto_CV_Tech.pdf_2026_6_5.pdf');
const urls = process.argv.slice(2).filter(Boolean);

const profile = {
  email: 'gianlucassanmartin@gmail.com',
  phone: '+56954764325',
  github: 'https://github.com/stredes',
  linkedin: 'https://www.linkedin.com/in/gian-lucas-san-martin-49ab29323/',
};

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function norm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
}

async function labelOf(locator) {
  return locator.evaluate((node) => {
    const id = node.id;
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const blocks = [];
    for (let item = node.closest('label, fieldset, .form-group, .field, div, section'); item && blocks.length < 3; item = item.parentElement) {
      const text = item.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (text && text.length < 900) blocks.push(text);
    }
    return [node.getAttribute('aria-label'), node.getAttribute('placeholder'), label?.textContent, ...blocks]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }).catch(() => '');
}

function expectedKind(question, fallback = 'text') {
  const q = norm(question);
  if (/selecciona una opcion|select an option|yes\s+no|si\s+no|s[ií]\s+no/.test(q)) return 'select';
  if (/cuantos anos|cuantos años|cuanto tiempo|anos de experiencia|años de experiencia|tiempo de experiencia|how many years|years of|nivel.*1.*6|1.*6|a1.*c2|c2/.test(q)) return 'number';
  if (/(sueldo|salario|renta|pretension|expectativa|remuneracion|salary)/.test(q) && /(usd|dolares|dolares|\$|numero|number|indique|ingrese)/.test(q)) return 'number';
  if (/telefono|phone|celular|email|correo|github|linkedin|rut|comuna|ciudad|location|ubicacion/.test(q)) return 'short';
  return fallback;
}

function yesNoFor(question) {
  const q = norm(question);
  if (/residencia legal.*chile|vive en chile|trabajar en chile|visa.*chile/.test(q)) return 'Si';
  if (/licencia.*clase b|clase b/.test(q)) return 'Si';
  if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No';
  if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No';
  if (/discapacidad|compin|pension de invalidez|ley 21\.015/.test(q)) return 'No';
  if (/gcp|google cloud|bigquery|databricks|spark|salesforce|sap|pentaho|kettle|oracle avanzado|java 8|spring|\.net|c#|kubernetes|docker avanzado/.test(q)) return 'No';
  if (/retail|comercio exterior|rubro bancario/.test(q)) return 'No';
  if (/react|typescript|javascript|python|sql|api|rest|git|github|linux|debian|arch|automatizacion|frontend|front-end|datos|qa|testing/.test(q)) return 'Si';
  if (/hibrid|presencial|santiago|las condes|providencia|remoto/.test(q)) return 'Si';
  if (/ingles|english/.test(q)) return 'Si';
  return '';
}

function numberFor(question) {
  const q = norm(question);
  if (/usd|dolares|dolares/.test(q) && /(sueldo|salario|renta|pretension|expectativa|remuneracion|salary)/.test(q)) return '900';
  if (/(sueldo|salario|renta|pretension|expectativa|remuneracion|salary)/.test(q)) return '900000';
  if (/nivel.*ingles|ingles.*1.*6|english.*1.*6|a1.*c2|c2/.test(q)) return '2';
  if (/gcp|google cloud|bigquery|databricks|spark|salesforce|sap|pentaho|kettle|java 8|spring|\.net|c#|kubernetes|docker avanzado|oracle avanzado/.test(q)) return '0';
  if (/python|typescript|javascript|react|sql|api|rest|git|github|linux|debian|arch|bash|automatizacion|frontend|front-end|datos|qa|testing/.test(q)) return '1';
  return '1';
}

function coverLetter() {
  return `Me interesa postular porque el rol conecta con mi perfil de Analista Programador en formacion y mi experiencia practica en proyectos activos. Actualmente trabajo con Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, Git/GitHub, Arch Linux y Debian. Mantengo proyectos como Exelcior Apolo para automatizacion de Excel, AMILAB Frontend/Backend para desarrollo web y datos, Inventario App para control de stock/reportes, y una app movil para HC Soluciones. Busco aportar como perfil junior en crecimiento, con aprendizaje rapido, responsabilidad, documentacion y foco en resolver problemas reales.`;
}

function answerFor(question, pageText, kind = 'text') {
  const q = norm(`${question} ${pageText}`);
  const shape = expectedKind(question, kind);
  if (shape === 'number') return numberFor(question);
  if (shape === 'select') return yesNoFor(question);
  if (/dolares|usd/.test(q) && /(sueldo|salario|renta|expectativa|salary)/.test(q)) return '900';
  if (/(sueldo|salario|renta|pretension|expectativa|remuneracion|salary)/.test(q)) return '900000';
  if (/rut/.test(q)) return '19921351-2';
  if (/telefono|phone|celular/.test(q)) return profile.phone;
  if (/email|correo/.test(q)) return profile.email;
  if (/linkedin/.test(q)) return profile.linkedin;
  if (/github|git repo|repositorio/.test(q)) return profile.github;
  if (/comuna|ciudad|ubicacion|location/.test(q)) return 'Santiago, Region Metropolitana.';
  if (/titulo|formacion|estudios|academica/.test(q)) return 'Analista Programador en formacion en Duoc UC, orientado a desarrollo de software, automatizacion y datos.';
  if (/disponibilidad/.test(q)) return 'Disponibilidad inmediata o segun coordinacion.';
  if (/ingles|english/.test(q)) return 'Ingles basico-intermedio; puedo leer documentacion tecnica y defender conversaciones simples.';
  if (/hibrid|presencial|remoto|modalidad/.test(q)) return 'Tengo disponibilidad para modalidad hibrida en Santiago si la ubicacion y horarios son coordinables.';

  const remembered = findSimilarQuestionAnswer(question, { platform: 'Get on Board' });
  if (remembered?.answer) return adaptAnswerToQuestion(question, remembered.answer);

  if (/java|spring/.test(q)) return 'Tengo base de programacion y desarrollo backend junior, pero mi experiencia practica principal esta en Python, JavaScript, TypeScript, React, SQL y APIs REST. Puedo reforzar Java/Spring si el equipo lo requiere.';
  if (/\.net|c#|angular/.test(q)) return 'Mi experiencia practica principal esta en TypeScript, React, Python, SQL y APIs REST. No me presento como senior en .NET/Angular, pero tengo buena base para aprender rapido y aportar como perfil junior en crecimiento.';
  if (/python|automatiz|api|rest/.test(q)) return 'Tengo experiencia practica en Python, automatizacion, SQL, reportes y APIs REST mediante proyectos activos como Exelcior Apolo, Inventario App, AMILAB Frontend/Backend y una app movil para HC Soluciones.';
  if (/react|frontend|front-end|typescript|javascript/.test(q)) return 'Tengo experiencia practica con React, TypeScript, JavaScript, Vite, consumo de APIs, validaciones, Git/GitHub y documentacion mediante proyectos activos como AMILAB Frontend y AMILAB Backend.';
  if (/sql|base de datos|database|datos/.test(q)) return 'Tengo base practica en SQL, SQLite/PostgreSQL, Firebase/Firestore, modelado simple, consultas, reportes y manejo de datos en proyectos como Inventario App y AMILAB.';
  if (/motiva|interesa|por que|porque|cover|carta|razon/.test(q)) return coverLetter();
  return coverLetter();
}

async function setValue(locator, value) {
  await locator.fill(value, { timeout: 1200 }).catch(() => {});
  await locator.evaluate((node, nextValue) => {
    const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(node, nextValue);
    else node.value = nextValue;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    node.dispatchEvent(new Event('blur', { bubbles: true }));
  }, value).catch(() => {});
}

async function clickText(page, patterns) {
  return page.evaluate((sources) => {
    const regexes = sources.map((source) => new RegExp(source, 'i'));
    const items = [...document.querySelectorAll('a,button,input[type="button"],input[type="submit"],[role="button"]')];
    for (const item of items) {
      const text = [item.textContent, item.value, item.getAttribute('aria-label')]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      const style = getComputedStyle(item);
      if (style.display === 'none' || style.visibility === 'hidden' || !item.getClientRects().length) continue;
      if (!regexes.some((regex) => regex.test(text))) continue;
      item.scrollIntoView({ block: 'center' });
      item.click();
      return text;
    }
    return '';
  }, patterns.map((pattern) => pattern.source)).catch(() => '');
}

async function fillForm(page) {
  const text = await bodyText(page);
  const answers = [];

  const textareas = page.locator('textarea');
  for (let i = 0, count = await textareas.count().catch(() => 0); i < count; i += 1) {
    const field = textareas.nth(i);
    const current = await field.inputValue({ timeout: 300 }).catch(() => '');
    if (current.trim().length >= 40) continue;
    const label = await labelOf(field);
    const answer = answerFor(label, text, 'text');
    await setValue(field, answer);
    answers.push({ question: label, answer, fieldType: 'textarea' });
  }

  const editors = page.locator('[contenteditable="true"]');
  for (let i = 0, count = await editors.count().catch(() => 0); i < count; i += 1) {
    const editor = editors.nth(i);
    const current = (await editor.innerText({ timeout: 300 }).catch(() => '')).trim();
    if (current.length >= 40) continue;
    const label = await labelOf(editor);
    const answer = answerFor(label, text, 'text');
    await editor.click({ timeout: 1000 }).catch(() => {});
    await page.keyboard.press('Control+A').catch(() => {});
    await page.keyboard.insertText(answer).catch(() => {});
    answers.push({ question: label, answer, fieldType: 'contenteditable' });
  }

  const inputs = page.locator('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])');
  for (let i = 0, count = await inputs.count().catch(() => 0); i < count; i += 1) {
    const input = inputs.nth(i);
    const current = await input.inputValue({ timeout: 300 }).catch(() => '');
    if (current.trim()) continue;
    const label = await labelOf(input);
    if (!label) continue;
    const answer = answerFor(label, text, 'short');
    await setValue(input, answer);
    answers.push({ question: label, answer, fieldType: 'input' });
  }

  const selects = page.locator('select');
  for (let i = 0, count = await selects.count().catch(() => 0); i < count; i += 1) {
    const select = selects.nth(i);
    const current = await select.inputValue({ timeout: 300 }).catch(() => '');
    if (current) continue;
    const rawLabel = await labelOf(select);
    const label = norm(rawLabel);
    const options = await select.locator('option').evaluateAll((items) => items.map((o) => ({ value: o.value, text: o.textContent?.trim() || '' }))).catch(() => []);
    const yes = options.find((o) => /^s[ií]$|^yes$/i.test(o.text));
    const no = options.find((o) => /^no$/i.test(o.text));
    const yesNo = yesNoFor(rawLabel);
    let pick = yesNo === 'No' ? no : yesNo === 'Si' ? yes : null;
    if (/senior|avanzado|experiencia laboral formal|gcp|salesforce|sap|pentaho|kettle|oracle avanzado|kubernetes avanzado/.test(label)) pick = no || pick;
    if (!pick && options.length === 2 && !/selecciona|select|choose/i.test(options[0]?.text || '')) pick = options.find((o) => o.value);
    if (pick?.value) {
      await select.selectOption(pick.value, { timeout: 1000 }).catch(() => {});
      answers.push({ question: rawLabel, answer: pick.text, fieldType: 'select' });
    } else {
      log(`Get on Board select sin respuesta segura: ${rawLabel}`);
    }
  }

  if (existsSync(cvPath)) {
    const files = page.locator('input[type="file"]');
    for (let i = 0, count = await files.count().catch(() => 0); i < count; i += 1) {
      const label = norm(await labelOf(files.nth(i)));
      if (!label || /cv|resume|curriculum|documento|pdf/.test(label) || count === 1) {
        await files.nth(i).setInputFiles(cvPath).catch(() => {});
      }
    }
  }

  return answers.filter((item) => item.question && item.answer);
}

async function applyOne(context, url) {
  const page = context.pages().find((p) => p.url().includes('getonbrd.com')) || await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  let text = await bodyText(page);
  const title = (await page.locator('h1').first().innerText({ timeout: 3000 }).catch(() => 'GetOnBoard role')).trim();
  const company = (await page.locator('h2, [data-company], .company').first().innerText({ timeout: 1500 }).catch(() => '')).trim();
  if (/empleo finalizado|no se reciben|ya no recibe/i.test(text)) return { title, status: 'closed' };
  if (/ya postulaste|postulacion enviada|postulación enviada|enviada hace/i.test(text)) return { title, status: 'already-applied' };
  const opened = await clickText(page, [/^postular$/, /^postularme$/, /^apply now$/, /tienes una postulaci[oó]n por enviar/]);
  if (!opened) return { title, status: 'no-apply-button' };
  await page.waitForTimeout(2500);

  const collectedAnswers = [];
  for (let step = 0; step < 8; step += 1) {
    collectedAnswers.push(...await fillForm(page));
    text = await bodyText(page);
    if (/vista previa|review|enviar postulaci[oó]n ahora|submit application/i.test(text) || /step=(preview|review)/i.test(page.url())) {
      const submitted = await clickText(page, [/enviar postulaci[oó]n ahora/, /enviar solicitud/, /submit application/, /^enviar$/]);
      if (!submitted) {
        await page.locator('#send-application-btn-1, #send-application-btn-2').first().click({ timeout: 3000 }).catch(() => {});
      }
      await page.waitForTimeout(3000);
      const after = await bodyText(page);
      const sent = /solicitud enviada|postulaci[oó]n enviada|te postulaste correctamente|fue enviada exitosamente|\bEnviada hace\b|\bENVIADA\b/i.test(after)
        && !/a[uú]n no ha sido enviada|no ha sido enviada|validation_failed|tiene errores/i.test(after);
      const status = sent ? 'submitted' : submitted ? 'submitted-unconfirmed' : 'preview-no-submit-button';
      const recorded = recordApplicationQuestions({
        platform: 'Get on Board',
        company,
        role: title,
        url,
        status,
        answers: collectedAnswers,
      });
      log(`Get on Board preguntas guardadas: ${recorded} | ${title}`);
      return { title, status };
    }
    const next = await clickText(page, [/^siguiente$/, /^continuar$/, /guardar y continuar/, /^vista previa$/]);
    if (!next) {
      const recorded = recordApplicationQuestions({
        platform: 'Get on Board',
        company,
        role: title,
        url,
        status: 'form-no-next',
        answers: collectedAnswers,
      });
      log(`Get on Board preguntas guardadas antes de bloqueo: ${recorded} | ${title}`);
      return { title, status: 'form-no-next' };
    }
    await page.waitForTimeout(2500);
  }

  recordApplicationQuestions({
    platform: 'Get on Board',
    company,
    role: title,
    url,
    status: 'step-limit',
    answers: collectedAnswers,
  });
  return { title, status: 'step-limit' };
}

if (!urls.length) {
  console.error('Usage: node output/getonboard-url-apply.mjs <url> [more urls]');
  process.exit(1);
}

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] || await browser.newContext();
for (const url of urls) {
  const result = await applyOne(context, url).catch((error) => ({ title: url, status: `error ${error.message}` }));
  log(`${result.title}: ${result.status} | ${url}`);
}
await browser.close();
