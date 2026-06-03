const modalSelector = '.jobs-easy-apply-modal, [role="dialog"]';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applicationText(profile, title = 'este cargo') {
  return `Hola:

Me interesa postular a ${title}. Estoy orientando mi carrera hacia programacion en el area TI y cuento con base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion y manejo de datos.

Mis proyectos principales son AMILAB Frontend, AMILAB Backend, Inventario App y Exelcior Apolo. En ellos he trabajado con frontend, backend serverless, Firebase/Firestore, SQL, generacion de reportes, validaciones, tests y automatizacion de procesos.

Ademas, mi experiencia previa en laboratorio clinico y logistica me dio disciplina con datos, trazabilidad, documentacion, inventario y trabajo con usuarios reales. Esa combinacion me ayuda a entender procesos operativos y convertirlos en soluciones digitales utiles.

Quedo atento.
${profile.fullName || ''}`;
}

function numericExperienceAnswer(question) {
  return '1';
}

export function answerQuestion(question, profile, title = '') {
  const q = normalizeText(question);

  if (/pretension|renta|salario|sueldo|salary|compensacion/.test(q)) {
    const match = String(profile.salary || '').match(/\d[\d. ]+/);
    return match ? match[0].replace(/[. ]/g, '') : '900000';
  }
  if (/codigo del pais|country code|phone country/.test(q)) return 'Chile (+56)';
  if (/email|correo/.test(q)) return profile.email || '';
  if (/telefono|phone|celular|mobile/.test(q)) return profile.phone || '';
  if (/linkedin/.test(q)) return profile.linkedin || '';
  if (/github/.test(q)) return profile.github || '';
  if (/portfolio|portafolio|website|sitio/.test(q)) return profile.portfolio || profile.github || '';
  if (/ciudad|city|ubicacion|location|comuna|region/.test(q)) return `${profile.city || 'Santiago'}, ${profile.country || 'Chile'}`;
  if (/disponibilidad|availability/.test(q)) return profile.availability || 'Inmediata o segun coordinacion';
  if (/modalidad|remoto|remote|hibrid|presencial/.test(q)) return profile.modality || 'Teletrabajo o modalidad semipresencial en Santiago.';
  if (/visa|patrocinio|sponsor|autorizado|work authorization/.test(q)) return 'No requiero patrocinio para trabajar en Chile.';
  if (/2\s*anos|2\s*años|dos\s*anos|dos\s*años|minimo.*experiencia|experiencia.*similar/.test(q)) return 'No';
  if (/formacion.*universitaria|ingenieria.*informatica|ingenieria.*datos|carrera.*afin|carrera.*af[ií]n/.test(q)) return 'Si';
  if (/herramientas.*analisis.*datos|analisis.*datos|sql.*python|python.*sql|aws|r studio|rstudio/.test(q)) return 'Si';
  if (/data mesh|data lake/.test(q)) return 'No';
  if (/anos|años|years|experiencia/.test(q)) return numericExperienceAnswer(question);
  if (/por que|why|motivacion|cover letter|carta|mensaje|comentario|presentacion|about you|perfil/.test(q)) {
    return applicationText(profile, title);
  }

  return '';
}

