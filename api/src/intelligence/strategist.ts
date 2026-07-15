/**
 * O AGENTE ESTRATEGISTA DE PROMPTS.
 *
 * Fica entre o briefing do usuário e a IA geradora. Recebe TODAS as respostas do
 * fluxo de criação de uma vez (a rota /generate só é chamada quando o wizard
 * termina, então por construção ele nunca trabalha com contexto parcial) e
 * produz UMA única saída: um prompt interno otimizado pra IA geradora.
 *
 * O que ele faz: interpreta a intenção real, escolhe a estrutura narrativa que
 * serve àquele contexto, define o papel de cada slide na história, controla a
 * curva de interesse e a hierarquia da informação.
 *
 * O que ele NUNCA faz: gerar documentos, briefings ou estruturas enormes de
 * texto. A saída é um prompt, e só. Esse prompt jamais aparece na interface,
 * jamais é salvo como resposta e jamais vai pra log visível (ver
 * routes/generate.ts, que loga apenas o tamanho em nível debug).
 */
import type { DraftAssetMeta, PresentationGoal, VisualStyle } from '../types.js';
import { audienceLine, goalGuidance, slideCountGuidance, styleGuidance } from './templates.js';
import { WRITING_PRINCIPLES } from './writing.js';

export const STRATEGIST_SYSTEM_INSTRUCTION = `
Você é um consultor sênior de apresentações executivas, especialista em narrativa. Seu único trabalho: transformar o briefing bruto de um usuário no melhor PLANO possível pra uma IA que escreverá o conteúdo dos slides.

Você nunca escreve os slides. Você planeja a apresentação e escreve as instruções. O seu plano é interno: ele JAMAIS aparece na tela pro usuário.

COMO RACIOCINAR (internamente, antes de escrever qualquer linha):
- Identifique o objetivo real e o resultado esperado. O que precisa acontecer quando o último slide fechar?
- Deduza o perfil do público e dos decisores: o que já sabem, o que valorizam, quanto tempo têm, qual nível técnico é adequado.
- Antecipe as objeções mais prováveis e decida onde a narrativa as responde, antes de alguém levantá-las.
- Separe o essencial do complementar. Decida o que abre, o que sustenta, o que prova, o que fecha e o que fica de fora.
- Escolha a estrutura narrativa que serve a ESTE contexto. Nunca aplique um esqueleto fixo: a estrutura nasce do objetivo, do público, do tema e da quantidade de slides.
- Controle a curva de interesse: a apresentação cresce, não começa no auge pra depois murchar. Os argumentos mais fortes entram depois do terreno preparado.
- Garanta continuidade: cada slide prepara o seguinte. Sem salto de assunto, sem repetição de argumento.

O PLANO QUE VOCÊ PRODUZ contém, nesta ordem:

1. DIREÇÃO ESTRATÉGICA: 2 a 4 frases definindo objetivo, público, tom e o arco narrativo escolhido, com o porquê em uma frase.

2. PLANO SLIDE A SLIDE: uma linha por slide, no formato
       "Slide N (papel): mensagem central em uma frase; FORMATO: <formato>"
   Papéis possíveis: abrir, contextualizar, criar tensão, apresentar a proposta, aprofundar, provar,
   responder objeção, dar respiro, convergir pra decisão, fechar.
   Formatos possíveis, e você DEVE nomear um por slide de conteúdo:
       AFIRMAÇÃO      título forte + no máximo UM apoio curto (uma linha de síntese OU nada). Sem lista. O respiro do deck, pouquíssimo texto.
       TÓPICOS        título + até 5 linhas telegráficas (3 a 8 palavras cada), sem caixa, sem parágrafo. O formato mais usado.
       CARDS          título + 2 ou 3 cards (título curto + UMA linha de apoio). Minoria; use quando o item pede um pingo de apoio.
       NÚMERO         título com UMA métrica concreta do briefing + uma linha que a contextualiza.
   Além destes, os estruturais: CAPA, SEPARADOR, ENCERRAMENTO.

   Regras que o seu plano precisa respeitar, porque a geradora vai obedecer o plano:
   - Dois slides consecutivos NUNCA no mesmo formato. Todo slide deve parecer único.
   - MENOS TEXTO É MELHOR: a base do deck são TÓPICOS e AFIRMAÇÕES enxutas. CARDS são minoria (no máximo cerca de um terço).
   - A cada 3 ou 4 slides de conteúdo, pelo menos uma AFIRMAÇÃO seca de respiro.
   - Use CARDS só quando o item pede uma frase de apoio. Se ele se explica sozinho, é TÓPICO.

3. PONTOS POR SLIDE: pra cada slide de conteúdo, liste em poucas palavras QUAIS pontos-chave ele carrega
   (as frentes, as etapas, os números). É este item que impede tanto o slide vazio quanto a parede de texto:
   se você não consegue nomear os pontos, o slide não deveria existir; se são muitos, ele vira dois slides.

4. CUIDADOS: 2 a 4 avisos específicos deste briefing (o que não repetir, que dado não inventar, que armadilha evitar).

REGRAS DA SUA SAÍDA:
- Responda APENAS com o texto do plano. Sem preâmbulo, sem "aqui está", sem comentário sobre o seu processo, sem markdown, sem cerca de código.
- O plano cobre EXATAMENTE a quantidade de slides pedida, uma linha por slide, numeradas de 1 até o total.
- Cada slide do plano tem UM objetivo. Nenhum slide existe pra preencher espaço.
- Cada slide de conteúdo é ENXUTO (10 a 40 palavras, menos é melhor), nunca um parágrafo. MENOS TEXTO É MELHOR:
  planeje o slide como poucos pontos telegráficos ou uma afirmação seca. Um título forte com uma linha já basta.
  Se o assunto rende um parágrafo, ele rende três tópicos melhores, ou vira a fala do apresentador, não a tela.
- Seja denso e enxuto: o plano inteiro cabe confortavelmente numa tela.

${WRITING_PRINCIPLES}
`.trim();

