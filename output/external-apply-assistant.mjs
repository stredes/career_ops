import { chromium } from 'playwright';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const profilePath = resolve(ROOT, 'config/profile.yml');
const cvPath = resolve(ROOT, process.env.CV_PATH || 'output/cv-gian-programador-ti.pdf');
const logPath = resolve(ROOT, 'output/external-apply-agent.log');
const autoSubmit = process.env.AUTO_SUBMIT_EXTERNAL !== '0';
const waitForUser = process.env.WAIT_FOR_USER !== '0';
const urls = (process.env.EXTERNAL_JOB_URLS || process.argv.slice(2).join('\n'))
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean);

const startApply = /postular|solicitar|apply now|apply|candidatura|enviar cv|continuar/i;
const finalSubmit = /enviar postulaci[oó]n|enviar solicitud|submit application|send application|finalizar|postularme|postular ahora|confirmar/i;
const nextStep = /siguiente|continuar|next|continue|guardar y continuar|review|revisar/i;
const loginSignals = /inicia sesi[oó]n|ingresa|login|log in|sign in|registr|crear cuenta|create account|join now|google|linkedin/i;
const hardStop = /certifico|declaro|declaraci[oó]n|antecedentes|background check|discapacidad|ley 21\.015|visa|patrocinio|sponsorship|reubicaci[oó]n|relocation|eirl|honorarios|boleta|contratista|pago|payment|prueba obligatoria|assessment/i;

const unresolvedHardStop = /certifico|declaro|declaraci[oÃ³]n|discapacidad|ley 21\.015|visa|patrocinio|sponsorship|reubicaci[oÃ³]n|relocation|eirl|honorarios|boleta|contratista|pago|payment|prueba obligatoria|assessment/i;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function loadProfile() {
  const profile = yaml.load(readFileSync(profilePath, 'utf8'));
  const candidate = profile.candidate || {};
  const location = profile.location || {};
  const compensation = profile.compensation || {};
  return {
    name: candidate.full_name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    linkedin: candidate.linkedin || '',
    github: candidate.github || '',
    portfolio: candidate.portfolio_url || candidate.github || '',
    city: location.city || 'Santiago',
    country: location.country || 'Chile',
    salary: String(compensation.minimum || '800000').replace(/[^\d]/g, '') || '800000',
    availability: 'Disponibilidad inmediata',
    comuna: 'Santiago',
  };
}

function coverLetter({ company = 'la empresa', role = 'este cargo' }) {
  return `Hola equipo de ${company}:

Me interesa postular al cargo de ${role}. Actualmente curso Analista Programador en Duoc UC y estoy orientando mi carrera al area TI, con base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion y manejo de datos.

He desarrollado proyectos como AMILAB Frontend/Backend, Inventario App y Exelcior Apolo, donde trabaje con frontend, backend serverless, bases de datos, validaciones, reportes, testing y automatizacion de procesos. Mi experiencia previa en laboratorio clinico y logistica tambien me aporta orden, trazabilidad, documentacion y criterio para entender procesos reales de usuarios.

Busco una oportunidad junior donde pueda aportar con responsabilidad, aprendizaje rapido y buena comunicacion tecnica.

Disponibilidad inmediata. Pretension de renta: $800.000 CLP, conversable segun condiciones.

Saludos,
Gian Lucas San Martin Agurto`;
}

function englishCoverLetter({ company = 'the company', role = 'this role' }) {
  return `Hello ${company} team,

I am interested in the ${role} role. I am currently studying Analista Programador and I am focused on growing in software development and IT, with practical foundations in Python, JavaScript, TypeScript, React, SQL, REST APIs, Git/GitHub, automation, and data handling.

My projects include AMILAB Frontend/Backend, Inventario App, and Exelcior Apolo, where I worked with frontend, backend APIs, databases, validations, reports, testing, and process automation. My previous experience in clinical laboratory and logistics also gives me discipline with records, traceability, documentation, and real operational workflows.

I am based in Chile, available for remote work, and able to coordinate with EST core hours.

Best regards,
Gian Lucas San Martin Agurto`;
}

