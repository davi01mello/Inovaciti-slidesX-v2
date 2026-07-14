import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
// Palco de 1600px: o tamanho real de um slide exportado.
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
await page.goto('http://localhost:5173/harness.html?tone=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const out = [];
  for (const stage of document.querySelectorAll('[data-slide-stage]')) {
    const w = stage.getBoundingClientRect().width;
    const fits = [...stage.querySelectorAll('[data-fit-guard]')];
    for (const el of fits) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      const width = el.getBoundingClientRect().width;
      const text = (el.textContent || '').trim();
      if (text.length < 20) continue;
      // fator --fit aplicado (o pai FitBox carrega a variável)
      let host = el; while (host && !host.style.getPropertyValue('--fit')) host = host.parentElement;
      const fit = host ? parseFloat(host.style.getPropertyValue('--fit') || '1') : 1;
      out.push({
        arch: stage.dataset.archetype,
        role: el.closest('[data-card]') ? 'card' : 'texto',
        stagePx: Math.round(w),
        fontPx: +(fs).toFixed(1),
        // normalizado pra um slide de 1600px (o export real)
        fontAt1600: +((fs / w) * 1600).toFixed(1),
        charsPerLine: Math.round(width / (fs * 0.5)),
        fit: +fit.toFixed(2),
        text: text.slice(0, 26),
      });
    }
  }
  return out;
});
const cards = data.filter(d => d.role === 'card');
const texts = data.filter(d => d.role === 'texto');
const show = (rows, label) => {
  console.log(`\n### ${label}`);
  for (const r of rows) console.log(`  ${r.arch.padEnd(10)} ${String(r.fontAt1600).padStart(5)}px@1600  ${String(r.charsPerLine).padStart(3)} chars/linha  fit ${r.fit}  "${r.text}"`);
};
show(cards, 'CORPO DE CARD');
show(texts.slice(0, 14), 'TEXTO CORRIDO');
const minCard = Math.min(...cards.map(c => c.fontAt1600));
const minFit = Math.min(...data.map(c => c.fit));
console.log(`\n  menor fonte de card num slide 1600px: ${minCard}px`);
console.log(`  menor --fit aplicado no deck: ${minFit}`);
await browser.close();
