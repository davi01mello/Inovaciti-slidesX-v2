/**
 * A IA GERADORA do storyboard. Segunda etapa da pipeline: recebe o plano do
 * estrategista (ou, se ele falhou, o briefing direto enriquecido com as specs) e
 * escreve o JSON dos slides.
 *
 * Tudo que é estável mora no system instruction: vocabulário de blocos, regras de
 * variedade, estrutura por quantidade. O prompt por request carrega só o que muda:
 * plano, ideia original, quantidade, objetivo, público e voz.
 */
import type { DraftAssetMeta, PresentationGoal, VisualStyle } from '../types.js';
import { audienceLine, goalGuidance, slideCountGuidance, styleGuidance } from './templates.js';
import { BASE_SYSTEM_INSTRUCTION } from './writing.js';

export const GENERATOR_SYSTEM_INSTRUCTION = `
${BASE_SYSTEM_INSTRUCTION}

Seu papel específico: escrever o storyboard completo de uma apresentação, no JSON pedido pelo schema.

VOCABULÁRIO DE SLIDES:
- "layout" de um slide é um de: "cover" (abertura), "section" (separador entre partes), "content" (miolo), "closing" (encerramento).
- "kind" de bloco:
    section-label  rótulo pequeno que o design renderiza em maiúsculas
    title-1        impacto máximo: capa, separador, encerramento
    title-2        título padrão de slide de conteúdo
    title-3        subseção (uso raro)
    subtitle       uma linha que completa um título
    body           UMA frase curta de apoio, RARO. Coadjuvante, nunca a estrela. A maioria dos slides não tem.
    highlight      uma frase curta de síntese, com destaque visual
    cards          até 3 itens {title, body curtíssimo} — um ponto com um pingo de apoio
    topics         até 5 itens de uma linha telegráfica — lista leve, SEM caixa

MENOS TEXTO É SEMPRE MELHOR. A espinha do deck são TÓPICOS curtos e AFIRMAÇÕES secas.
Cards são o tempero, texto corrido é raríssimo. Um slide que é só um título forte é um
ótimo slide. Na dúvida entre dizer mais ou dizer menos, diga MENOS: o resto é a fala.

ESTRUTURA POR QUANTIDADE DE SLIDES (adapte, sem exceção):
- 1 slide: um único "cover" autocontido: section-label, title-1 forte e um subtitle que carregue a mensagem inteira.
- 2 slides: "cover" com a tese e "closing" com a conclusão e o próximo passo.
- 3 ou mais: "cover" abre, "closing" fecha, conteúdo no meio.
- Capa (cover): um section-label de contexto (2 a 3 palavras), um title-1 com ângulo forte e específico ao tema (jamais genérico tipo "Apresentação institucional") e UM subtitle de uma linha completando o título. Sem body, sem listas.
- Separador (section): só a partir de 8 slides. De 8 a 13, no máximo 1 ou 2. Em decks longos, um a cada 5 a 8 slides de conteúdo. Tem section-label e title-1, e nada mais. É um respiro.
- Encerramento (closing): title-1 curto e caloroso, um subtitle com o próximo passo concreto, e um highlight com a frase que você quer que fique. Nada de listas.
- Slide de CONTEÚDO (content): title-2 + no MÁXIMO um formato de apoio. Pode ser só o título com um subtitle. NUNCA parede de texto.

OS FORMATOS DE SLIDE DE CONTEÚDO. Cada slide de conteúdo nasce com UM formato. TÓPICOS e
AFIRMAÇÃO são os mais comuns; todos são enxutos:
  c) TÓPICOS        title-2 + topics (3 a 5 linhas telegráficas, sem body). Pra etapas, entregas, frentes, benefícios. É o formato mais usado.
  a) AFIRMAÇÃO      title-2 forte + no máximo UM apoio curto (um subtitle de uma linha, OU um highlight, OU um body de UMA frase). Sem lista. Pra tese, virada, conclusão parcial. Pode ser quase só o título: isso é elegante.
  b) CARDS          title-2 + cards (2 ou 3 itens: título + UMA linha curtíssima). Pra pilares, serviços, diferenciais. Sem body antes dos cards. Use com parcimônia.
  d) NÚMERO         title-2 curto contendo UMA métrica concreta do usuário + subtitle de contexto. Nunca invente o número.

REGRAS DURAS DE VARIEDADE (todo slide único, nunca dois iguais seguidos):
- Dois slides consecutivos NUNCA usam o mesmo formato. Alterne tópicos, afirmação, cards, número.
- A cada 3 ou 4 slides de conteúdo, pelo menos UM é AFIRMAÇÃO enxuta (respiro, pouquíssimo texto).
- Não repita a mesma contagem de itens em listas vizinhas (não faça três slides seguidos com 3 tópicos).
- CARDS é minoria: no máximo cerca de um terço dos slides de conteúdo. Se estiver usando card em quase todo slide, troque a maioria por tópicos ou afirmação.
- NUNCA cards e topics no mesmo slide. NUNCA body junto de uma lista.

ALÉM DOS SLIDES, gere também:
- "title": o nome da apresentação na plataforma. De 2 a 5 palavras, direto e específico ao tema (ex: "Pitch CITi Para Sympla"). Primeira letra de cada palavra principal em maiúscula, sem ponto final, sem aspas. É um nome, não um resumo.
- "chat": 3 a 4 mensagens curtas (1 a 2 frases cada), em primeira pessoa como o assistente do CITi Slides, contando o que acabou de montar. Mencione o número real de slides e o tema real. A última convida a revisar. Tom de colega mostrando o rascunho.

Responda só com o JSON pedido pelo schema.
`.trim();

