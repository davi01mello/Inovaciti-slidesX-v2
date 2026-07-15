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

A FORMA DO SLIDE DE CONTEÚDO É DITADA PELA VOZ, não é livre. A VOZ da escrita (ver, no fim
do prompt, "ESTRUTURA OBRIGATÓRIA desta voz") diz exatamente quais blocos cada slide de
conteúdo pode ter. Em resumo:
  Sereno   -> só title-2 (+ subtitle curto opcional). NUNCA lista, NUNCA body, NUNCA destaque. Muitos slides só título.
  Preciso  -> title-2 + UMA lista (2 a 3 tópicos OU 2 cards) OU um body curto, + subtitle curto opcional. A ÚNICA voz que enumera.
  Presença -> title-2 manchete + no máximo UM acento de 1 a 3 palavras (highlight OU section-label). NUNCA lista, NUNCA body.
Siga a estrutura da voz ativa à risca. O servidor DESCARTA qualquer bloco fora dela, então
fugir da voz só faz o slide sair menor do que você planejou.

VARIEDADE, DENTRO DA VOZ:
- Em Preciso, alterne o formato de apoio entre slides vizinhos (tópicos num, cards noutro, body noutro) e varie a contagem de itens. Nunca cards e tópicos no mesmo slide, nunca body junto de lista.
- Em Sereno e Presença a forma é uniforme (o título comanda): a variedade vem das IDEIAS, não do formato. Alterne slides só-título com slides que ganham a linha de apoio, pra criar respiro.
- Todo slide diz UMA coisa nova. Nenhum repete a mensagem do anterior.

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
    'ANTES DE RESPONDER, CONFIRA CADA SLIDE "content": ele obedece a ESTRUTURA OBRIGATÓRIA da voz (só os blocos que ela permite) e é ENXUTO ao extremo? MENOS TEXTO É SEMPRE MELHOR: muitos slides devem ser só um título. Se um slide tem mais texto do que a estrutura da voz permite, CORTE até caber. Nenhum slide vira parede de texto.',
    'CONFIRA TAMBÉM: no máximo 3 cards e 5 tópicos; nunca cards e tópicos no mesmo slide; nunca body junto de lista; e no máximo um trecho de destaque de 1 a 3 palavras por slide.',
  ].join('\n');
}

/**
 * DOIS exemplos concretos da FORMA da voz ativa, no schema REAL (texto em content:
 * [{text}], tópicos em topics: [[{text}]], cards em cards: [{title,body}]). O modelo
 * imita a forma dos exemplos; por isso eles PRECISAM do schema exato — um exemplo com
 * o shape errado faz o modelo copiar o erro e o slide volta vazio. O conteúdo é só
 * ilustrativo: a geradora escreve sobre o tema real do usuário.
 */
function voiceExamples(style: VisualStyle): string {
  const head = 'EXEMPLOS DA FORMA (copie o FORMATO, jamais o conteúdo; escreva sobre o tema real do usuário):';
  if (style === 'minimal') {
    return `${head}
Sereno é só o título, ou o título e uma linha:
{"layout":"content","blocks":[{"kind":"title-2","content":[{"text":"A fila é sintoma, não causa"}]}]}
{"layout":"content","blocks":[{"kind":"title-2","content":[{"text":"Menos etapas, menos espera"}]},{"kind":"subtitle","content":[{"text":"O ganho vem da ordem, não do time"}]}]}`;
  }
  if (style === 'balanced') {
    return `${head}
Preciso é o título e UMA lista curta (tópicos OU cards, nunca os dois):
{"layout":"content","blocks":[{"kind":"title-2","content":[{"text":"O que muda na rotina"}]},{"kind":"topics","topics":[[{"text":"Pedido chega já validado"}],[{"text":"Conferência durante, não depois"}],[{"text":"Retrabalho vira exceção"}]]}]}
{"layout":"content","blocks":[{"kind":"title-2","content":[{"text":"Três frentes, na ordem certa"}]},{"kind":"cards","cards":[{"title":[{"text":"Validação na entrada"}],"body":[{"text":"O pedido não entra incompleto"}]},{"title":[{"text":"Conferência contínua"}],"body":[{"text":"Vira etapa curta em cada passo"}]}]}]}`;
  }
  return `${head}
Presença é uma manchete seca, às vezes com um acento curto:
{"layout":"content","blocks":[{"kind":"title-2","content":[{"text":"Contratar sem reordenar é comprar mais fila"}]}]}
{"layout":"content","blocks":[{"kind":"section-label","content":[{"text":"O problema"}]},{"kind":"title-2","content":[{"text":"A fila não é o gargalo. É o sintoma."}]}]}`;
}

export function buildGeneratorPrompt(params: GeneratorPromptParams): string {
  // Exemplos da forma só fazem sentido quando há slides de conteúdo (3+ slides).
  const examples = params.slideCount >= 3 ? `\n\n${voiceExamples(params.style)}` : '';
  const closing = `
${slideCountGuidance(params.slideCount)}
${structuralReminder(params.slideCount)}
${assetsLine(params.assets)}${examples}
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
