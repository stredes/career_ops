import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const subjects = [
  'Completa tu candidatura a QA Automatizador',
  'Completa tu candidatura a Desarrollador Full Stack .Net Angular (E)'
];
function clean(v){ return String(v||'').replace(/\s+/g,' ').trim(); }
async function main(){
  const browser = await chromium.connectOverCDP(CDP);
  const context = browser.contexts()[0] || await browser.newContext();
  const out = [];
  for (const subject of subjects){
    const page = await context.newPage();
    const q = `from:notifications@ats.bizneo.com "${subject}" newer_than:7d`;
    await page.goto('https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(q), { waitUntil:'domcontentloaded', timeout:45000 }).catch(()=>{});
    await page.waitForTimeout(7000);
    const before = await page.evaluate(() => document.body.innerText.slice(0, 1200)).catch(e=>String(e));
    const rows = await page.evaluate(() => {
      const clean = (v) => String(v||'').replace(/\s+/g,' ').trim();
      return [...document.querySelectorAll('tr[role="row"]')].map((row, index) => ({
        index,
        text: clean(row.innerText || row.textContent).slice(0, 500),
        visible: !!row.getClientRects().length,
      })).filter(r => /Bizneo|candidatura|QA Automatizador|Full Stack|notifications/i.test(r.text));
    }).catch(()=>[]);
    const targetIndex = rows.find(r => r.text.includes(subject))?.index ?? rows[0]?.index;
    let clicked = false;
    if (targetIndex !== undefined) {
      clicked = await page.evaluate((idx) => {
        const rows = [...document.querySelectorAll('tr[role="row"]')];
        const row = rows[idx];
        if (!row) return false;
        row.scrollIntoView({block:'center'});
        row.click();
        return true;
      }, targetIndex).catch(()=>false);
    }
    await page.waitForTimeout(3000);
    const data = await page.evaluate(() => {
      const clean = (v) => String(v||'').replace(/\s+/g,' ').trim();
      const subj = clean(document.querySelector('h2.hP')?.textContent);
      const body = clean(document.body.innerText).slice(0, 1200);
      const anchors = [...document.querySelectorAll('a[href]')]
        .map(a => ({ text: clean(a.innerText || a.textContent), href: a.href }))
        .filter(a => /bizneo|candidate|candidatura|continuar|ats|jobs|oferta|form/i.test(`${a.text} ${a.href}`));
      return { openedSubject: subj, body, anchors };
    }).catch(e=>({error:String(e)}));
    out.push({ requestedSubject: subject, before, rows, targetIndex, clicked, ...data });
    await page.close().catch(()=>{});
  }
  const outPath = resolve('output/email-audits/bizneo-links-2026-06-19.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ outPath, out }, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e.stack || e.message || String(e)); process.exit(1); });