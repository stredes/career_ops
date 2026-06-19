import { findSimilarQuestionAnswer, recordApplicationQuestions } from './application-question-bank.mjs';

const modalSelector = '.jobs-easy-apply-modal';
const stretchApply = process.env.LINKEDIN_STRETCH_APPLY === '1';

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

Me interesa postular a ${title}. Estoy orientando mi carrera hacia programacion en el area TI y cuento con base practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, inventario y aplicaciones moviles.

Mis proyectos principales son Exelcior Apolo para automatizacion y validacion de Excel, Amiweb/AMILAB para desarrollo web, Inventario App para gestion de inventario y reportes, y una aplicacion movil privada para HC Soluciones. Trabajo con Python, React, TypeScript, Firebase/Firestore, SQL, Git/GitHub, Arch Linux y Debian.

Actualmente mantengo proyectos activos para AMILAB, Tamapal y HC Soluciones, lo que me permite practicar con necesidades reales, documentacion, usuarios, procesos operativos y soluciones digitales utiles.

Quedo atento.
${profile.fullName || ''}`;
}

function numericExperienceAnswer(question) {
  const q = normalizeText(question);
  if (stretchApply) return '1';
  if (/5\s*(anos|años|years)|cinco\s*(anos|años)|senior|lider|lead|arquitect/.test(q)) return '';
  if (/3\s*(anos|años|years)|tres\s*(anos|años)/.test(q)) return '';
  if (/2\s*(anos|años|years)|dos\s*(anos|años)/.test(q)) return '';
  return '1';
}

function answerLooksCompatible(answer, kind) {
  const value = String(answer || '').trim();
  if (!value) return false;
  if (kind === 'number') return /^\d+([.,]\d+)?$/.test(value);
  if (kind === 'yesno' || kind === 'select') return /^(si|sí|sÃ­|yes|no)$/i.test(value);
  if (kind === 'short') return value.length <= 120;
  return true;
}

function rememberedAnswer(question, kind = 'text') {
  const remembered = findSimilarQuestionAnswer(question, { platform: 'LinkedIn' });
  if (!remembered) return '';
  return answerLooksCompatible(remembered.answer, kind) ? remembered.answer : '';
}

function isNumericQuestion(question) {
  const q = normalizeText(question);
  return /cuanto tiempo|cuantos anos|cuantos aÃ±os|cuantos años|how long|how many years|years of|anos de experiencia|aÃ±os de experiencia|años de experiencia|tiempo de experiencia|escala.*1.*5|1.*5|capacidad.*analizar datos|presentar conclusiones|nivel.*1.*6|1.*6|a1.*c2|c2|expectativa.*usd|salary.*usd|renta liquida|renta líquida|pretension|pretensión|salary|sueldo|remuneracion|remuneración/.test(q);
}

function answerNumber(question, profile) {
  const q = normalizeText(question);
  if (/escala.*1.*5|1.*5|capacidad.*analizar datos|presentar conclusiones/.test(q)) return '4';
  if (/usd|dolar|dolares|contractor/.test(q) && /salary|salario|sueldo|renta|expectation|expectativa|pretension|remuneracion/.test(q)) return '900';
  if (/pretension|renta|salario|sueldo|salary|compensacion|remuneracion|liquida|liquido/.test(q)) return '800000';
  if (/bigquery|gcp|google cloud|databricks|spark|flutter|dart|angular|java|spring|golang|go\b|docker|kubernetes|jenkins|gitlab ci/.test(q)) return '0';
  if (/nivel.*ingles|ingles.*1.*6|english.*1.*6|a1.*c2|c2/.test(q)) return '2';
  if (/github actions|ci\/cd|cicd|python|typescript|javascript|react|bash|linux|git\b|api|rest|sql|postgres|mysql|sqlite|automatizacion|automation|qa|testing|mobile testing|react native/.test(q)) return '1';
  return numericExperienceAnswer(question) || '1';
}

export function answerQuestion(question, profile, title = '', kind = 'text') {
  const q = normalizeText(question);

  if (/first name|nombre\b/.test(q) && !/full|completo|last|apellido/.test(q)) return 'Gian';
  if (/last name|apellido/.test(q)) return 'San Martin Agurto';
  if (/full name|nombre completo/.test(q)) return profile.fullName || 'Gian Lucas San Martin Agurto';
  if (/codigo del pais|country code|phone country/.test(q)) return 'Chile (+56)';
  if (/email|correo/.test(q)) return profile.email || 'gianlucassanmartin@gmail.com';
  if (/telefono|phone|celular|mobile/.test(q)) return profile.phone || '+56954764325';
  if (/ciudad|city|ubicacion|location|comuna|region/.test(q)) return `${profile.city || 'Santiago'}, ${profile.country || 'Chile'}`;

  if (kind === 'number' || isNumericQuestion(question)) {
    return rememberedAnswer(question, 'number') || answerNumber(question, profile);
  }
  if (kind === 'yesno' || kind === 'select') {
    if (/ingl|english|idioma|language/.test(q)) {
      if (/conversaci[oó]n|conversation|conversational/.test(q)) return 'Conversación';
      if (/basico|b[aá]sico|basic/.test(q)) return 'Básico';
      return 'Conversación';
    }
    if (/yes\s+no|si\s+no|s[ií]\s+no|selecciona una opci[oó]n\s+yes\s+no/.test(q)) {
      return answerYesNo(question) || rememberedAnswer(question, 'yesno');
    }
    const rememberedSelect = rememberedAnswer(question, 'select');
    return /^(si|sí|sÃ­|yes|no)$/i.test(rememberedSelect) ? '' : rememberedSelect;
  }

  if (/usd|dolar|dolares|contractor/.test(q) && /salary|salario|sueldo|renta|expectation|expectativa|pretension|remuneracion/.test(q)) {
    return '900';
  }
  if (/pretension|renta|salario|sueldo|salary|compensacion|remuneracion|liquida|liquido/.test(q)) {
    const match = String(profile.salary || '').match(/\d[\d. ]+/);
    return match ? match[0].replace(/[. ]/g, '') : '900000';
  }
  if (/cuanto tiempo|cuantos anos|cuantos años|how long|how many years/.test(q)
    && /github actions|gitlab ci|jenkins|ci\/cd|cicd|python|typescript|javascript|react|bash|linux|git\b|docker|kubernetes|aws|azure|gcp|flutter|dart|angular|java|spring|golang|go\b/.test(q)) {
    if (/java|spring|golang|go\b|docker|kubernetes|jenkins|gitlab ci|flutter|dart|angular|gcp|bigquery|databricks|spark/.test(q)) return '0';
    return '1';
  }
  if (/bigquery/.test(q)) return '0';
  if (/nivel.*ingles|ingles.*1.*6|a1.*c2|c2/.test(q)) return '2';
  if (/anos|aÃ±os|years|experiencia/.test(q) && /cuantos|cuanto|how many|tiempo|anos|aÃ±os|years/.test(q)) {
    return numericExperienceAnswer(question);
  }
  const remembered = rememberedAnswer(question, kind === 'short' ? 'short' : 'text');
  if (remembered) return remembered;
  if (/linkedin/.test(q)) return profile.linkedin || '';
  if (/github/.test(q)) return profile.github || '';
  if (/portfolio|portafolio|website|sitio/.test(q)) return profile.portfolio || profile.github || '';
  if (/disponibilidad|availability/.test(q)) return profile.availability || 'Inmediata o segun coordinacion';
  if (/modalidad|remoto|remote|hibrid|presencial/.test(q)) return profile.modality || 'Teletrabajo o modalidad semipresencial en Santiago.';
  if (/advanced|professional|fluent|native|avanzado|fluido|nativo/.test(q) && /ingles|english|idioma|language/.test(q)) return stretchApply ? 'No' : '';
  if (/intermediate|conversational|intermedio|conversacional/.test(q) && /ingles|english|idioma|language/.test(q)) {
    return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
  }
  if (/ingles|english|idioma|language/.test(q)) return 'Basico (A2)';
  if (/visa|patrocinio|sponsor|autorizado|work authorization/.test(q)) return 'No requiero patrocinio para trabajar en Chile.';
  if (/2\s*anos|2\s*años|dos\s*anos|dos\s*años|minimo.*experiencia|experiencia.*similar/.test(q)) return 'No';
  if (/formacion.*universitaria|ingenieria.*informatica|ingenieria.*datos|carrera.*afin|carrera.*af[ií]n/.test(q)) {
    return 'Analista Programador en formacion en Duoc UC, con foco en desarrollo de software, automatizacion y datos.';
  }
  if (/r studio|rstudio/.test(q)) return '';
  if (/herramientas.*analisis.*datos|analisis.*datos|sql.*python|python.*sql|aws/.test(q)) return 'Si';
  if (/data mesh|data lake/.test(q)) return 'No';
  if (/anos|años|years|experiencia/.test(q)) return numericExperienceAnswer(question);
  if (/por que|why|motivacion|cover letter|carta|mensaje|comentario|presentacion|about you|perfil/.test(q)) {
    return applicationText(profile, title);
  }

  return '';
}

export function answerYesNo(question) {
  const remembered = findSimilarQuestionAnswer(question, { platform: 'LinkedIn' });
  if (remembered && /^(si|sí|yes|no)$/i.test(remembered.answer.trim())) {
    return remembered.answer.trim().replace(/^sí$/i, 'Si').replace(/^yes$/i, 'Si');
  }
  const q = normalizeText(question);
  if (/2\s*anos|2\s*años|dos\s*anos|dos\s*años|minimo.*experiencia|experiencia.*similar/.test(q)) return 'No';
  if (/formacion.*universitaria|ingenieria.*informatica|ingenieria.*datos|carrera.*afin|carrera.*af[ií]n/.test(q)) return '';
  if (/r studio|rstudio/.test(q)) return '';
  if (/herramientas.*analisis.*datos|analisis.*datos|sql.*python|python.*sql|aws/.test(q)) return 'Si';
  if (/data mesh|data lake/.test(q)) return 'No';
  if (/gcp|google cloud|bigquery|databricks|spark|lenguaje r|\\br\\b/.test(q)) return 'No';
  if (/retail|comercio exterior/.test(q)) return 'No';
  if (/hibrid|presencial.*las condes|las condes/.test(q)) return 'Si';
  if (/visa|sponsor|patrocinio/.test(q)) return 'No';
  if (/advanced|professional|fluent|native|avanzado|fluido|nativo/.test(q) && /ingles|english|idioma|language/.test(q)) return stretchApply ? 'No' : '';
  if (/intermediate|conversational|intermedio|conversacional/.test(q) && /ingles|english|idioma|language/.test(q)) return 'Si';
  if (/ingles|english|idioma|language/.test(q)) return '';
  if (/\.net|c#|csharp|angular|aws|docker|redis|kubernetes|go\b|golang/.test(q)) return 'No';
  if (/sql|base de datos|database|oracle|postgres|mysql|sqlite/.test(q)) return 'Si';
  if (/javascript|typescript|react|frontend|front-end|python|automatizacion|automation|git|github|api|rest/.test(q)) return 'Si';
  if (/inventario|datos|reportes/.test(q)) return 'Si';
  if (/laboratorio|clinico|salud|health|logistica/.test(q)) return '';
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
    const direct = [aria, placeholder, label?.textContent, labelledBy].filter(Boolean).join(' ');
    return (direct || container?.textContent || '')
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

export async function answerDynamicQuestions(page, profile, title = '', context = {}) {
  const dialog = page.locator(modalSelector).last();
  const fields = dialog.locator('input:not([type="hidden"]):not([type="file"]), textarea, select');
  const count = await fields.count().catch(() => 0);
  let answered = 0;
  const capturedAnswers = [];

  for (let i = 0; i < count; i += 1) {
    try {
      const field = fields.nth(i);
      const tag = await field.evaluate((node) => node.tagName.toLowerCase());
      const type = await field.evaluate((node) => (node.getAttribute('type') || '').toLowerCase()).catch(() => '');
      if (type === 'radio' || type === 'checkbox') continue;

      const current = await field.inputValue({ timeout: 300 }).catch(() => '');

      const fieldId = await field.getAttribute('id').catch(() => '');
      const question = (await questionText(field)) || fieldId || '';
      const kind = tag === 'select'
        ? 'select'
        : tag === 'textarea'
          ? 'text'
          : (type === 'number' || isNumericQuestion(question))
            ? 'number'
            : 'short';
      const looksLikeYesNoSelect = /yes\s+no|si\s+no|s[iÃ­]\s+no|selecciona una opci[oÃ³]n\s+yes\s+no/i.test(question);
      const answer = answerQuestion(question, profile, title, kind) || (tag === 'select' && looksLikeYesNoSelect ? answerYesNo(question) : '');
      if (!answer) continue;
      if (current && tag !== 'select' && current === answer) continue;
      if (current && tag !== 'select' && !/pretension|renta|salario|sueldo|salary|compensacion|remuneracion|liquida|liquido/i.test(question)) continue;

      if (tag === 'select') {
        if (await chooseSelect(field, answer)) {
          answered += 1;
          capturedAnswers.push({ question, answer });
        }
      } else {
        await field.fill(answer, { timeout: 1500 });
        if (/location|ubicacion|geo-location/i.test(`${question} ${fieldId}`)) {
          await field.press('ArrowDown', { timeout: 800 }).catch(() => {});
          await field.press('Enter', { timeout: 800 }).catch(() => {});
        }
        answered += 1;
        capturedAnswers.push({ question, answer });
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
        capturedAnswers.push({ question: text, answer });
        console.log(`Selected: ${text.slice(0, 90)} -> ${answer}`);
      }
    } catch {}
  }

  recordApplicationQuestions({
    platform: 'LinkedIn',
    company: context.company || '',
    role: title,
    url: page.url(),
    status: 'answered',
    answers: capturedAnswers,
  });

  return answered;
}
