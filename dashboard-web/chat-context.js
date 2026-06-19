export const chatContext = {
  generatedAt: '2026-06-19',
  workspace: 'C:/Users/bodega 1/Desktop/workspace/career-ops',
  dashboard: {
    url: 'http://127.0.0.1:5177',
    cdpUrl: 'http://127.0.0.1:9223',
    autorun: 'off',
  },
  currentCv: {
    label: 'CV Tech',
    path: 'C:/Users/bodega 1/Downloads/Gian_Lucas_San_Martin_Agurto_CV_Tech.pdf_2026_6_5.pdf',
    useForAllPortals: true,
  },
  candidate: {
    fullName: 'Gian Lucas San Martin Agurto',
    email: 'gianlucassanmartin@gmail.com',
    phone: '+56954764325',
    rut: '19921351-2',
    birthDate: '1999-06-02',
    englishLevel: 'basic-intermediate',
    hasClassBLicense: true,
    availability: 'immediate',
    defaultNetSalaryClp: 900000,
  },
  targetRules: {
    portals: [
      'LinkedIn',
      'Computrabajo',
      'Get on Board',
      'Chiletrabajos',
      'Trabajando',
      'external ATS portals',
    ],
    avoid: [
      'practica',
      'practicante',
      'internship',
      'very low paid trainee roles',
    ],
    allowStretchApplications: true,
    preferRemoteOrHybrid: true,
    confirmBeforeTracking: [
      'visible submitted state',
      'portal status says postulado/enviada',
      'confirmation email or portal evidence',
    ],
  },
  answerProtocol: {
    principle: 'Read each question before answering and adapt the response to the field type.',
    fieldTypes: {
      personalData: 'Use exact candidate data.',
      numericExperience: 'Use a number only, usually 1 for junior practical experience unless stronger evidence exists.',
      salary: 'Use 900000 CLP net by default, adjust upward for higher scope roles.',
      yesNo: 'Answer yes/no only when the question clearly asks for binary selection.',
      select: 'Choose the closest truthful option from available options.',
      text: 'Answer with concise profile-specific evidence from the Tech CV and projects.',
    },
    never: [
      'Do not paste generic paragraphs into phone, city, salary, title, or yes/no fields.',
      'Do not claim senior experience when the profile is junior or in formation.',
      'Do not duplicate applications unless the portal confirms a distinct offer or variant.',
    ],
  },
  profileEvidence: {
    summary:
      'Analista Programador en formacion orientado al area TI, con experiencia practica en Python, JavaScript, TypeScript, React, SQL, APIs REST, Git/GitHub, automatizacion, manejo de datos, Arch Linux y Debian.',
    projects: [
      {
        name: 'Exelcior Apolo',
        repo: 'https://github.com/stredes/exelcior_apolo',
        since: '2025-05-11',
        purpose: 'Automatizacion de procesos, reportes y apoyo operativo.',
      },
      {
        name: 'Amiweb',
        repo: 'https://github.com/stredes/amiweb',
        since: '2025-06-02',
        purpose: 'Aplicacion web para AMILAB con frontend/backend, datos y flujos de contacto/soporte.',
      },
      {
        name: 'Inventario App',
        repo: 'https://github.com/stredes/INVENTARIO_APP',
        since: '2025-05-04',
        purpose: 'Gestion de inventario, stock, trazabilidad y datos para Tamapal.',
      },
      {
        name: 'HC Soluciones mobile app',
        repo: 'https://github.com/NWFL-Software-Development',
        since: '2026-03-03',
        purpose: 'Aplicacion movil en desarrollo para procesos de negocio de HC Soluciones.',
      },
    ],
  },
  latestKnownState: {
    trackerHealth: 'clean',
    verifyCommand: 'node verify-pipeline.mjs',
    verifyResult: '0 errors, 0 warnings',
    totalApplications: 277,
    statusCounts: {
      applied: 210,
      responded: 36,
      rejected: 19,
      evaluated: 6,
      discarded: 5,
      interview: 1,
    },
    emailSync: {
      gmailBodyReadingWorks: true,
      lastAudit:
        'output/email-audits/2026-06-19T17-15-34-077Z-gmail-safe-read.md',
      notes: [
        'Gmail was read with body-level extraction, not only snippets.',
        'Unread and relevant old emails should be checked before status sync.',
        'LinkedIn, Computrabajo, Get on Board, Chiletrabajos, Trabajando, and external ATS messages should update dashboard status when evidence is clear.',
      ],
    },
    bizneoTecnova: [
      {
        applicationId: 279,
        company: 'Tecnova',
        role: 'QA Automatizador',
        status: 'Responded',
        evidence:
          'Bizneo link is closed and says it may already have been completed.',
      },
      {
        applicationId: 269,
        company: 'Tecnova Soluciones Informaticas',
        role: 'Desarrollador FullStack Net',
        status: 'Responded',
        evidence:
          'Bizneo link is closed and says it may already have been completed.',
      },
    ],
  },
  immediateNextSteps: [
    'Update the dashboard with the latest Bizneo verification.',
    'Continue portal discovery and applications using confirmed submission evidence only.',
    'Read Gmail messages fully and sync real statuses.',
    'Keep building the question-answer bank from application forms.',
  ],
};

export default chatContext;
