import type { BlockRect } from '@/types/slide';

/** Piso de tamanho: abaixo disso a caixa vira um fio impossível de pegar de volta. */
const MIN_WIDTH = 0.06;
const MIN_HEIGHT = 0.04;

/** Mantém o rect dentro do slide (0..1 nos dois eixos) e nunca menor que o mínimo usável. */
export function clampRect(rect: BlockRect): BlockRect {
  const width = Math.max(MIN_WIDTH, Math.min(1, rect.width));
  const height = Math.max(MIN_HEIGHT, Math.min(1, rect.height));
  const x = Math.max(0, Math.min(1 - width, rect.x));
  const y = Math.max(0, Math.min(1 - height, rect.y));
  return { x, y, width, height };
}
