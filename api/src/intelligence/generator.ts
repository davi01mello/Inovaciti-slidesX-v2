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
import { currentYearLine } from './knowledge.js';
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
    body           um texto curto de apoio: 12 a 25 palavras, uma ou duas frases
    highlight      frase de síntese com destaque visual: 6 a 14 palavras
    cards          2 a 3 itens {title, body curtíssimo} — um ponto com um pingo de apoio
    topics         3 a 5 itens de uma linha telegráfica — lista leve, SEM caixa
    stats          1 a 4 métricas {value, label}. Com 1 item o número sai GIGANTE na cor
                   de destaque; com 2 a 4, painel de indicadores. Só números reais.
    steps          3 a 5 etapas em sequência — vira timeline numerada com conectores
    compare        exatamente 2 lados {label, points} frente a frente

FORMAS EXATAS NO JSON (copie o SHAPE, escreva sobre o tema real do usuário):
  {"kind":"title-2","content":[{"text":"Três fases. "},{"text":"Seis semanas.","highlight":true}]}
  {"kind":"topics","topics":[[{"text":"..."}],[{"text":"..."}]]}
  {"kind":"cards","cards":[{"title":[{"text":"..."}],"body":[{"text":"..."}],"icon":"busca"}]}
  {"kind":"stats","stats":[{"value":[{"text":"R$ 48 mil"}],"label":[{"text":"investimento total"}],"icon":"cifrao"}]}
  {"kind":"steps","steps":[[{"text":"Diagnóstico do fluxo"}],[{"text":"Prototipação com o time"}],[{"text":"Entrega e medição"}]],"icons":["busca","cubo","foguete"]}
  {"kind":"compare","sides":[{"label":[{"text":"Hoje"}],"points":[[{"text":"..."}]],"icon":"documento"},{"label":[{"text":"Com o CITi"}],"points":[[{"text":"..."}]],"icon":"raio"}]}

ESTRUTURA POR QUANTIDADE DE SLIDES (adapte, sem exceção):
- 1 slide: um único "cover" autocontido: section-label, title-1 forte e um subtitle que carregue a mensagem inteira.
- 2 slides: "cover" com a tese e "closing" com a conclusão e o próximo passo.
- 3 ou mais: "cover" abre, "closing" fecha, conteúdo no meio.
- Capa (cover): um section-label de contexto (2 a 3 palavras), um title-1 com ângulo forte e específico ao tema (jamais genérico tipo "Apresentação institucional") e UM subtitle de uma linha completando o título. Sem body, sem listas.
- Separador (section): só a partir de 8 slides. De 8 a 13, no máximo 1 ou 2. Em decks longos, um a cada 5 a 8 slides de conteúdo. Tem section-label e title-1, e nada mais. É um respiro.
- Encerramento (closing): title-1 curto e caloroso, um subtitle com o próximo passo concreto, e um highlight com a frase que você quer que fique. Nada de listas.
- Slide de CONTEÚDO (content): é UM formato do CATÁLOGO DE FORMATOS (acima), com exatamente
  os blocos da gramática daquele formato, dentro da faixa de palavras dele.

A FORMA DE CADA SLIDE DE CONTEÚDO É O FORMATO QUE O PLANO NOMEIA. Monte exatamente os
blocos da gramática do formato planejado. O servidor DESCARTA blocos fora da gramática e
corta o que passar dos tetos, então fugir do formato só faz o slide sair menor do que
você planejou. Se o plano não veio, escolha você o formato de cada slide pelo conteúdo
dele, aplicando as regras de variedade do catálogo.

VARIEDADE:
- Dois slides vizinhos NUNCA têm o mesmo formato. O servidor converte repetições à força,
  então é melhor você mesmo escolher a alternância.
- Todo slide diz UMA coisa nova. Nenhum repete a mensagem do anterior.
- Varie a contagem de itens entre listas do deck (3 tópicos num, 4 noutro).
- O conteúdo principal que enumera pontos de peso (pilares, frentes, fases, o que fica ao
  fim) sai em cards ou jornada, o desenho de colunas/caixas com número e apoio, NUNCA em
  topicos. Bare topicos é a lista magra, reservada pro secundário e usada com moderação.

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
 * vezes saía como "content" e os slides de conteúdo fugiam do formato planejado.
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
    'ANTES DE RESPONDER, CONFIRA CADA SLIDE "content": (1) ele tem EXATAMENTE os blocos da gramática do formato planejado; (2) nenhum bloco passa do teto de palavras (body 25, tópico/etapa/ponto 10, card.body 16); (3) dois slides vizinhos nunca têm o mesmo formato; (4) stats só com números reais (do briefing ou da base do CITi). Nem parede de texto, nem slide oco.',
    'CONFIRA TAMBÉM: todo title-2 tem UM segmento de 2 a 5 palavras com highlight (a assinatura da marca) e NUNCA termina com ponto final, nem o título inteiro nem o segmento em destaque (título é manchete, não frase; nenhum bloco de nenhum slide termina com ponto final); itens de cards/stats/compare com "icon" do vocabulário (todos os itens do slide, ou nenhum); no máximo 3 cards, 5 tópicos, 5 etapas e 4 stats; nunca dois tipos de lista no mesmo slide; compare sempre com exatamente 2 lados; e no máximo um destaque de corpo de 1 a 3 palavras por slide.',
  ].join('\n');
}

export function buildGeneratorPrompt(params: GeneratorPromptParams): string {
  const closing = `
${currentYearLine()}
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