function answerFor(question, profile, meta) {
  const q = normalize(question);
  if (/first name|firstname|nombre/.test(q)) return 'Gian Lucas';
  if (/last name|lastname|apellido/.test(q)) return 'San Martin Agurto';
  if (/nombre|name/.test(q)) return profile.name;
  if (/correo|email|e-mail/.test(q)) return profile.email;
  if (/telefono|phone|celular|movil|mobile/.test(q)) return profile.phone;
  if (/linkedin/.test(q)) return profile.linkedin;
  if (/github/.test(q)) return profile.github;
  if (/portfolio|portafolio|sitio|website/.test(q)) return profile.portfolio;
  if (/address|direccion|direcci/.test(q)) return `${profile.city}, Region Metropolitana, ${profile.country}`;
  if (/country|pais|pa[iÃ­]s/.test(q)) return profile.country;
  if (/city|ciudad|ubicacion|location|region/.test(q)) return `${profile.city}, ${profile.country}`;
  if (/comuna/.test(q)) return profile.comuna;
  if (/renta|salario|sueldo|pretensi|salary/.test(q)) return profile.salary;
  if (/disponibilidad|availability/.test(q)) return profile.availability;
  if (/ingles|english/.test(q)) {
    if (/avanzado|advanced|fluent|fluido|native|nativo/.test(q)) return '';
    if (/intermedio|intermediate|conversacional|conversational/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
    return 'Basico (A2)';
  }
  if (/colina|trasladarse|traslado|movilizaci/.test(q)) return '';
  if (/calzado|zapatos? de seguridad|epp/.test(q)) return '';
  if (/previous va|department of veterans affairs|veterans affairs|experiencia va/.test(q)) {
    return 'I do not have previous experience working at the Department of Veterans Affairs.';
  }
  if (/public git|git repo|github/.test(q)) return profile.github;
  if (/summary|resumen/.test(q)) {
    return 'Analista Programador en formacion, orientado al area TI, con base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, automatizacion y manejo de datos. Experiencia previa en laboratorio clinico y logistica, con disciplina en procesos, trazabilidad, documentacion y trabajo con usuarios reales.';
  }
  if (/por que|motivacion|carta|presentacion|cover|comentario|mensaje|perfil|cuentanos|cuentanos/.test(q)) {
    return /cover|english|remote|software engineer|developer|united states|background check/i.test(question)
      ? englishCoverLetter(meta)
      : coverLetter(meta);
  }
  if (/experiencia|herramientas|skills|habilidades/.test(q)) {
    return 'Tengo experiencia practica en proyectos con Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, automatizacion, reportes y manejo de datos. Ademas cuento con experiencia operativa en laboratorio y logistica, con foco en trazabilidad, registros y documentacion.';
  }
  if (/formacion|educacion|estudios|titulo|degree/.test(q)) {
    return 'Analista Programador en curso en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
  }
  return '';
}

function yesNoFor(question) {
  const q = normalize(question);
  if (/us citizen|u\.s\. citizen|citizen.*united states|residing in the united states|residente.*estados unidos/.test(q)) return false;
  if (/background check|public trust|security clearance|antecedentes/.test(q)) return true;
  if (/camera on|meet on camera|on camera|camara|c[aÃ¡]mara|no filters|sin filtros/.test(q)) return true;
  if (/10:00 am.*4:00 pm est|10.*4.*est|core hours|horario.*est/.test(q)) return true;
  if (/department of veterans affairs|previous va|experiencia va/.test(q)) return false;
  if (/eligible work authorization.*latin america|work authorization.*latin america|autorizado.*latin america|autorizado.*latinoamerica/.test(q)) return true;
  if (/bachelor.*computer science|equivalent related experience|equivalent experience|related experience/.test(q)) return true;
  if (/advanced english|professional english|native english|ingles avanzado|ingl[eÃ©]s avanzado|nativo/.test(q)) return null;
  if (/visa|sponsorship|patrocinio|relocation|reubicaci/.test(q)) return false;
  return null;
}

async function questionForNode(locator) {
  return locator.evaluate((node) => {
    const id = node.id;
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const ancestors = [];
    for (let item = node.parentElement; item; item = item.parentElement) {
      const text = item.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (text) ancestors.push(text);
      if (ancestors.length >= 8) break;
    }
    const usefulAncestor = ancestors.find((text) => text.includes('?') && text.length < 1200)
      || ancestors.find((text) => text.length > 20 && text.length < 1200)
      || '';
    return [
      node.getAttribute('aria-label'),
      node.getAttribute('placeholder'),
      node.getAttribute('name'),
      label?.textContent,
      usefulAncestor,
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }).catch(() => '');
}

async function fillRadios(page) {
  let answered = 0;
  const groups = await page.locator('input[type="radio"]').evaluateAll((inputs) => (
    [...new Set(inputs.map((input) => input.name).filter(Boolean))]
  )).catch(() => []);

  for (const name of groups) {
    const checked = await page.locator(`input[type="radio"][name="${name}"]:checked`).count().catch(() => 0);
    if (checked) continue;
    const first = page.locator(`input[type="radio"][name="${name}"]`).first();
    const question = await questionForNode(first);
    const answer = yesNoFor(question);
    if (answer === null) continue;
    const value = answer ? 'true' : 'false';
    const radio = page.locator(`input[type="radio"][name="${name}"][value="${value}"]`).first();
    try {
      await radio.locator('xpath=ancestor::label[1]').click({ timeout: 2500 });
      answered += 1;
    } catch {
      try {
        await radio.check({ force: true, timeout: 1000 });
        answered += 1;
      } catch {}
    }
  }
  return answered;
}

async function visibleText(page) {
  return page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
}

async function clickByText(page, pattern, { final = false } = {}) {
  return page.evaluate(({ source, finalSource, final }) => {
    const pattern = new RegExp(source, 'i');
    const finalPattern = new RegExp(finalSource, 'i');
    const controls = Array.from(document.querySelectorAll('button,a,input[type="submit"],input[type="button"],[role="button"]'));
    for (const element of controls) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || !element.getClientRects().length) continue;
      const text = [element.textContent, element.value, element.getAttribute('aria-label'), element.getAttribute('title')]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (!pattern.test(text)) continue;
      if (!final && finalPattern.test(text)) continue;
      element.scrollIntoView({ block: 'center' });
      element.click();
      return text;
    }
    return '';
  }, { source: pattern.source, finalSource: finalSubmit.source, final }).catch(() => '');
}

