import { chromium } from 'playwright';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const cvPath = resolve(ROOT, process.env.CV_PATH || 'output/cv-gian-programador-ti.pdf');
const logPath = resolve(ROOT, 'output/chiletrabajos-url-apply.log');
const autoSubmit = process.env.AUTO_SUBMIT_CHILETRABAJOS !== '0';
const urls = (process.env.CHILETRABAJOS_URLS || process.argv.slice(2).join('\n'))
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean);

const hardQuestion = /discapacidad|ley 21\.015|calzado|zapatos? de seguridad|colina|trasladarse|traslado diario|epp|faena|terreno|licencia clase|licencia conducir|honorarios|eirl|boleta|antecedentes|declaraci[oó]n|declaro/i;
const hardPage = /este anuncio ha expirado|ha sido desactivado|ya ha postulado|usted ya ha postulado/i;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function loadProfile() {
  const profile = yaml.load(readFileSync(resolve(ROOT, 'config/profile.yml'), 'utf8'));
  const candidate = profile.candidate || {};
  return {
    name: candidate.full_name || 'Gian Lucas San Martin Agurto',
    salary: process.env.DEFAULT_SALARY || '900000',
    availability: 'Disponibilidad inmediata',
  };
}

function jobIdFromUrl(url) {
  return (String(url).match(/(\d{7})/) || [])[1] || '';
}

function letter({ company, role, salary }) {
  return `Hola equipo de ${company || 'la empresa'}:

Me interesa postular al cargo de ${role || 'este cargo'}. Actualmente curso Analista Programador en Duoc UC y estoy orientando mi carrera al area TI, con foco en desarrollo junior, soporte de sistemas, datos y automatizacion.

Tengo base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, automatizacion y documentacion. He desarrollado proyectos como AMILAB Frontend/Backend, Inventario App y Exelcior Apolo, trabajando con frontend, backend serverless, bases de datos, reportes, validaciones, tests y mejora de procesos.

Mi experiencia previa en laboratorio clinico y logistica me aporta orden, trazabilidad, atencion al detalle, manejo de registros, inventario y trabajo con usuarios reales. Esa combinacion me permite aportar tanto desde lo tecnico como desde la comprension de procesos operativos.

Disponibilidad inmediata. Pretension de renta: $${salary || '900000'} CLP, conversable segun condiciones.

Saludos,
Gian Lucas San Martin Agurto`;
}

function answer(question) {
  const q = String(question || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/numero.*correo|correo.*numero|telefono.*correo|contacto/.test(q)) return '+56 9 5476 4325 / gianlucassanmartin@gmail.com';
  if (/comuna/.test(q)) return 'Santiago';
  if (/pretensiones de renta|pretension de renta|pretensi/.test(q)) return '1100000';
  if (/disponibilidad/.test(q)) return 'Disponibilidad inmediata';
  if (/excel/.test(q)) return 'Manejo Excel a nivel intermedio para registros, reportes, filtros y control de datos operativos.';
  if (/python/.test(q)) return 'Tengo experiencia practica con Python en proyectos propios, automatizacion, reportes, manejo de datos y aplicaciones de escritorio.';
  if (/funciones.*automatizacion|automatizacion.*funciones|realizadas en automatizacion/.test(q)) return 'He automatizado transformacion y validacion de archivos Excel, generacion de reportes/PDF, exportacion CSV, controles de inventario y flujos de datos en proyectos propios con Python. Tambien he trabajado pruebas basicas, documentacion y validacion de APIs/datos.';
  if (/selenium/.test(q)) return 'Manejo Selenium a nivel basico/en aprendizaje. Tengo base en testing, validaciones, Postman/APIs, SQL y automatizacion con Python; puedo aprender y reforzar Selenium rapidamente en el contexto del equipo.';
  if (/sql|base de datos/.test(q)) return 'Tengo experiencia practica con SQL, SQLite/PostgreSQL y consultas para proyectos academicos y personales.';
  if (/ingles|english/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
  if (/office|microsoft 365|365/.test(q)) return 'Tengo manejo practico de herramientas Office/Microsoft 365 para documentacion, registros, reportes y trabajo colaborativo.';
  if (/sap/.test(q)) return 'No tengo experiencia directa trabajando en SAP; si tengo experiencia con sistemas operativos/administrativos como Manager+, Zendo LIMS, registros, inventario y trazabilidad, y buena disposicion para aprender el sistema requerido.';
  if (/ticket|incidente|mesa|soporte/.test(q)) return 'Tengo base en soporte, documentacion, seguimiento de incidentes y trabajo con usuarios desde entornos operativos y proyectos TI.';
  if (/formacion|titulo|estudios/.test(q)) return 'Analista Programador en curso en Duoc UC; titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
  if (/experiencia|perfil|comentario|motivacion|por que/.test(q)) {
    return 'Estoy orientando mi carrera al area TI como Analista Programador en formacion. Cuento con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion y documentacion. Mi experiencia previa en laboratorio y logistica me aporta orden, trazabilidad y criterio para trabajar con procesos reales.';
  }
  return '';
}

async function metadata(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const get = (label) => (text.match(new RegExp(`${label}\\s*\\n?\\s*([^\\n]+)`, 'i')) || [])[1]?.trim() || '';
    return {
      role: document.querySelector('h1')?.textContent?.trim() || get('Gian lucas, estas postulando a') || document.title,
      company: get('Buscado') || 'la empresa',
      text,
    };
  });
}

