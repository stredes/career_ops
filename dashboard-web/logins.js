const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const profileDir = path.join(root, '.monitor-browser-profile');
const port = Number(process.env.MONITOR_CHROME_PORT || 9223);
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const loginUrls = [
  'http://127.0.0.1:5177',
  'https://mail.google.com/mail/u/0/#inbox',
  'https://candidato.cl.computrabajo.com/candidate/home',
  'https://www.getonbrd.com/misempleos',
  'https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED',
];

function findChrome() {
  const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!chrome) throw new Error('No se encontro chrome.exe en Program Files.');
  return chrome;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });
    req.setTimeout(2500, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

async function isChromeReady() {
  try {
    await requestJson(`http://127.0.0.1:${port}/json/version`);
    return true;
  } catch {
    return false;
  }
}

async function openTab(url) {
  try {
    await requestJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`);
  } catch {
    // Chrome may reject /json/new on some builds; opening the profile is enough.
  }
}

async function launch() {
  fs.mkdirSync(profileDir, { recursive: true });

  if (!(await isChromeReady())) {
    const chrome = findChrome();
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      ...loginUrls,
    ];
    const child = spawn(chrome, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
  } else {
    for (const url of loginUrls) await openTab(url);
  }

  console.log(JSON.stringify({
    status: 'ready',
    profileDir,
    port,
    cdpUrl: `http://127.0.0.1:${port}`,
    loginUrls,
    note: 'Las sesiones quedan guardadas en el perfil de Chrome. No se guardan contrasenas en este archivo.',
  }, null, 2));
}

launch().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
