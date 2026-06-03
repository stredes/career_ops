import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9222';

const baseLetter = ({ company, role, focus }) => `Hola equipo de ${company}:

Me interesa postular al cargo de ${role}. Actualmente curso Analista Programador en Duoc UC y estoy orientando mi carrera al desarrollo de software, soporte de sistemas y automatizacion de procesos.

Tengo base practica en Python, JavaScript, TypeScript, Java, SQL, React, Node.js, FastAPI, APIs REST y Git/GitHub. He desarrollado proyectos propios como AMILAB Frontend con React y TypeScript, AMILAB Backend con TypeScript, Firebase/Firestore, endpoints REST y validaciones, Inventario App en Python con SQLAlchemy y SQLite/PostgreSQL, y Exelcior Apolo para automatizar procesos y reportes.

${focus}

Mi experiencia previa en laboratorio clinico y logistica me aporta orden, trazabilidad, atencion al detalle y criterio para entender procesos reales de usuarios. Busco un equipo donde pueda aprender, aportar con responsabilidad y crecer tecnicamente.

Disponibilidad inmediata.
Pretension de renta: $900.000, conversable segun condiciones.

Saludos,
Gian Lucas San Martin Agurto`;

const jobs = [
  {
    id: '3777820',
    company: 'Consistor Chile',
    role: 'Desarrollador Junior Full Stack',
    salary: '900000',
    focus: 'Me interesa especialmente seguir creciendo con Java Spring Boot, Next.js, APIs REST, bases de datos, Docker y buenas practicas de desarrollo en equipo.'
  },
  {
    id: '3836685',
    company: 'SmartJob',
    role: 'Developer Backend',
    salary: '900000',
    focus: 'Para este rol backend puedo aportar con mi experiencia practica en JavaScript/TypeScript, Node.js, diseno de endpoints REST, validaciones, bases de datos SQL/Firestore, pruebas funcionales y documentacion tecnica.'
  },
  {
    id: '3823186',
    company: 'Empresa Comercial de Lampa',
    role: 'Desarrollador Full Stack Junior',
    salary: '900000',
    focus: 'Tengo interes en desarrollo full stack y en soluciones para procesos comerciales, inventario y e-commerce, donde ya he practicado frontend React/TypeScript, backend TypeScript, APIs REST, manejo de datos y automatizacion.'
  },
  {
    id: '3842827',
    company: 'Technology Solutions',
    role: 'Desarrollador Fullstack',
    salary: '950000',
    focus: 'Aunque mi perfil es junior/en formacion, tengo practica con APIs REST, Postman, Git/GitHub, SQL, React, TypeScript y arquitectura por capas en proyectos propios, y estoy disponible para aprender con rapidez dentro del equipo.'
  },
  {
    id: '3836880',
    company: 'Huntic',
    role: 'Desarrollador Junior',
    salary: '850000',
    focus: 'Me atrae un rol junior donde pueda fortalecer desarrollo web, integracion de APIs, JavaScript, bases de datos y mantenimiento de sistemas. Tengo alta disposicion para aprender nuevas tecnologias del stack del equipo.'
  }
];

