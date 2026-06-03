import { chromium } from 'playwright';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const cvPath = resolve(ROOT, 'output/cv-gian-programador-ti.pdf');
const logPath = resolve(ROOT, 'output/direct-apply-agent.log');
const autoSubmit = process.env.AUTO_SUBMIT_DIRECT === '1';

const profile = {
  name: 'Gian Lucas San Martín Agurto',
  email: 'gianlucassanmartin@gmail.com',
  phone: '+56 9 5476 4325',
  linkedin: 'https://www.linkedin.com/in/gian-lucas-san-martin-49ab29323/',
  github: 'https://github.com/stredes',
  salary: '$900.000 CLP',
  availability: 'Inmediata o según coordinación',
  modality: 'Teletrabajo o semipresencial',
  experience: `Mi experiencia profesional combina operación, datos y desarrollo de software. Actualmente estoy orientando mi carrera al área TI como Analista Programador en formación, con proyectos prácticos en frontend, backend, automatización y gestión de datos. He desarrollado AMILAB Frontend con React, TypeScript y Vite, y AMILAB Backend con TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, validaciones con Zod, logging y tests. También desarrollé Inventario App, un sistema en Python con SQLAlchemy, SQLite/PostgreSQL, generación de PDFs, exportación CSV y arquitectura por capas, además de Exelcior Apolo, una aplicación Python para automatizar transformación, validación e impresión de archivos Excel.

Mi experiencia previa en laboratorio clínico y logística aporta una base sólida para TI: manejo de sistemas, trazabilidad, control de datos, documentación, cumplimiento de procedimientos y trabajo con usuarios reales. En Barnafi Krause y RLab trabajé con registros, sistemas LIS, datos clínicos y procesos regulados, mientras que en Amilab he trabajado con control de inventario, stock, despacho y datos operativos. Esa combinación me permite entender problemas reales de negocio y transformarlos en soluciones digitales útiles.`,
  education: `Actualmente curso la carrera de Analista Programador en Instituto Profesional Duoc UC, Sede Puente Alto, donde he desarrollado conocimientos en programación, bases de datos, desarrollo web, análisis de sistemas y construcción de aplicaciones. Mi formación técnica incluye Python, JavaScript, TypeScript, Java, SQL, React, Node.js, FastAPI, Git/GitHub, Firebase/Firestore, consumo y diseño de APIs REST, testing, automatización y generación de reportes.

Como complemento, soy titulado de Técnico en Laboratorio Clínico y Banco de Sangre por Instituto Profesional Duoc UC. Esta segunda formación me entrega una ventaja diferencial para el área TI: experiencia con procesos regulados, datos sensibles, trazabilidad, calidad, documentación y trabajo riguroso bajo protocolos. Mi objetivo profesional actual es desarrollarme como programador en el área TI, aportando con proyectos reales, aprendizaje continuo y capacidad para conectar tecnología con procesos operativos.`,
};

function shortReason(app) {
  const base = {
    Magnet: `Me interesa este rol porque combina backend, APIs REST, React y bases de datos, areas donde ya he construido proyectos practicos como AMILAB Backend/Frontend e Inventario App. Estoy en formacion como Analista Programador y busco crecer en un equipo donde pueda aportar con codigo, orden, documentacion y aprendizaje rapido. Mi experiencia previa en laboratorio y logistica tambien me ayuda a entender procesos reales, datos operativos y necesidades de usuarios.`,
    'BC Tecnologia': `Me interesa este rol porque conecta soporte operativo, sistemas, monitoreo y resolucion de incidentes, areas donde puedo aportar con orden, seguimiento y aprendizaje tecnico. Estoy en formacion como Analista Programador y cuento con base en Python, SQL, Git/GitHub, datos y automatizacion. Mi experiencia en laboratorio y logistica me dio disciplina con procesos, registros, trazabilidad y trabajo con usuarios reales.`,
    'Ameris Capital': `Me interesa este rol porque combina QA, desarrollo junior, validacion y datos. Estoy en formacion como Analista Programador y cuento con base en Python, JavaScript, TypeScript, SQL, APIs REST, testing y documentacion. Mi experiencia previa en laboratorio clinico y logistica me dio atencion al detalle, control de calidad, trazabilidad y criterio para detectar errores que impactan procesos reales.`,
  };
  return base[app.company] || app.message.slice(0, 900);
}

