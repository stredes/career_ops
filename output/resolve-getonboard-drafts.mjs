import { chromium } from 'playwright';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const logPath = resolve(ROOT, 'output/direct-apply-agent.log');
const cvPath = resolve(ROOT, 'output/cv-gian-programador-ti.pdf');
const autoSubmit = process.env.AUTO_SUBMIT_DIRECT === '1';

const reasons = {
  magnet: `Me interesa este rol porque combina backend, APIs REST, React y bases de datos, areas donde ya he construido proyectos practicos como AMILAB Backend/Frontend e Inventario App. Estoy en formacion como Analista Programador y busco crecer en un equipo donde pueda aportar con codigo, orden, documentacion y aprendizaje rapido. Mi experiencia previa en laboratorio y logistica tambien me ayuda a entender procesos reales, datos operativos y necesidades de usuarios.`,
  'bc tecnologia': `Me interesa este rol porque conecta soporte operativo, sistemas, monitoreo y resolucion de incidentes, areas donde puedo aportar con orden, seguimiento y aprendizaje tecnico. Estoy en formacion como Analista Programador y cuento con base en Python, SQL, Git/GitHub, datos y automatizacion. Mi experiencia en laboratorio y logistica me dio disciplina con procesos, registros, trazabilidad y trabajo con usuarios reales.`,
  'bc technology': `I am interested in this role because it combines operational support, systems monitoring and incident resolution, areas where I can contribute with discipline, clear follow-up and fast technical learning. I am currently training as an Analyst Programmer and I have practical foundations in Python, SQL, Git/GitHub, data workflows and automation. My previous experience in clinical laboratory and logistics also gives me strong attention to process, traceability, records and real user needs.`,
  ameris: `Me interesa este rol porque combina QA, desarrollo junior, validacion y datos. Estoy en formacion como Analista Programador y cuento con base en Python, JavaScript, TypeScript, SQL, APIs REST, testing y documentacion. Mi experiencia previa en laboratorio clinico y logistica me dio atencion al detalle, control de calidad, trazabilidad y criterio para detectar errores que impactan procesos reales.`,
  default: `Me interesa esta oportunidad porque calza con mi busqueda de crecimiento en el area TI como Analista Programador en formacion. Cuento con base practica en Python, JavaScript, TypeScript, SQL, React, APIs REST, testing, datos y automatizacion. Ademas, mi experiencia previa en laboratorio y logistica me ayuda a entender procesos reales, trabajar con orden y aportar con criterio operativo.`,
};

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`, 'utf8');
}

function reasonFor(text = '') {
  if (/english|ingl[eé]s/i.test(text) && /bc tecnolog/i.test(text)) return reasons['bc technology'];
  const key = Object.keys(reasons).find((item) => text.toLowerCase().includes(item));
  return reasons[key] || reasons.default;
}

async function visibleText(page) {
  return page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
}

async function setDomValue(locator, value) {
  await locator.evaluate((node, nextValue) => {
    const prototype = node instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(node, nextValue);
    else node.value = nextValue;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    node.dispatchEvent(new Event('blur', { bubbles: true }));
  }, value);
}

async function fillDraft(page) {
  const body = await visibleText(page);
  const reason = reasonFor(body);

  const textareas = page.locator('textarea');
  for (let i = 0, count = await textareas.count().catch(() => 0); i < count; i += 1) {
    try {
      const field = textareas.nth(i);
      const current = await field.inputValue({ timeout: 300 }).catch(() => '');
      if (current.length < 50 || current.length > 1000) {
        await field.fill(reason, { timeout: 1000 }).catch(() => {});
        await setDomValue(field, reason).catch(() => {});
      }
    } catch {}
  }

  const editors = page.locator('[contenteditable="true"]');
  for (let i = 0, count = await editors.count().catch(() => 0); i < count; i += 1) {
    try {
      const editor = editors.nth(i);
      const current = (await editor.innerText({ timeout: 300 }).catch(() => '')).trim();
      if (current.length < 50 || current.length > 1000) {
        await editor.click({ timeout: 1000 });
        await page.keyboard.press('Control+A').catch(() => {});
        await page.keyboard.insertText(reason);
      }
    } catch {}
  }

  const inputs = page.locator('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])');
  for (let i = 0, count = await inputs.count().catch(() => 0); i < count; i += 1) {
    try {
      const input = inputs.nth(i);
      const current = await input.inputValue({ timeout: 300 }).catch(() => '');
      if (current) continue;
      const label = await input.evaluate((node) => {
        const id = node.getAttribute('id');
        const el = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const parent = node.closest('label, div, fieldset, section');
        return [node.getAttribute('aria-label'), node.getAttribute('placeholder'), el?.textContent, parent?.textContent]
          .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
      }).catch(() => '');
      let value = reason;
      if (!label.trim()) continue;
      if (/renta|salario|sueldo|pretension|expectativa/.test(label)) value = '900';
      if (/telefono|phone|celular/.test(label)) value = '+56954764325';
      if (/email|correo/.test(label)) value = 'gianlucassanmartin@gmail.com';
      if (/linkedin/.test(label)) value = 'https://www.linkedin.com/in/gian-lucas-san-martin-49ab29323/';
      if (/github|portafolio|portfolio/.test(label)) value = 'https://github.com/stredes';
      await input.fill(value, { timeout: 1000 }).catch(() => {});
      await setDomValue(input, value).catch(() => {});
    } catch {}
  }

  const selects = page.locator('select');
  for (let i = 0, count = await selects.count().catch(() => 0); i < count; i += 1) {
    try {
      const select = selects.nth(i);
      const selected = await select.inputValue({ timeout: 300 }).catch(() => '');
      if (selected) continue;
      const options = await select.locator('option').evaluateAll((items) => items
        .map((option) => ({ value: option.value, text: option.textContent?.trim() || '' }))
        .filter((option) => option.value || option.text));
      const answer = options.find((option) => /s[ií]|yes/i.test(option.text))
        || options.find((option) => !/selecciona|select|choose/i.test(option.text));
      if (answer?.value) await select.selectOption(answer.value, { timeout: 1000 }).catch(() => {});
    } catch {}
  }

  if (existsSync(cvPath)) {
    const files = page.locator('input[type="file"]');
    for (let i = 0, count = await files.count().catch(() => 0); i < count; i += 1) {
      try { await files.nth(i).setInputFiles(cvPath); } catch {}
    }
  }
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

async function resolveOpenDraft(page) {
  for (let step = 0; step < 8; step += 1) {
    await fillDraft(page);
    const text = await visibleText(page);
    const isPreview = /step=(preview|review|vista)/i.test(page.url()) || /enviar postulaci[oó]n ahora/i.test(text);

    if (isPreview) {
      const submit = await clickByText(page, [/enviar postulaci[oó]n ahora/, /enviar solicitud/, /submit application/, /^enviar$/]);
      if (submit) {
        log(autoSubmit ? `Clicked final submit: ${submit}` : `Final submit visible: ${submit}`);
        await page.waitForTimeout(2500);
        const after = `${page.url()}\n${await visibleText(page)}`;
        if (!/validation_failed=true|tiene errores|campos marcados/i.test(after)) return true;
      }
    }

    const next = await clickByText(page, [/^siguiente$/, /^continuar$/, /guardar y continuar/, /^vista previa$/]);
    if (!next) {
      log(`Draft stopped without next button at ${page.url()}`);
      return false;
    }
    log(`Advanced draft: ${next}`);
    await page.waitForTimeout(2200);
  }
  return false;
}

async function main() {
  const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages().find((item) => !item.isClosed()) || await context.newPage();
  await page.goto('https://www.getonbrd.com/applications?ref=sidebar_nav', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  log('Resolving Get on Board drafts.');

  for (let i = 0; i < 8; i += 1) {
    const clicked = await clickByText(page, [/por enviar/, /pendiente/, /editar/, /continuar/, /borrador/]);
    if (!clicked) {
      log('No more obvious draft controls found.');
      break;
    }
    log(`Opened draft: ${clicked}`);
    await page.waitForTimeout(2500);
    await resolveOpenDraft(page);
    await page.goto('https://www.getonbrd.com/applications?ref=sidebar_nav', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
  }
}

main().catch((error) => {
  log(`ERROR ${error.stack || error.message || error}`);
  process.exit(1);
});