async function hasByText(page, pattern) {
  return page.evaluate(({ source }) => {
    const pattern = new RegExp(source, 'i');
    const controls = Array.from(document.querySelectorAll('button,a,input[type="submit"],input[type="button"],[role="button"]'));
    return controls.some((element) => {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || !element.getClientRects().length) return false;
      const text = [element.textContent, element.value, element.getAttribute('aria-label'), element.getAttribute('title')]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      return pattern.test(text);
    });
  }, { source: pattern.source }).catch(() => false);
}

async function waitUntilRegistered(page) {
  for (let i = 0; i < 600; i += 1) {
    const text = await visibleText(page);
    const hasForm = await page.locator('input,textarea,select').count().catch(() => 0);
    if (!loginSignals.test(text) || hasForm > 4) return true;
    await page.bringToFront().catch(() => {});
    await page.waitForTimeout(1000);
  }
  return false;
}

async function fillForm(page, profile, meta) {
  let filled = 0;
  const fields = page.locator('input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]), textarea, select');
  const count = await fields.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const field = fields.nth(i);
    try {
      const tag = await field.evaluate((node) => node.tagName.toLowerCase());
      const type = await field.evaluate((node) => (node.getAttribute('type') || '').toLowerCase()).catch(() => '');
      if (type === 'checkbox' || type === 'radio') continue;
      const current = await field.inputValue({ timeout: 400 }).catch(() => '');
      const question = await questionForNode(field);
      if (current && !/salary|sueldo|renta|pretensi|email|correo|phone|telefono|cover|summary|resumen/i.test(question)) continue;
      const answer = answerFor(question, profile, meta);
      if (!answer) continue;
      if (tag === 'select') {
        const ok = await field.evaluate((node, answer) => {
          const wanted = answer.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const option = Array.from(node.options).find((item) => {
            const text = item.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            return text === wanted || text.includes(wanted) || wanted.includes(text);
          });
          if (!option) return false;
          node.value = option.value;
          node.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, answer);
        if (ok) filled += 1;
      } else {
        await field.scrollIntoViewIfNeeded({ timeout: 800 }).catch(() => {});
        await field.fill(answer, { timeout: 1200 });
        filled += 1;
      }
    } catch {}
  }

  filled += await fillRadios(page);

  const files = page.locator('input[type="file"]');
  const fileCount = await files.count().catch(() => 0);
  let uploaded = 0;
  if (existsSync(cvPath)) {
    for (let i = 0; i < fileCount; i += 1) {
      try {
        await files.nth(i).setInputFiles(cvPath);
        uploaded += 1;
      } catch {}
    }
  }
  return { filled, uploaded };
}