function genericQuestionAnswer(question, app) {
  const q = String(question || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/pretension|renta|salario|sueldo|salary/.test(q)) return '800000';
  if (/disponibilidad|availability/.test(q)) return 'Inmediata o segun coordinacion';
  if (/modalidad|remoto|hibrid|presencial/.test(q)) return 'Teletrabajo o semipresencial en Santiago';
  if (/linkedin/.test(q)) return profile.linkedin;
  if (/github|portafolio|portfolio|website|sitio/.test(q)) return profile.github;
  if (/telefono|phone|celular/.test(q)) return profile.phone;
  if (/correo|email/.test(q)) return profile.email;
  if (/nombre|name/.test(q)) return profile.name;
  if (/por que|motivacion|razon|reason|why|comentario|presentacion|cuentanos|cu[eé]ntanos/.test(q)) return shortReason(app);
  if (/experiencia|perfil|about you/.test(q)) return shortReason(app);
  return shortReason(app);
}

const applications = [
  {
    company: 'Magnet',
    role: 'Back-end Developer Node.js con React',
    url: 'https://www.getonbrd.com/jobs/programming/back-end-node-js-developer-react-magnet-remote',
    message: `Hola equipo de Magnet:

Me interesa postular al cargo de Back-end Developer Node.js con React. Estoy orientando mi carrera al area TI como Analista Programador y cuento con proyectos practicos en frontend, backend, APIs REST, bases de datos y automatizacion.

Mi proyecto mas relevante para este cargo es AMILAB, donde desarrolle frontend con React, TypeScript y Vite, y backend serverless con TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, validaciones con Zod, logging y tests. Tambien desarrolle Inventario App, un sistema Python con SQLAlchemy, SQLite/PostgreSQL, reportes PDF, exportacion CSV y arquitectura por capas.

Me interesa seguir creciendo en un equipo donde pueda aportar con codigo, orden, documentacion y aprendizaje rapido. Mi experiencia previa en laboratorio y logistica me ayuda a entender procesos reales, datos operativos, trazabilidad y necesidades de usuarios, lo que considero valioso para construir software util.

Saludos,
Gian Lucas San Martín Agurto`,
  },
  {
    company: 'BC Tecnologia',
    role: 'Soporte Operativo Junior',
    url: 'https://www.getonbrd.com/jobs/programming/soporte-operativo-junior-bc-tecnologia-remote',
    message: `Hola equipo de BC Tecnologia:

Me interesa postular al cargo de Soporte Operativo Junior. Estoy orientando mi carrera al area TI como Analista Programador en formacion y cuento con base practica en soporte de sistemas, datos, automatizacion, SQL, Python, Git/GitHub y documentacion.

Mi experiencia previa en laboratorio clinico y logistica me dio disciplina con procesos operativos, registros, trazabilidad, cumplimiento de procedimientos, inventario y trabajo con usuarios reales. Esa base calza bien con un rol operativo donde se necesita orden, seguimiento, comunicacion clara y capacidad para resolver incidentes.

Tambien he desarrollado proyectos propios como Inventario App, Exelcior Apolo y AMILAB, donde trabaje con automatizacion, reportes, datos, backend, frontend y validaciones.

Me interesa especialmente un rol junior remoto donde pueda aportar desde la operacion y crecer tecnicamente dentro del equipo.

Saludos,
Gian Lucas San Martin Agurto`,
  },
  {
    company: 'Ameris Capital',
    role: 'Developer QA Junior',
    url: 'https://www.getonbrd.com/jobs/sysadmin-devops-qa/developer-qa-junior-ameris-capital-santiago',
    message: `Hola equipo de Ameris Capital:

Me interesa postular al cargo de Developer QA Junior. Estoy en formacion como Analista Programador y cuento con base practica en Python, JavaScript, TypeScript, SQL, APIs REST, testing, validaciones y manejo de datos.

Mi perfil combina desarrollo junior con una experiencia previa fuerte en procesos regulados, registros, trazabilidad y control de calidad desde laboratorio clinico y logistica. Esa experiencia me ayuda a mirar los sistemas con atencion al detalle, validar datos, documentar hallazgos y entender el impacto operativo de los errores.

Mis proyectos principales son AMILAB Frontend/Backend, Inventario App y Exelcior Apolo. En ellos he trabajado con frontend, backend serverless, bases de datos, reportes, validaciones, tests y automatizacion de procesos.

Me interesa crecer en QA y desarrollo, aportando con orden, criterio tecnico y aprendizaje rapido.

Saludos,
Gian Lucas San Martin Agurto`,
  },
];

