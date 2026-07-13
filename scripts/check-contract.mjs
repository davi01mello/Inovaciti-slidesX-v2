/**
 * Verifica que o contrato de tipos entre api/ e app/ não divergiu.
 * Não há pacote compartilhado entre os dois lados (decisão consciente, evita tooling de
 * monorepo agora), então os tipos são espelhados na mão e este script falha o build se
 * uma declaração mudar de um lado só. Roda no predev e no prebuild dos dois pacotes.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const API_FILES = ['api/src/types.ts'];
const APP_FILES = [
  'app/src/types/generated.ts',
  'app/src/types/slide.ts',
  'app/src/types/creation.ts',
  'app/src/lib/richText.tsx',
];

// Toda declaração que cruza a fronteira HTTP precisa estar idêntica nos dois lados.
const CONTRACT_TYPES = [
  'PresentationGoal',
  'VisualStyle',
  'SlideLayout',
  'BlockAlign',
  'TextBlockKind',
  'RichRun',
  'GeneratedTextBlock',
  'GeneratedBulletsBlock',
  'GeneratedBlock',
  'GeneratedSlide',
];

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Extrai o corpo de uma declaração exportada (interface ou type alias) pelo nome. */
function extractDeclaration(source, name) {
  const clean = stripComments(source);

  const interfaceStart = clean.search(new RegExp(`export interface ${name}\\b`));
  if (interfaceStart !== -1) {
    const braceStart = clean.indexOf('{', interfaceStart);
    let depth = 0;
    for (let i = braceStart; i < clean.length; i++) {
      if (clean[i] === '{') depth++;
      if (clean[i] === '}') {
        depth--;
        if (depth === 0) return normalize(clean.slice(interfaceStart, i + 1));
      }
    }
    return null;
  }

  const typeMatch = clean.match(new RegExp(`export type ${name}\\b[\\s\\S]*?;`));
  if (typeMatch) return normalize(typeMatch[0]);

  return null;
}

function normalize(declaration) {
  return declaration.replace(/\s+/g, ' ').trim();
}

function collect(files) {
  const out = new Map();
  for (const file of files) {
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    for (const name of CONTRACT_TYPES) {
      if (out.has(name)) continue;
      const declaration = extractDeclaration(source, name);
      if (declaration) out.set(name, { declaration, file });
    }
  }
  return out;
}

const apiTypes = collect(API_FILES);
const appTypes = collect(APP_FILES);

const problems = [];
for (const name of CONTRACT_TYPES) {
  const api = apiTypes.get(name);
  const app = appTypes.get(name);
  if (!api) problems.push(`${name}: ausente no lado da api (${API_FILES.join(', ')})`);
  if (!app) problems.push(`${name}: ausente no lado do app (${APP_FILES.join(', ')})`);
  if (api && app && api.declaration !== app.declaration) {
    problems.push(
      `${name}: divergiu entre ${api.file} e ${app.file}\n  api: ${api.declaration}\n  app: ${app.declaration}`,
    );
  }
}

if (problems.length > 0) {
  console.error('Contrato de tipos api/app divergiu:\n');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error('\nAlinhe os dois lados antes de seguir (ver comentário SYNC_WITH nos arquivos).');
  process.exit(1);
}

console.log(`check:contract ok (${CONTRACT_TYPES.length} tipos idênticos nos dois lados)`);
