import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const ROOT = resolve('C:/Users/bodega 1/Desktop/workspace/career-ops');
const USER_DATA_DIR = resolve(ROOT, process.env.RECORDING_PROFILE || '.recording-browser-profile');
const outputPath = resolve(
  ROOT,
  process.env.RECORDING_PATH || `output/linkedin-recording-${new Date().toISOString().slice(0, 10)}.json`,
);

const finalSubmitText = /submit application|enviar solicitud|enviar postulaci[oó]n|send application|presentar solicitud|enviar candidatura|finalizar postulaci[oó]n/i;
const actions = [];

function flush() {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(actions, null, 2)}\n`, 'utf8');
}

function record(action) {
  actions.push({
    ...action,
    at: new Date().toISOString(),
  });
  flush();
  console.log(`${actions.length}. ${action.type}: ${action.label || action.selector || action.url || ''}`);
}

async function main() {
  flush();
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1365, height: 900 },
  });

  await context.exposeFunction('__careerOpsRecord', record);
  await context.addInitScript(({ finalSubmitSource }) => {
    const finalSubmit = new RegExp(finalSubmitSource, 'i');

    function cssPath(node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
      const element = node;
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
      if (testId) return `[data-testid="${CSS.escape(testId)}"], [data-test-id="${CSS.escape(testId)}"]`;
      const aria = element.getAttribute('aria-label');
      if (aria) return `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(aria)}"]`;

      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
        let part = current.tagName.toLowerCase();
        const classes = [...current.classList].filter(Boolean).slice(0, 2);
        if (classes.length) part += `.${classes.map((item) => CSS.escape(item)).join('.')}`;
        const parent = current.parentElement;
        if (parent) {
          const sameTag = [...parent.children].filter((child) => child.tagName === current.tagName);
          if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(' > ');
    }

    function labelFor(node) {
      const element = node.closest('button,a,label,input,textarea,select,[role="button"]') || node;
      const id = element.getAttribute('id');
      const linkedLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      return (
        element.getAttribute('aria-label') ||
        linkedLabel?.textContent ||
        element.getAttribute('placeholder') ||
        element.innerText ||
        element.value ||
        ''
      ).trim().replace(/\s+/g, ' ').slice(0, 160);
    }

    document.addEventListener(
      'click',
      (event) => {
        const target = event.target.closest('button,a,[role="button"],input,textarea,select,label');
        if (!target) return;
        const label = labelFor(target);
        window.__careerOpsRecord({
          type: 'click',
          selector: cssPath(target),
          label,
          blockedOnReplay: finalSubmit.test(label),
          url: location.href,
        });
      },
      true,
    );

    document.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        const inputType = (target.getAttribute('type') || '').toLowerCase();
        const sensitive = inputType === 'password' || /password|contrase[nñ]a|passcode/i.test(labelFor(target));
        window.__careerOpsRecord({
          type: target.tagName === 'SELECT' ? 'select' : 'fill',
          selector: cssPath(target),
          label: labelFor(target),
          value: sensitive ? '' : target.value,
          redacted: sensitive,
          url: location.href,
        });
      },
      true,
    );
  }, { finalSubmitSource: finalSubmitText.source });

  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/jobs/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('Recording started.');
  console.log(`Output: ${outputPath}`);
  console.log('Interact with LinkedIn normally. Password fields are redacted.');
  console.log('Close this terminal with Ctrl+C when you finish the demonstration.');

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