interface GeneratorPromptParams {
  /** Plano interno produzido pelo estrategista. Null quando ele falhou. */
  plan: string | null;
  idea: string;
  slideCount: number;
  goal: PresentationGoal;
  audience: string;
  style: VisualStyle;
  assets: DraftAssetMeta[];
}

/**
 * As FOTOS do usuário viram slides de verdade.
 *
 * O motor anexa cada foto a um slide de miolo depois da geração (arquétipo media:
 * texto numa coluna, foto emoldurada na outra). Pra que o slide não fique com um
 * texto que ignora a imagem ao lado, a geradora precisa saber que ela existe e
 * escrever pelo menos um slide onde um apoio visual faz sentido.
 */
function assetsLine(assets: DraftAssetMeta[]): string {
  if (assets.length === 0) return 'O usuário não anexou nenhum arquivo.';

  const photos = assets.filter((a) => a.kind === 'image');
  const others = assets.filter((a) => a.kind !== 'image');

  const lines = [
    `O usuário anexou: ${assets.map((a) => `${a.name} (${a.kind})`).join(', ')}. Você não vê o conteúdo deles.`,
  ];
  if (photos.length > 0) {
    lines.push(
      `${photos.length} ${photos.length === 1 ? 'é uma FOTO que vai ocupar' : 'são FOTOS que vão ocupar'} ${photos.length === 1 ? 'um slide de miolo' : `${photos.length} slides de miolo`}, com o texto numa coluna e a imagem na outra. Escreva ${photos.length === 1 ? 'esse slide' : 'esses slides'} com title-2 + um body CURTO (1 a 2 frases) e, se ajudar, um subtitle: o texto sustenta a imagem, não a descreve. Trate ${photos.length === 1 ? 'a foto' : 'as fotos'} como evidência do argumento daquele slide.`,
    );
  }
  if (others.length > 0) {
    lines.push('Os demais anexos são contexto de que existem, e nada mais. Não invente o conteúdo deles.');
  }
  return lines.join(' ');
}

/**
 * Lembrete estrutural no FIM do prompt, onde o modelo mais obedece. As regras já
 * estão no system instruction, mas sem este reforço final o primeiro slide às
 * vezes saía como "content" e os slides de conteúdo saíam sem body.
 */
function structuralReminder(slideCount: number): string {
  if (slideCount === 1) {
    return 'ESTRUTURA OBRIGATÓRIA: um único slide, layout "cover", autocontido.';
  }
  if (slideCount === 2) {
    return 'ESTRUTURA OBRIGATÓRIA: o primeiro slide é layout "cover" e o segundo é layout "closing". Nenhum slide "content".';
  }
  return [
    `ESTRUTURA OBRIGATÓRIA: exatamente ${slideCount} slides. O primeiro é layout "cover" e o último é layout "closing". O miolo usa "content" (e "section" só quando as regras permitirem).`,
    'ANTES DE RESPONDER, CONFIRA CADA SLIDE "content": ele fica entre 10 e 40 palavras no total? Se passar de 45, ENXUGUE SEM DÓ: corte adjetivo, corte a frase que repete o título, corte o que a fala do apresentador cobre. MENOS TEXTO É MELHOR. Nenhum slide vira parede de texto.',
    'CONFIRA TAMBÉM: a MAIORIA dos slides usa tópicos curtos ou afirmação enxuta; cards são minoria (no máximo cerca de um terço); nenhuma lista tem body junto; no máximo 3 cards; no máximo 5 tópicos; nunca cards e tópicos juntos; dois slides seguidos nunca no mesmo formato; e nenhum trecho longo marcado como destaque (no máximo 3 palavras, no máximo um por slide).',
  ].join('\n');
}

export function buildGeneratorPrompt(params: GeneratorPromptParams): string {
  const closing = `
${slideCountGuidance(params.slideCount)}
${structuralReminder(params.slideCount)}
${assetsLine(params.assets)}
`.trim();

  if (params.plan) {
    return `
Um estrategista sênior já analisou o briefing completo e definiu o plano abaixo. Escreva o storyboard seguindo o plano fielmente: o arco narrativo, o papel de cada slide, as mensagens centrais e os formatos indicados. Você tem liberdade só na redação final das frases.

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
