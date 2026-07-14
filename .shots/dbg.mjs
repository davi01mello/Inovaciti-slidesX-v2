import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
await p.goto('http://localhost:5173/harness.html?tone=1', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const stage = [...document.querySelectorAll('[data-slide-stage]')].find(s => s.dataset.archetype === 'cards');
  const guards = [...stage.querySelectorAll('[data-fit-guard]')];
  const body = guards.find(g => (g.textContent||'').startsWith('A ordem aqui'));
  const outer = body.parentElement;
  const cso = getComputedStyle(outer), csb = getComputedStyle(body);
  return {
    outerTag: outer.className, outerMaxW: cso.maxWidth, outerW: outer.getBoundingClientRect().width, outerFs: cso.fontSize,
    bodyMaxW: csb.maxWidth, bodyW: body.getBoundingClientRect().width, bodyFs: csb.fontSize, bodyDisplay: csb.display,
  };
});
console.log(r);
await b.close();
