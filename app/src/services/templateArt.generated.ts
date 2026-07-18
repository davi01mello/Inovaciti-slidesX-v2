/* eslint-disable */
/**
 * CATÁLOGO DE ARTES DA MARCA — GERADO. NÃO EDITE À MÃO.
 *
 * Fonte: brand/templates-src/  ·  Gerador: brand/tools/build_templates.py
 * Pra adicionar uma arte: jogue o PNG (ou MP4, pra fundo com movimento) em
 * brand/templates-src/<Familia>/ e rode
 *
 *     python3 brand/tools/build_templates.py
 *
 * `grid` é a grade de ocupação 16x9 medida na própria arte: 0 = vazio liso,
 * 99 = escultura ou facho de luz. É contra ela que o motor de zonas pontua cada
 * arranjo possível de cada arquétipo (ver services/artZones.ts).
 */
import art_capa_01 from '@/assets/templates/capa/capa-01.webp';
import art_capa_02 from '@/assets/templates/capa/capa-02.webp';
import art_capa_03 from '@/assets/templates/capa/capa-03.webp';
import art_capa_04 from '@/assets/templates/capa/capa-04.webp';
import art_capa_05 from '@/assets/templates/capa/capa-05.webp';
import art_capa_06 from '@/assets/templates/capa/capa-06.webp';
import art_capa_07 from '@/assets/templates/capa/capa-07.webp';
import art_capa_08 from '@/assets/templates/capa/capa-08.webp';
import art_capa_09 from '@/assets/templates/capa/capa-09.webp';
import art_capa_10 from '@/assets/templates/capa/capa-10.webp';
import art_capa_11 from '@/assets/templates/capa/capa-11.webp';
import art_capa_12 from '@/assets/templates/capa/capa-12.webp';
import art_capa_13 from '@/assets/templates/capa/capa-13.webp';
import art_capa_14 from '@/assets/templates/capa/capa-14.webp';
import art_capa_15 from '@/assets/templates/capa/capa-15.webp';
import art_capa_16 from '@/assets/templates/capa/capa-16.webp';
import art_capa_17 from '@/assets/templates/capa/capa-17.webp';
import art_capa_18 from '@/assets/templates/capa/capa-18.webp';
import art_capa_19 from '@/assets/templates/capa/capa-19.webp';
import art_capa_20 from '@/assets/templates/capa/capa-20.webp';
import art_capa_21 from '@/assets/templates/capa/capa-21.webp';
import art_capa_22 from '@/assets/templates/capa/capa-22.webp';
import art_capa_23 from '@/assets/templates/capa/capa-23.webp';
import art_capa_24 from '@/assets/templates/capa/capa-24.webp';
import art_capa_25 from '@/assets/templates/capa/capa-25.webp';
import art_capa_26 from '@/assets/templates/capa/capa-26.webp';
import art_capa_27 from '@/assets/templates/capa/capa-27.webp';
import art_capa_28 from '@/assets/templates/capa/capa-28.webp';
import art_canva_both_01 from '@/assets/templates/canvas/canva-both-01.webp';
import art_canva_both_02 from '@/assets/templates/canvas/canva-both-02.webp';
import art_canva_down_01 from '@/assets/templates/canvas/canva-down-01.webp';
import art_canva_down_02 from '@/assets/templates/canvas/canva-down-02.webp';
import art_canva_down_03 from '@/assets/templates/canvas/canva-down-03.webp';
import art_canva_down_04 from '@/assets/templates/canvas/canva-down-04.webp';
import art_canva_left_01 from '@/assets/templates/canvas/canva-left-01.webp';
import art_canva_left_02 from '@/assets/templates/canvas/canva-left-02.webp';
import art_canva_left_03 from '@/assets/templates/canvas/canva-left-03.webp';
import art_canva_left_04 from '@/assets/templates/canvas/canva-left-04.webp';
import art_canva_right_01 from '@/assets/templates/canvas/canva-right-01.webp';
import art_canva_right_02 from '@/assets/templates/canvas/canva-right-02.webp';
import art_canva_right_03 from '@/assets/templates/canvas/canva-right-03.webp';
import art_espiral_branco_01 from '@/assets/templates/espiral/espiral-branco-01.webp';
import art_espiral_preto_01 from '@/assets/templates/espiral/espiral-preto-01.webp';
import art_espiral_preto_02 from '@/assets/templates/espiral/espiral-preto-02.webp';

export type ArtFamily = 'capa' | 'canvas' | 'espiral';

export interface TemplateArt {
  id: string;
  family: ArtFamily;
  src: string;
  /** Matiz dominante da escultura, em graus. */
  hue: number;
  /** L* médio da arte (0..1). */
  luminance: number;
  /** Croma médio (0..1): o quanto a arte TEM cor. */
  vividness: number;
  /** Posição no eixo de cor: 0 = Névoa, 0.5 = Oceano, 1 = Floresta. */
  tone: number;
  /** Arte de fundo claro: a tinta do slide vira escura e o acento vira o profundo. */
  light: boolean;
  /** Fundo com movimento (WebP animado, de um MP4 fonte) em vez de imagem parada. */
  animated: boolean;
  /** Ocupação visual, 16 colunas x 9 linhas, em ordem de leitura (0..99). */
  grid: number[];
}

export const GRID_COLS = 16;
export const GRID_ROWS = 9;