const applyText = /postular|postula|apply|easy apply|solicitar|enviar cv|candidatura/i;
const neverClickText = /enviar postulación|enviar postulaci[oó]n|submit application|send application|finalizar|confirmar|review your application|submit/i;

const finalSubmitText = /enviar postulaci[oÃ³]n|enviar solicitud|submit application|send application|finalizar postulaci[oÃ³]n|confirmar postulaci[oÃ³]n/i;
const blockingText = /assessment|test|prueba|evaluaci[oÃ³]n|payment|pago|certifico|declaro|declaraci[oÃ³]n|background check|antecedentes|consentimiento especial|special consent/i;

const nextStepText = /siguiente|continuar|guardar y continuar|vista previa|revisar|preview|next|continue/i;
const safeFinalSubmitText = /enviar postulaci[oó]n|enviar solicitud|submit application|send application|finalizar postulaci[oó]n|confirmar postulaci[oó]n|postular ahora|postularme/i;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

async function clickNonFinalApply(page) {
  const clickedByText = await page.evaluate(() => {
    const patterns = [
      /^postular$/i,
      /^postularme$/i,
      /^apply$/i,
      /^apply now$/i,
    ];
    const candidates = Array.from(document.querySelectorAll('a,button,[role="button"]'));
    for (const element of candidates) {
      if (element.closest('nav, header, footer')) continue;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || !element.getClientRects().length) continue;
      const text = [
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
      ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (!patterns.some((pattern) => pattern.test(text))) continue;
      element.scrollIntoView({ block: 'center' });
      element.click();
      return text;
    }
    return '';
  }).catch(() => '');
  if (clickedByText) {
    log(`Clicked apply control: ${clickedByText}`);
    await page.waitForTimeout(3000);
    return true;
  }

  const locators = [
    page.getByRole('button', { name: applyText }),
    page.getByRole('link', { name: applyText }),
    page.locator('button,a').filter({ hasText: applyText }),
  ];
  for (const locator of locators) {
    try {
      const el = locator.first();
      if (!(await el.count())) continue;
      const txt = (await el.innerText({ timeout: 1000 }).catch(() => '')).trim();
      if (neverClickText.test(txt)) continue;
      await el.click({ timeout: 4000 });
      await page.waitForTimeout(2500);
      return true;
    } catch {}
  }
  return false;
}

async function logVisibleControls(page, app) {
  const controls = await page.locator('a,button,input[type="submit"],input[type="button"],[role="button"]').evaluateAll((items) =>
    items
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      })
      .map((element) => [
        element.innerText,
        element.value,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
      ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 20),
  ).catch(() => []);
  log(`Visible controls for ${app.company}: ${controls.join(' | ') || 'none'}`);
}

async function fillTextLike(page, patterns, value) {
  for (const pattern of patterns) {
    const locators = [
      page.getByLabel(pattern),
      page.getByPlaceholder(pattern),
      page.locator(`input[name*="${String(pattern).replace(/[^a-z0-9]/gi, '')}" i]`),
    ];
    for (const locator of locators) {
      try {
        const el = locator.first();
        if (!(await el.count())) continue;
        const tag = await el.evaluate(node => node.tagName.toLowerCase()).catch(() => '');
        if (tag !== 'input' && tag !== 'textarea') continue;
        const current = await el.inputValue({ timeout: 500 }).catch(() => '');
        if (!current) await el.fill(value, { timeout: 1500 });
        return true;
      } catch {}
    }
  }
  return false;
}

