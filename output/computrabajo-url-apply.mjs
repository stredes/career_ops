import { chromium } from 'playwright';
import { appendFileSync } from 'fs';
import { resolve } from 'path';
import { compactQuestionMemory, findSimilarQuestionAnswer, recordApplicationQuestions } from './application-question-bank.mjs';

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
  const remembered = findSimilarQuestionAnswer(question, { platform: 'Computrabajo' });
  if (remembered) return remembered.answer;
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
  if (/versiones.*\.net|\.net.*productivos|netcore|net core/.test(q)) {
    return 'No cuento con experiencia productiva formal en .NET. Tengo base en desarrollo web, APIs REST, SQL, JavaScript, TypeScript y React; puedo incorporarme como perfil junior y reforzar .NET/.NET Core segun el stack del equipo.';
  }
  if (/asp\.net|mvc|web api/.test(q)) {
    return 'No tengo experiencia laboral directa con ASP.NET MVC o Web API. Si tengo experiencia practica construyendo y consumiendo APIs REST, validaciones, endpoints y documentacion en proyectos con TypeScript/JavaScript, y buena disposicion para aprender el framework requerido.';
  }
  if (/herramientas.*ia|ia.*utilizas|inteligencia artificial|ai tools/.test(q)) {
    return 'Utilizo herramientas de IA como ChatGPT y GitHub Copilot para apoyo en analisis, documentacion, depuracion, generacion de ideas y automatizacion. Las uso como asistencia, validando siempre el resultado tecnico antes de aplicarlo.';
  }
  if (/cuantos anos lleva en desarrollo|a[nÃ±]os lleva en desarrollo|tiempo.*desarrollo/.test(q)) {
    return 'Cuento con alrededor de 1 ano de experiencia practica en desarrollo mediante proyectos academicos y personales, con foco en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, documentacion y pruebas basicas.';
  }
  if (/stack tecnologico|stack tecnol[oÃ³]gico|node.*react|react.*node|\.net.*node.*react/.test(q)) {
    return 'Mi stack principal practico es JavaScript, TypeScript, React, Python, SQL, APIs REST y Git/GitHub. Tengo base en Node/APIs y React mediante proyectos como AMILAB, y .NET lo manejo a nivel basico/en aprendizaje, con disposicion para reforzarlo.';
  }
  if (/cloud|devops|despliegue|deploy/.test(q)) {
    return 'Tengo experiencia basica/practica en despliegues y herramientas cloud/devops mediante Vercel, Firebase/Firestore, Git/GitHub, variables de entorno, documentacion y control de versiones. No cuento aun con experiencia laboral profunda en cloud, pero tengo buena base para aprender.';
  }
  if (/desarrollador bi|experiencia.*bi|business intelligence|power bi/.test(q)) {
    return 'Tengo experiencia practica con datos, SQL basico-intermedio, Python, Excel, reportes, validaciones y control de informacion. No cuento con experiencia laboral formal como desarrollador BI, pero mi base en datos y automatizacion me permite aportar como perfil junior/en aprendizaje.';
  }
  if (/herramientas descritas|herramientas.*aviso|manejas las herramientas|stack descrito/.test(q)) {
    return 'Manejo parte de las herramientas asociadas a desarrollo web: JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, testing basico y documentacion. Si el aviso incluye herramientas especificas adicionales, las manejo a nivel basico/en aprendizaje y puedo reforzarlas rapidamente.';
  }
  if (/db2|jcl|vsam|sam|mainframe/.test(q)) {
    return 'No cuento con experiencia laboral directa en DB2, JCL ni archivos VSAM/SAM. Tengo base en SQL, control de versiones, documentacion y desarrollo junior, y estoy disponible para aprender tecnologias Mainframe si el equipo lo permite.';
  }
  if (/rubro bancario|banca|bancario|financiero/.test(q)) {
    return 'No tengo experiencia formal directa en proyectos del rubro bancario. Si tengo experiencia practica con datos, documentacion, validaciones, trazabilidad y procesos ordenados, ademas de buena disposicion para aprender reglas y flujos del negocio financiero.';
  }
  if (/gitlab|control de versiones|versionamiento/.test(q)) {
    return 'Tengo experiencia practica con Git/GitHub para control de versiones, ramas, commits, repositorios y documentacion. GitLab lo manejo a nivel basico/en aprendizaje; puedo adaptarme al flujo de versionamiento del equipo.';
  }
  if (/carta de presentacion|carta de presentaci[oÃ³]n|cover letter|cuerpo de la carta/.test(q)) {
    return 'Me interesa postular porque estoy orientando mi carrera al area TI como Analista Programador en formacion. Cuento con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, reportes y documentacion. Mi experiencia previa en laboratorio y logistica me aporta orden, trazabilidad y criterio para trabajar con procesos reales. Busco aportar como perfil junior con aprendizaje rapido, responsabilidad y buena comunicacion.';
  }
  if (/actualmente.*trabajando|se encuentra trabajando|trabajo actual/.test(q)) {
    return 'No, actualmente tengo disponibilidad inmediata para integrarme a un nuevo cargo.';
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
  const memory = compactQuestionMemory('Computrabajo');
  return page.evaluate(({ pageText, memory }) => {
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const tokens = (value) => normalize(value).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2);
    const similarity = (a, b) => {
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
      return Math.max(overlap / union, (overlap / Math.min(setA.size, setB.size)) * 0.86);
    };
    const remembered = (question) => {
      if (/rut|discapacidad|compin|antecedentes|background|visa|patrocinio|sponsor/.test(normalize(question))) return '';
      const categoryFor = (value) => {
        const q = normalize(value);
        if (/telefono|celular|phone|mobile|numero de contacto|contacto|correo|email|e-mail/.test(q)) return 'contact';
        if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa/.test(q)) return 'salary';
        if (/comuna|residencia|ciudad|ubicacion|location|city/.test(q)) return 'location';
        if (/titulo|formacion|estudios|casa de estudios|academica/.test(q)) return 'education';
        if (/disponibilidad/.test(q)) return 'availability';
        if (/ingles|english/.test(q)) return 'english';
        if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'license_b';
        if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'transport';
        if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'safety_shoes';
        if (/python.*playwright|playwright.*python/.test(q)) return 'python_playwright';
        if (/sql.*python.*excel|nivel.*sql|nivel.*python|nivel.*excel/.test(q)) return 'sql_python_excel';
        if (/automatizacion|rpa/.test(q)) return 'automation';
        return '';
      };
      const currentCategory = categoryFor(question);
      let best = null;
      for (const item of memory || []) {
        let score = similarity(question, item.question);
        if (currentCategory && currentCategory === (item.category || categoryFor(item.question))) score = Math.max(score, 0.78);
        score += item.scoreBias || 0;
        if (!best || score > best.score) best = { ...item, score };
      }
      if (!best || best.score < 0.72) return '';
      const q = normalize(question);
      if (/telefono|celular|phone|mobile|numero de contacto|contacto/.test(q) && /correo|email|e-mail/.test(q)) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
      if (/telefono|celular|phone|mobile|numero de contacto|contacto/.test(q)) return '+56954764325';
      if (/correo|email|e-mail/.test(q)) return 'gianlucassanmartin@gmail.com';
      if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa/.test(q)) return /brut/.test(q)
        ? 'Mis expectativas de renta bruta estan en torno a $1.100.000 CLP, conversable segun modalidad, beneficios y proyeccion.'
        : 'Mis expectativas de renta liquida estan en torno a $900.000 CLP, conversable segun modalidad, beneficios y proyeccion.';
      if (/comuna|residencia|ciudad|ubicacion|location|city/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/titulo|formacion|estudios|casa de estudios|academica/.test(q)) return 'Estudiante de Analista Programador en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
      return best.answer;
    };
    const answer = (question) => {
      const previous = remembered(question);
      if (previous) return previous;
      const q = normalize(question);
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
  }, { pageText, memory }).catch(() => 0);
}