async function fillAndSubmit(page, meta, profile) {
  const salary = meta.text.match(/Salario\s*\n?\s*\$?([\d.]+)/i)?.[1]?.replace(/[^\d]/g, '') || profile.salary;
  await page.locator('textarea[name="app_letter"]').fill(letter({ ...meta, salary }), { timeout: 3000 }).catch(() => {});
  await page.locator('input[name="salary"]').fill(salary, { timeout: 1500 }).catch(() => {});
  await page.locator('input[name="disp"]').fill(profile.availability, { timeout: 1500 }).catch(() => {});
  await page.locator('#dispoIn').check({ timeout: 1000 }).catch(() => {});
  await page.locator('select[name="situacion_laboral"]').selectOption('no_responde', { timeout: 1500 }).catch(() => {});

  const questions = await page.locator('textarea[name^="q"]').all();
  for (const field of questions) {
    const q = await field.evaluate((node) => {
      const id = node.id;
      const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : '';
      const parent = node.closest('div, label, fieldset')?.textContent || '';
      return `${label || ''} ${parent}`.replace(/\s+/g, ' ').trim();
    }).catch(() => '');
    if (hardQuestion.test(q)) return { status: 'paused', reason: `hard question: ${q}` };
    const value = answer(q);
    if (!value) return { status: 'paused', reason: `unknown question: ${q}` };
    await field.fill(value, { timeout: 1500 });
  }

  if (existsSync(cvPath)) {
    await page.locator('input[type="file"]').first().setInputFiles(cvPath).catch(() => {});
  }

  if (!autoSubmit) return { status: 'prepared', reason: 'autoSubmit off' };
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {}),
    page.locator('form input[name="apply"]').click({ timeout: 5000 }).catch(async () => {
      await page.evaluate(() => document.querySelector('form')?.requestSubmit()).catch(() => {});
    }),
  ]);
  await page.waitForTimeout(2500);
  const after = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  return /postulaciones|postulaste|historial|postulacion|postulando/i.test(after)
    ? { status: 'submitted', reason: 'confirmation/redirect' }
    : { status: 'clicked-final', reason: after.slice(0, 500) };
}

async function main() {
  if (!urls.length) throw new Error('Usage: node output/chiletrabajos-url-apply.mjs <url> [more urls...]');
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const profile = loadProfile();
  const results = [];
  for (const url of urls) {
    const id = jobIdFromUrl(url);
    const page = await context.newPage();
    const applyUrl = id ? `https://www.chiletrabajos.cl/trabajo/postular/${id}` : url;
    log(`Chiletrabajos apply: ${applyUrl}`);
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500);
    const meta = await metadata(page);
    if (hardPage.test(meta.text)) {
      results.push({ id, status: 'skipped', reason: 'expired/already applied', role: meta.role, company: meta.company, url: page.url() });
      await page.close().catch(() => {});
      continue;
    }
    const hasForm = await page.locator('form input[name="apply"]').count().catch(() => 0);
    if (!hasForm) {
      results.push({ id, status: 'skipped', reason: 'no form', role: meta.role, company: meta.company, url: page.url() });
      await page.close().catch(() => {});
      continue;
    }
    const result = await fillAndSubmit(page, meta, profile);
    results.push({ id, role: meta.role, company: meta.company, url: page.url(), ...result });
    log(`${result.status}: ${meta.company} - ${meta.role} (${result.reason})`);
    await page.close().catch(() => {});
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});
