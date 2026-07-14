import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
await page.goto('http://localhost:5173/harness.html?tone=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const rows = await page.evaluate(() => {
  const cv = document.createElement('canvas').getContext('2d');
  const out = [];
  for (const stage of document.querySelectorAll('[data-slide-stage]')) {
    for (const el of stage.querySelectorAll('[data-fit-guard]')) {
      const t = (el.textContent || '').trim();
      if (t.length < 60) continue;               // só texto corrido
      const cs = getComputedStyle(el);
      cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const avgChar = cv.measureText('abcdefghijklmnopqrstuvwxyz áéçãõ, .').width / 35;
      const w = el.getBoundingClientRect().width;
      out.push({ a: stage.dataset.archetype, chars: Math.round(w / avgChar), align: cs.textAlign, t: t.slice(0, 24) });
    }
  }
  return out;
});
for (const r of rows) console.log(`  ${r.a.padEnd(10)} ${String(r.chars).padStart(3)} car/linha  ${r.align.padEnd(8)} "${r.t}"`);
const bad = rows.filter(r => r.chars > 78);
console.log(bad.length === 0 ? '\n  OK: nenhuma linha passa de 78 caracteres' : `\n  LONGAS DEMAIS: ${bad.map(b=>b.a+':'+b.chars).join(', ')}`);
await browser.close();
