import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// fileURLToPath, e não .pathname: o diretório do projeto tem um espaço no nome e o
// .pathname devolve %20, que o fs não resolve. O print ia pra um caminho fantasma.
const OUT = path.dirname(fileURLToPath(import.meta.url));
const tones = process.argv[2] ? [Number(process.argv[2])] : [1, 0.55, 0.12];
const debug = process.argv[3] === 'debug';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1720, height: 1200 }, deviceScaleFactor: 1.5 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.text().includes('[fit]')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

for (const tone of tones) {
  const url = `http://localhost:5173/harness.html?tone=${tone}${debug ? '&debug=1' : ''}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  const report = await page.locator('[data-overflow-report]').first();
  const status = await report.getAttribute('data-overflow-report');
  const text = await report.textContent();
  console.log(`tone ${tone}  ->  ${status.toUpperCase()}  |  ${text.split('\n')[0]}`);
  if (status === 'fail') console.log(text);

  const deck = page.locator('[data-deck]').first();
  const name = path.join(OUT, `deck-tone-${String(tone).replace('.', '_')}${debug ? '-debug' : ''}.png`);
  await deck.screenshot({ path: name });
}

if (errors.length) {
  console.log('\n--- console ---');
  for (const e of [...new Set(errors)].slice(0, 12)) console.log(' ', e.slice(0, 220));
}
await browser.close();
