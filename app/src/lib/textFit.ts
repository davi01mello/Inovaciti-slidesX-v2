import type { CSSProperties } from 'react';

/**
 * As regras de TEXTO que não precisam do DOM: puras, testáveis, sem React.
 * O componente que mede e encolhe vive em components/present/fit.tsx.
 */

/** Abaixo disso, coluna justificada vira rio de espaços. Prefira parecer bom a obedecer a regra. */
const MIN_CHARS_FOR_JUSTIFY = 45;

/**
 * A MEDIDA da linha: cerca de 70 caracteres. Acima disso o olho perde o começo da
 * linha seguinte e a leitura vira trabalho.
 *
 * Medindo o render, o parágrafo de introdução de um slide de cards saía com 109
 * caracteres por linha: ele herdava a largura INTEIRA da zona do título, que é larga
 * porque o TÍTULO é largo. Título aguenta linha longa (são cinco palavras em corpo
 * 40px). Parágrafo não. Tipografia de livro vive entre 45 e 75.
 *
 * ARMADILHA: a unidade `ch` MENTE aqui. Ela é a largura do glifo "0", e a Sora é uma
 * geométrica de algarismos largos: medindo no navegador, `64ch` deu 448px e coube
 * OITENTA E OITO caracteres, não 64. A largura média de uma letra minúscula na Sora
 * é 0.54em, contra 0.74em do "0". Então o teto é em `em`, que é o tamanho da fonte e
 * não o capricho de um glifo:
 *
 *     70 caracteres x 0.54em  ≈  38em
 *
 * Continua sendo relativo à fonte (encolheu a fonte, cabe mais texto na mesma
 * medida), que era a razão de querer `ch` em primeiro lugar.
 */
export const MAX_MEASURE = '38em';

/**
 * Justificar SÓ quando a coluna aguenta.
 *
 * Uma coluna estreita justificada abre rios de espaço entre as palavras e fica
 * pior do que se estivesse alinhada à esquerda. O limiar é a contagem de
 * caracteres por linha, que dá pra calcular sem tocar no DOM: a zona tem largura
 * conhecida (fração do palco) e a fonte tem tamanho conhecido (em cqw). Uma letra
 * de texto corrido ocupa cerca de meio `em` na média.
 *
 * Estimativa conservadora de propósito: ela ignora o `--fit`, que só AUMENTA a
 * contagem de caracteres. Na dúvida, alinha à esquerda.
 */
export function charsPerLine(zoneWidthFraction: number, fontSizeCqw: number): number {
  if (fontSizeCqw <= 0) return 0;
  return (zoneWidthFraction * 100) / (fontSizeCqw * 0.5);
}

export function justifyIfWide(zoneWidthFraction: number, fontSizeCqw: number): 'justify' | 'left' {
  return charsPerLine(zoneWidthFraction, fontSizeCqw) >= MIN_CHARS_FOR_JUSTIFY ? 'justify' : 'left';
}

/**
 * CAMADA 3: o clamp duro.
 *
 * Se o texto estourar até no piso da escala, ele é CORTADO. Truncar é feio.
 * Vazar de um card é muito pior: vazar quebra o alinhamento do slide inteiro e
 * entrega que o sistema não tem controle do que desenha.
 */
export function clampLines(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
    // ESPAÇO PRA TINTA. Um título display tem line-height apertado (1.04), e num
    // line-height menor que a caixa da fonte a tinta do glifo TRANSBORDA a linha:
    // o rabo do "g" de "margem" cai alguns pixels abaixo do fim do bloco. Com
    // `overflow: hidden` em cima, esse rabo seria cortado.
    // O padding dá o espaço; a margem negativa desfaz o efeito dele no layout.
    // Nada se move, e nenhum descendente é decapitado.
    paddingBottom: '0.16em',
    marginBottom: '-0.16em',
  } as CSSProperties;
}

/**
 * Confere, no navegador, que NADA vazou. Só roda no harness e nos testes.
 * Devolve os elementos que estouraram — vazio significa slide íntegro.
 */
export function findOverflowing(root: HTMLElement): { el: HTMLElement; over: number }[] {
  const out: { el: HTMLElement; over: number }[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-fit-guard]'))) {
    const over = el.scrollHeight - el.clientHeight;
    if (over > 1) out.push({ el, over });
  }
  return out;
}