export function answerYesNo(question) {
  const q = normalizeText(question);
  if (/2\s*anos|2\s*años|dos\s*anos|dos\s*años|minimo.*experiencia|experiencia.*similar/.test(q)) return 'No';
  if (/formacion.*universitaria|ingenieria.*informatica|ingenieria.*datos|carrera.*afin|carrera.*af[ií]n/.test(q)) return 'Si';
  if (/herramientas.*analisis.*datos|analisis.*datos|sql.*python|python.*sql|aws|r studio|rstudio/.test(q)) return 'Si';
  if (/data mesh|data lake/.test(q)) return 'No';
  if (/visa|sponsor|patrocinio/.test(q)) return 'No';
  if (/\.net|c#|csharp|angular|aws|docker|redis|kubernetes|go\b|golang/.test(q)) return 'No';
  if (/sql|base de datos|database|oracle|postgres|mysql|sqlite/.test(q)) return 'Si';
  if (/javascript|typescript|react|frontend|front-end|python|automatizacion|automation|git|github|api|rest/.test(q)) return 'Si';
  if (/laboratorio|clinico|salud|health|inventario|logistica|datos|reportes/.test(q)) return 'Si';
  if (/remoto|remote|hibrid|presencial|santiago|chile/.test(q)) return 'Si';
  return '';
}

async function questionText(field) {
  return field.evaluate((node) => {
    const id = node.getAttribute('id');
    const aria = node.getAttribute('aria-label') || '';
    const placeholder = node.getAttribute('placeholder') || '';
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const labelledBy = node.getAttribute('aria-labelledby')
      ?.split(/\s+/)
      .map((item) => document.getElementById(item)?.textContent || '')
      .join(' ');
    const container = node.closest('fieldset, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element, div');
    return [aria, placeholder, label?.textContent, labelledBy, container?.textContent]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }).catch(() => '');
}

async function chooseSelect(field, answer) {
  const options = await field.locator('option').evaluateAll((items) =>
    items.map((item) => ({ value: item.value, text: item.textContent?.trim() || '' })),
  ).catch(() => []);
  const wanted = normalizeText(answer);
  const match = options.find((option) => normalizeText(option.text) === wanted)
    || options.find((option) => normalizeText(option.text).includes(wanted))
    || options.find((option) => wanted.includes(normalizeText(option.text)));
  if (!match?.value) return false;
  await field.selectOption(match.value, { timeout: 1500 });
  return true;
}

async function chooseYesNo(page, question, answer) {
  const dialog = page.locator(modalSelector).last();
  const pattern = new RegExp(answer === 'Si' ? '^(si|s[ií]|yes)$' : '^(no)$', 'i');
  const questionPattern = new RegExp(escapeRegExp(question).slice(0, 70), 'i');
  const group = dialog.locator('fieldset, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element')
    .filter({ hasText: questionPattern })
    .first();
  const locators = [
    group.getByRole('radio', { name: pattern }),
    group.getByRole('button', { name: pattern }),
    group.getByText(pattern),
  ];
  for (const locator of locators) {
    try {
      const first = locator.first();
      if (!(await first.count())) continue;
      await first.click({ timeout: 1500 });
      return true;
    } catch {}
  }
  return false;
}

export async function answerDynamicQuestions(page, profile, title = '') {
  const dialog = page.locator(modalSelector).last();
  const fields = dialog.locator('input:not([type="hidden"]):not([type="file"]), textarea, select');
  const count = await fields.count().catch(() => 0);
  let answered = 0;

  for (let i = 0; i < count; i += 1) {
    try {
      const field = fields.nth(i);
      const tag = await field.evaluate((node) => node.tagName.toLowerCase());
      const type = await field.evaluate((node) => (node.getAttribute('type') || '').toLowerCase()).catch(() => '');
      if (type === 'radio' || type === 'checkbox') continue;

      const current = await field.inputValue({ timeout: 300 }).catch(() => '');

      const question = await questionText(field);
      const answer = answerQuestion(question, profile, title) || (tag === 'select' ? answerYesNo(question) : '');
      if (!answer) continue;
      if (current && tag !== 'select' && current === answer) continue;
      if (current && tag !== 'select' && !/pretension|renta|salario|sueldo|salary|compensacion/i.test(question)) continue;

      if (tag === 'select') {
        if (await chooseSelect(field, answer)) answered += 1;
      } else {
        await field.fill(answer, { timeout: 1500 });
        answered += 1;
      }
      console.log(`Answered: ${question.slice(0, 90)} -> ${answer}`);
    } catch {}
  }

  const groups = dialog.locator('fieldset, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element');
  const groupCount = await groups.count().catch(() => 0);
  for (let i = 0; i < groupCount; i += 1) {
    try {
      const text = (await groups.nth(i).innerText({ timeout: 500 }).catch(() => '')).replace(/\s+/g, ' ').trim();
      const answer = answerYesNo(text);
      if (!answer) continue;
      if (await chooseYesNo(page, text, answer)) {
        answered += 1;
        console.log(`Selected: ${text.slice(0, 90)} -> ${answer}`);
      }
    } catch {}
  }

  return answered;
}
