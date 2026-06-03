import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { answerDynamicQuestions } from './linkedin-question-answerer.mjs';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const USER_DATA_DIR = resolve(ROOT, process.env.LINKEDIN_PROFILE || '.recording-browser-profile');
const profilePath = resolve(ROOT, 'config/profile.yml');
const cvPath = resolve(ROOT, process.env.CV_PATH || 'output/cv-gian-programador-ti.pdf');
const finalSubmitText = /submit application|enviar solicitud|enviar postulaci[oó]n|send application|presentar solicitud|enviar candidatura|finalizar postulaci[oó]n/i;
const nextText = /next|siguiente|ir al siguiente paso|review|revisar|continuar/i;

function loadProfile() {
  const profile = yaml.load(readFileSync(profilePath, 'utf8'));
  const candidate = profile.candidate || {};
  const compensation = profile.compensation || {};
  const location = profile.location || {};
  return {
    fullName: candidate.full_name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    linkedin: candidate.linkedin || '',
    github: candidate.github || '',
    portfolio: candidate.portfolio_url || candidate.github || '',
    city: location.city || 'Santiago',
    country: location.country || 'Chile',
    salary: compensation.minimum || compensation.target_range || '',
    availability: 'Inmediata o segun coordinacion',
    modality: compensation.location_flexibility || '',
  };
}

async function clickFirst(locator) {
  try {
    const first = locator.first();
    if (!(await first.count())) return false;
    await first.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
    await first.click({ timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

async function uploadCv(page) {
  if (!existsSync(cvPath)) return 0;
  const files = page.locator('input[type="file"]');
  const count = await files.count().catch(() => 0);
  let uploaded = 0;
  for (let i = 0; i < count; i += 1) {
    try {
      await files.nth(i).setInputFiles(cvPath);
      uploaded += 1;
    } catch {}
  }
  return uploaded;
}

async function activePage(context) {
  const pages = context.pages();
  return pages.find((page) => /linkedin\.com/.test(page.url())) || pages[pages.length - 1] || await context.newPage();
}

async function main() {
  const profile = loadProfile();
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1365, height: 900 },
  });
  const page = await activePage(context);
  if (!/linkedin\.com/.test(page.url())) {
    await page.goto('https://www.linkedin.com/jobs/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  console.log('Current-form assistant started.');
  console.log('Open a LinkedIn Easy Apply modal. The assistant will fill visible questions and stop before submit.');

  for (let step = 0; step < 8; step += 1) {
    await page.waitForTimeout(1200);
    const finalButton = page.getByRole('button', { name: finalSubmitText });
    if (await finalButton.count().catch(() => 0)) {
      console.log('Final submit visible. Stopping before submit.');
      break;
    }

    const title = (await page.locator('.jobs-unified-top-card__job-title, h1').first().innerText({ timeout: 1000 }).catch(() => '')).trim();
    const answered = await answerDynamicQuestions(page, profile, title);
    const uploaded = await uploadCv(page);
    console.log(`Step ${step + 1}: answered=${answered}, uploaded=${uploaded}`);

    const nowFinal = await page.getByRole('button', { name: finalSubmitText }).count().catch(() => 0);
    if (nowFinal) {
      console.log('Final submit visible after filling. Stopping before submit.');
      break;
    }

    const advanced = await clickFirst(page.getByRole('button', { name: nextText }));
    if (!advanced) {
      console.log('No next/review button found. Waiting for manual action or more fields.');
      await page.waitForTimeout(2500);
    }
  }

  console.log('Assistant paused. Review the application in Chrome.');
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
