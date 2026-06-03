import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const cvPath = resolve(ROOT, 'output/cv-gian-programador-ti.pdf');

const profileBlocks = {
  experience: `Mi experiencia profesional combina operación, datos y desarrollo de software. Actualmente estoy orientando mi carrera al área TI como Analista Programador en formación, con proyectos prácticos en frontend, backend, automatización y gestión de datos. He desarrollado AMILAB Frontend con React, TypeScript y Vite, y AMILAB Backend con TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, validaciones con Zod, logging y tests. También desarrollé Inventario App, un sistema en Python con SQLAlchemy, SQLite/PostgreSQL, generación de PDFs, exportación CSV y arquitectura por capas, además de Exelcior Apolo, una aplicación Python para automatizar transformación, validación e impresión de archivos Excel.

Mi experiencia previa en laboratorio clínico y logística aporta una base sólida para TI: manejo de sistemas, trazabilidad, control de datos, documentación, cumplimiento de procedimientos y trabajo con usuarios reales. En Barnafi Krause y RLab trabajé con registros, sistemas LIS, datos clínicos y procesos regulados, mientras que en Amilab he trabajado con control de inventario, stock, despacho y datos operativos. Esa combinación me permite entender problemas reales de negocio y transformarlos en soluciones digitales útiles.`,
  education: `Actualmente curso la carrera de Analista Programador en Instituto Profesional Duoc UC, Sede Puente Alto, donde he desarrollado conocimientos en programación, bases de datos, desarrollo web, análisis de sistemas y construcción de aplicaciones. Mi formación técnica incluye Python, JavaScript, TypeScript, Java, SQL, React, Node.js, FastAPI, Git/GitHub, Firebase/Firestore, consumo y diseño de APIs REST, testing, automatización y generación de reportes.

Como complemento, soy titulado de Técnico en Laboratorio Clínico y Banco de Sangre por Instituto Profesional Duoc UC. Esta segunda formación me entrega una ventaja diferencial para el área TI: experiencia con procesos regulados, datos sensibles, trazabilidad, calidad, documentación y trabajo riguroso bajo protocolos. Mi objetivo profesional actual es desarrollarme como programador en el área TI, aportando con proyectos reales, aprendizaje continuo y capacidad para conectar tecnología con procesos operativos.`,
};

const applications = [
  {
    company: 'Consistor Chile',
    role: 'Programador junior fullstack JavaScript',
    url: 'https://www.chiletrabajos.cl/trabajo/3610115/',
    message: `Hola equipo de Consistor Chile:

Me interesa postular al cargo de Programador junior fullstack JavaScript. Estoy en formación como Analista Programador y busco incorporarme al área TI en un rol donde pueda aportar con desarrollo web, APIs REST, manejo de datos y aprendizaje continuo.

Mi mejor evidencia para este rol es mi proyecto AMILAB, donde desarrollé un frontend con React, TypeScript y Vite, y un backend serverless con TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, Auth, CORS, Zod, logging y tests. También cuento con proyectos en Python orientados a inventario, reportes, PDFs, SQL y automatización de procesos operativos.

Además de mi formación técnica, tengo experiencia previa en laboratorio clínico y logística, lo que me ha dado disciplina con datos, trazabilidad, documentación, atención al detalle y trabajo con usuarios reales. Creo que esa combinación puede aportar valor en equipos que desarrollan software para resolver problemas concretos.

Me interesa especialmente la modalidad remota, el foco junior y la posibilidad de crecer técnicamente dentro del equipo.

Saludos,
Gian Lucas San Martín Agurto`,
  },
  {
    company: 'Genesys',
    role: 'Desarrollador Full Stack Junior',
    url: 'https://www.chiletrabajos.cl/trabajo/desarrollador-full-stack-junior-3827596',
    message: `Hola equipo de Genesys:

Me interesa postular al cargo de Desarrollador Full Stack Junior. Estoy orientando mi carrera hacia programación en el área TI y cuento con proyectos prácticos que demuestran desarrollo frontend, backend, APIs, manejo de datos y automatización.

Para este rol destaco especialmente AMILAB, un proyecto full stack con frontend en React, TypeScript y Vite, y backend serverless en TypeScript con Vercel Functions, Firebase/Firestore, endpoints REST, validaciones con Zod, logging y tests. También desarrollé Inventario App, un sistema Python para productos, compras, ventas, reportes, PDFs y persistencia con SQLite/PostgreSQL.

Mi stack principal actual es Python, JavaScript, TypeScript, React, FastAPI, SQL y Git/GitHub. Aunque Angular/.NET/SQL Server no son mi experiencia principal, tengo fundamentos sólidos en frontend, APIs, bases de datos y arquitectura de aplicaciones, por lo que puedo adaptarme con rapidez al stack del equipo.

La modalidad 100% remota y el enfoque junior calzan muy bien con mi búsqueda actual.

Saludos,
Gian Lucas San Martín Agurto`,
  },
  {
    company: 'Perceptual Consultora',
    role: 'Programador Web PHP Junior',
    url: 'https://www.chiletrabajos.cl/trabajo/mj-programador-web-php-junior-contrato-indefinido-3800954',
    message: `Hola equipo de Perceptual Consultora:

Me interesa postular al cargo de Programador Web PHP Junior. Estoy en formación como Analista Programador y busco incorporarme al área TI en un rol junior donde pueda seguir creciendo en desarrollo web, backend, bases de datos y mantención de aplicaciones.

Mi experiencia práctica incluye proyectos como AMILAB Frontend, desarrollado con React, TypeScript y Vite, y AMILAB Backend, desarrollado con TypeScript, Vercel Functions, Firebase/Firestore, endpoints REST, validación con Zod y tests. También cuento con Inventario App, un sistema Python con SQLAlchemy, SQLite/PostgreSQL, reportes PDF y exportación CSV.

Aunque mi stack principal no es PHP/.NET, tengo fundamentos en programación web, APIs, SQL, arquitectura por capas y manejo de datos. Me interesa aprender y adaptarme al stack del equipo.

Saludos,
Gian Lucas San Martín Agurto`,
  },
  {
    company: 'ALS Group',
    role: 'Programador Full Stack Junior',
    url: 'https://cl.linkedin.com/jobs/view/programador-full-stack-junior-at-als-group-4349591435',
    message: `Hola:

Me interesa postular al cargo de Programador Full Stack Junior. Estoy en formación como Analista Programador y cuento con proyectos full stack en React, TypeScript, Vite, backend serverless, Firebase/Firestore, APIs REST, SQL y Python.

Aunque Go, Redis, Docker y AWS ECS no son mi stack principal actual, tengo base en backend, APIs, datos, despliegue serverless y aprendizaje rápido de tecnologías nuevas. Me interesa la oportunidad si el equipo contempla mentoría para perfiles junior.

Saludos,
Gian Lucas San Martín Agurto`,
  },
];