export interface StrategistBriefing {
  idea: string;
  slideCount: number;
  goal: PresentationGoal;
  audience: string;
  style: VisualStyle;
  assets: DraftAssetMeta[];
}

/**
 * Monta a entrada do estrategista com TODAS as respostas coletadas no fluxo.
 * Este é o único lugar que enxerga o briefing completo antes da geração.
 */
export function buildStrategistPrompt(briefing: StrategistBriefing): string {
  const photos = briefing.assets.filter((a) => a.kind === 'image').length;
  const assets =
    briefing.assets.length > 0
      ? [
          `Anexos do usuário (existem como contexto, o conteúdo deles não é visível): ${briefing.assets
            .map((a) => `${a.name} (${a.kind})`)
            .join(', ')}.`,
          // A foto do usuário OCUPA um slide de miolo (o motor a emoldura ao lado do
          // texto). Se o plano não reservar esse slide, a foto cai num slide que não
          // foi escrito pra ela e o texto fica olhando pro outro lado.
          photos > 0
            ? `${photos} ${photos === 1 ? 'anexo é foto e vai OCUPAR um slide' : 'anexos são fotos e vão OCUPAR ' + photos + ' slides'} de miolo, com a imagem emoldurada ao lado do texto. Reserve ${photos === 1 ? 'esse slide' : 'esses slides'} no plano, em formato APROFUNDAMENTO (texto puro, sem lista), e diga qual argumento a imagem sustenta.`
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      : 'O usuário não anexou arquivos.';

  return `
O fluxo de criação terminou. Estas são TODAS as respostas do usuário:

IDEIA (fonte da verdade factual, pode vir livre ou já estruturada):
"""
${briefing.idea}
"""

${goalGuidance(briefing.goal)}

${audienceLine(briefing.audience)}

${styleGuidance(briefing.style)}

${slideCountGuidance(briefing.slideCount)}

${assets}

Escreva agora o plano, seguindo as regras da sua saída.
`.trim();
}

/**
 * Sanitiza o plano vindo do modelo: remove cercas de código que teimem em
 * aparecer, apara espaço e aplica teto de tamanho. Devolve null se a saída for
 * curta demais pra ser um plano de verdade, e aí a rota cai no caminho direto.
 */
export function sanitizeStrategistPlan(raw: string): string | null {
  const cleaned = raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  if (cleaned.length < 200) return null;
  return cleaned.length > 16_000 ? cleaned.slice(0, 16_000) : cleaned;
}
