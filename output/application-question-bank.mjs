import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const jsonlPath = resolve(ROOT, 'data/application-questions.jsonl');
const mdPath = resolve(ROOT, 'data/application-questions.md');

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokens(value) {
  const stopwords = new Set([
    'con', 'del', 'las', 'los', 'una', 'uno', 'para', 'por', 'que', 'cual', 'cuales',
    'indique', 'comente', 'cuenta', 'tiene', 'favor', 'maximo', 'caracteres', 'actualizado',
    'actualizados', 'pregunta', 'seleccion', 'respuesta', 'cargo', 'este', 'esta', 'estas',
    'numero', 'electronico', 'electronica', 'actualizada', 'actualizadas', 'datos',
  ]);
  return normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word))
    .filter((word) => word.length > 2 && !stopwords.has(word));
}

function similarity(a, b) {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.92;

  const setA = new Set(tokens(normalizedA));
  const setB = new Set(tokens(normalizedB));
  if (!setA.size || !setB.size) return 0;
  let overlap = 0;
  for (const token of setA) if (setB.has(token)) overlap += 1;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = overlap / union;
  const containment = overlap / Math.min(setA.size, setB.size);
  return Math.max(jaccard, containment * 0.96);
}

function memoryBlocked(question) {
  return /rut|discapacidad|compin|antecedentes|background|visa|patrocinio|sponsor|salud mental|enfermedad|diagnostico/i
    .test(normalize(question));
}

function questionCategory(question) {
  const q = normalize(question);
  if (/telefono|tel[eé]fono|celular|phone|mobile|numero de contacto|contacto|correo|email|e-mail/.test(q)) return 'contact';
  if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa/.test(q)) return 'salary';
  if (/comuna|residencia|ciudad|ubicacion|ubicaci[oó]n|location|city/.test(q)) return 'location';
  if (/titulo|t[ií]tulo|formacion|formaci[oó]n|estudios|casa de estudios|academica|acad[eé]mica/.test(q)) return 'education';
  if (/disponibilidad/.test(q)) return 'availability';
  if (/ingles|english/.test(q)) return 'english';
  if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'license_b';
  if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'transport';
  if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'safety_shoes';
  if (/python.*playwright|playwright.*python/.test(q)) return 'python_playwright';
  if (/sql.*python.*excel|nivel.*sql|nivel.*python|nivel.*excel/.test(q)) return 'sql_python_excel';
  if (/automatizacion|automatizaci[oó]n|rpa/.test(q)) return 'automation';
  return '';
}

export function adaptAnswerToQuestion(question, answer) {
  const q = normalize(question);
  const original = clean(answer);
  if (!original) return '';

  const asksPhone = /telefono|tel[eé]fono|celular|phone|mobile|numero de contacto|contacto/.test(q);
  const asksEmail = /correo|email|e-mail/.test(q);
  if (asksPhone && asksEmail) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
  if (asksPhone && !asksEmail) return '+56954764325';
  if (asksEmail && !asksPhone) return 'gianlucassanmartin@gmail.com';

  if (/comuna|residencia|ciudad|ubicacion|ubicaci[oó]n|location|city/.test(q)) {
    return 'Santiago, Region Metropolitana.';
  }

  if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa/.test(q)) {
    if (/brut/.test(q)) return 'Mis expectativas de renta bruta estan en torno a $1.100.000 CLP, conversable segun modalidad, beneficios y proyeccion.';
    if (/usd|dolar|d[oó]lar/.test(q)) return '900 USD mensuales, conversable segun modalidad, beneficios y proyeccion.';
    return 'Mis expectativas de renta liquida estan en torno a $900.000 CLP, conversable segun modalidad, beneficios y proyeccion.';
  }

  if (/titulo|t[ií]tulo|formacion|formaci[oó]n|estudios|casa de estudios|academica|acad[eé]mica/.test(q)) {
    return 'Estudiante de Analista Programador en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
  }

  if (/disponibilidad/.test(q)) return 'Disponibilidad inmediata o segun coordinacion.';
  if (/ingles|english/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
  if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
  if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No cuento con vehiculo propio; puedo coordinar traslado segun ubicacion y horario.';
  if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No cuento actualmente con zapatos de seguridad.';

  if (/python.*playwright|playwright.*python/.test(q)) {
    return 'Python: nivel practico intermedio para automatizacion, datos, reportes y scripting. Playwright: experiencia practica automatizando navegacion/formularios y pruebas basicas. Perfil junior con foco en aprender rapido.';
  }

  if (/herramienta.*automatizacion|herramienta.*automatizaci[oó]n|utilizado principalmente|usado principalmente|herramienta principal/.test(q)) {
    return original;
  }

  if (/sql.*python.*excel|nivel.*sql|nivel.*python|nivel.*excel/.test(q)) {
    return 'SQL: basico-intermedio para consultas y validaciones. Python: intermedio practico para automatizacion, reportes y datos. Excel: intermedio para registros, filtros, tablas, reportes y control operativo.';
  }

  if (/automatizacion|automatizaci[oó]n|rpa/.test(q)) {
    return 'Tengo experiencia practica automatizando procesos con Python: transformacion y validacion de archivos, reportes, control de inventario, flujos de datos y documentacion. Proyectos: Inventario App, Exelcior Apolo y AMILAB.';
  }

  return original;
}

