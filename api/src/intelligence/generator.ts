/**
 * A IA GERADORA do storyboard. Segunda etapa da pipeline: recebe o prompt
 * otimizado do estrategista (ou, se ele falhou, o briefing direto enriquecido
 * com as specs) e escreve o JSON dos slides.
 *
 * Tudo que é estável mora no system instruction: vocabulário de blocos, regras
 * de variedade, estrutura por quantidade. O prompt por request carrega só o que
 * muda: plano, ideia original, quantidade, objetivo, público e tom.
 */
import type { DraftAssetMeta, PresentationGoal, VisualStyle } from '../types.js';
import { audienceLine, goalGuidance, slideCountGuidance, styleGuidance } from './templates.js';
import { BASE_SYSTEM_INSTRUCTION } from './writing.js';

export const GENERATOR_SYSTEM_INSTRUCTION = `
${BASE_SYSTEM_INSTRUCTION}

Seu papel específico: escrever o storyboard completo de uma apresentação, no JSON pedido pelo schema.

VOCABULÁRIO DE SLIDES:
- "layout" de um slide é um de: "cover" (abertura), "section" (separador curto entre partes), "content" (miolo), "closing" (encerramento).
- "kind" de bloco de texto: title-1 (impacto máximo, uso raro: capa e encerramento), title-2 (título padrão de slide de conteúdo), title-3 (subseção), subtitle (complementa um título), body (parágrafo curto livre), bullets (lista de tópicos curtos), highlight (frase resumo com barra lateral verde, no máximo um por slide), section-label (rótulo pequeno que o design renderiza em maiúsculas).

ESTRUTURA POR QUANTIDADE DE SLIDES (adapte, sem exceção):
- 1 slide: um único slide layout "cover", autocontido: section-label de contexto, title-1 forte e UM subtitle que carregue a mensagem central inteira. É um cartaz, não uma capa de algo que não existe.
- 2 slides: "cover" com a tese e "closing" com a conclusão e o próximo passo. Sem miolo, os dois carregam conteúdo de verdade.
- 3 ou mais: "cover" abre, "closing" fecha, conteúdo no meio.
- Capa (cover): o design coloca a marca do CITi grande, o texto precisa estar à altura. Um section-label curto de contexto (2 a 4 palavras), um title-1 com ângulo forte e específico ao tema (3 a 6 palavras, capitalização normal de frase, jamais genérico tipo "Apresentação institucional") e UM subtitle de uma linha completando o título. Nada de bullets na capa.
- Encerramento (closing): title-1 curto e caloroso (agradecimento ou chamada pra ação) e um subtitle curto (contato ou próximo passo).
- Separadores (section): só a partir de 8 slides. De 8 a 13 slides, no máximo 1 ou 2. Em decks longos (14 ou mais), um separador a cada 5 a 8 slides de conteúdo organiza os capítulos. Section tem section-label e title-1, sem bullets.

VARIEDADE É REGRA DE OURO. Cada slide de conteúdo nasce com formato PRÓPRIO. Os formatos (todos layout "content"):
a) AFIRMAÇÃO CENTRAL: um title-2 e um highlight OU um body curto, sem bullets. Uma frase vivendo sozinha na tela. Use pra tese, posicionamento, virada de argumento ou conclusão parcial.
b) CARDS: bullets com exatamente 2 ou 3 itens curtos e paralelos, viram cartões lado a lado. Bom pra pilares, serviços, diferenciais.
c) LINHAS NUMERADAS: bullets com 4 a 6 itens, viram linhas com número índice. Bom pra processo, etapas, entregas.
d) NÚMERO EM DESTAQUE: quando existir UMA métrica concreta vinda do usuário, ela vira o title-2 (curto, com o número) e um subtitle de contexto. Nunca invente o número.
e) TÍTULO COM APOIO: um title-2 e um subtitle ou body de uma linha, mais nada. Um respiro no meio do deck.
Regras duras de variação:
- No máximo METADE dos slides de conteúdo usa bullets (formatos b e c somados).
- Toda apresentação com 3 ou mais slides tem pelo menos UMA afirmação central (formato a).
- Dois slides consecutivos NUNCA repetem o mesmo formato.
- Entre slides com bullets, varie a contagem de itens conforme o conteúdo real, nunca todos com 3.

ALÉM DOS SLIDES, gere também:
- "title": o nome da apresentação na plataforma. De 2 a 5 palavras, direto e específico ao tema (ex: "Pitch CITi Para Sympla"). Primeira letra de cada palavra principal em maiúscula, sem ponto final, sem aspas. Nunca copie a instrução do usuário inteira: é um nome, não um resumo.
- "chat": 3 a 4 mensagens curtas (1 a 2 frases cada), em primeira pessoa como o assistente do CITi Slides, contando o que acabou de montar. Mencione o número real de slides e o tema real. A última convida a revisar e pedir ajustes. Tom de colega mostrando o rascunho.

Responda só com o JSON pedido pelo schema.
`.trim();

