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
  const q = normalize(question);
  if (/rut/.test(q)) return '199213512';
  if (/pretension|pretensi|renta|sueldo|salario|expectativa|remuneracion/.test(q)) {
    if (/brut/.test(q)) return '1100000';
    return '900000';
  }
  if (/cuantos anos|cuanto tiempo|anos de experiencia|tiempo de experiencia|nivel.*1.*6|1.*6|a1.*c2|c2/.test(q)) {
    if (/ingles|english/.test(q)) return '2';
    if (/gcp|google cloud|bigquery|databricks|spark|salesforce|sap|pentaho|kettle|java|spring|\.net|c#|kubernetes|docker avanzado|oracle avanzado/.test(q)) return '0';
    return '1';
  }
  if (/comuna de residencia|residencia|comuna|ciudad|ubicacion/.test(q)) return 'Santiago, Region Metropolitana.';
  if (/numero de contacto|n[uú]mero de contacto|telefono|tel[eé]fono|celular/.test(q) && !/correo|email/.test(q)) return '+56954764325';
  if (/correo electronico|correo electr[oó]nico|email/.test(q) && !/telefono|tel[eé]fono|celular/.test(q)) return 'gianlucassanmartin@gmail.com';
  if (/dominio de c#|conocimiento.*c#|experiencia.*c#/.test(q)) return 'Tengo base en C#/.NET a nivel junior/en aprendizaje. Mi experiencia principal es con JavaScript, TypeScript, React, Python, SQL y APIs REST, pero puedo reforzar C# rapidamente segun el stack del equipo.';
  if (/bases de datos relacionales y no relacionales|base de datos relacional|bases relacionales|bases no relacionales|nosql/.test(q)) return 'Si. Tengo experiencia practica con SQL, consultas, modelos simples y CRUD en bases relacionales, ademas de Firestore como base NoSQL. Puedo adaptarme a PostgreSQL, MySQL, SQL Server u otras bases segun el proyecto.';
  if (/modernizacion|modernizaci[oó]n|migraci[oó]n.*nube|migrar.*nube|hacia la nube/.test(q)) return 'He trabajado en proyectos con enfoque cloud/serverless como AMILAB, usando Firebase/Firestore, Vercel, variables de entorno, Git/GitHub, endpoints y documentacion. No he liderado una migracion empresarial a GCP, pero entiendo despliegues, datos y adaptacion de aplicaciones a servicios cloud.';
  if (/node\.?js.*angular|angular.*node|solucion fullstack.*node|fullstack.*node/.test(q)) return 'He desarrollado soluciones full stack con TypeScript/JavaScript, React, APIs REST, Firebase/Firestore y documentacion. Node.js lo manejo a nivel base/practico para backend/APIs; Angular lo manejo a nivel basico/en aprendizaje, con experiencia transferible desde React.';
  if (/nifi|tls|tlf|certificado.*cifrado|cifrado de datos/.test(q)) return 'No cuento con experiencia laboral directa aplicando certificados TLS/TLF en flujos NiFi. Si tengo base en integraciones, APIs, datos, documentacion y buenas practicas de seguridad basica; puedo aprender el flujo NiFi y el manejo de certificados si el equipo lo requiere.';
  if (/curso|certificaci[oó]n|certificado/.test(q)) return 'Actualmente curso Analista Programador en Duoc UC. He reforzado con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, Firebase/Firestore, Arch Linux y Debian; no cuento con una certificacion formal avanzada vigente.';
  if (/resides en santiago|residencia.*santiago|vives en santiago/.test(q)) return 'Si, resido en Santiago, Region Metropolitana.';
  if (/proceso automatizado falla|automatizado falla|identificar y solucionar/.test(q)) return 'Primero revisaria logs, mensajes de error y el punto exacto donde falla. Luego validaria entradas, credenciales, dependencias, conexion a base de datos/API y cambios recientes. Reproduciria el caso con datos controlados, aislaria la causa, aplicaria correccion, probaria nuevamente y documentaria incidente, solucion y prevenciones.';
  if (/documentarias un proceso automatizado|documentar.*proceso automatizado|mantenido por otros/.test(q)) return 'Documentaria objetivo, entradas y salidas, responsables, dependencias, credenciales/variables de entorno, pasos de ejecucion, diagrama simple del flujo, validaciones, manejo de errores, logs, pruebas, frecuencia, rollback y ejemplos. Tambien dejaria README, comentarios utiles y checklist de mantenimiento.';
  if (/herramienta.*ia|herramientas.*ia|utilizado.*ia|usado.*ia/.test(q)) return 'Si. He utilizado herramientas de IA como ChatGPT y GitHub Copilot como apoyo para documentacion, generacion de ideas, revision de codigo, automatizacion y analisis tecnico. Las uso como complemento, validando siempre las respuestas antes de aplicarlas.';
  if (/detalla.*experiencia.*requisitos|experiencia.*requisitos.*oferta|requisitos solicitados/.test(q)) return 'Tengo experiencia practica en desarrollo web y automatizacion con TypeScript, JavaScript, React, Node/APIs REST, Python, SQL, Git/GitHub, Firebase/Firestore, Vercel, documentacion y validaciones. En AMILAB trabaje frontend React/TypeScript y backend serverless; en Inventario App y Exelcior Apolo trabaje datos, reportes, automatizacion y arquitectura por capas.';
  if (/manejas base de datos|bases? de datos.*cual|base de datos.*cuales/.test(q)) return 'Si. Manejo SQL a nivel basico-intermedio con consultas, modelos simples, CRUD, validaciones y reportes. He trabajado con SQLite/PostgreSQL en proyectos, Firestore como NoSQL en AMILAB, y puedo adaptarme a MySQL, SQL Server u otras bases relacionales segun el stack.';
  if (/pipelines?.*ci\/cd|ci\/cd.*github actions|github actions.*herramientas similares/.test(q)) return 'He trabajado con Git/GitHub, flujos de versionamiento, despliegues en Vercel/Firebase y configuraciones basicas de proyecto. GitHub Actions lo manejo a nivel basico/en aprendizaje para automatizar validaciones, pruebas o despliegues simples; no cuento aun con experiencia avanzada productiva en CI/CD.';
  if (/dominio avanzado.*react.*vue|react.*vue.*proyecto|vue\.?js.*proyecto/.test(q)) return 'Mi experiencia mas fuerte es con React, TypeScript y Vite en AMILAB Frontend, construyendo interfaz, validaciones, consumo de APIs y estructura de componentes. Vue.js lo manejo a nivel basico/en aprendizaje, con experiencia transferible desde React. No me presentaria como avanzado en Vue, pero puedo adaptarme rapido.';
  if (/react.*tailwind|tailwind.*react|shadcn|librerias de componentes|componentes como shadcn/.test(q)) return 'Tengo experiencia practica con React, TypeScript y Vite en AMILAB Frontend, trabajando componentes, formularios, consumo de APIs, validaciones y estructura de interfaz. Tailwind lo manejo a nivel basico/en aprendizaje y puedo adaptarme a librerias de componentes como shadcn rapidamente por mi base en React y CSS.';
  if (/typeorm|type orm|manejo de datos.*typeorm/.test(q)) return 'No he usado TypeORM en produccion. Tengo base practica en SQL, modelos de datos, CRUD, SQLite/PostgreSQL y Firestore, ademas de APIs REST con TypeScript. Puedo aprender TypeORM rapidamente porque entiendo la relacion entre entidades, repositorios, consultas y persistencia.';
  if (/dashboards|looker studio|reportes|indicadores/.test(q)) return 'He creado reportes y salidas de datos en proyectos como Inventario App y Exelcior Apolo, con indicadores de stock, movimientos, validaciones, exportaciones CSV/PDF y control operativo. No he usado Looker Studio en produccion, pero entiendo la logica de KPIs, filtros, fuentes de datos y visualizacion para seguimiento.';
  if (/que es un proceso etl|proceso etl|importancia.*datos/.test(q)) return 'Un ETL consiste en extraer datos desde una o varias fuentes, transformarlos limpiando, validando y normalizando la informacion, y cargarlos en un destino como una base, reporte o sistema. Es importante porque permite datos consistentes, trazables y listos para analisis o automatizacion.';
  if (/inner join|left join/.test(q)) return 'INNER JOIN devuelve solo registros con coincidencia en ambas tablas. LEFT JOIN devuelve todos los registros de la tabla izquierda y agrega datos de la derecha cuando existen; si no hay coincidencia, quedan nulos. Usaria INNER para cruces obligatorios y LEFT para conservar todos los clientes, productos o casos aunque no tengan movimiento relacionado.';
  if (/total de transacciones por cliente|transacciones por cliente|consulta sql/.test(q)) return 'Usaria una agregacion por cliente filtrando el periodo. Ejemplo: SELECT cliente_id, COUNT(*) AS cantidad, SUM(monto) AS total FROM transacciones WHERE fecha >= :desde AND fecha < :hasta GROUP BY cliente_id ORDER BY total DESC. Si se requiere nombre del cliente, agregaria JOIN con la tabla clientes.';
  if (/datos sensibles|datos criticos|confidencialidad/.test(q)) return 'He trabajado con datos sensibles en entorno de laboratorio clinico y datos operativos/inventario. Los manejo con criterio de confidencialidad, acceso minimo necesario, no compartiendo informacion fuera de canales autorizados, evitando exponer credenciales, validando respaldos, documentando procesos y respetando trazabilidad.';
  if (/creacion o mantenimiento de procesos automatizados|procesos automatizados|que hiciste y que herramientas/.test(q)) return 'Si. He creado automatizaciones con Python para transformar y validar archivos Excel, generar reportes, exportar CSV/PDF y controlar datos operativos. En proyectos como Exelcior Apolo e Inventario App use Python, SQL/SQLite, Git/GitHub, documentacion, validaciones y pruebas basicas.';
  const remembered = findSimilarQuestionAnswer(question, { platform: 'Computrabajo' });
  if (remembered) return remembered.answer;
  if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
  if (/sql injection|cross-site scripting|xss|path traversal|vulnerabilidades de seguridad|mitigarlas/.test(q)) {
    return 'Si, conozco vulnerabilidades comunes como SQL Injection, XSS y Path Traversal a nivel junior. Aplico mitigaciones basicas como validacion y sanitizacion de entradas, consultas parametrizadas/ORM, control de rutas y permisos, manejo seguro de errores, revision de dependencias y buenas practicas OWASP.';
  }
  if (/sector salud|sector publico|sector p[uú]blico/.test(q)) {
    return 'Tengo experiencia previa en sector salud desde laboratorio clinico, trabajando con procesos regulados, trazabilidad, registros, datos sensibles, sistemas y documentacion. En sector publico no tengo experiencia formal directa, pero puedo adaptarme a sus procedimientos, controles y flujos de trabajo.';
  }
  if (/sistema productivo|punta a punta|desarrollado o mantenido|que parte hiciste/.test(q)) {
    return 'He desarrollado y mantenido proyectos completos como AMILAB Frontend/Backend e Inventario App. En AMILAB trabaje frontend con React/TypeScript/Vite, backend serverless con TypeScript, Firebase/Firestore, endpoints REST, validaciones y documentacion. En Inventario App trabaje modelo de datos, reportes, exportaciones, validaciones y flujo de inventario.';
  }
  if (/carrera.*institucion|institucion.*estado|estado de la misma|titulado.*proceso/.test(q)) {
    return 'Analista Programador en formacion en Instituto Profesional Duoc UC. Actualmente en proceso de formacion, orientado a desarrollo de software, automatizacion, datos y soporte TI.';
  }
  if (/herramientas mencionadas|herramientas descritas|herramientas del aviso|conocimiento en las herramientas/.test(q)) {
    return 'Manejo parte de las herramientas asociadas al rol: Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, Firebase/Firestore, documentacion y automatizacion. Algunas herramientas especificas del aviso puedo manejarlas a nivel basico/en aprendizaje y reforzarlas rapidamente segun el stack del equipo.';
  }
  if (/trabajar de forma presencial|modalidad presencial|esta de acuerdo.*presencial/.test(q)) {
    return 'Si, tengo disponibilidad para modalidad presencial en Santiago si la ubicacion y horario son coordinables.';
  }
  if (/tareas descriptas|tareas descritas|experiencia en las tareas/.test(q)) {
    return 'Tengo experiencia practica relacionada con automatizacion, manejo de datos, documentacion, validaciones y mejora de procesos mediante proyectos como Exelcior Apolo, Inventario App y AMILAB. Si alguna tarea requiere una herramienta especifica, puedo aprenderla y adaptarme rapidamente.';
  }
  if (/automation anywhere|a360|bots/.test(q)) {
    return 'No cuento con experiencia comprobada laboral en Automation Anywhere A360. Si tengo experiencia practica automatizando procesos con Python, manejo de datos, archivos Excel, reportes, validaciones y documentacion; puedo aprender A360 y aportar como perfil junior/en formacion.';
  }
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
    return 'Analista Programador en formacion en Duoc UC, orientado a desarrollo de software, automatizacion, datos y soporte TI. Cuento con proyectos activos en Python, React, TypeScript, SQL, Firebase/Firestore, Git/GitHub, Arch Linux y Debian.';
  }
  if (/numero de contacto|n[uú]mero de contacto|correo electronico|correo electr[oó]nico|telefono|tel[eé]fono|contacto/.test(q)) {
    return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
  }
  if (/experiencia reciente|funciones desempenadas|funciones desempeñadas|anos de experiencia|a[nñ]os de experiencia/.test(q)) {
    return 'Tengo experiencia practica reciente en desarrollo web, automatizacion y datos mediante proyectos activos: AMILAB Frontend/Backend, Exelcior Apolo, Inventario App y una app movil para HC Soluciones. He trabajado con React, TypeScript, JavaScript, Python, SQL, APIs REST, Firebase/Firestore, Git/GitHub, documentacion y pruebas basicas.';
  }
  if (/python.*entornos laborales|anos.*python/.test(q)) {
    return 'Tengo experiencia practica con Python en proyectos propios y academicos durante mi formacion como Analista Programador, especialmente en automatizacion, manejo de datos, reportes, SQL y aplicaciones de escritorio. No cuento con 2 anos laborales formales dedicados exclusivamente a Python, pero si con proyectos concretos como Inventario App y Exelcior Apolo, y buena base para aprender rapido.';
  }
  if (/versiones.*\.net|\.net.*productivos|netcore|net core/.test(q)) {
    return 'No cuento con experiencia productiva formal en .NET. Tengo base en desarrollo web, APIs REST, SQL, JavaScript, TypeScript y React; puedo incorporarme como perfil junior y reforzar .NET/.NET Core segun el stack del equipo.';
  }
  if (/analista ti.*gestion de proyectos tecnico|analista ti.*desarrollos \.net|desarrollos \.net/.test(q)) {
    return 'Mi experiencia formal en .NET aun es junior/en aprendizaje. Si tengo experiencia practica como Analista Programador en formacion, trabajando con proyectos de software, APIs REST, SQL, React, TypeScript, Python, Git/GitHub, documentacion, validaciones y seguimiento de tareas tecnicas. Puedo aportar en analisis, coordinacion, pruebas y levantamiento tecnico mientras refuerzo .NET segun el stack del equipo.';
  }
  if (/proveedores externos|seguimiento de tiempos|reporteria sobre los avances|reporte.*avances|servicios tecnicos/.test(q)) {
    return 'He realizado seguimiento y documentacion de tareas tecnicas en proyectos activos, coordinando avances, validaciones, incidencias y entregables. Manejo reportes, datos, Git/GitHub, documentacion y comunicacion con usuarios/equipos. No tengo experiencia senior gestionando proveedores externos, pero puedo apoyar control de tiempos, registro de avances y validacion funcional/tecnica de soluciones.';
  }
  if (/asp\.net|mvc|web api/.test(q)) {
    return 'No tengo experiencia laboral directa con ASP.NET MVC o Web API. Si tengo experiencia practica construyendo y consumiendo APIs REST, validaciones, endpoints y documentacion en proyectos con TypeScript/JavaScript, y buena disposicion para aprender el framework requerido.';
  }
  if (/herramienta.*ia|herramientas.*ia|utilizado.*herramienta|usado.*herramienta|ia.*utilizas|inteligencia artificial|ai tools/.test(q)) {
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
    return 'Me interesa postular porque estoy orientando mi carrera al area TI como Analista Programador en formacion. Mantengo proyectos activos en Python, React, TypeScript, inventario, automatizacion de Excel y desarrollo movil para AMILAB, Tamapal y HC Soluciones. Busco aportar como perfil junior con aprendizaje rapido, responsabilidad, buena comunicacion y foco en soluciones practicas.';
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
      if (/titulo|formacion|estudios|casa de estudios|academica/.test(q)) return 'Analista Programador en formacion en Duoc UC, orientado a desarrollo de software, automatizacion y datos. Proyectos activos: AMILAB Frontend/Backend, Exelcior Apolo, Inventario App y app movil para HC Soluciones.';
      return best.answer;
    };
    const answer = (question) => {
      const q = normalize(question);
      if (/rut/.test(q)) return '199213512';
      if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa|remuneracion/.test(q)) {
        if (/brut/.test(q)) return '1100000';
        return '900000';
      }
      if (/cuantos anos|cuanto tiempo|anos de experiencia|tiempo de experiencia|nivel.*1.*6|1.*6|a1.*c2|c2/.test(q)) {
        if (/ingles|english/.test(q)) return '2';
        if (/gcp|google cloud|bigquery|databricks|spark|salesforce|sap|pentaho|kettle|java|spring|\.net|c#|kubernetes|docker avanzado|oracle avanzado/.test(q)) return '0';
        return '1';
      }
      if (/comuna de residencia|residencia|comuna|ciudad|ubicacion|location|city/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/numero de contacto|contacto|telefono|tel[eé]fono|celular/.test(q) && !/correo|email/.test(q)) return '+56954764325';
      if (/correo|email/.test(q) && !/telefono|tel[eé]fono|celular/.test(q)) return 'gianlucassanmartin@gmail.com';
      if (/oracle database|pl\/sql|pl sql|procedimientos almacenados|problema real.*pl\/sql|problema real.*pl sql/.test(q)) return 'No cuento con experiencia laboral directa en Oracle Database ni PL/SQL. Tengo base practica en SQL, consultas, modelos simples y validaciones de datos; trabajo mas con consultas y CRUD que con procedimientos almacenados.';
      if (/devops.*pretensiones|pretensiones.*devops|disponibilidad.*devops|herramientas.*devops|metodologias devops/.test(q)) return 'Tengo experiencia basica/practica en despliegues y herramientas devops mediante Vercel, Firebase, Git/GitHub, variables de entorno, documentacion y control de versiones. Pretension liquida: $900.000 CLP conversable. Disponibilidad inmediata.';
      if (/dominio de c#|conocimiento.*c#|experiencia.*c#/.test(q)) return 'Tengo base en C#/.NET a nivel junior/en aprendizaje. Mi experiencia principal es con JavaScript, TypeScript, React, Python, SQL y APIs REST, pero puedo reforzar C# rapidamente segun el stack del equipo.';
      if (/bases de datos relacionales y no relacionales|base de datos relacional|bases relacionales|bases no relacionales|nosql/.test(q)) return 'Si. Tengo experiencia practica con SQL, consultas, modelos simples y CRUD en bases relacionales, ademas de Firestore como base NoSQL. Puedo adaptarme a PostgreSQL, MySQL, SQL Server u otras bases segun el proyecto.';
      if (/modernizacion|modernizaci[oó]n|migraci[oó]n.*nube|migrar.*nube|hacia la nube/.test(q)) return 'He trabajado en proyectos con enfoque cloud/serverless como AMILAB, usando Firebase/Firestore, Vercel, variables de entorno, Git/GitHub, endpoints y documentacion. No he liderado una migracion empresarial a GCP, pero entiendo despliegues, datos y adaptacion de aplicaciones a servicios cloud.';
      if (/node\.?js.*angular|angular.*node|solucion fullstack.*node|fullstack.*node/.test(q)) return 'He desarrollado soluciones full stack con TypeScript/JavaScript, React, APIs REST, Firebase/Firestore y documentacion. Node.js lo manejo a nivel base/practico para backend/APIs; Angular lo manejo a nivel basico/en aprendizaje, con experiencia transferible desde React.';
      if (/nifi|tls|tlf|certificado.*cifrado|cifrado de datos/.test(q)) return 'No cuento con experiencia laboral directa aplicando certificados TLS/TLF en flujos NiFi. Si tengo base en integraciones, APIs, datos, documentacion y buenas practicas de seguridad basica; puedo aprender el flujo NiFi y el manejo de certificados si el equipo lo requiere.';
      if (/curso|certificaci[oó]n|certificado/.test(q)) return 'Actualmente curso Analista Programador en Duoc UC. He reforzado con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, Firebase/Firestore, Arch Linux y Debian; no cuento con una certificacion formal avanzada vigente.';
      const previous = remembered(question);
      if (previous) return previous;
      if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
      if (/sql injection|cross-site scripting|xss|path traversal|vulnerabilidades de seguridad|mitigarlas/.test(q)) return 'Si, conozco vulnerabilidades comunes como SQL Injection, XSS y Path Traversal a nivel junior. Aplico mitigaciones basicas como validacion y sanitizacion de entradas, consultas parametrizadas/ORM, control de rutas y permisos, manejo seguro de errores, revision de dependencias y buenas practicas OWASP.';
      if (/sector salud|sector publico|sector p[uú]blico/.test(q)) return 'Tengo experiencia previa en sector salud desde laboratorio clinico, trabajando con procesos regulados, trazabilidad, registros, datos sensibles, sistemas y documentacion. En sector publico no tengo experiencia formal directa, pero puedo adaptarme a sus procedimientos, controles y flujos de trabajo.';
      if (/sistema productivo|punta a punta|desarrollado o mantenido|que parte hiciste/.test(q)) return 'He desarrollado y mantenido proyectos completos como AMILAB Frontend/Backend e Inventario App. En AMILAB trabaje frontend con React/TypeScript/Vite, backend serverless con TypeScript, Firebase/Firestore, endpoints REST, validaciones y documentacion. En Inventario App trabaje modelo de datos, reportes, exportaciones, validaciones y flujo de inventario.';
      if (/carrera.*institucion|institucion.*estado|estado de la misma|titulado.*proceso/.test(q)) return 'Analista Programador en formacion en Instituto Profesional Duoc UC. Actualmente en proceso de formacion, orientado a desarrollo de software, automatizacion, datos y soporte TI.';
      if (/herramientas mencionadas|herramientas descritas|herramientas del aviso|conocimiento en las herramientas/.test(q)) return 'Manejo parte de las herramientas asociadas al rol: Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, Firebase/Firestore, documentacion y automatizacion. Algunas herramientas especificas del aviso puedo manejarlas a nivel basico/en aprendizaje y reforzarlas rapidamente segun el stack del equipo.';
      if (/trabajar de forma presencial|modalidad presencial|esta de acuerdo.*presencial/.test(q)) return 'Si, tengo disponibilidad para modalidad presencial en Santiago si la ubicacion y horario son coordinables.';
      if (/tareas descriptas|tareas descritas|experiencia en las tareas/.test(q)) return 'Tengo experiencia practica relacionada con automatizacion, manejo de datos, documentacion, validaciones y mejora de procesos mediante proyectos como Exelcior Apolo, Inventario App y AMILAB. Si alguna tarea requiere una herramienta especifica, puedo aprenderla y adaptarme rapidamente.';
      if (/automation anywhere|a360|bots/.test(q)) return 'No cuento con experiencia comprobada laboral en Automation Anywhere A360. Si tengo experiencia practica automatizando procesos con Python, manejo de datos, archivos Excel, reportes, validaciones y documentacion; puedo aprender A360 y aportar como perfil junior/en formacion.';
      if (/itil/.test(q)) return 'Tengo conocimiento basico de practicas ITIL para registro, priorizacion, seguimiento y escalamiento de incidentes. No cuento con certificacion ITIL vigente.';
      if (/microinformatica|hardware|software|redes basicas|redes b[aá]sicas/.test(q)) return 'Experiencia junior/en formacion en microinformatica: soporte a usuarios, sistemas operativos, software administrativo, revision inicial de hardware, redes basicas, documentacion y escalamiento.';
      if (/renovacion tecnologica|renovaci[oó]n tecnol[oó]gica|pcs|servidores/.test(q)) return 'He participado a nivel de apoyo junior en soporte, revision y configuracion basica de equipos, documentacion y seguimiento de casos. Puedo apoyar proyectos de renovacion tecnologica bajo procedimientos definidos.';
      if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No cuento actualmente con zapatos de seguridad.';
      if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No cuento con vehiculo propio; puedo coordinar traslado segun ubicacion y horario.';
      if (/pretensiones de renta|pretensi|renta|sueldo/.test(q)) return 'Mis pretensiones de renta estan en torno a $900.000 CLP liquidos, conversable segun modalidad, beneficios y proyeccion.';
      if (/comuna de residencia|residencia|comuna/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/titulo profesional|t[ií]tulo profesional|formacion|formaci[oó]n|estudios/.test(q)) return 'Analista Programador en formacion en Duoc UC, orientado a desarrollo de software, automatizacion, datos y soporte TI. Cuento con proyectos activos en Python, React, TypeScript, SQL, Firebase/Firestore, Git/GitHub, Arch Linux y Debian.';
      if (/numero de contacto|n[uú]mero de contacto|correo electronico|correo electr[oó]nico|telefono|tel[eé]fono|contacto/.test(q)) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
      if (/experiencia reciente|funciones desempenadas|funciones desempeñadas|anos de experiencia|a[nñ]os de experiencia/.test(q)) return 'Tengo experiencia practica reciente en desarrollo web, automatizacion y datos mediante proyectos activos: AMILAB Frontend/Backend, Exelcior Apolo, Inventario App y una app movil para HC Soluciones. He trabajado con React, TypeScript, JavaScript, Python, SQL, APIs REST, Firebase/Firestore, Git/GitHub, documentacion y pruebas basicas.';
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
      if (/titulo|formacion|estudios|casa de estudios|academica/.test(q)) return 'Analista Programador en formacion en Duoc UC, orientado a desarrollo de software, automatizacion y datos. Proyectos activos: AMILAB Frontend/Backend, Exelcior Apolo, Inventario App y app movil para HC Soluciones.';
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
      const q = normalize(label);
      if (/rut/.test(q)) return '199213512';
      if (/pretension|pretensi|renta|sueldo|salario|salary|expectativa|remuneracion/.test(q)) {
        if (/brut/.test(q)) return '1100000';
        return '900000';
      }
      if (/cuantos anos|cuanto tiempo|anos de experiencia|tiempo de experiencia|nivel.*1.*6|1.*6|a1.*c2|c2/.test(q)) {
        if (/ingles|english/.test(q)) return '2';
        if (/gcp|google cloud|bigquery|databricks|spark|salesforce|sap|pentaho|kettle|java|spring|\.net|c#|kubernetes|docker avanzado|oracle avanzado/.test(q)) return '0';
        return '1';
      }
      if (/comuna de residencia|residencia|comuna|ciudad|ubicacion|location|city/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/numero de contacto|contacto|telefono|tel[eé]fono|celular/.test(q) && !/correo|email/.test(q)) return '+56954764325';
      if (/correo|email/.test(q) && !/telefono|tel[eé]fono|celular/.test(q)) return 'gianlucassanmartin@gmail.com';
      if (/oracle database|pl\/sql|pl sql|procedimientos almacenados|problema real.*pl\/sql|problema real.*pl sql/.test(q)) return 'No cuento con experiencia laboral directa en Oracle Database ni PL/SQL. Tengo base practica en SQL, consultas, modelos simples y validaciones de datos; trabajo mas con consultas y CRUD que con procedimientos almacenados.';
      if (/oracle bpm|bpm suite|suite bpm/.test(q)) return 'No cuento con experiencia laboral directa en Oracle BPM Suite ni versiones 11.1.1.19/11.1.1.17. Tengo base practica en SQL, APIs REST, documentacion, analisis de procesos y desarrollo junior; puedo aprender Oracle BPM si el equipo acepta perfil en formacion.';
      if (/devops.*pretensiones|pretensiones.*devops|disponibilidad.*devops/.test(q)) return 'Tengo experiencia basica/practica en despliegues y herramientas devops mediante Vercel, Firebase, Git/GitHub, variables de entorno, documentacion y control de versiones. Pretension liquida: $900.000 CLP conversable. Disponibilidad inmediata.';
      if (/mainframe|cobol|cics|jcl|db2|tso|zowe/.test(q)) return 'No cuento con experiencia laboral directa en Mainframe, COBOL, CICS, JCL, DB2, TSO o ZOWE. Tengo base en SQL, Git/GitHub, VSCode, documentacion y desarrollo junior, y puedo aprender estas tecnologias si el equipo acepta perfil en formacion.';
      if (/sql injection|cross-site scripting|xss|path traversal|vulnerabilidades de seguridad|mitigarlas/.test(q)) return 'Si, conozco vulnerabilidades comunes como SQL Injection, XSS y Path Traversal a nivel junior. Aplico mitigaciones basicas como validacion y sanitizacion de entradas, consultas parametrizadas/ORM, control de rutas y permisos, manejo seguro de errores, revision de dependencias y buenas practicas OWASP.';
      if (/sector salud|sector publico|sector p[uú]blico/.test(q)) return 'Tengo experiencia previa en sector salud desde laboratorio clinico, trabajando con procesos regulados, trazabilidad, registros, datos sensibles, sistemas y documentacion. En sector publico no tengo experiencia formal directa, pero puedo adaptarme a sus procedimientos, controles y flujos de trabajo.';
      if (/sistema productivo|punta a punta|desarrollado o mantenido|que parte hiciste/.test(q)) return 'He desarrollado y mantenido proyectos completos como AMILAB Frontend/Backend e Inventario App. En AMILAB trabaje frontend con React/TypeScript/Vite, backend serverless con TypeScript, Firebase/Firestore, endpoints REST, validaciones y documentacion. En Inventario App trabaje modelo de datos, reportes, exportaciones, validaciones y flujo de inventario.';
      if (/carrera.*institucion|institucion.*estado|estado de la misma|titulado.*proceso/.test(q)) return 'Analista Programador en formacion en Instituto Profesional Duoc UC. Actualmente en proceso de formacion, orientado a desarrollo de software, automatizacion, datos y soporte TI.';
      if (/herramientas mencionadas|herramientas descritas|herramientas del aviso|conocimiento en las herramientas/.test(q)) return 'Manejo parte de las herramientas asociadas al rol: Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, Firebase/Firestore, documentacion y automatizacion. Algunas herramientas especificas del aviso puedo manejarlas a nivel basico/en aprendizaje y reforzarlas rapidamente segun el stack del equipo.';
      if (/trabajar de forma presencial|modalidad presencial|esta de acuerdo.*presencial/.test(q)) return 'Si, tengo disponibilidad para modalidad presencial en Santiago si la ubicacion y horario son coordinables.';
      if (/tareas descriptas|tareas descritas|experiencia en las tareas/.test(q)) return 'Tengo experiencia practica relacionada con automatizacion, manejo de datos, documentacion, validaciones y mejora de procesos mediante proyectos como Exelcior Apolo, Inventario App y AMILAB. Si alguna tarea requiere una herramienta especifica, puedo aprenderla y adaptarme rapidamente.';
      if (/automation anywhere|a360|bots/.test(q)) return 'No cuento con experiencia comprobada laboral en Automation Anywhere A360. Si tengo experiencia practica automatizando procesos con Python, manejo de datos, archivos Excel, reportes, validaciones y documentacion; puedo aprender A360 y aportar como perfil junior/en formacion.';
      if (/dominio de c#|conocimiento.*c#|experiencia.*c#/.test(q)) return 'Tengo base en C#/.NET a nivel junior/en aprendizaje. Mi experiencia principal es con JavaScript, TypeScript, React, Python, SQL y APIs REST, pero puedo reforzar C# rapidamente segun el stack del equipo.';
      if (/bases de datos relacionales y no relacionales|base de datos relacional|bases relacionales|bases no relacionales|nosql/.test(q)) return 'Si. Tengo experiencia practica con SQL, consultas, modelos simples y CRUD en bases relacionales, ademas de Firestore como base NoSQL. Puedo adaptarme a PostgreSQL, MySQL, SQL Server u otras bases segun el proyecto.';
      if (/modernizacion|modernizaci[oó]n|migraci[oó]n.*nube|migrar.*nube|hacia la nube/.test(q)) return 'He trabajado en proyectos con enfoque cloud/serverless como AMILAB, usando Firebase/Firestore, Vercel, variables de entorno, Git/GitHub, endpoints y documentacion. No he liderado una migracion empresarial a GCP, pero entiendo despliegues, datos y adaptacion de aplicaciones a servicios cloud.';
      if (/node\.?js.*angular|angular.*node|solucion fullstack.*node|fullstack.*node/.test(q)) return 'He desarrollado soluciones full stack con TypeScript/JavaScript, React, APIs REST, Firebase/Firestore y documentacion. Node.js lo manejo a nivel base/practico para backend/APIs; Angular lo manejo a nivel basico/en aprendizaje, con experiencia transferible desde React.';
      if (/nifi|tls|tlf|certificado.*cifrado|cifrado de datos/.test(q)) return 'No cuento con experiencia laboral directa aplicando certificados TLS/TLF en flujos NiFi. Si tengo base en integraciones, APIs, datos, documentacion y buenas practicas de seguridad basica; puedo aprender el flujo NiFi y el manejo de certificados si el equipo lo requiere.';
      if (/curso|certificaci[oó]n|certificado/.test(q)) return 'Actualmente curso Analista Programador en Duoc UC. He reforzado con proyectos practicos en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, Firebase/Firestore, Arch Linux y Debian; no cuento con una certificacion formal avanzada vigente.';
      if (/lims|empower/.test(q)) return 'No he trabajado directamente con LIMS ni Empower en un rol TI productivo. Si tengo experiencia previa en entornos de laboratorio y sistemas con trazabilidad, registros, validacion de datos y cumplimiento de procedimientos, ademas de base tecnica en SQL, Python, documentacion y soporte.';
      if (/que carrera estudiaste|carrera estudiaste|carrera.*estudiaste/.test(q)) return 'Estoy cursando Analista Programador en Duoc UC, con foco en desarrollo de software, automatizacion, datos, SQL, Python, TypeScript, React, APIs REST, Git/GitHub, Arch Linux y Debian.';
      if (/nivel.*titulo|nivel.*tutulo|titulo universitario|tutulo universitario/.test(q)) return 'Analista Programador en formacion en Duoc UC. Actualmente estoy orientado a desarrollo de software, automatizacion, datos y soporte TI, con proyectos practicos en Python, TypeScript, React, SQL, APIs REST, Git/GitHub, Arch Linux y Debian.';
      if (/experiencia.*analisis.*gestion de datos|analisis y gestion de datos|gestion de datos/.test(q)) return 'Si, tengo experiencia practica en analisis y gestion de datos mediante proyectos de inventario, automatizacion y reporteria. He trabajado con Python, SQL/SQLite/PostgreSQL, validaciones, limpieza de datos, exportaciones CSV/PDF, control de stock y documentacion en Inventario App, Exelcior Apolo y AMILAB.';
      if (/oficina.*2 veces|2 veces.*semana|asistir.*oficina|remota y presencial|remoto y presencial/.test(q)) return 'Si, estoy de acuerdo con asistir a oficina 2 veces por semana en Santiago si la ubicacion y horario son coordinables.';
      if (/apache|dataflow/.test(q)) return 'No he usado Apache Dataflow en proyectos productivos. Si tengo experiencia practica con Python, SQL, automatizacion, procesamiento de archivos/datos, validaciones, reportes y flujos de integracion; puedo aprender Dataflow o herramientas Apache segun el stack del equipo.';
      if (/resides en santiago|residencia.*santiago|vives en santiago/.test(q)) return 'Si, resido en Santiago, Region Metropolitana.';
      if (/proceso automatizado falla|automatizado falla|identificar y solucionar/.test(q)) return 'Primero revisaria logs, mensajes de error y el punto exacto donde falla. Luego validaria entradas, credenciales, dependencias, conexion a base de datos/API y cambios recientes. Reproduciria el caso con datos controlados, aislaria la causa, aplicaria la correccion, probaria nuevamente y documentaria incidente, solucion y prevenciones.';
      if (/documentarias un proceso automatizado|documentar.*proceso automatizado|mantenido por otros/.test(q)) return 'Documentaria objetivo, entradas y salidas, responsables, dependencias, credenciales o variables de entorno, pasos de ejecucion, diagrama simple del flujo, validaciones, manejo de errores, logs, pruebas, frecuencia, rollback y ejemplos. Tambien dejaria README y checklist de mantenimiento.';
      if (/detalla.*experiencia.*requisitos|experiencia.*requisitos.*oferta|requisitos solicitados/.test(q)) return 'Tengo experiencia practica en desarrollo web y automatizacion con TypeScript, JavaScript, React, Node/APIs REST, Python, SQL, Git/GitHub, Firebase/Firestore, Vercel, documentacion y validaciones. En AMILAB trabaje frontend React/TypeScript y backend serverless; en Inventario App y Exelcior Apolo trabaje datos, reportes, automatizacion y arquitectura por capas.';
      if (/manejas base de datos|bases? de datos.*cual|base de datos.*cuales/.test(q)) return 'Si. Manejo SQL a nivel basico-intermedio con consultas, modelos simples, CRUD, validaciones y reportes. He trabajado con SQLite/PostgreSQL en proyectos, Firestore como NoSQL en AMILAB, y puedo adaptarme a MySQL, SQL Server u otras bases relacionales segun el stack.';
      if (/pipelines?.*ci\/cd|ci\/cd.*github actions|github actions.*herramientas similares/.test(q)) return 'He trabajado con Git/GitHub, flujos de versionamiento, despliegues en Vercel/Firebase y configuraciones basicas de proyecto. GitHub Actions lo manejo a nivel basico/en aprendizaje para automatizar validaciones, pruebas o despliegues simples; no cuento aun con experiencia avanzada productiva en CI/CD.';
      if (/dominio avanzado.*react.*vue|react.*vue.*proyecto|vue\.?js.*proyecto/.test(q)) return 'Mi experiencia mas fuerte es con React, TypeScript y Vite en AMILAB Frontend, construyendo interfaz, validaciones, consumo de APIs y estructura de componentes. Vue.js lo manejo a nivel basico/en aprendizaje, con experiencia transferible desde React. No me presentaria como avanzado en Vue, pero puedo adaptarme rapido.';
      if (/react.*tailwind|tailwind.*react|shadcn|librerias de componentes|componentes como shadcn/.test(q)) return 'Tengo experiencia practica con React, TypeScript y Vite en AMILAB Frontend, trabajando componentes, formularios, consumo de APIs, validaciones y estructura de interfaz. Tailwind lo manejo a nivel basico/en aprendizaje y puedo adaptarme a librerias de componentes como shadcn rapidamente por mi base en React y CSS.';
      if (/typeorm|type orm|manejo de datos.*typeorm/.test(q)) return 'No he usado TypeORM en produccion. Tengo base practica en SQL, modelos de datos, CRUD, SQLite/PostgreSQL y Firestore, ademas de APIs REST con TypeScript. Puedo aprender TypeORM rapidamente porque entiendo la relacion entre entidades, repositorios, consultas y persistencia.';
  if (/react.*tailwind|tailwind.*react|shadcn|librerias de componentes|componentes como shadcn/.test(q)) return 'Tengo experiencia practica con React, TypeScript y Vite en AMILAB Frontend, trabajando componentes, formularios, consumo de APIs, validaciones y estructura de interfaz. Tailwind lo manejo a nivel basico/en aprendizaje y puedo adaptarme a librerias de componentes como shadcn rapidamente por mi base en React y CSS.';
  if (/typeorm|type orm|manejo de datos.*typeorm/.test(q)) return 'No he usado TypeORM en produccion. Tengo base practica en SQL, modelos de datos, CRUD, SQLite/PostgreSQL y Firestore, ademas de APIs REST con TypeScript. Puedo aprender TypeORM rapidamente porque entiendo la relacion entre entidades, repositorios, consultas y persistencia.';
      if (/dashboards|looker studio|reportes|indicadores/.test(q)) return 'He creado reportes y salidas de datos en proyectos como Inventario App y Exelcior Apolo, con indicadores de stock, movimientos, validaciones, exportaciones CSV/PDF y control operativo. No he usado Looker Studio en produccion, pero entiendo la logica de KPIs, filtros, fuentes de datos y visualizacion para seguimiento.';
      if (/que es un proceso etl|proceso etl|importancia.*datos/.test(q)) return 'Un ETL consiste en extraer datos desde una o varias fuentes, transformarlos limpiando, validando y normalizando la informacion, y cargarlos en un destino como una base, reporte o sistema. Es importante porque permite datos consistentes, trazables y listos para analisis o automatizacion.';
      if (/inner join|left join/.test(q)) return 'INNER JOIN devuelve solo registros con coincidencia en ambas tablas. LEFT JOIN devuelve todos los registros de la tabla izquierda y agrega datos de la derecha cuando existen; si no hay coincidencia quedan nulos. Usaria INNER para cruces obligatorios y LEFT para conservar todos los clientes, productos o casos aunque no tengan movimiento relacionado.';
      if (/total de transacciones por cliente|transacciones por cliente|consulta sql/.test(q)) return 'Usaria una agregacion por cliente filtrando el periodo. Ejemplo: SELECT cliente_id, COUNT(*) AS cantidad, SUM(monto) AS total FROM transacciones WHERE fecha >= :desde AND fecha < :hasta GROUP BY cliente_id ORDER BY total DESC. Si se requiere nombre del cliente, agregaria JOIN con la tabla clientes.';
      if (/datos sensibles|datos criticos|confidencialidad/.test(q)) return 'He trabajado con datos sensibles en entorno de laboratorio clinico y datos operativos/inventario. Los manejo con criterio de confidencialidad, acceso minimo necesario, canales autorizados, no exposicion de credenciales, respaldos, documentacion y trazabilidad.';
      if (/creacion o mantenimiento de procesos automatizados|procesos automatizados|que hiciste y que herramientas/.test(q)) return 'Si. He creado automatizaciones con Python para transformar y validar archivos Excel, generar reportes, exportar CSV/PDF y controlar datos operativos. En proyectos como Exelcior Apolo e Inventario App use Python, SQL/SQLite, Git/GitHub, documentacion, validaciones y pruebas basicas.';
      const previous = remembered(label);
      if (previous) return previous;
      if (/licencia.*clase b|clase b|licencia de conducir/.test(q)) return 'Si, cuento con licencia clase B vigente.';
      if (/itil/.test(q)) return 'Tengo conocimiento basico de practicas ITIL para registro, priorizacion, seguimiento y escalamiento de incidentes. No cuento con certificacion ITIL vigente.';
      if (/microinformatica|hardware|software|redes basicas|redes b[aá]sicas/.test(q)) return 'Experiencia junior/en formacion en microinformatica: soporte a usuarios, sistemas operativos, software administrativo, revision inicial de hardware, redes basicas, documentacion y escalamiento.';
      if (/renovacion tecnologica|renovaci[oó]n tecnol[oó]gica|pcs|servidores/.test(q)) return 'He participado a nivel de apoyo junior en soporte, revision y configuracion basica de equipos, documentacion y seguimiento de casos. Puedo apoyar proyectos de renovacion tecnologica bajo procedimientos definidos.';
      if (/zapatos? de seguridad|calzado de seguridad/.test(q)) return 'No cuento actualmente con zapatos de seguridad.';
      if (/vehiculo propio|movilizacion propia|transporte propio/.test(q)) return 'No cuento con vehiculo propio; puedo coordinar traslado segun ubicacion y horario.';
      if (/numero de contacto|contacto|correo|telefono/.test(q)) return 'Telefono: +56954764325. Correo: gianlucassanmartin@gmail.com.';
      if (/pretensiones de renta|pretensi|renta|sueldo/.test(q)) return 'Mis pretensiones de renta estan en torno a $900.000 CLP liquidos, conversable segun modalidad, beneficios y proyeccion.';
      if (/comuna de residencia|residencia|comuna/.test(q)) return 'Santiago, Region Metropolitana.';
      if (/titulo profesional|formacion academica|formacion|estudios/.test(q)) return 'Analista Programador en formacion en Duoc UC, orientado a desarrollo de software, automatizacion, datos y soporte TI. Cuento con proyectos activos en Python, React, TypeScript, SQL, Firebase/Firestore, Git/GitHub, Arch Linux y Debian.';
      if (/power automate/.test(q)) return 'He usado Power Automate a nivel basico/en aprendizaje. Mi experiencia principal en automatizacion ha sido con Python, scripts, validaciones de datos y flujos con Excel. Puedo adaptarme a Power Automate y aplicar la misma logica de procesos, condiciones y seguimiento.';
      if (/azure ai foundry|azure/.test(q)) return 'No cuento con experiencia laboral directa en Azure AI Foundry. Si tengo base en IA aplicada, APIs, automatizacion y proyectos con Python/JavaScript. Estoy disponible para aprender la herramienta y aportar desde mi base tecnica junior.';
      if (/python.*scripting|python.*automatizaci|python.*integraci|python.*apis|python/.test(q)) return 'Si, tengo experiencia practica con Python en proyectos academicos y propios para automatizacion, scripting, manejo de datos, reportes, SQL e integracion con APIs. Destaco Inventario App y Exelcior Apolo, donde use Python para procesos, validaciones y generacion de reportes.';
      if (/mssql server|sql server/.test(q)) return 'Si, tengo experiencia practica basica-intermedia con SQL y bases relacionales. He trabajado consultas, CRUD, modelos simples y validaciones en proyectos con SQLite/PostgreSQL, y puedo adaptarme a MSSQL Server/SQL Server segun el entorno del equipo.';
      if (/sistemas operativos windows|windows/.test(q)) return 'Si, tengo experiencia usando Windows para trabajo diario, configuracion basica, instalacion de software, resolucion de problemas comunes y soporte a usuarios. Tambien manejo Linux, especialmente Arch Linux y Debian.';
      if (/desarrollo de sistemas|en que proyectos|que proyectos|proyectos/.test(q)) return 'He desarrollado y mantenido proyectos activos como Exelcior Apolo, Amiweb/AMILAB, Inventario App y una aplicacion movil para HC Soluciones. En ellos he trabajado con Python, React, TypeScript, SQL, Firebase/Firestore, APIs REST, reportes, validaciones, documentacion, Git/GitHub, Arch Linux y Debian.';
      if (/versiones.*\.net|\.net.*productivos|netcore|net core/.test(q)) return 'No cuento con experiencia productiva formal en .NET. Tengo base en desarrollo web, APIs REST, SQL, JavaScript, TypeScript y React; puedo incorporarme como perfil junior y reforzar .NET/.NET Core segun el stack del equipo.';
      if (/analista ti.*gestion de proyectos tecnico|analista ti.*desarrollos \.net|desarrollos \.net/.test(q)) return 'Mi experiencia formal en .NET aun es junior/en aprendizaje. Si tengo experiencia practica como Analista Programador en formacion, trabajando con proyectos de software, APIs REST, SQL, React, TypeScript, Python, Git/GitHub, documentacion, validaciones y seguimiento de tareas tecnicas. Puedo aportar en analisis, coordinacion, pruebas y levantamiento tecnico mientras refuerzo .NET segun el stack del equipo.';
      if (/proveedores externos|seguimiento de tiempos|reporteria sobre los avances|reporte.*avances|servicios tecnicos/.test(q)) return 'He realizado seguimiento y documentacion de tareas tecnicas en proyectos activos, coordinando avances, validaciones, incidencias y entregables. Manejo reportes, datos, Git/GitHub, documentacion y comunicacion con usuarios/equipos. No tengo experiencia senior gestionando proveedores externos, pero puedo apoyar control de tiempos, registro de avances y validacion funcional/tecnica de soluciones.';
      if (/asp\.net|mvc|web api/.test(q)) return 'No tengo experiencia laboral directa con ASP.NET MVC o Web API. Si tengo experiencia practica construyendo y consumiendo APIs REST, validaciones, endpoints y documentacion en proyectos con TypeScript/JavaScript, y buena disposicion para aprender el framework requerido.';
      if (/react native/.test(q)) return 'No cuento con experiencia laboral directa en React Native. Si tengo base practica en React, TypeScript, JavaScript, componentes, rutas, consumo de APIs y validaciones; puedo adaptarme al entorno mobile con aprendizaje rapido.';
      if (/logica de negocio|l[oÃ³]gica de negocio/.test(q)) return 'En mis proyectos manejo la logica de negocio separandola de la interfaz cuando es posible, usando funciones, servicios o endpoints que validan datos, aplican reglas y documentan el flujo. No lo he aplicado en iOS productivo, pero si en proyectos web/API como AMILAB e Inventario App.';
      if (/swift|uikit|concurrencia en ios|arquitecturas en apps ios|apps ios|autenticacion biometrica|biometrica en ios|face id/.test(q)) return 'No tengo experiencia laboral directa desarrollando apps iOS en produccion con Swift/UIKit. Tengo base en desarrollo web, APIs REST, Git, validaciones y logica de negocio; si el equipo acepta perfil junior, puedo aprender el stack iOS con responsabilidad.';
      if (/consumiendo apis rest en ios|apis rest en ios|autenticacion segura/.test(q)) return 'No he consumido APIs REST especificamente desde iOS. Si tengo experiencia practica consumiendo e integrando APIs REST en proyectos web, manejando endpoints, validaciones, autenticacion basica y documentacion.';
      if (/git en equipos|trabajas normalmente con git/.test(q)) return 'Trabajo con Git/GitHub para control de versiones, ramas, commits, repositorios y documentacion. Puedo adaptarme a flujos de equipo con pull requests, revisiones y convenciones definidas.';
      if (/desarrollo de apis|integracion.*sistemas externos|integraci[oÃ³]n.*sistemas externos/.test(q)) return 'Si, tengo experiencia practica desarrollando y consumiendo APIs REST en proyectos academicos y propios. Por ejemplo, AMILAB Backend integra endpoints para datos de productos/contacto y validaciones, y he trabajado consumo de APIs desde frontend React/TypeScript.';
      if (/sistemas nuevos desde cero|mantenimiento a sistemas/.test(q)) return 'He construido proyectos desde cero a nivel academico y personal, como AMILAB e Inventario App, definiendo estructura, pantallas, datos, validaciones y documentacion. Tambien he realizado ajustes, correcciones y mejoras sobre sistemas propios existentes.';
      if (/no-sql|nosql|mongodb|redis|couchdb/.test(q)) return 'Tengo experiencia practica con Firestore como base NoSQL en proyectos propios. No cuento con experiencia laboral directa en MongoDB, Redis o CouchDB, pero entiendo el modelo general NoSQL y puedo aprender la herramienta requerida.';
      if (/angularjs|html5|css|javascript/.test(q)) return 'Tengo experiencia practica con HTML5, CSS, JavaScript, TypeScript y React en proyectos web. AngularJS lo manejo a nivel basico/en aprendizaje; puedo adaptarme si el equipo lo utiliza.';
      if (/cms|wordpress|strapi/.test(q)) return 'No tengo experiencia laboral directa implementando CMS como WordPress o Strapi. Si tengo experiencia practica en desarrollo web con React, TypeScript, rutas, componentes, consumo de datos, Firebase/Firestore y documentacion; puedo aprender e integrar un CMS segun el proyecto.';
      if (/liderando equipos frontend|celulas agiles|c[eÃ©]lulas [aÃ¡]giles|liderazgo frontend/.test(q)) return 'No he liderado formalmente equipos frontend ni celulas agiles. Si he trabajado organizando tareas, documentando avances, usando Git/GitHub y desarrollando proyectos web propios con React/TypeScript. Puedo aportar como perfil colaborador junior y aprender practicas agiles del equipo.';
      if (/servicenow|itsm|itom|cmdb/.test(q)) return 'No cuento con experiencia laboral directa en ServiceNow, ITSM, ITOM o CMDB. Tengo base en soporte, documentacion de incidencias, procesos, SQL y desarrollo junior; puedo aprender la plataforma si el rol acepta perfil en formacion.';
      if (/postgresql/.test(q)) return 'Si, tengo experiencia practica basica con PostgreSQL y SQL en proyectos academicos/personales, incluyendo consultas, modelos, CRUD y conexion desde aplicaciones. Tambien he usado SQLite y Firestore.';
      if (/php laravel|laravel/.test(q)) return 'No tengo experiencia laboral directa con PHP Laravel. Tengo base en desarrollo web, APIs REST, JavaScript/TypeScript, React, SQL y estructura backend; puedo aprender Laravel con rapidez si el equipo lo requiere.';
      if (/integraciones de apis|servicios externos|integracion.*apis/.test(q)) return 'Si, he realizado integracion y consumo de APIs REST en proyectos propios, con validaciones, endpoints, datos de frontend/backend y documentacion. Mi experiencia es practica/junior, no senior productiva.';
      if (/cosmos db|neo4j|bases de datos de grafos/.test(q)) return 'No tengo experiencia directa con Cosmos DB ni Neo4J. Si tengo base practica en SQL, Firestore/NoSQL y modelado simple de datos, y estoy dispuesto a aprender y trabajar con esas tecnologias.';
      if (/java.*spring|spring boot|arquitectura hexagonal|patrones de dise/.test(q)) return 'Tengo base en Java y programacion orientada a objetos en formacion, pero no experiencia avanzada laboral con Spring/Spring Boot ni arquitectura hexagonal. Si tengo base en APIs REST, SQL, Git y buenas practicas, y puedo reforzar ese stack.';
      if (/sql.*mysql|adm de bases de datos|microservicios/.test(q)) return 'Tengo experiencia practica con SQL, consultas, CRUD y bases como SQLite/PostgreSQL; MySQL lo manejo a nivel basico/en aprendizaje. He creado y consumido APIs REST en proyectos propios. No cuento aun con experiencia laboral profunda en microservicios.';
      if (/aws|kubernetes/.test(q)) return 'Tengo conocimiento basico de cloud/devops y despliegues mediante Vercel, Firebase, Git/GitHub y variables de entorno. AWS lo manejo a nivel fundamentos y Kubernetes no lo he usado laboralmente; puedo aprenderlo.';
      if (/oracle database|pl\/sql|pl sql|procedimientos almacenados/.test(q)) return 'No cuento con experiencia laboral directa en Oracle Database ni PL/SQL. Tengo base practica en SQL, consultas, modelos simples y validaciones de datos; trabajo mas con consultas y CRUD que con procedimientos almacenados.';
      if (/cursos relacionados.*desarrollo|herramientas de desarrollo/.test(q)) return 'Si. Actualmente curso Analista Programador en Duoc UC y he reforzado con fundamentos AWS, Red Hat System Administration, Git/GitHub, SQL, JavaScript, TypeScript, React, Python, APIs REST y proyectos propios.';
      if (/herramienta.*ia|herramientas.*ia|utilizado.*herramienta|usado.*herramienta|ia.*utilizas|inteligencia artificial|ai tools/.test(q)) return 'Utilizo herramientas de IA como ChatGPT y GitHub Copilot para apoyo en analisis, documentacion, depuracion, generacion de ideas y automatizacion. Las uso como asistencia, validando siempre el resultado tecnico antes de aplicarlo.';
      if (/cuantos anos lleva en desarrollo|a[nÃ±]os lleva en desarrollo|tiempo.*desarrollo/.test(q)) return 'Cuento con alrededor de 1 ano de experiencia practica en desarrollo mediante proyectos academicos y personales, con foco en Python, JavaScript, TypeScript, React, SQL, APIs REST, automatizacion, documentacion y pruebas basicas.';
      if (/stack tecnologico|stack tecnol[oÃ³]gico|node.*react|react.*node|\.net.*node.*react/.test(q)) return 'Mi stack principal practico es JavaScript, TypeScript, React, Python, SQL, APIs REST y Git/GitHub. Tengo base en Node/APIs y React mediante proyectos como AMILAB, y .NET lo manejo a nivel basico/en aprendizaje, con disposicion para reforzarlo.';
      if (/cloud|devops|despliegue|deploy/.test(q)) return 'Tengo experiencia basica/practica en despliegues y herramientas cloud/devops mediante Vercel, Firebase/Firestore, Git/GitHub, variables de entorno, documentacion y control de versiones. No cuento aun con experiencia laboral profunda en cloud, pero tengo buena base para aprender.';
      if (/desarrollador bi|experiencia.*bi|business intelligence|power bi/.test(q)) return 'Tengo experiencia practica con datos, SQL basico-intermedio, Python, Excel, reportes, validaciones y control de informacion. No cuento con experiencia laboral formal como desarrollador BI, pero mi base en datos y automatizacion me permite aportar como perfil junior/en aprendizaje.';
      if (/herramientas descritas|herramientas.*aviso|manejas las herramientas|stack descrito/.test(q)) return 'Manejo parte de las herramientas asociadas a desarrollo web: JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, testing basico y documentacion. Si el aviso incluye herramientas especificas adicionales, las manejo a nivel basico/en aprendizaje y puedo reforzarlas rapidamente.';
      if (/db2|jcl|vsam|sam|mainframe/.test(q)) return 'No cuento con experiencia laboral directa en DB2, JCL ni archivos VSAM/SAM. Tengo base en SQL, control de versiones, documentacion y desarrollo junior, y estoy disponible para aprender tecnologias Mainframe si el equipo lo permite.';
      if (/rubro bancario|banca|bancario|financiero/.test(q)) return 'No tengo experiencia formal directa en proyectos del rubro bancario. Si tengo experiencia practica con datos, documentacion, validaciones, trazabilidad y procesos ordenados, ademas de buena disposicion para aprender reglas y flujos del negocio financiero.';
      if (/gitlab|control de versiones|versionamiento/.test(q)) return 'Tengo experiencia practica con Git/GitHub para control de versiones, ramas, commits, repositorios y documentacion. GitLab lo manejo a nivel basico/en aprendizaje; puedo adaptarme al flujo de versionamiento del equipo.';
      if (/carta de presentacion|carta de presentaci[oÃ³]n|cover letter|cuerpo de la carta/.test(q)) return 'Me interesa postular porque estoy orientando mi carrera al area TI como Analista Programador en formacion. Mantengo proyectos activos en Python, React, TypeScript, inventario, automatizacion de Excel y desarrollo movil para AMILAB, Tamapal y HC Soluciones. Busco aportar como perfil junior con aprendizaje rapido, responsabilidad, buena comunicacion y foco en soluciones practicas.';
      if (/actualmente.*trabajando|se encuentra trabajando|trabajo actual/.test(q)) return 'No, actualmente tengo disponibilidad inmediata para integrarme a un nuevo cargo.';
      if (/ingles|english/.test(q)) return 'Basico-intermedio; puedo defenderme en conversaciones tecnicas simples y sigo mejorando.';
      if (/experiencia reciente|funciones desempenadas|anos de experiencia|experiencia en el cargo|cargo/.test(q)) return 'Tengo experiencia practica reciente en desarrollo web, automatizacion y datos mediante proyectos activos: AMILAB Frontend/Backend, Exelcior Apolo, Inventario App y una app movil para HC Soluciones. He trabajado con React, TypeScript, JavaScript, Python, SQL, APIs REST, Firebase/Firestore, Git/GitHub, documentacion y pruebas basicas. Mi experiencia formal en TI es junior/en formacion, con proyectos concretos y aprendizaje rapido.';
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
  await page.waitForTimeout(6000).catch(() => {});
  if (page.isClosed()) {
    return { status: 'paused', reason: 'page closed after submit click; verify portal before tracker', role, company, url };
  }
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