const applyButton = /postular|postula|apply|solicitar|enviar cv|enviar candidatura|candidatura/i;
const finalSubmit = /enviar postulación|enviar postulaci[oó]n|enviar candidatura|submit application|send application|finalizar|confirmar/i;

async function maybeClickApply(page) {
  const candidates = [
    page.getByRole('link', { name: applyButton }),
    page.getByRole('button', { name: applyButton }),
    page.locator('a,button').filter({ hasText: applyButton }),
  ];
  for (const locator of candidates) {
    try {
      const first = locator.first();
      if (await first.count()) {
        const text = (await first.innerText({ timeout: 1500 }).catch(() => '')).trim();
        if (finalSubmit.test(text)) continue;
        await first.click({ timeout: 3000 });
        await page.waitForTimeout(2500);
        return true;
      }
    } catch {}
  }
  return false;
}

async function fillObviousFields(page, app) {
  const fields = [
    [/nombre|name/i, 'Gian Lucas San Martín Agurto'],
    [/email|correo/i, 'gianlucassanmartin@gmail.com'],
    [/tel[eé]fono|phone|celular/i, '+56 9 5476 4325'],
    [/pretensi[oó]n|renta|salario|sueldo/i, '$900.000 CLP'],
    [/linkedin/i, 'https://www.linkedin.com/in/gian-lucas-san-martin-49ab29323/'],
    [/github|portafolio|portfolio/i, 'https://github.com/stredes'],
  ];

  for (const [name, value] of fields) {
    const locators = [
      page.getByLabel(name),
      page.getByPlaceholder(name),
      page.locator('input,textarea').filter({ hasText: name }),
    ];
    for (const locator of locators) {
      try {
        const first = locator.first();
        if (await first.count()) {
          await first.fill(value, { timeout: 1500 });
          break;
        }
      } catch {}
    }
  }

  const textareas = page.locator('textarea');
  const n = await textareas.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
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
        if (current.trim() !== profileBlocks.experience.trim()) await field.fill(profileBlocks.experience);
      } else if (/formaci[oó]n|educaci[oó]n|estudios|education|academic/i.test(labelText)) {
        if (current.trim() !== profileBlocks.education.trim()) await field.fill(profileBlocks.education);
      } else if (!current || current.length < 20) {
        await field.fill(app.message);
      }
    } catch {}
  }

  const fileInputs = page.locator('input[type="file"]');
  const fileCount = await fileInputs.count().catch(() => 0);
  for (let i = 0; i < fileCount; i++) {
    try {
      await fileInputs.nth(i).setInputFiles(cvPath);
    } catch {}
  }
}

async function main() {
  if (!existsSync(cvPath)) {
    console.error(`CV PDF not found: ${cvPath}`);
    process.exit(1);
  }

  const userDataDir = resolve(ROOT, '.apply-browser-profile');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1365, height: 900 },
  });

  for (const app of applications) {
    const page = await browser.newPage();
    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await maybeClickApply(page);
    await fillObviousFields(page, app);
    console.log(`Prepared: ${app.company} - ${app.role}`);
  }

  console.log('\nTabs prepared.');
  console.log('Leave this process open. Press Ctrl+C here when finished.');
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
