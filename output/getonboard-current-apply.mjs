import { chromium } from 'playwright';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const logPath = resolve(ROOT, 'output/direct-apply-agent.log');
const cvPath = resolve(ROOT, 'output/cv-gian-programador-ti.pdf');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const autoSubmit = process.env.AUTO_SUBMIT_DIRECT === '1';

const profile = {
  name: 'Gian Lucas San Martin Agurto',
  email: 'gianlucassanmartin@gmail.com',
  phone: '+56954764325',
  linkedin: 'https://www.linkedin.com/in/gian-lucas-san-martin-49ab29323/',
  github: 'https://github.com/stredes',
};

const selectedJobs = [
  {
    company: 'Ameris Capital',
    role: 'Developer QA Junior',
    url: 'https://www.getonbrd.com/jobs/sysadmin-devops-qa/developer-qa-junior-ameris-capital-santiago',
    reason: `Hola equipo de Ameris Capital:

Me interesa postular al cargo de Developer QA Junior. Estoy en formacion como Analista Programador y cuento con base practica en Python, JavaScript, TypeScript, SQL, APIs REST, testing, validaciones y documentacion.

Mi perfil combina desarrollo junior con experiencia previa en procesos regulados, registros, trazabilidad y control de calidad desde laboratorio clinico y logistica. Esa experiencia me ayuda a mirar los sistemas con atencion al detalle, validar datos, documentar hallazgos y entender el impacto operativo de los errores.

Mis proyectos principales son AMILAB Frontend/Backend, Inventario App y Exelcior Apolo. En ellos he trabajado con frontend, backend serverless, bases de datos, reportes, validaciones, tests y automatizacion de procesos.

Me interesa crecer en QA y desarrollo, aportando con orden, criterio tecnico y aprendizaje rapido.`,
  },
  {
    company: 'TCIT',
    role: 'AI Engineer Junior',
    url: 'https://www.getonbrd.cl/jobs/machine-learning-ai/ai-engineer-junior-tcit-santiago',
    reason: `Hola equipo de TCIT:

Me interesa postular al cargo de AI Engineer Junior. Estoy en formacion como Analista Programador y busco crecer en roles donde pueda unir programacion, automatizacion, APIs, datos e IA aplicada.

Tengo proyectos practicos en Python, JavaScript, TypeScript, React, SQL y APIs REST. Destaco Exelcior Apolo, una app Python para automatizar transformacion, validacion e impresion de Excel; Inventario App, sistema Python con SQLAlchemy, SQLite/PostgreSQL y reportes; y AMILAB Frontend/Backend, con React, TypeScript, Firebase/Firestore, endpoints REST, validaciones y tests.

Me interesa aprender y aportar en un equipo que trabaje con IA de forma aplicada, manteniendo criterio tecnico, documentacion y responsabilidad sobre los resultados.`,
  },
  {
    company: 'Norun SpA',
    role: 'Desarrollador/a Full-Stack Junior',
    url: 'https://www.getonbrd.com/jobs/programacion/desarrollador-a-full-stack-junior-norun-spa-santiago',
    reason: `Hola equipo de Norun:

Me interesa postular al cargo de Desarrollador/a Full-Stack Junior. Estoy en formacion como Analista Programador y cuento con proyectos practicos que conectan frontend, backend, datos y automatizacion.

He desarrollado AMILAB Frontend con React, TypeScript y Vite, y AMILAB Backend con TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, validaciones con Zod, logging y tests. Tambien desarrollé Inventario App en Python con SQLAlchemy, SQLite/PostgreSQL, reportes PDF y arquitectura por capas, ademas de Exelcior Apolo para automatizar flujos con Excel.

Busco una oportunidad junior donde pueda aprender, aportar con codigo, documentacion y responsabilidad, y seguir creciendo en desarrollo web full-stack.`,
  },
];

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

async function visibleText(page) {
  return page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
}

function reasonFor(pageText, job) {
  if (/ingl[eé]s|english/i.test(pageText)) return job.reason.startsWith('I am') ? job.reason : `I am interested in this role because it matches my current path as an Analyst Programmer in training and my practical work with Python, JavaScript, SQL, React, REST APIs and automation. I have built projects such as AMILAB Frontend/Backend, Inventario App and Exelcior Apolo, where I worked with software development, data workflows, reporting and process automation. My previous experience in laboratory and logistics also gives me strong attention to detail, traceability, documentation and understanding of real operational needs.`;
  return job.reason;
}

async function setDomValue(locator, value) {
  await locator.evaluate((node, nextValue) => {
    const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(node, nextValue);
    else node.value = nextValue;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    node.dispatchEvent(new Event('blur', { bubbles: true }));
  }, value);
}

async function clickByText(page, patterns) {
  return page.evaluate((sources) => {
    const regexes = sources.map((source) => new RegExp(source, 'i'));
    const items = Array.from(document.querySelectorAll('a,button,[role="button"],input[type="submit"],input[type="button"]'));
    for (const element of items) {
      if (element.closest('nav, header, footer')) continue;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || !element.getClientRects().length) continue;
      const text = [element.textContent, element.value, element.getAttribute('aria-label'), element.getAttribute('title')]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (!regexes.some((regex) => regex.test(text))) continue;
      element.scrollIntoView({ block: 'center' });
      element.click();
      return text;
    }
    return '';
  }, patterns.map((pattern) => pattern.source)).catch(() => '');
}