const extraAnswers = {
  '3823186': [
    'React, TypeScript, JavaScript, HTML5, CSS3, Vite, React Router, Bootstrap y consumo de APIs REST.',
    'Python/FastAPI, TypeScript/Node.js, Firebase/Firestore, SQL, SQLite/PostgreSQL, Java en formacion y APIs REST.',
    'Formacion en Analista Programador Duoc UC, AWS Foundations, Red Hat System Administration y practica constante con Git/GitHub.',
    'No tengo experiencia formal en e-commerce productivo, pero desarrolle AMILAB Frontend/Backend para catalogo B2B, contacto, soporte, APIs y datos de productos.'
  ],
  '3842827': [
    '+56954764325, gianlucassanmartin@gmail.com. Pretension de renta: $950.000 CLP, conversable segun condiciones.',
    'Uso Postman a nivel inicial/intermedio para probar endpoints REST, revisar respuestas, validar datos y documentar flujos basicos.',
    'SQL, SQLite, PostgreSQL y Firestore a nivel inicial/practico en proyectos propios; consultas, CRUD, modelos y trazabilidad.',
    'Conocimiento practico del ciclo: levantamiento, diseno, desarrollo, pruebas, control de versiones, correccion y documentacion.'
  ],
  '3836880': [
    'Santiago, Region Metropolitana.',
    'No tengo experiencia formal en PHP/Laravel; tengo base en JavaScript, React, Java, Python y APIs REST, y puedo aprender Laravel con rapidez.',
    'Si. Manejo HTML, CSS y JavaScript en proyectos web con React, TypeScript, Vite y consumo de APIs.',
    'Si. He trabajado integracion y diseno de APIs REST en proyectos propios, con validaciones, endpoints, pruebas y documentacion.'
  ]
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function blockAds(context) {
  await context.route('**/*', route => {
    const url = route.request().url();
    const type = route.request().resourceType();
    if (
      /doubleclick|googlesyndication|googletagmanager|google-analytics|googleadservices|adsystem|facebook|hotjar/i.test(url) ||
      ['image', 'font', 'media'].includes(type)
    ) {
      return route.abort().catch(() => {});
    }
    return route.continue().catch(() => {});
  });
}

async function fillAndSubmit(page, job) {
  await page.goto(`https://www.chiletrabajos.cl/trabajo/postular/${job.id}`, {
    waitUntil: 'domcontentloaded',
    timeout: 25000
  });
  await sleep(1200);

  const hasForm = await page.locator('form input[name="apply"]').count();
  if (!hasForm) {
    return { id: job.id, role: job.role, status: 'no-form', url: page.url() };
  }

  await page.fill('textarea[name="app_letter"]', baseLetter(job)).catch(() => {});
  await page.fill('input[name="salary"]', job.salary).catch(() => {});
  await page.fill('input[name="disp"]', 'Disponibilidad inmediata').catch(() => {});
  await page.check('#dispoIn').catch(() => {});
  await page.selectOption('select[name="situacion_laboral"]', 'no_responde').catch(() => {});

  const answers = extraAnswers[job.id] || [];
  const editable = await page.locator('form textarea:not([name="app_letter"]), form input[type="text"]:not([name="disp"])').all();
  for (let i = 0; i < editable.length && i < answers.length; i += 1) {
    await editable[i].fill(answers[i]).catch(() => {});
  }

  const before = page.url();
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {}),
    page.locator('form input[name="apply"]').click({ timeout: 8000 }).catch(async () => {
      await page.evaluate(() => document.querySelector('form')?.requestSubmit()).catch(() => {});
    })
  ]);
  await sleep(2500);

  const text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  return {
    id: job.id,
    role: job.role,
    status: /historial|postulaciones|postulaste|postulacion|postulando/i.test(text) || page.url() !== before ? 'submitted-or-redirected' : 'unknown',
    url: page.url(),
    text: text.slice(0, 900)
  };
}

async function dashboard(page) {
  await page.goto('https://www.chiletrabajos.cl/dashboard/postulaciones', {
    waitUntil: 'domcontentloaded',
    timeout: 25000
  }).catch(() => {});
  await sleep(1800);
  return page.evaluate(() => ({
    url: location.href,
    text: document.body.innerText,
    rows: Array.from(document.querySelectorAll('body a'))
      .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
      .filter(a => /postular\/\d+|trabajo\/.*-\d+/.test(a.href) || /\d{7}/.test(a.text))
  }));
}

(async () => {
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0];
  await blockAds(context);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);

  const results = [];
  for (const job of jobs) {
    results.push(await fillAndSubmit(page, job));
  }

  const applications = await dashboard(page);
  console.log(JSON.stringify({ results, applications }, null, 2));
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
})().catch(error => {
  console.error(error);
  process.exit(1);
});
