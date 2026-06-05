import { chromium } from 'playwright';
import { recordApplicationQuestions } from './application-question-bank.mjs';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const platform = process.env.QUESTION_PLATFORM || 'Manual';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages().find((item) => /candidate\/kq|postular|apply|application|pandape|trabajando|chiletrabajos|linkedin/i.test(item.url()))
    || context.pages().at(-1);
  if (!page) throw new Error('No browser page available');

  const data = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (element) => getComputedStyle(element).display !== 'none'
      && getComputedStyle(element).visibility !== 'hidden'
      && !!element.getClientRects().length;
    const fieldText = (field) => {
      const id = field.getAttribute('id');
      const aria = field.getAttribute('aria-label') || '';
      const placeholder = field.getAttribute('placeholder') || '';
      const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : '';
      const block = field.closest('li, .form-group, .mb20, .question, fieldset, section, div')?.innerText || '';
      return clean([aria, placeholder, label, block].filter(Boolean).join(' '));
    };
    const seen = new Set();
    const questions = [];
    for (const field of [...document.querySelectorAll('textarea, input[type=radio], input[type=text], input[type=email], input[type=tel], select')]) {
      if (!visible(field)) continue;
      const question = fieldText(field)
        .replace(/\(m[aá]ximo .*?caracteres\)/i, '')
        .replace(/\* Required fields?/i, '')
        .trim();
      if (!question || seen.has(question)) continue;
      seen.add(question);
      const answer = field.type === 'radio'
        ? ([...document.querySelectorAll(`input[type=radio][name="${CSS.escape(field.name)}"]`)]
          .find((item) => item.checked)?.closest('label')?.innerText || '')
        : field.value || '';
      questions.push({ question, answer: clean(answer) });
    }
    const h1 = document.querySelector('h1')?.textContent || document.title;
    return { title: clean(h1), questions };
  });

  const count = recordApplicationQuestions({
    platform,
    role: data.title,
    url: page.url(),
    status: 'manual-collect',
    questions: data.questions,
  });
  console.log(JSON.stringify({ page: page.url(), role: data.title, collected: count, questions: data.questions }, null, 2));
  await browser.close().catch(() => {});
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