async function fillComputrabajoQuestions(page) {
  const memory = compactQuestionMemory('Computrabajo');
  return page.evaluate((memory) => {
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const tokens = (value) => normalize(value).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2);
    const similarity = (a, b) => {
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
      return Math.max(overlap / union, (overlap / Math.min(setA.size, setB.size)) * 0.86);
    };
    const remembered = (question) => {
      if (/rut|discapacidad|compin|antecedentes|background|visa|patrocinio|sponsor/.test(normalize(question))) return '';
      const categoryFor = (value) => {
        const q = normalize(value);
        if (/telefono|celular|phone|mobile|numero de contacto|contacto|correo|email|e-mail/.test(q)) return 'contact';
        if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa/.test(q)) return 'salary';
        if (/comuna|residencia|ciudad|ubicacion|location|city/.test(q)) return 'location';
        if (/titulo|formacion|estudios|casa de estudios|academica/.test(q)) return 'education';
        if (/disponibilidad/.test(q)) return 'availability';
        if (/ingles|english/.test(q)) return 'english';
        if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'license_b';
        if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'transport';
        if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'safety_shoes';
        if (/python.*playwright|playwright.*python/.test(q)) return 'python_playwright';
        if (/sql.*python.*excel|nivel.*sql|nivel.*python|nivel.*excel/.test(q)) return 'sql_python_excel';
        if (/automatizacion|rpa/.test(q)) return 'automation';
        return '';
      };
      const currentCategory = categoryFor(question);
      let best = null;
      for (const item of memory || []) {
        let score = similarity(question, item.question);
        if (currentCategory && currentCategory === (item.category || categoryFor(item.question))) score = Math.max(score, 0.78);
        score += item.scoreBias || 0;
        if (!best || score > best.score) best = { ...item, score };
      }
      if (!best || best.score < 0.72) return '';
      const q = normalize(question);
      if (/telefono|celular|phone|mobile|numero de contacto|contacto/.test(q) && /correo|email|e-mail/.test(q)) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
      if (/telefono|celular|phone|mobile|numero de contacto|contacto/.test(q)) return '+56954764325';
      if (/correo|email|e-mail/.test(q)) return 'gianlucassanmartin@gmail.com';
      if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa/.test(q)) return /brut/.test(q)
        ? 'Mis expectativas de renta bruta estan en torno a $1.100.000 CLP, conversable segun modalidad, beneficios y proyeccion.'
        : 'Mis expectativas de renta liquida estan en torno a $900.000 CLP, conversable segun modalidad, beneficios y proyeccion.';
      if (/comuna|residencia|ciudad|ubicacion|location|city/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/titulo|formacion|estudios|casa de estudios|academica/.test(q)) return 'Estudiante de Analista Programador en Duoc UC. Titulado de Tecnico en Laboratorio Clinico y Banco de Sangre.';
      return best.answer;
    };
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
      const previous = remembered(label);
      if (previous) return previous;
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
      if (/versiones.*\.net|\.net.*productivos|netcore|net core/.test(q)) return 'No cuento con experiencia productiva formal en .NET. Tengo base en desarrollo web, APIs REST, SQL, JavaScript, TypeScript y React; puedo incorporarme como perfil junior y reforzar .NET/.NET Core segun el stack del equipo.';
      if (/asp\.net|mvc|web api/.test(q)) return 'No tengo experiencia laboral directa con ASP.NET MVC o Web API. Si tengo experiencia practica construyendo y consumiendo APIs REST, validaciones, endpoints y documentacion en proyectos con TypeScript/JavaScript, y buena disposicion para aprender el framework requerido.';
      if (/herramientas.*ia|ia.*utilizas|inteligencia artificial|ai tools/.test(q)) return 'Utilizo herramientas de IA como ChatGPT y GitHub Copilot para apoyo en analisis, documentacion, depuracion, generacion de ideas y automatizacion. Las uso como asistencia, validando siempre el resultado tecnico antes de aplicarlo.';
      if (/cuantos anos lleva en desarrollo|a[nÃ±]os lleva en desarrollo|tiempo.*desarrollo/.test(q)) return 'Cuento con alrededor de 1 ano de experiencia practica en desarrollo mediante proyectos academicos y personales, con foco en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, documentacion y pruebas basicas.';
      if (/stack tecnologico|stack tecnol[oÃ³]gico|node.*react|react.*node|\.net.*node.*react/.test(q)) return 'Mi stack principal practico es JavaScript, TypeScript, React, Python, SQL, APIs REST y Git/GitHub. Tengo base en Node/APIs y React mediante proyectos como AMILAB, y .NET lo manejo a nivel basico/en aprendizaje, con disposicion para reforzarlo.';
      if (/cloud|devops|despliegue|deploy/.test(q)) return 'Tengo experiencia basica/practica en despliegues y herramientas cloud/devops mediante Vercel, Firebase/Firestore, Git/GitHub, variables de entorno, documentacion y control de versiones. No cuento aun con experiencia laboral profunda en cloud, pero tengo buena base para aprender.';
      if (/desarrollador bi|experiencia.*bi|business intelligence|power bi/.test(q)) return 'Tengo experiencia practica con datos, SQL basico-intermedio, Python, Excel, reportes, validaciones y control de informacion. No cuento con experiencia laboral formal como desarrollador BI, pero mi base en datos y automatizacion me permite aportar como perfil junior/en aprendizaje.';
      if (/herramientas descritas|herramientas.*aviso|manejas las herramientas|stack descrito/.test(q)) return 'Manejo parte de las herramientas asociadas a desarrollo web: JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, testing basico y documentacion. Si el aviso incluye herramientas especificas adicionales, las manejo a nivel basico/en aprendizaje y puedo reforzarlas rapidamente.';
      if (/db2|jcl|vsam|sam|mainframe/.test(q)) return 'No cuento con experiencia laboral directa en DB2, JCL ni archivos VSAM/SAM. Tengo base en SQL, control de versiones, documentacion y desarrollo junior, y estoy disponible para aprender tecnologias Mainframe si el equipo lo permite.';
      if (/rubro bancario|banca|bancario|financiero/.test(q)) return 'No tengo experiencia formal directa en proyectos del rubro bancario. Si tengo experiencia practica con datos, documentacion, validaciones, trazabilidad y procesos ordenados, ademas de buena disposicion para aprender reglas y flujos del negocio financiero.';
      if (/gitlab|control de versiones|versionamiento/.test(q)) return 'Tengo experiencia practica con Git/GitHub para control de versiones, ramas, commits, repositorios y documentacion. GitLab lo manejo a nivel basico/en aprendizaje; puedo adaptarme al flujo de versionamiento del equipo.';
      if (/carta de presentacion|carta de presentaci[oÃ³]n|cover letter|cuerpo de la carta/.test(q)) return 'Me interesa postular porque estoy orientando mi carrera al area TI como Analista Programador en formacion. Cuento con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, reportes y documentacion. Mi experiencia previa en laboratorio y logistica me aporta orden, trazabilidad y criterio para trabajar con procesos reales. Busco aportar como perfil junior con aprendizaje rapido, responsabilidad y buena comunicacion.';
      if (/actualmente.*trabajando|se encuentra trabajando|trabajo actual/.test(q)) return 'No, actualmente tengo disponibilidad inmediata para integrarme a un nuevo cargo.';
      if (/ingles|english/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
      if (/experiencia reciente|funciones desempenadas|anos de experiencia|experiencia en el cargo|cargo/.test(q)) return 'Estoy orientando mi carrera a desarrollo e IA como Analista Programador en formacion. Tengo proyectos practicos con Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, documentacion y validaciones. Mi experiencia laboral formal en TI aun es junior/en formacion, pero cuento con proyectos concretos y aprendizaje rapido.';
      if (/soporte|mesa de ayuda|usuario/.test(q)) return 'Tengo experiencia en soporte a usuarios, uso de sistemas operativos/administrativos, documentacion de incidencias, seguimiento de casos, manejo de datos y coordinacion con equipos operativos. Como Analista Programador en formacion tengo base en SQL, Python, Git/GitHub, APIs y resolucion de problemas tecnicos.';
      return '';
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
  }, memory).catch((error) => ({ filled: [], paused: [`fill-error: ${error.message || error}`] }));
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
    recordApplicationQuestions({
      platform: 'Computrabajo',
      company,
      role,
      url: page.url(),
      status: 'paused',
      questions,
    });
    return { status: 'paused', reason: 'questions require manual reading', role, company, url: page.url(), questions };
  }
  const filledQuestions = await fillComputrabajoQuestions(page);
  recordApplicationQuestions({
    platform: 'Computrabajo',
    company,
    role,
    url: page.url(),
    status: filledQuestions.paused?.length ? 'paused' : 'answered',
    questions: filledQuestions.paused || [],
    answers: filledQuestions.filled || [],
  });
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