async function labelOf(locator) {
  return locator.evaluate((node) => {
    const id = node.getAttribute('id');
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const parent = node.closest('label, div, fieldset, section');
    return [node.getAttribute('aria-label'), node.getAttribute('placeholder'), label?.textContent, parent?.textContent]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }).catch(() => '');
}

function answerFor(label, job, body) {
  const q = `${label} ${body}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/dolares|usd/.test(q) && /sueldo|salario|renta|expectativa/.test(q)) return '900';
  if (/sueldo|salario|renta|pretension|expectativa/.test(q)) return '900000';
  if (/telefono|phone|celular/.test(q)) return profile.phone;
  if (/email|correo/.test(q)) return profile.email;
  if (/linkedin/.test(q)) return profile.linkedin;
  if (/github|portafolio|portfolio|website|sitio/.test(q)) return profile.github;
  if (/disponibilidad|availability/.test(q)) return 'Inmediata o segun coordinacion';
  if (/modalidad|remoto|hibrid|presencial/.test(q)) return 'Teletrabajo o modalidad hibrida en Santiago';
  if (/ingles|english/.test(q)) return 'Ingles basico A2, con disposicion a mejorar continuamente.';
  return reasonFor(body, job);
}

async function fillDraft(page, job) {
  const body = await visibleText(page);
  const reason = reasonFor(body, job);

  const textareas = page.locator('textarea');
  for (let i = 0, count = await textareas.count().catch(() => 0); i < count; i += 1) {
    const field = textareas.nth(i);
    const current = await field.inputValue({ timeout: 300 }).catch(() => '');
    if (current.trim().length >= 50 && current.length <= 1000) continue;
    const label = await labelOf(field);
    const value = answerFor(label, job, body);
    await field.fill(value, { timeout: 1000 }).catch(() => {});
    await setDomValue(field, value).catch(() => {});
  }

  const inputs = page.locator('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])');
  for (let i = 0, count = await inputs.count().catch(() => 0); i < count; i += 1) {
    const input = inputs.nth(i);
    const current = await input.inputValue({ timeout: 300 }).catch(() => '');
    if (current) continue;
    const label = await labelOf(input);
    if (!label.trim()) continue;
    const value = answerFor(label, job, body);
    await input.fill(value, { timeout: 1000 }).catch(() => {});
    await setDomValue(input, value).catch(() => {});
  }

  const selects = page.locator('select');
  for (let i = 0, count = await selects.count().catch(() => 0); i < count; i += 1) {
    const select = selects.nth(i);
    const selected = await select.inputValue({ timeout: 300 }).catch(() => '');
    if (selected) continue;
    const label = await labelOf(select);
    const options = await select.locator('option').evaluateAll((items) => items
      .map((option) => ({ value: option.value, text: option.textContent?.trim() || '' }))
      .filter((option) => option.value || option.text)).catch(() => []);
    const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const yes = options.find((option) => /^s[ií]$|yes/i.test(option.text));
    const no = options.find((option) => /^no$/i.test(option.text));
    let answer = yes;
    if (/senior|avanzad|5 anos|mas de 3|advanced english|ingles avanzado/.test(normalized)) answer = no || answer;
    if (/salesforce/.test(normalized)) answer = no || answer;
    answer ||= options.find((option) => !/selecciona|select|choose/i.test(option.text));
    if (answer?.value) await select.selectOption(answer.value, { timeout: 1000 }).catch(() => {});
  }

  if (existsSync(cvPath)) {
    const files = page.locator('input[type="file"]');
    for (let i = 0, count = await files.count().catch(() => 0); i < count; i += 1) {
      await files.nth(i).setInputFiles(cvPath).catch(() => {});
    }
  }
}

async function resolveApplication(page, job) {
  for (let step = 0; step < 10; step += 1) {
    await fillDraft(page, job);
    const body = await visibleText(page);
    const isPreview = /step=(preview|review|vista)/i.test(page.url()) || /enviar postulaci[oó]n ahora/i.test(body);
    if (isPreview) {
      const submit = await clickByText(page, [/enviar postulaci[oó]n ahora/, /enviar solicitud/, /submit application/, /^enviar$/]);
      if (submit) {
        log(`${job.role}: clicked final submit ${submit}`);
        await page.waitForTimeout(3000);
        const after = `${page.url()}\n${await visibleText(page)}`;
        if (/solicitud enviada|postulaci[oó]n enviada|enviada/i.test(after)) return 'submitted';
        if (/tiene errores|campos marcados|validation_failed/i.test(after)) return 'validation-error';
        return 'submitted-or-pending-confirmation';
      }
    }
    const next = await clickByText(page, [/^siguiente$/, /^continuar$/, /guardar y continuar/, /^vista previa$/]);
    if (!next) return 'no-next';
    log(`${job.role}: advanced ${next}`);
    await page.waitForTimeout(2500);
  }
  return 'step-limit';
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages().find((item) => item.url().includes('getonbrd.com')) || await context.newPage();
  log('Starting Get on Board matched visible jobs apply run.');

  for (const job of selectedJobs) {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    const body = await visibleText(page);
    if (/postulaci[oó]n enviada|ya postulaste|enviada/i.test(body)) {
      log(`${job.role}: already applied or sent.`);
      continue;
    }
    const apply = await clickByText(page, [/^postular$/, /^postularme$/, /tienes una postulaci[oó]n por enviar/]);
    if (!apply) {
      log(`${job.role}: no apply button found.`);
      continue;
    }
    log(`${job.role}: opened application via ${apply}`);
    await page.waitForTimeout(3000);
    const result = await resolveApplication(page, job);
    log(`${job.role}: result ${result}`);
  }
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});