interface GeneratorPromptParams {
  /** Prompt otimizado produzido pelo estrategista. Null quando ele falhou. */
  plan: string | null;
  idea: string;
  slideCount: number;
  goal: PresentationGoal;
  audience: string;
  style: VisualStyle;
  assets: DraftAssetMeta[];
}

function assetsLine(assets: DraftAssetMeta[]): string {
  return assets.length > 0
    ? `O usuário anexou estes arquivos (contexto de que existem, você não vê o conteúdo): ${assets
        .map((a) => `${a.name} (${a.kind})`)
        .join(', ')}.`
    : 'O usuário não anexou nenhum arquivo.';
}

/**
 * Lembrete estrutural no FIM do prompt, onde o modelo mais obedece. A regra já
 * existe no system instruction, mas sem este reforço final calculado pela
 * contagem o primeiro slide às vezes saía como "content".
 */
function structuralReminder(slideCount: number): string {
  if (slideCount === 1) {
    return 'ESTRUTURA OBRIGATÓRIA: um único slide, layout "cover", autocontido.';
  }
  if (slideCount === 2) {
    return 'ESTRUTURA OBRIGATÓRIA: o primeiro slide é layout "cover" e o segundo é layout "closing". Nenhum slide "content".';
  }
  return `ESTRUTURA OBRIGATÓRIA: exatamente ${slideCount} slides. O primeiro é layout "cover" e o último é layout "closing". O miolo usa "content" (e "section" só quando as regras permitirem).`;
}

export function buildGeneratorPrompt(params: GeneratorPromptParams): string {
  const closing = `
${slideCountGuidance(params.slideCount)}
${structuralReminder(params.slideCount)}
${assetsLine(params.assets)}
`.trim();

  if (params.plan) {
    return `
Um estrategista sênior já analisou o briefing completo e definiu o plano abaixo. Escreva o storyboard seguindo o plano fielmente: o arco narrativo, o papel de cada slide, as mensagens centrais e os formatos sugeridos. Você tem liberdade só na redação final das frases.

PLANO ESTRATÉGICO:
"""
${params.plan}
"""

IDEIA ORIGINAL DO USUÁRIO (fonte da verdade factual; se o plano contradisser um fato daqui, vale a ideia):
"""
${params.idea}
"""

${styleGuidance(params.style)}

${closing}
`.trim();
  }

  // Caminho direto: sem plano, o briefing enriquecido guia a geração sozinho.
  return `
Gere o storyboard de uma apresentação nova a partir do briefing abaixo. Antes de escrever, defina internamente o arco narrativo e o papel de cada slide: cada slide prepara o seguinte, os argumentos mais fortes entram depois do contexto estar montado, o fechamento retoma a jornada.

IDEIA DO USUÁRIO (pode vir livre ou já estruturada slide a slide; se vier estruturada, respeite a estrutura):
"""
${params.idea}
"""

${goalGuidance(params.goal)}

${audienceLine(params.audience)}

${styleGuidance(params.style)}

${closing}
`.trim();
}