function existingKeys() {
  if (!existsSync(jsonlPath)) return new Set();
  const keys = new Set();
  const content = readFileSync(jsonlPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (item.key) keys.add(item.key);
    } catch {}
  }
  return keys;
}

function ensureFiles() {
  mkdirSync(dirname(jsonlPath), { recursive: true });
  if (!existsSync(mdPath)) {
    appendFileSync(mdPath, '# Application Questions Bank\n\n', 'utf8');
  }
}

export function recordApplicationQuestions({
  platform,
  company = '',
  role = '',
  url = '',
  status = '',
  questions = [],
  answers = [],
}) {
  ensureFiles();
  const seen = existingKeys();
  const rows = [];

  for (const raw of questions) {
    const question = typeof raw === 'string' ? raw : raw?.question || raw?.label || '';
    const answer = typeof raw === 'object' ? raw?.answer || raw?.value || '' : '';
    rows.push({ question, answer });
  }

  for (const raw of answers) {
    const question = raw?.question || raw?.label || '';
    const answer = raw?.answer || raw?.value || '';
    rows.push({ question, answer });
  }

  const uniqueRows = [];
  const turnSeen = new Set();
  for (const row of rows) {
    const question = clean(row.question);
    if (!question) continue;
    const answer = clean(row.answer);
    const key = [
      normalize(platform),
      normalize(company),
      normalize(role),
      normalize(question),
      normalize(answer),
    ].join('|');
    if (seen.has(key) || turnSeen.has(key)) continue;
    turnSeen.add(key);
    uniqueRows.push({ key, question, answer });
  }

  if (!uniqueRows.length) return 0;

  const timestamp = new Date().toISOString();
  for (const row of uniqueRows) {
    const item = {
      key: row.key,
      timestamp,
      platform: clean(platform),
      company: clean(company),
      role: clean(role),
      url: clean(url),
      status: clean(status),
      question: row.question,
      answer: row.answer,
    };
    appendFileSync(jsonlPath, `${JSON.stringify(item)}\n`, 'utf8');
    appendFileSync(
      mdPath,
      [
        `## ${timestamp} - ${clean(platform) || 'Portal'}`,
        `- Company: ${clean(company) || '-'}`,
        `- Role: ${clean(role) || '-'}`,
        `- Status: ${clean(status) || '-'}`,
        `- URL: ${clean(url) || '-'}`,
        `- Question: ${row.question}`,
        `- Answer: ${row.answer || '-'}`,
        '',
      ].join('\n'),
      'utf8',
    );
  }

  return uniqueRows.length;
}

export function readQuestionMemory() {
  if (!existsSync(jsonlPath)) return [];
  return readFileSync(jsonlPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((item) => item?.question && item?.answer)
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

export function findSimilarQuestionAnswer(question, {
  platform = '',
  minScore = 0.72,
  memory = readQuestionMemory(),
} = {}) {
  if (!question || memoryBlocked(question)) return null;
  let best = null;
  for (const item of memory) {
    if (!item.answer || memoryBlocked(item.question)) continue;
    let score = similarity(question, item.question);
    const category = questionCategory(question);
    if (category && category === questionCategory(item.question)) score = Math.max(score, 0.78);
    if (platform && normalize(platform) === normalize(item.platform)) score += 0.15;
    score = Math.min(1, score);
    if (!best || score > best.score) best = { ...item, score };
  }
  return best && best.score >= minScore
    ? { ...best, rawAnswer: best.answer, answer: adaptAnswerToQuestion(question, best.answer) }
    : null;
}

export function compactQuestionMemory(platform = '') {
  return readQuestionMemory().map((item) => ({
    platform: item.platform || '',
    question: item.question || '',
    answer: item.answer || '',
    category: questionCategory(item.question),
    scoreBias: platform && normalize(platform) === normalize(item.platform) ? 0.15 : 0,
  }));
}