export const TEMPLATE_ARTS: TemplateArt[] = [
  {
    id: 'capa-01',
    family: 'capa',
    src: art_capa_01,
    hue: 164.5,
    luminance: 0.058,
    vividness: 0.058,
    tone: 0.94,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  1, 17,
       1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  3,  4,  6, 16, 30, 25,
       1,  1,  1,  1,  1,  1,  1,  2,  2,  4,  7, 16, 36, 76,  9,  6,
       1,  1,  1,  1,  1,  1,  1,  2,  4,  9, 17, 36, 84, 39,  9,  9,
       1,  1,  1,  1,  1,  1,  2,  4, 10, 22, 43, 73, 45, 32,  9, 77,
       1,  1,  1,  1,  1,  2,  4, 10, 64, 43, 30, 55, 85, 33, 33, 74,
       1,  1,  1,  1,  3,  7,  8, 10, 88, 47, 18, 22, 40, 44, 46, 55,
       1,  1,  1,  8,  6,  3,  3,  4,  6, 48, 39, 52, 38, 32, 43, 51,
       1,  4, 11,  4,  2,  1,  1,  2, 28, 40, 42, 62, 26, 15,  8,  5,
    ],
  },
  {
    id: 'capa-02',
    family: 'capa',
    src: art_capa_02,
    hue: 163.2,
    luminance: 0.042,
    vividness: 0.042,
    tone: 0.957,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  2,  2, 16,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  3,  4, 47, 57, 53,
       0,  0,  0,  0,  0,  0,  0,  1,  1,  2,  4,  7, 60, 41, 19,  2,
       0,  0,  0,  0,  0,  0,  1,  1,  3,  5, 11, 35, 37,  9,  1,  3,
       0,  0,  0,  0,  0,  1,  1,  3,  6, 14, 26, 51, 13,  2, 11, 14,
       1,  0,  0,  0,  1,  1,  2,  5, 13, 28, 51, 55, 33, 10, 12,  7,
       3,  7, 14,  0,  1,  1,  3, 11, 45, 68, 84, 83, 22, 24,  6,  8,
       0,  2, 14, 29, 31, 37, 36, 44, 48, 43, 54, 38, 45, 22, 14,  3,
       0,  0,  0,  0,  3, 19, 57, 17, 28, 25, 57, 80, 13,  3,  1,  0,
    ],
  },
  {
    id: 'capa-03',
    family: 'capa',
    src: art_capa_03,
    hue: 162.8,
    luminance: 0.067,
    vividness: 0.065,
    tone: 0.963,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  4, 65,  4,  1,  1,  1,  1,  1,  1,  1,  1,  5,  9,  9,  7,
       2, 35, 66,  1,  1,  1,  1,  1,  1,  1,  1,  2, 10, 13, 58, 79,
      20, 62, 25,  1,  1,  1,  1,  1,  1,  2,  3,  9, 42, 75, 33,  2,
      28, 60,  0,  1,  1,  1,  1,  1,  2,  3,  6, 17, 98, 55,  8, 45,
      21, 67,  1,  1,  1,  1,  1,  1,  2,  5, 16, 22, 70, 32,  9, 23,
      27, 70,  0,  1,  1,  1,  1,  1,  3, 12, 23, 32, 54, 45, 12,  6,
      38, 80,  0,  1,  1,  1,  1,  2, 36, 57, 58, 66, 89, 59, 41, 28,
      42, 75, 21,  1,  1,  2,  4, 16, 61,  6, 39, 36, 43, 35, 77, 28,
       2, 63, 81,  7,  1,  1,  3, 36, 36,  3,  9, 43, 49, 60, 43, 58,
    ],
  },
  {
    id: 'capa-04',
    family: 'capa',
    src: art_capa_04,
    hue: 170.7,
    luminance: 0.05,
    vividness: 0.055,
    tone: 0.856,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  8,  2, 12, 17, 23, 44, 36,  1,  2,  2,  3,  5, 10, 73, 39,
       3,  6, 10,  8,  6,  1,  1,  1,  1,  2,  2,  6, 20, 86, 89, 40,
      10, 13,  9,  3,  1,  1,  1,  1,  1,  2,  3, 12, 70, 91, 57, 79,
      14, 17,  7,  1,  1,  1,  1,  1,  1,  2,  4, 12, 64, 65, 78, 24,
      14, 61, 64,  3,  2,  1,  1,  1,  1,  1,  3,  7, 19, 46, 68,  7,
      16, 26, 62, 44,  3,  1,  1,  1,  1,  1,  2,  4,  8, 15, 49, 33,
      38, 57, 84, 70, 38, 21, 19,  9,  1,  1,  2,  3,  4,  5,  7, 11,
      24, 44, 39, 41, 28, 25,  3,  9,  5,  4,  6,  7,  9, 11, 15, 16,
      13, 43, 48, 53, 44, 61,  3,  2,  1,  1,  1,  5, 10, 15, 13,  2,
    ],
  },
  {
    id: 'capa-05',
    family: 'capa',
    src: art_capa_05,
    hue: 158.6,
    luminance: 0.052,
    vividness: 0.055,
    tone: 1.0,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  1,  1,  0,  0,  0,  1,  1, 24,  9,  9, 12,  6, 24, 43,
       1,  1,  1,  1,  1,  1,  1,  1,  1,  8, 25, 17, 27, 68, 49,  6,
       1,  1,  1,  1,  1,  1,  1,  1,  4, 37, 12, 25, 81,  8,  1,  1,
       5,  1,  1,  1,  1,  1,  1,  2, 39, 21,  5, 57, 21, 21, 22,  6,
      11,  2,  1,  1,  1,  2,  3,  4, 27,  5,  5, 65, 21, 73, 10,  7,
       9, 12,  2,  2,  3,  5,  7,  8, 17, 17, 37, 70, 53, 68, 43, 10,
       3, 10, 18, 21,  7, 11, 18, 26, 52, 58, 51, 11, 31, 15, 42, 25,
       1,  3,  9, 25, 36, 40, 45, 59, 48, 49, 51, 68, 59, 69, 17, 30,
       1,  1,  3,  5, 10, 27, 42, 23, 35,  9, 31, 61, 39, 29, 28,  5,
    ],
  },
  {
    id: 'capa-06',
    family: 'capa',
    src: art_capa_06,
    hue: 161.9,
    luminance: 0.045,
    vividness: 0.048,
    tone: 0.974,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 14,  4,  3,  0,
       0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1, 27,  9, 18,  1,  1,
       1,  1,  1,  1,  1,  1,  1,  1,  1,  2, 18, 32, 27, 23,  1, 16,
       1,  1,  1,  1,  1,  1,  1,  1,  3,  5, 39,  5, 41,  2, 35, 37,
       1,  1,  0,  1,  1,  1,  1,  4,  8, 32, 29, 34, 23,  8, 42,  2,
      10, 15,  0,  1,  1,  1,  3,  8, 20, 43, 25, 36,  9, 19,  6,  1,
       1, 22, 38, 41, 40,  1,  6, 17, 48, 53, 59, 32, 24,  9,  4,  2,
       3,  9, 11,  8, 17, 44, 43, 43, 75, 99, 90, 69, 61, 34, 20,  6,
       1,  1,  1,  2,  2,  4,  7, 37, 43, 28, 20, 24, 39, 21, 11,  4,
    ],
  },
  {
    id: 'capa-07',
    family: 'capa',
    src: art_capa_07,
    hue: 163.1,
    luminance: 0.053,
    vividness: 0.044,
    tone: 0.958,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  2,  8,  4,  3,  3,  7,  6,  2,  0,  0,  0,  0,  0,  0,
       1,  2,  3, 23, 15,  8, 13,  8,  1,  0,  0,  0,  0,  0,  0,  0,
       2,  3,  5, 48, 22, 17,  2,  1,  1,  1,  1,  0,  0,  0,  0,  0,
       2,  3,  6, 62, 37,  4,  3,  2,  2,  1,  1,  1,  1,  0,  0,  0,
       3,  3,  7, 76, 26,  7,  5,  3,  3,  2,  1,  1,  1,  0,  0,  0,
       2,  3,  7, 74, 38, 16,  8,  5,  4,  2,  2,  1,  1,  1,  0,  0,
       2,  3,  7, 68, 71, 29, 11,  7,  4, 36, 47, 33, 28, 20, 11,  4,
       2,  3,  5, 33, 81, 72, 35, 11, 66, 57, 47, 45, 42, 38, 24,  1,
       2,  3,  7, 36, 49, 28, 13,  6, 39, 27,  6, 56, 30,  4,  6,  9,
    ],
  },
  {
    id: 'capa-08',
    family: 'capa',
    src: art_capa_08,
    hue: 164.4,
    luminance: 0.025,
    vividness: 0.029,
    tone: 0.94,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      32,  9,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       4, 53,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       1, 21, 61,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      24,  3, 32, 51,  1,  1,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,
      23, 27,  4, 29, 39,  5,  3,  2,  1,  0,  0,  0,  0,  0,  0,  0,
       0, 27, 27,  5, 31, 38, 14,  6,  2,  1,  0,  0,  0,  0,  0,  0,
       0,  0, 33, 30, 30, 39, 40, 18,  8,  3,  1,  0,  0,  0,  0,  0,
       0,  1,  2, 39, 39, 31, 67, 33, 19, 10,  4,  2,  1,  1,  0,  0,
       1,  3,  8, 22, 62, 38, 51, 56, 46, 37, 30, 23, 17, 11,  6,  2,
    ],
  },
  {
    id: 'capa-09',
    family: 'capa',
    src: art_capa_09,
    hue: 163.5,
    luminance: 0.062,
    vividness: 0.063,
    tone: 0.953,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  1,  1,  1,  1,  1,  2,  2,  3,  3,  2,  2,  2,  2,  2,  2,
       1,  2,  2,  2,  2,  2,  2,  2,  5,  4,  3,  3,  3,  4,  3,  3,
      17, 59, 87, 66,  4,  4,  4,  4,  7,  4,  4,  6,  9, 12, 12,  8,
       1,  1,  8, 53, 64,  7,  8,  9,  9,  6, 15, 46, 41, 40, 32, 21,
       4,  1,  2,  4, 41, 13, 14, 16, 12, 49, 62, 21,  5,  4,  3,  2,
      11, 21,  4, 46, 75, 29, 37, 30, 46, 69, 36, 50, 29,  2,  1,  1,
       6, 67, 36, 17, 78, 51, 82, 67, 79, 29,  5, 51, 66,  2,  1,  1,
       1, 16, 41, 32, 34, 42, 38, 46, 24,  7,  6, 27, 50,  1,  1,  1,
       1,  1,  8, 16, 31, 57, 55, 64, 32, 13, 15, 16,  8,  1,  1,  0,
    ],
  },
  {
    id: 'capa-10',
    family: 'capa',
    src: art_capa_10,
    hue: 165.8,
    luminance: 0.028,
    vividness: 0.031,
    tone: 0.922,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1, 14, 65, 37,
       0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  2,  3, 21, 45, 40, 17,
       0,  0,  0,  0,  0,  0,  1,  1,  2,  3,  5, 35, 37, 20, 24,  6,
       0,  0,  0,  0,  0,  1,  1,  2,  4,  7, 11, 44,  7,  3,  1,  0,
       0,  0,  0,  0,  1,  1,  2,  4,  9, 20, 39, 22,  5,  1,  0,  0,
       0,  0,  0,  0,  1,  1,  3,  7, 18, 50, 80, 33, 12,  1,  9, 16,
       0,  0,  0,  0,  1,  5, 22, 34, 47, 76, 51, 18, 52, 42, 19,  1,
       0,  1,  2,  3,  8, 13,  6,  5, 13, 51, 61, 20,  2,  1,  0,  0,
    ],
  },
  {
    id: 'capa-11',
    family: 'capa',
    src: art_capa_11,
    hue: 168.5,
    luminance: 0.04,
    vividness: 0.038,
    tone: 0.885,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 15, 41, 20,  7,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1, 70, 25,  1,  0,
       0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  2, 17, 80, 10,  2,  1,
       0,  0,  0,  0,  0,  1,  1,  1,  2,  3, 56, 41, 91, 16,  1,  1,
       0,  0,  0,  0,  0,  1,  1,  3,  6, 11, 34, 36, 88,  5,  1, 30,
       0,  0,  0,  0,  0,  1,  2,  6, 57, 68, 49, 34, 53, 31, 41, 23,
       0,  0,  0,  0,  1,  1,  4, 58, 63, 14, 11, 15, 31, 35, 20,  8,
       0,  0,  0,  0,  1,  2, 46, 68, 32, 82, 79, 71, 49, 15,  4,  2,
      10, 18, 17, 21, 27, 40, 62, 93, 85, 37, 11,  6,  3,  2,  1,  0,
    ],
  },
  {
    id: 'capa-12',
    family: 'capa',
    src: art_capa_12,
    hue: 165.7,
    luminance: 0.057,
    vividness: 0.067,
    tone: 0.923,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      59, 66, 30, 12,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      41, 41, 37, 16,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  8,
      14, 22, 20, 21,  7,  1,  1,  1,  1,  1,  1,  1,  1, 34, 57, 31,
       5,  6, 11, 21, 10,  1,  1,  1,  1,  2,  2,  2, 44, 42,  3,  2,
       3,  5, 15, 28, 17,  1,  1,  2,  3,  4,  6,  6, 58, 24,  4,  3,
       3,  4, 14, 31, 23,  2,  3,  4,  6, 11, 17, 18, 81, 57, 41, 30,
       3,  6, 15, 34, 25,  3,  4,  8, 14, 25, 44, 69, 75,  8,  4,  5,
       4, 10, 19, 20, 26,  4, 32, 48, 57, 43, 75, 97, 14,  5, 14, 38,
       9, 16, 20, 16, 23, 46, 42, 17, 44, 92, 79, 63, 22, 89, 70, 15,
    ],
  },
  {
    id: 'capa-13',
    family: 'capa',
    src: art_capa_13,
    hue: 170.4,
    luminance: 0.051,
    vividness: 0.059,
    tone: 0.86,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  1,  1,  1,  1,  1,  1,  1,  1,  1, 33, 15,  1,  2, 39, 26,
       1,  1,  1,  1,  1,  1,  1,  1,  1, 33, 77, 14, 25, 27,  6, 54,
       1,  1,  1,  1,  1,  1,  1,  1,  2, 84, 53, 43, 57, 66, 64, 71,
       1,  1,  1,  1,  1,  1,  2,  2,  2, 52, 99, 91, 41, 21, 47, 16,
       6,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2, 18, 77, 40, 55, 22,
      11, 14,  2,  2,  2,  3,  3,  3,  4,  6,  7, 31, 29, 56, 35,  9,
       9, 23, 33, 10,  3,  4,  9, 25, 50, 56, 61, 53, 41, 37, 51,  3,
       4,  7, 17, 28, 14, 23, 26, 51, 71, 66, 45, 21, 14, 35, 64, 45,
       1,  2,  3,  5, 11, 14, 15, 26, 15,  3,  4,  4,  3,  3,  4, 24,
    ],
  },
  {
    id: 'capa-14',
    family: 'capa',
    src: art_capa_14,
    hue: 170.7,
    luminance: 0.032,
    vividness: 0.032,
    tone: 0.856,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  1,  0,  0,  0,  1,  1,  1,  3, 14, 75, 81, 85, 34,  0,
       0,  0,  1,  0,  0,  1,  1,  1,  4, 65, 76, 45,  6,  0,  0,  0,
       0,  0,  0,  0,  0,  1,  1,  2, 41, 57,  7, 13, 12,  0,  0,  0,
       0,  0,  0,  0,  0,  1,  2,  3, 22,  4, 55, 88, 52, 14,  4,  1,
       0,  0,  0,  0,  1,  1,  4,  9, 35, 45, 77, 11, 24, 57,  3,  3,
       0,  0,  0,  0,  1,  2, 12, 41, 49, 44, 24,  0, 63, 31,  2,  1,
       2,  1,  0,  0,  0,  3, 50, 83, 10,  5, 15, 48, 46,  4,  1,  1,
       9,  9, 10, 16, 32, 47, 43,  1,  2,  2, 28, 26,  1,  1,  1,  0,
       9, 10, 10, 12,  9,  5,  5,  3,  3,  9, 19,  1,  1,  1,  0,  0,
    ],
  },
  {
    id: 'capa-15',
    family: 'capa',
    src: art_capa_15,
    hue: 185.1,
    luminance: 0.068,
    vividness: 0.087,
    tone: 0.661,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  2,  1,  1, 12,
       0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  4,  9, 33, 66, 49, 58,
       0,  0,  0,  0,  0,  0,  0,  1,  3,  7, 16, 72, 96, 35,  5,  4,
       0,  0,  0,  0,  0,  0,  1,  3,  8, 18, 30, 80,  9, 13, 51, 86,
       0,  0,  0,  0,  0,  1,  2,  6, 20, 37, 41, 69, 39, 70, 69, 64,
       0,  0,  0,  0,  0,  1,  3, 13, 72, 86, 74, 59, 88, 92,  4,  1,
       0,  0,  0,  0,  0,  1, 14, 62, 82, 49, 87, 76, 89, 13,  2,  0,
       0,  0,  0,  0,  3, 10, 65, 82, 30, 58, 20, 86, 99, 41,  9,  0,
       1, 14, 15,  9,  6, 21, 28, 60, 40, 25, 37, 34,  9,  4,  2,  1,
    ],
  },
  {
    id: 'capa-16',
    family: 'capa',
    src: art_capa_16,
    hue: 187.5,
    luminance: 0.059,
    vividness: 0.093,
    tone: 0.628,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  1,  1,  0,  1,  1,  1,  3,  4,  4,  2,
       0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1, 22, 59, 63, 41, 36,
       0,  0,  0,  0,  0,  0,  1,  1,  1,  2,  3, 86, 10, 13, 10,  6,
       0,  0,  0,  0,  0,  0,  1,  1,  3, 37, 53, 86, 44, 73, 59, 16,
      25,  1,  0,  0,  0,  1,  1,  3,  7, 52, 52, 44, 56, 68, 32,  9,
      36, 40,  1,  1,  1,  1,  7, 68, 77, 78, 72, 92, 58, 15,  4,  1,
      41, 93, 67,  7,  2,  5, 74, 65, 39, 54, 87, 71, 47, 79, 68, 40,
       2, 17, 42, 80, 59, 61, 42,  9, 14, 76, 93, 91, 99, 20,  3,  2,
       0,  1,  2, 44, 50, 22, 10,  3,  2, 24, 72, 84, 17, 68, 36,  5,
    ],
  },
  {
    id: 'capa-17',
    family: 'capa',
    src: art_capa_17,
    hue: 186.5,
    luminance: 0.082,
    vividness: 0.117,
    tone: 0.642,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  1,  1,  1,  2,  2,  3,  4,  5, 31, 38, 28, 29,
       0,  0,  0,  1,  1,  2,  2,  3,  5, 10, 40, 87, 53,  2,  2,  2,
       0,  0,  1,  1,  2,  3,  3,  6, 12, 58, 97, 47, 15, 11,  8,  5,
       0,  1,  1,  2,  3,  4,  5, 10, 33, 89, 74, 32, 16, 15, 19, 30,
       0,  1,  2,  2,  3,  4,  7, 18, 90, 93, 95, 96, 64,  7,  2, 10,
       1,  1,  2,  3,  5,  8, 14, 36, 81, 98, 85, 59, 71, 84, 33,  1,
       1,  2,  3,  6, 10, 18, 38, 60, 46, 58, 15, 10, 18, 47, 98, 90,
      21, 15,  5, 13, 29, 53, 83, 35, 25, 30, 80, 99, 94, 94, 56, 23,
       2, 34, 44, 60, 80, 83, 20,  5, 36, 62, 99, 68,  4,  2,  2,  1,
    ],
  },
  {
    id: 'capa-18',
    family: 'capa',
    src: art_capa_18,
    hue: 191.3,
    luminance: 0.069,
    vividness: 0.118,
    tone: 0.576,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  1,  1,  1,  1,  1,  2,  3,  5,  6, 92, 99, 67, 19,  7,
       1,  1,  1,  1,  1,  1,  2,  2,  3,  4, 42, 80, 25, 25, 15, 11,
       1,  2,  2,  2,  2,  3,  3,  4,  5,  6, 30, 13, 22, 19,  9, 16,
       2,  2,  2,  3,  4,  5,  6,  7,  8, 53, 53, 21, 10, 36, 21, 18,
       2,  3,  4,  5,  8, 10, 12, 14, 23, 54, 99, 30, 40, 50, 12, 16,
       5,  4,  7, 11, 16, 21, 26, 31, 56, 46, 93, 99, 79, 15,  3, 47,
       8, 14, 26, 26, 33, 43, 66, 67, 37, 43, 94, 82,  7, 12, 37, 30,
       3,  4, 14, 56, 85, 90, 79,  7,  7, 61, 99,  7, 41, 53,  3,  1,
       4,  4,  4,  6, 15, 41, 73, 59, 43, 53,  7, 53, 77,  4,  1,  1,
    ],
  },
  {
    id: 'capa-19',
    family: 'capa',
    src: art_capa_19,
    hue: 196.2,
    luminance: 0.111,
    vividness: 0.17,
    tone: 0.511,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  1,  1,  1,  1,  1,  2,  2,  2,  4,  7, 62, 83, 60, 22,
       1,  1,  1,  1,  1,  2,  2,  2,  3,  5,  9, 85, 68, 19,  5,  3,
       1,  1,  1,  2,  2,  2,  3,  4,  6, 11, 77, 64, 18, 18, 19,  6,
       3,  4,  2,  2,  2,  3,  4,  6, 12, 24, 83, 82, 92, 68, 62, 36,
       2,  6,  7,  4,  4,  5,  7, 12, 23, 44, 90, 68, 82, 41, 18, 12,
       2,  2,  5,  8, 11,  9, 12, 22, 40, 81, 92, 74, 74, 58, 20, 61,
       3,  2,  3,  5,  9, 17, 23, 39, 69, 90, 68, 65, 66, 47, 47, 57,
       3,  6,  7, 10, 16, 28, 42, 84, 91, 97, 96, 72, 64, 85, 88, 83,
       2,  4,  6,  9, 19, 45, 64, 83, 15, 26, 29, 30, 45, 93, 98, 73,
    ],
  },
  {
    id: 'capa-20',
    family: 'capa',
    src: art_capa_20,
    hue: 189.5,
    luminance: 0.089,
    vividness: 0.138,
    tone: 0.601,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  1,  1,  1,  1,  1,  1,  1,  2,  4, 17, 12, 23, 29,  3,
       1,  1,  1,  1,  1,  1,  1,  2,  2,  3,  7, 25, 27, 59,  5,  5,
       1,  1,  1,  2,  2,  2,  3,  3,  5,  7, 19, 37, 73, 31, 10, 21,
       2,  3,  3,  4,  4,  5,  6,  8, 11, 16, 50, 64, 67, 55, 42, 21,
       6,  7,  9, 10, 12, 14, 17, 19, 23, 42, 76, 90, 58,  4,  2,  1,
      14, 22, 48, 64, 67, 73, 63, 55, 53, 94, 99, 24, 13,  5,  1,  1,
      64, 68, 70, 51, 39, 54, 88, 90, 99, 66, 23, 34, 11,  4,  2,  1,
      40, 14,  8,  6,  6,  9, 17, 38, 83, 87, 24, 48, 18, 20,  3,  1,
       7,  3,  2,  2,  2,  2,  4,  9, 22, 68, 68, 50, 56, 14,  8,  1,
    ],
  },
  {
    id: 'capa-21',
    family: 'capa',
    src: art_capa_21,
    hue: 191.3,
    luminance: 0.096,
    vividness: 0.141,
    tone: 0.577,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  4, 59, 81, 54,
       1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  4, 62, 99, 26,  3,
       1,  2,  3,  4,  5,  4,  4,  3,  4,  4,  5, 42, 85, 47,  4,  1,
       2,  6, 17, 24, 16, 11,  8,  8,  7,  9, 13, 75, 62,  8,  2,  1,
      31, 55, 82, 96, 92, 44, 22, 21, 47, 72, 74, 58, 99,  5,  1,  1,
       3,  3,  7, 18, 51, 69, 73, 59, 80, 74, 89, 99, 61, 24, 35, 57,
       1,  1,  2,  5, 14, 39, 93, 91, 75,  8,  5, 26, 40, 34, 83, 66,
       0,  1,  6, 39, 62, 76, 94, 68, 16,  2,  2,  5, 33, 87, 41,  5,
       0,  3, 41, 63, 13, 34, 21,  7,  3, 11,  7,  4, 35, 75, 16,  1,
    ],
  },
  {
    id: 'capa-22',
    family: 'capa',
    src: art_capa_22,
    hue: 198.7,
    luminance: 0.067,
    vividness: 0.156,
    tone: 0.478,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       4,  4,  4,  4,  4,  4,  5,  5,  5,  5,  5,  5,  5,  8,  8,  9,
       4,  4,  4,  4,  5,  5,  5,  6,  6,  6,  5,  5,  6, 15, 11, 20,
       5,  6,  5,  5,  5,  5,  5,  6,  6,  6,  6,  6,  7, 45, 46, 18,
       7,  7,  7,  6,  5,  5,  5,  6,  6,  6,  6,  7, 11, 83, 22, 10,
       9, 10, 10,  9,  7,  6,  6,  6,  6,  7,  8, 11, 59, 50, 10,  7,
      13, 16, 17, 15, 10,  8,  7,  7,  7,  9, 13, 20, 60, 15,  7,  8,
      20, 27, 38, 38, 23, 13,  9,  8, 11, 18, 34, 75, 39, 12, 12, 26,
      28, 45, 75, 86, 63, 41, 26, 23, 33, 85, 99, 89, 53, 52, 48, 28,
      26, 44, 34, 23, 18, 15, 13, 21, 41, 51, 48, 17, 28, 21,  8,  6,
    ],
  },
  {
    id: 'capa-23',
    family: 'capa',
    src: art_capa_23,
    hue: 161.9,
    luminance: 0.098,
    vividness: 0.116,
    tone: 0.975,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       2,  2,  2,  2,  2,  2,  2,  2,  3,  3,  4,  9, 31, 33, 18,  3,
       2,  3,  3,  3,  3,  3,  3,  3,  3,  4,  8, 35, 34,  8,  4,  3,
       3,  4,  4,  4,  4,  4,  4,  3,  3,  5, 14, 36, 16,  8,  7,  9,
       5,  6,  7,  6,  5,  5,  4,  4,  4,  6, 12, 36, 23, 25, 24, 23,
       7, 11, 12, 10,  8,  6,  5,  4,  4,  6, 11, 30, 78, 78, 70, 59,
      13, 18, 18, 16, 11,  7,  5,  4,  5,  7, 12, 72, 90, 30, 11,  6,
      83, 59, 37, 26, 16, 10,  7,  6,  7, 14, 70, 87, 31, 10,  5,  3,
      58, 88, 81, 72, 31, 17, 11, 10, 20, 50, 64, 42, 12,  6,  3,  2,
       8, 19, 44, 84, 63, 35, 20, 19, 27, 20, 34, 17,  6,  4,  3,  2,
    ],
  },
  {
    id: 'capa-24',
    family: 'capa',
    src: art_capa_24,
    hue: 169.5,
    luminance: 0.073,
    vividness: 0.084,
    tone: 0.871,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       3,  7,  8,  8,  8, 11, 18, 28, 10,  0,  0,  0,  0,  0,  0,  0,
      21, 29, 23, 15,  7,  5, 12, 27, 19,  1,  1,  1,  0,  0,  0,  0,
      64, 59, 38, 20,  8,  6,  7, 15, 30,  1,  1,  1,  1,  1,  0,  0,
      92, 71, 40, 19,  6,  3,  5, 15, 27,  1,  1,  1,  1,  1,  1,  0,
      64, 40,  5,  7,  3,  5,  6, 19, 14,  2,  2,  1,  1,  1,  1,  0,
      50,  3,  5,  8, 13, 19, 28, 32,  6,  4,  2,  2,  1,  1,  1,  1,
      43, 13, 24, 34, 40, 47, 44, 16, 10,  5,  3,  2,  1,  1,  1,  1,
      35, 46, 54, 65, 61, 47, 26, 19, 13,  7,  4,  2,  1,  1,  1,  1,
      11, 56, 99, 66, 48, 38, 28, 20, 14,  7,  4,  2,  1,  1,  1,  1,
    ],
  },
  {
    id: 'capa-25',
    family: 'capa',
    src: art_capa_25,
    hue: 170.0,
    luminance: 0.077,
    vividness: 0.088,
    tone: 0.865,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0, 28, 14, 11, 13, 14,  7,  3,
       0,  0,  0,  0,  0,  0,  0,  1,  1, 31, 40, 31, 21, 22, 12,  3,
       1,  0,  0,  1,  1,  1,  1,  1,  2,  3, 52, 62, 51, 35, 20,  5,
       1,  1,  1,  1,  1,  1,  2,  2,  3,  5,  7, 61, 97, 59, 33,  7,
       1,  1,  1,  2,  2,  2,  3,  4,  6,  8, 14, 21, 86, 60, 22,  5,
       1,  1,  1,  2,  3,  4,  5,  6, 10, 15, 24, 56, 86, 48, 12,  4,
       2,  4,  4,  3,  4,  5,  8, 13, 18, 28, 61, 83, 76, 31,  7,  2,
       7, 15, 26, 37, 43, 28, 20, 28, 54, 69, 83, 62, 29, 12,  3,  1,
       1,  2,  4, 11, 24, 42, 46, 55, 68, 50, 33, 17,  6,  3,  1,  1,
    ],
  },
  {
    id: 'capa-26',
    family: 'capa',
    src: art_capa_26,
    hue: 165.6,
    luminance: 0.08,
    vividness: 0.093,
    tone: 0.925,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  1,  1,  1,  1,  1,  1,  1,  0, 19,  3,  1,  1,  0,  0,
       1,  1,  1,  1,  1,  1,  1,  1,  1,  1, 34,  8,  7,  7,  5,  2,
       2,  2,  2,  2,  2,  2,  1,  1,  2,  2, 51, 39, 23, 16,  8,  3,
       3,  3,  3,  2,  2,  2,  2,  2,  2,  3,  4, 88, 61, 30, 16,  5,
       4,  4,  4,  4,  3,  2,  2,  2,  3,  4,  8, 15, 99, 50, 24,  8,
      15, 10,  7,  6,  4,  3,  3,  3,  4,  7, 15, 30, 92, 75, 26,  8,
      52, 48, 18, 10,  7,  5,  4,  5,  7, 15, 29, 58, 83, 64, 21,  5,
      14, 45, 48, 30, 14,  9,  8, 10, 16, 29, 66, 84, 85, 30,  7,  2,
       3,  6, 20, 41, 30, 25, 27, 34, 44, 62, 75, 47, 20,  6,  2,  1,
    ],
  },
  {
    id: 'capa-27',
    family: 'capa',
    src: art_capa_27,
    hue: 174.4,
    luminance: 0.043,
    vividness: 0.051,
    tone: 0.805,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  1,  2,  2,  2,  2,  1,  1,  1,  1,  0,  0,  0,  0,  0,  0,
       5, 19, 32, 22,  5,  4,  4,  3,  2,  2,  1,  1,  1,  1,  0,  0,
       2,  9, 29, 67, 34, 13,  9,  6,  5,  3,  2,  2,  1,  1,  1,  0,
       1,  9, 32, 63, 86, 44, 23, 15, 10,  6,  4,  3,  2,  1,  1,  1,
       1,  8, 30, 57, 78, 95, 81, 41, 25, 16,  9,  5,  3,  2,  1,  1,
       1,  3, 15, 37, 55, 72, 90, 94, 71, 52, 34, 12,  5,  2,  1,  1,
       0,  1,  4, 10, 23, 35, 44, 50, 32, 21, 27, 32, 18,  4,  2,  1,
       0,  0,  1,  2,  5, 12, 15, 17, 15,  8,  3,  3, 13,  9,  2,  0,
    ],
  },
  {
    id: 'capa-28',
    family: 'capa',
    src: art_capa_28,
    hue: 163.2,
    luminance: 0.085,
    vividness: 0.101,
    tone: 0.956,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  2,  3,  4,  6,  9, 12, 15, 16, 17, 17, 16, 14, 60, 29,
       1,  1,  2,  2,  4,  5,  8, 11, 13, 16, 17, 17, 16, 13, 52, 26,
       1,  1,  2,  2,  3,  5,  6, 10, 12, 13, 15, 15, 14, 19, 51, 20,
       1,  1,  2,  2,  3,  4,  5,  8, 10, 11, 12, 12, 11, 52, 42,  8,
       2,  3,  3,  2,  2,  3,  5,  6,  8,  9, 10, 10, 14, 74, 29,  6,
      16, 43, 71, 68,  3,  3,  3,  5,  6,  7, 10, 16, 57, 77, 12,  4,
       4, 11, 28, 69, 68,  4,  3,  4,  5,  8, 17, 63, 81, 32,  6,  2,
       1,  3,  8, 19, 44, 28,  9, 11, 18, 48, 64, 71, 28,  7,  2,  1,
       0,  1,  2,  4, 11, 25, 32, 43, 53, 52, 28, 12,  4,  2,  1,  1,
    ],
  },
  {
    id: 'canva-both-01',
    family: 'canvas',
    src: art_canva_both_01,
    hue: 178.4,
    luminance: 0.029,
    vividness: 0.028,
    tone: 0.752,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  8, 84, 76,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  4, 59, 85,  2,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  6, 85, 92, 93,
       1,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  3, 54, 94, 82,
       4,  5,  5,  3,  1,  0,  0,  0,  0,  0,  0,  0,  0,  2,  4, 73,
      68, 59, 15,  9,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 19,
      40, 61, 20, 16,  5,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      99, 61, 73, 16,  5,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      92, 56, 94, 22,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
  },
  {
    id: 'canva-both-02',
    family: 'canvas',
    src: art_canva_both_02,
    hue: 186.5,
    luminance: 0.073,
    vividness: 0.074,
    tone: 0.641,
    light: false,
    animated: true,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  3, 83, 86, 55, 81,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  2,  6, 99, 46, 79, 86,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  3, 69, 80, 46, 99, 38,
       1,  2,  2,  2,  1,  0,  0,  0,  0,  1,  4, 96, 95, 74, 99, 70,
      55,  8, 42, 66, 53,  1,  0,  0,  0,  1,  3, 13, 77, 99, 66, 84,
      99, 92, 68, 28, 98,  4,  0,  0,  0,  0,  1,  4,  7, 17, 94, 68,
      67, 66, 38, 10, 68,  3,  0,  0,  0,  0,  0,  1,  2,  3,  3,  2,
      28, 89, 77, 70, 45,  2,  0,  0,  0,  0,  0,  0,  1,  1,  1,  0,
      52, 46, 99, 93,  5,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
  },
  {
    id: 'canva-down-01',
    family: 'canvas',
    src: art_canva_down_01,
    hue: 173.4,
    luminance: 0.018,
    vividness: 0.023,
    tone: 0.818,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  0,  0,  0,  0,  0,
       0,  0,  1,  2,  1,  1,  2,  2,  2,  2,  1,  1,  2,  1,  0,  0,
       1,  3,  5,  3,  7,  3,  5,  6,  6,  5,  3,  8,  4,  6,  4,  2,
       2, 12, 21, 36, 53, 60, 17, 17, 17, 18, 58, 50, 34, 20, 12,  2,
       6,  4,  6,  6, 10, 31, 58, 56, 56, 58, 31,  9,  5,  5,  3,  5,
    ],
  },
  {
    id: 'canva-down-02',
    family: 'canvas',
    src: art_canva_down_02,
    hue: 166.7,
    luminance: 0.047,
    vividness: 0.048,
    tone: 0.909,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  0,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  2,  2,  1,  1,
       0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  3,  5,  6,  6,  4,  3,
       0,  0,  0,  0,  0,  0,  0,  1,  3,  7, 15, 18, 18, 16, 10,  5,
       0,  0,  0,  0, 79, 97, 55, 24, 45, 68, 55, 36, 33, 28, 19,  9,
       0,  0,  0, 21, 71, 48, 36, 53, 77, 53, 36, 68, 82, 43, 23, 12,
       0,  0,  0, 15, 79, 17, 18, 13, 27, 13, 10, 11, 86, 98, 22, 10,
    ],
  },
  {
    id: 'canva-down-03',
    family: 'canvas',
    src: art_canva_down_03,
    hue: 168.1,
    luminance: 0.108,
    vividness: 0.086,
    tone: 0.891,
    light: false,
    animated: true,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      12,  2,  3,  2,  2,  2,  2,  4,  4,  4,  4,  3,  3,  3,  2,  2,
      35, 76, 91,  5,  3,  3,  3,  8,  7,  6,  5, 12, 78, 50, 30, 28,
       7, 22, 68, 80,  4,  4,  4, 13, 11,  9, 13, 78, 51,  9,  4, 10,
      11, 36, 42, 78, 79,  8,  8, 24, 31, 25, 57, 27, 18, 37,  9, 10,
       8,  4, 19, 22, 64, 24, 27, 53, 22, 10, 67, 14, 11, 36, 20, 15,
      20, 20, 13, 22, 46, 50, 41, 33, 49, 83, 71, 49, 56, 32, 65, 41,
       5, 22, 27, 28, 35, 49, 63, 67, 87, 76, 58, 54, 57, 39, 30,  9,
       6,  6,  8, 21, 44, 48, 55, 63, 54, 87, 56, 46, 25,  2, 19, 14,
      17, 13, 17, 32, 19, 19, 23, 17, 10,  6,  4,  3,  1,  1,  3, 11,
    ],
  },
  {
    id: 'canva-down-04',
    family: 'canvas',
    src: art_canva_down_04,
    hue: 165.2,
    luminance: 0.112,
    vividness: 0.082,
    tone: 0.93,
    light: false,
    animated: true,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  1,  0,  0,  1,  1,  1,  2,  3,  3,  4, 14, 65, 14,  7,  4,
       1,  0,  1,  1,  1,  1,  2, 15,  8, 43, 17, 61, 49, 32, 29,  5,
       1,  1,  1,  1,  2, 16, 11, 13, 21, 56, 47, 51, 58, 33, 66,  8,
       1,  1,  1,  1, 11, 19, 19, 18, 23, 16, 44, 25, 57, 29, 46,  9,
       2,  2,  3,  3,  3, 20, 13, 15, 17, 27, 26, 36, 54, 25, 11, 30,
       9, 11,  4,  2,  2, 16, 16, 20, 36, 67, 24, 60, 71, 15, 16, 20,
      63, 35, 38,  4,  9, 22, 39, 18, 49, 61, 31, 68, 58, 18, 13, 10,
      10,  6, 17, 25, 32, 26, 75, 13, 15, 23, 47, 51, 55, 48, 22, 17,
      23, 21, 17, 24, 23, 29, 40, 24, 32, 42, 39, 59, 66, 75, 33, 16,
    ],
  },
  {
    id: 'canva-left-01',
    family: 'canvas',
    src: art_canva_left_01,
    hue: 168.4,
    luminance: 0.039,
    vividness: 0.041,
    tone: 0.886,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       1,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      60, 45,  8,  2,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  0,
      20, 33, 88, 11,  3,  2,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
      88, 13, 78, 23, 11,  6,  5,  4,  2,  1,  1,  1,  1,  1,  1,  1,
      46, 91, 69, 68, 57, 15, 10,  7,  5,  2,  1,  1,  1,  1,  1,  1,
      58, 71, 83, 46, 69, 59, 12,  9,  6,  3,  1,  1,  1,  1,  1,  1,
      37, 43, 48, 38, 10, 66, 12,  7,  5,  2,  1,  1,  1,  1,  1,  1,
      29, 63, 24, 24,  2, 69,  5,  4,  3,  1,  1,  1,  0,  1,  1,  0,
       1, 50, 39, 18, 20, 43,  2,  2,  1,  1,  1,  1,  1,  0,  0,  0,
    ],
  },
  {
    id: 'canva-left-02',
    family: 'canvas',
    src: art_canva_left_02,
    hue: 174.6,
    luminance: 0.048,
    vividness: 0.055,
    tone: 0.803,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      42, 66, 53,  2,  4,  3,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      53,  2, 64, 91,  7,  3,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,
       2, 20, 36, 94, 10,  5,  2,  1,  1,  1,  1,  1,  1,  1,  1,  0,
      47, 20, 79, 30, 18, 10,  3,  2,  1,  1,  1,  1,  1,  1,  1,  1,
      74, 53, 85, 68, 55, 18,  7,  3,  2,  1,  1,  1,  1,  1,  1,  1,
      86, 83, 36, 43, 61, 94, 12,  4,  3,  2,  1,  1,  1,  1,  1,  1,
      87, 45, 58, 27, 15, 86, 53,  4,  3,  2,  1,  1,  1,  1,  1,  1,
      26, 53, 65,  2,  9, 29, 34,  3,  2,  2,  1,  1,  1,  1,  1,  0,
      45, 82, 47, 19, 58, 96,  6,  3,  2,  1,  1,  1,  1,  1,  0,  0,
    ],
  },
  {
    id: 'canva-left-03',
    family: 'canvas',
    src: art_canva_left_03,
    hue: 172.3,
    luminance: 0.055,
    vividness: 0.065,
    tone: 0.833,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      10, 31, 37, 22, 12,  7,  3,  1,  1,  1,  1,  0,  0,  0,  0,  0,
      29, 43, 32, 29, 20, 12,  7,  3,  1,  1,  1,  1,  1,  0,  0,  0,
      45, 47, 74, 55, 33, 21, 11,  3,  1,  1,  1,  1,  1,  1,  0,  0,
      51, 78, 45, 25, 21, 14,  6,  3,  2,  2,  1,  1,  1,  1,  1,  0,
      57, 67, 24, 11, 10, 10,  8,  4,  3,  2,  1,  1,  1,  1,  1,  0,
      50, 59, 39, 33, 37, 35, 15,  5,  3,  2,  1,  1,  1,  1,  1,  0,
      50, 25, 73, 76, 63, 36, 13,  5,  3,  2,  1,  1,  1,  1,  1,  0,
      39, 40, 34, 73, 60, 34, 15,  6,  3,  2,  1,  1,  1,  1,  1,  0,
       6, 10, 18, 39, 55, 44, 17,  5,  3,  2,  1,  1,  1,  1,  0,  0,
    ],
  },
  {
    id: 'canva-left-04',
    family: 'canvas',
    src: art_canva_left_04,
    hue: 186.9,
    luminance: 0.127,
    vividness: 0.089,
    tone: 0.636,
    light: false,
    animated: true,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       9, 10, 24, 75, 58, 17,  7,  6,  3,  2,  2,  2,  2,  1,  1,  0,
      11, 13, 85, 28, 39, 87, 12,  8,  4,  3,  2,  2,  2,  2,  1,  0,
      70, 67, 61, 54, 30, 85, 73, 11,  6,  3,  3,  2,  2,  2,  1,  1,
      77, 43, 53, 61, 38, 19, 53, 80, 10,  5,  3,  2,  2,  2,  1,  1,
      80, 82, 49, 88, 58, 24, 28, 87, 14,  7,  4,  3,  2,  1,  2,  1,
      61, 39, 68, 99, 91, 36, 18, 74, 75,  8,  4,  3,  2,  1,  2,  1,
      76, 75, 57, 64, 62, 35, 24, 23, 45,  7,  4,  3,  2,  2,  1,  1,
      15, 36, 55, 35, 31, 51, 46, 87, 13,  4,  3,  3,  2,  2,  1,  1,
      10, 20, 66, 29, 52, 83, 15, 11,  7,  5,  2,  2,  2,  1,  1,  0,
    ],
  },
  {
    id: 'canva-right-01',
    family: 'canvas',
    src: art_canva_right_01,
    hue: 171.6,
    luminance: 0.058,
    vividness: 0.056,
    tone: 0.844,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  3,  5,  7,  6,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  4, 13, 33, 62, 21,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  2, 11, 22, 86, 58, 99,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  3, 14, 24, 87, 12, 67,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  2, 10, 27, 65, 99, 15,
       0,  0,  0,  1,  2,  5, 12, 20, 23, 21, 18, 95, 89,  6, 99, 91,
       0,  1,  2,  8, 23, 43, 64, 89, 98, 79, 87, 76, 10, 83, 99, 38,
       0,  0,  1,  1,  4, 12, 23, 34, 40, 36, 68, 99, 32, 46, 14,  0,
    ],
  },
  {
    id: 'canva-right-02',
    family: 'canvas',
    src: art_canva_right_02,
    hue: 177.2,
    luminance: 0.158,
    vividness: 0.16,
    tone: 0.768,
    light: false,
    animated: true,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
      17, 10, 23, 70, 28, 15, 11,  2,  2,  2,  1,  0,  0,  0,  0,  0,
      23, 30, 32, 76, 32, 22, 23, 62, 13, 39, 13, 14,  9,  2,  2,  1,
      29, 62, 43, 90, 24, 22, 21, 44, 79, 50, 18, 12, 18, 54, 53,  5,
      56, 30, 58, 89, 27, 24, 29, 23, 54, 82, 41, 21, 10, 10, 47, 68,
      24, 19, 82, 92, 15, 44, 51, 31, 14, 69, 44, 31, 12,  9, 17, 45,
       9, 32, 91, 31, 11, 52, 59, 32, 20, 51, 49, 39, 14,  9, 12, 27,
      17, 62, 81, 22, 56, 85, 68, 22, 23, 56, 59, 41, 16,  8,  8, 19,
      35, 73, 42, 56, 70, 52, 22, 15, 54, 56, 51, 30, 12,  6, 10, 18,
      83, 67, 62, 42, 26, 17, 11, 23, 84, 49, 54, 19,  7,  6,  7, 17,
    ],
  },
  {
    id: 'canva-right-03',
    family: 'canvas',
    src: art_canva_right_03,
    hue: 184.7,
    luminance: 0.095,
    vividness: 0.116,
    tone: 0.666,
    light: false,
    animated: true,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  4,
       0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  3,  5,  6,  6, 29, 21,
       0,  0,  0,  0,  0,  0,  0,  1,  2,  5, 19, 78, 75, 90, 44, 44,
       0,  0,  0,  0,  0,  0,  1,  2,  7, 16, 71, 69, 39, 30, 37, 29,
       0,  0,  0,  0,  0,  0,  1,  6, 20, 38, 64, 24, 36, 87, 47, 64,
       0,  0,  0,  0,  0,  1,  3, 16, 50, 81, 53, 38, 51, 95, 32, 41,
       0,  0,  0,  0,  0,  9, 37, 85, 98, 83, 44, 40, 50, 89, 10,  4,
       0,  0,  1, 12, 14, 63, 36, 28, 98, 80, 37, 79, 90, 92, 15,  2,
      26, 21, 33, 40, 52, 60, 43, 48, 39, 30, 54, 72, 99, 54,  7,  1,
    ],
  },
  {
    id: 'espiral-branco-01',
    family: 'espiral',
    src: art_espiral_branco_01,
    hue: 174.1,
    luminance: 0.822,
    vividness: 0.24,
    tone: 0.0,
    light: true,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       5,  5,  5,  5,  5, 10, 10,  6,  5,  5,  5,  5,  5,  5,  5, 14,
       6,  6,  8,  6, 11, 17, 18, 25, 23, 11, 16, 12,  7,  7,  6, 33,
       8, 14, 12,  7, 10, 15, 19, 25, 38, 36, 24, 25, 12, 10, 17, 43,
      19, 18, 15,  9, 10, 16, 21, 27, 33, 44, 39, 31, 27, 14, 33, 49,
      26, 23, 21, 15, 12, 14, 21, 29, 34, 41, 50, 35, 46, 25, 41, 42,
      27, 28, 26, 22, 18, 19, 23, 28, 29, 36, 52, 45, 56, 34, 45, 24,
      29, 25, 29, 23, 29, 23, 23, 26, 27, 34, 56, 64, 57, 39, 46, 22,
      24, 23, 31, 27, 14, 18, 24, 30, 34, 39, 61, 71, 48, 55, 32, 26,
      27, 13, 11, 14, 17, 23, 33, 44, 52, 57, 64, 68, 55, 48, 33, 29,
    ],
  },
  {
    id: 'espiral-preto-01',
    family: 'espiral',
    src: art_espiral_preto_01,
    hue: 168.1,
    luminance: 0.079,
    vividness: 0.092,
    tone: 0.891,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  0,  0,  0,  0,  3,  2,  0,  0,  0,  0,  0,  0,  0,  0,  1,
       0,  0,  0,  0,  2,  9, 12, 28, 31,  6,  9,  1,  0,  0,  0,  3,
       0,  4,  2,  0,  1,  5,  8, 32, 92, 66, 12, 15,  0,  0,  3,  6,
      12,  8,  3,  1,  0,  2,  6, 10, 44, 99, 27, 13, 10,  1,  9, 14,
      28, 11,  5,  3,  0,  1,  3,  3,  9, 77, 84, 14, 61, 10, 13, 36,
      46, 11, 10, 12,  3,  4,  2,  3,  4, 27, 81, 36, 99, 14, 50, 28,
      20,  8, 15, 12,  7,  8,  9, 11, 10, 24, 84, 84, 98, 32, 81,  2,
       5,  5,  7,  7, 11, 20, 31, 36, 33, 37, 76, 99, 45, 86, 33,  3,
       6,  7,  6, 11, 26, 45, 66, 80, 76, 62, 70, 89, 64, 55,  4,  1,
    ],
  },
  {
    id: 'espiral-preto-02',
    family: 'espiral',
    src: art_espiral_preto_02,
    hue: 169.6,
    luminance: 0.07,
    vividness: 0.08,
    tone: 0.87,
    light: false,
    animated: false,
    // A escultura desta arte, medida. Cada linha é uma faixa do slide, de cima
    // pra baixo; cada número é o quão ocupada a célula está (0 = vazio liso).
    grid: [
       0,  2,  7, 19,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
       0, 11, 21, 62,  0,  1,  1,  6,  0,  0,  1,  0,  0,  0,  0,  0,
       0, 45, 34, 88,  0,  1,  1, 12, 39, 24,  6,  4,  2,  2,  2,  0,
      53, 29, 54, 99,  0,  1,  3,  7, 77, 99, 21, 14,  4,  3,  6, 12,
      25,  5, 68, 81,  1,  1,  5,  6, 14, 99, 34, 15,  3,  4,  9, 27,
       1, 16, 99, 27,  7, 17, 55, 15, 16, 41, 26,  8,  3,  4,  6, 17,
       5, 54, 78, 10, 65, 99, 57, 15, 22, 55, 24,  4,  4,  3,  3,  9,
      15, 50,  8, 41, 65, 35, 28, 33, 33, 50, 16,  4,  3,  2,  2,  6,
      15,  5, 10, 18, 25, 47, 69, 76, 63, 43, 10,  5,  1,  1,  2,  4,
    ],
  },
];
