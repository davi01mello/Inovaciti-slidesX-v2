/**
 * Propõe o manifesto de zonas de um fundo de template novo usando a IA de visão.
 *
 * Fluxo híbrido do CITi Slides: a IA olha a arte UMA vez (aqui, em tempo de
 * desenvolvimento) e propõe os retângulos; você ajusta o que precisar e cola o
 * resultado em app/src/services/templateManifest.ts. O runtime nunca chama
 * visão — usa só o manifesto salvo, 100% determinístico.
 *
 * Uso (na pasta api/, com GEMINI_API_KEY no .env):
 *   npx tsx scripts/proposeZones.ts ../app/src/assets/templates/bg-novo.webp cards
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateText } from '../src/llm/gemini.js';

const ARCHETYPES = ['cover', 'statement', 'cards', 'rows', 'bignumber'] as const;

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const SYSTEM = `
Você é o olho de design do CITi Slides. Recebe a arte de FUNDO de um template de
slide 16:9 (sem nenhum texto) e devolve as zonas onde o conteúdo deve ser composto,
como retângulos normalizados (x, y, width, height entre 0 e 1, origem no canto
superior esquerdo).

Regras de design que suas zonas precisam respeitar:
- Identifique onde estão os elementos visuais fortes (esculturas 3D, brilhos,
  manchas de luz). NENHUMA zona de texto pode cobrir um elemento forte.
- "logo": onde a marca deve viver (normalmente canto superior esquerdo; na capa
  pode ser maior, como elemento de design). "logoSafe" é o retângulo de proteção
  ao redor dela, com respiro generoso — texto nunca entra ali.
- "content" é a zona principal (título/afirmação/cards/linhas), com margens
  laterais SIMÉTRICAS em relação ao espaço vazio disponível.
- "header" (opcional) é a faixa de título no topo para arquétipos cards/rows,
  sem intersectar logoSafe.
- "banner" (opcional) é uma faixa de fecho na parte de baixo.
- "textColor": "light" se o fundo é escuro, "dark" se o fundo é claro.

Responda APENAS com JSON válido neste formato (sem markdown, sem comentários):
{
  "textColor": "light",
  "logo": { "zone": { "x": 0, "y": 0, "width": 0, "height": 0 } },
  "logoSafe": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "header": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "content": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "banner": { "x": 0, "y": 0, "width": 0, "height": 0 }
}
`.trim();

async function main(): Promise<void> {
  const [, , imagePath, archetypeArg] = process.argv;
  if (!imagePath) {
    process.stderr.write('uso: npx tsx scripts/proposeZones.ts <caminho-da-arte> [arquétipo]\n');
    process.exit(1);
  }
  const archetype = archetypeArg && (ARCHETYPES as readonly string[]).includes(archetypeArg) ? archetypeArg : 'statement';

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    process.stderr.write(`extensão não suportada: ${ext} (use webp/png/jpg)\n`);
    process.exit(1);
  }

  const dataBase64 = (await readFile(imagePath)).toString('base64');

  const raw = await generateText({
    systemInstruction: SYSTEM,
    prompt: `Arquétipo alvo: "${archetype}". Proponha o manifesto de zonas desta arte de fundo.`,
    images: [{ mimeType, dataBase64 }],
  });

  // O modelo às vezes envelopa em cerca de código mesmo com instrução contrária.
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const proposed = JSON.parse(json) as Record<string, unknown>;

  const id = `citi-${archetype}-${path.basename(imagePath, ext)}`;
  process.stdout.write(
    `// Proposta pra colar em app/src/services/templateManifest.ts (ajuste à mão se precisar):\n` +
      JSON.stringify({ id, archetype, ...proposed }, null, 2) +
      '\n',
  );
}

main().catch((err) => {
  process.stderr.write(`falhou: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