async function requiredEmpty(page) {
  return page.locator('input[required], input[aria-required="true"], textarea[required], textarea[aria-required="true"], select[required], select[aria-required="true"]').evaluateAll((fields) => {
    const missing = fields.filter((field) => {
      if (field.type === 'file') return !field.files?.length;
      if (field.tagName.toLowerCase() === 'select') return !field.value;
      if (field.type === 'radio') return !document.querySelector(`input[type="radio"][name="${CSS.escape(field.name)}"]:checked`);
      if (field.type === 'checkbox') return !field.checked;
      return !field.value?.trim();
    });
    const seenRadio = new Set();
    return missing.filter((field) => {
      if (field.type !== 'radio') return true;
      if (seenRadio.has(field.name)) return false;
      seenRadio.add(field.name);
      return true;
    }).length;
  }).catch(() => 0);
}

async function processUrl(context, url, profile) {
  const page = await context.newPage();
  await page.bringToFront().catch(() => {});
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  let text = await visibleText(page);
  if (loginSignals.test(text) && waitForUser) {
    log(`Registro/login requerido: ${page.url()}`);
    log('Deje la pantalla al frente. Completa registro/login y el agente retomara automaticamente.');
    await page.bringToFront().catch(() => {});
    await waitUntilRegistered(page);
  }

  const meta = await page.evaluate(() => {
    const title = document.querySelector('h1')?.textContent?.trim() || document.title;
    const company = document.querySelector('[data-company], .company, .organization, h2')?.textContent?.trim() || 'la empresa';
    return { role: title, company };
  }).catch(() => ({ role: 'este cargo', company: 'la empresa' }));

  const clicked = await clickByText(page, startApply);
  if (clicked) {
    log(`Apply abierto con control: ${clicked}`);
    await page.waitForTimeout(2500);
  }

  for (let step = 0; step < 8; step += 1) {
    const result = await fillForm(page, profile, meta);
    log(`Paso ${step + 1}: campos=${result.filled}, cv=${result.uploaded}`);

    text = await visibleText(page);
    if (unresolvedHardStop.test(text)) {
      const emptyAfterFill = await requiredEmpty(page);
      if (emptyAfterFill > 0) {
        log(`PAUSA ${meta.company} - ${meta.role}: pregunta sensible o declaracion no resuelta.`);
        await page.bringToFront().catch(() => {});
        return { status: 'paused', reason: 'hard-stop', url: page.url(), meta };
      }
    }

    const empty = await requiredEmpty(page);
    if (empty > 0) {
      log(`PAUSA ${meta.company} - ${meta.role}: ${empty} campos requeridos siguen vacios.`);
      await page.bringToFront().catch(() => {});
      return { status: 'paused', reason: `${empty} required empty`, url: page.url(), meta };
    }

    if (!autoSubmit && await hasByText(page, finalSubmit)) {
      log(`PREPARADA ${meta.company} - ${meta.role}: encontre boton final, autoSubmit off.`);
      await page.bringToFront().catch(() => {});
      return { status: 'prepared', reason: 'autoSubmit off', url: page.url(), meta };
    }

    const final = autoSubmit ? await clickByText(page, finalSubmit, { final: true }) : '';
    if (final) {
      await page.waitForTimeout(3000);
      const after = await visibleText(page);
      const sent = /postulaci[oó]n enviada|solicitud enviada|application sent|thank you|gracias por postular|recibimos tu postulaci/i.test(after);
      log(`${sent ? 'ENVIADA' : 'FINAL CLICKEADO'} ${meta.company} - ${meta.role}`);
      return { status: sent ? 'submitted' : 'clicked-final', url: page.url(), meta };
    }

    const next = await clickByText(page, nextStep);
    if (!next) {
      log(`PAUSA ${meta.company} - ${meta.role}: no encontre siguiente/final.`);
      await page.bringToFront().catch(() => {});
      return { status: 'paused', reason: 'no next/final', url: page.url(), meta };
    }
    await page.waitForTimeout(2500);
  }
  return { status: 'paused', reason: 'max steps', url: page.url(), meta };
}

async function main() {
  if (!urls.length) throw new Error('Usage: node output/external-apply-assistant.mjs <job-url> [more urls...]');
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const profile = loadProfile();
  const results = [];
  for (const url of urls) {
    log(`Procesando postulacion externa: ${url}`);
    results.push(await processUrl(context, url, profile));
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});