async function fillForm(page, app) {
  await fillTextLike(page, [/nombre|name/i], profile.name);
  await fillTextLike(page, [/correo|email/i], profile.email);
  await fillTextLike(page, [/tel[eé]fono|phone|celular/i], profile.phone);
  await fillTextLike(page, [/linkedin/i], profile.linkedin);
  await fillTextLike(page, [/github|portafolio|portfolio|website|sitio/i], profile.github);
  await fillTextLike(page, [/renta|salario|sueldo|salary|pretensi/i], profile.salary);
  await fillTextLike(page, [/disponibilidad|availability/i], profile.availability);
  await fillTextLike(page, [/modalidad|remote|remoto/i], profile.modality);
  await fillTextLike(page, [/experiencia|perfil profesional|profile|professional experience|about you/i], profile.experience);
  await fillTextLike(page, [/formaci[oó]n|educaci[oó]n|estudios|education|academic/i], profile.education);

  const textareas = page.locator('textarea');
  const count = await textareas.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    try {
      const field = textareas.nth(i);
      const current = await field.inputValue({ timeout: 500 }).catch(() => '');
      const labelText = await field.evaluate((node) => {
        const id = node.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const parent = node.closest('label, div, section, fieldset');
        return `${label?.textContent || ''} ${parent?.textContent || ''}`;
      }).catch(() => '');
      if (/experiencia|perfil profesional|professional experience|about you/i.test(labelText)) {
        if (current.trim() !== profile.experience.trim()) await field.fill(profile.experience);
      } else if (/formaci[oó]n|educaci[oó]n|estudios|education|academic/i.test(labelText)) {
        if (current.trim() !== profile.education.trim()) await field.fill(profile.education);
      } else if (!current || current.length < 30) {
        await field.fill(app.message);
      }
    } catch {}
  }

  const files = page.locator('input[type="file"]');
  const fileCount = await files.count().catch(() => 0);
  for (let i = 0; i < fileCount; i++) {
    try {
      await files.nth(i).setInputFiles(cvPath);
    } catch {}
  }

  const editableCount = await page.locator('[contenteditable="true"]').count().catch(() => 0);
  for (let i = 0; i < editableCount; i++) {
    try {
      const editor = page.locator('[contenteditable="true"]').nth(i);
      const current = (await editor.innerText({ timeout: 500 }).catch(() => '')).trim();
      if (current.length < 30) {
        await editor.click({ timeout: 1500 });
        await page.keyboard.insertText(app.message);
      }
    } catch {}
  }

  const allTextareas = page.locator('textarea');
  const allTextareaCount = await allTextareas.count().catch(() => 0);
  for (let i = 0; i < allTextareaCount; i++) {
    try {
      const field = allTextareas.nth(i);
      const current = await field.inputValue({ timeout: 300 }).catch(() => '');
      if (current.length < 50 || current.length > 1000) await field.fill(genericQuestionAnswer('', app), { timeout: 1000 });
    } catch {}
  }

  const allEditors = page.locator('[contenteditable="true"]');
  const allEditorCount = await allEditors.count().catch(() => 0);
  for (let i = 0; i < allEditorCount; i++) {
    try {
      const editor = allEditors.nth(i);
      const current = (await editor.innerText({ timeout: 300 }).catch(() => '')).trim();
      if (current.length < 50 || current.length > 1000) {
        await editor.click({ timeout: 1000 });
        await page.keyboard.press('Control+A').catch(() => {});
        await page.keyboard.insertText(shortReason(app));
      }
    } catch {}
  }

  const inputs = page.locator('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])');
  const inputCount = await inputs.count().catch(() => 0);
  for (let i = 0; i < inputCount; i++) {
    try {
      const input = inputs.nth(i);
      const current = await input.inputValue({ timeout: 300 }).catch(() => '');
      if (current) continue;
      const question = await input.evaluate((node) => {
        const id = node.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const parent = node.closest('label, div, section, fieldset');
        return [node.getAttribute('aria-label'), node.getAttribute('placeholder'), label?.textContent, parent?.textContent]
          .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      }).catch(() => '');
      await input.fill(genericQuestionAnswer(question, app), { timeout: 1000 });
    } catch {}
  }

  const selects = page.locator('select');
  const selectCount = await selects.count().catch(() => 0);
  for (let i = 0; i < selectCount; i++) {
    try {
      const select = selects.nth(i);
      const current = await select.inputValue({ timeout: 300 }).catch(() => '');
      if (current) continue;
      const options = await select.locator('option').evaluateAll((items) =>
        items.map((option) => ({ value: option.value, text: option.textContent?.trim() || '' }))
          .filter((option) => option.value && !/selecciona|select|elige|choose/i.test(option.text)),
      );
      if (options[0]) await select.selectOption(options[0].value, { timeout: 1000 });
    } catch {}
  }

  const fieldsets = await page.locator('fieldset').all().catch(() => []);
  for (const fieldset of fieldsets) {
    try {
      const checked = await fieldset.locator('input[type="radio"]:checked').count().catch(() => 0);
      if (checked) continue;
      const firstRadio = fieldset.locator('input[type="radio"]').first();
      if (await firstRadio.count().catch(() => 0)) await firstRadio.check({ timeout: 1000 });
    } catch {}
  }
}

async function hasBlockingSignals(page) {
  const text = await page.locator('main, form, [role="main"], body').first().innerText({ timeout: 1000 }).catch(() => '');
  if (blockingText.test(text)) return 'blocking text detected';

  const requiredEmpty = await page.locator('input[required], textarea[required], select[required]').evaluateAll((fields) =>
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

async function advanceApplicationSteps(page, app) {
  for (let step = 0; step < 6; step++) {
    await fillForm(page, app);
    if (await maybeSubmit(page, app)) return 'submitted';

    const clicked = await page.evaluate((source) => {
      const pattern = new RegExp(source, 'i');
      const candidates = Array.from(document.querySelectorAll('button,a,[role="button"],input[type="submit"],input[type="button"]'));
      for (const element of candidates) {
        if (element.closest('nav, header, footer')) continue;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || !element.getClientRects().length) continue;
        const text = [
          element.textContent,
          element.value,
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (/^\d+\s+/.test(text)) continue;
        if (!pattern.test(text)) continue;
        element.scrollIntoView({ block: 'center' });
        element.click();
        return text;
      }
      return '';
    }, nextStepText.source).catch(() => '');

    if (!clicked) return 'prepared';
    log(`Advanced ${app.company}: ${clicked}`);
    await page.waitForTimeout(2500);
    await logVisibleControls(page, app);
  }
  return 'prepared';
}

async function maybeSubmit(page, app) {
  const button = page.getByRole('button', { name: safeFinalSubmitText }).first();
  const link = page.getByRole('link', { name: safeFinalSubmitText }).first();
  const target = (await button.count().catch(() => 0)) ? button : link;
  if (!(await target.count().catch(() => 0))) {
    log(`Prepared ${app.company}: no final submit button visible.`);
    return false;
  }

  if (!autoSubmit) {
    log(`Prepared ${app.company}: final submit visible, waiting for manual review.`);
    return false;
  }

  const blocker = await hasBlockingSignals(page);
  if (blocker) {
    log(`Skipped submit for ${app.company}: ${blocker}.`);
    return false;
  }

  const disabled = await target.isDisabled().catch(() => false);
  if (disabled) {
    log(`Skipped submit for ${app.company}: submit control disabled.`);
    return false;
  }

  await target.click({ timeout: 3000 });
  await page.waitForTimeout(2500);
  log(`Submitted ${app.company}: ${app.role}`);
  return true;
}

async function reusablePage(context) {
  const pages = context.pages();
  const page = pages.find((item) => !item.isClosed()) || await context.newPage();
  for (const extra of pages) {
    if (extra !== page && !extra.isClosed()) {
      await extra.close().catch(() => {});
    }
  }
  return page;
}

async function main() {
  if (!existsSync(cvPath)) {
    throw new Error(`CV PDF not found: ${cvPath}`);
  }

  let context;
  if (process.env.CONNECT_CDP === '1') {
    const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222');
    context = browser.contexts()[0] || await browser.newContext();
    log(`Connected to real Chrome over CDP: ${process.env.CDP_URL || 'http://127.0.0.1:9222'}`);
  } else {
    context = await chromium.launchPersistentContext(resolve(ROOT, '.apply-browser-profile'), {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1365, height: 900 },
    });
  }

  const page = await reusablePage(context);

  for (const app of applications) {
    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await clickNonFinalApply(page);
    await logVisibleControls(page, app);
    const result = await advanceApplicationSteps(page, app);
    log(`${result === 'submitted' ? 'Submitted' : 'Prepared'} ${app.company}: ${app.role}`);
  }

  console.log('\nPreparé las postulaciones posibles de LinkedIn/Get on Board.');
  log('Prepared direct application tabs.');
  await new Promise(() => {});
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
