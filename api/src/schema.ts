/**
 * Schemas de "structured output" do Gemini (subconjunto de OpenAPI: type/properties/items/enum/required).
 *
 * Não há suporte confiável a union/oneOf nesse subconjunto, então o bloco é UM objeto com campos
 * alternativos e o `kind` diz qual deles vale:
 *
 *   kind = title-1 | title-2 | ... | body | highlight | section-label  ->  usa `content`
 *   kind = cards                                                       ->  usa `cards`   (máx 3)
 *   kind = topics                                                      ->  usa `topics`  (máx 5)
 *
 * `cards` e `topics` são campos SEPARADOS de propósito, não um `items` genérico: o item de um card
 * é um objeto {title, body} e o de um tópico é uma linha de texto. Espremer os dois no mesmo campo
 * convidava o modelo a mandar tópico com cara de card — exatamente a confusão que o produto proíbe.
 * Com dois campos, o schema já diz que são coisas diferentes.
 *
 * O teto (3 / 5) é PEDIDO aqui e no prompt, e CORTADO em normalize.ts. Modelo nenhum obedece limite
 * numérico com 100% de confiabilidade, então a garantia de verdade é o corte.
 */

const richRunSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    bold: { type: 'boolean' },
    highlight: { type: 'boolean' },
  },
  required: ['text'],
};

const richTextSchema = {
  type: 'array',
  items: richRunSchema,
};

/** SYNC_WITH: SLIDE_ICONS em api/src/types.ts. O normalize valida de novo (o corte é lá). */
const slideIconEnum = ['busca', 'grafico', 'usuarios', 'documento', 'calendario', 'lista', 'cadeado', 'cubo', 'alvo', 'raio', 'escudo', 'relogio', 'engrenagem', 'dados', 'foguete', 'check', 'aspas', 'cifrao'];

const cardSchema = {
  type: 'object',
  properties: {
    title: richTextSchema,
    body: richTextSchema,
    icon: { type: 'string', enum: slideIconEnum },
  },
  required: ['title', 'body'],
};

const statSchema = {
  type: 'object',
  properties: {
    value: richTextSchema,
    label: richTextSchema,
    icon: { type: 'string', enum: slideIconEnum },
  },
  required: ['value', 'label'],
};

const compareSideSchema = {
  type: 'object',
  properties: {
    label: richTextSchema,
    points: { type: 'array', items: richTextSchema },
    icon: { type: 'string', enum: slideIconEnum },
  },
  required: ['label', 'points'],
};

const blockKindEnum = [
  'title-1',
  'title-2',
  'title-3',
  'subtitle',
  'body',
  'highlight',
  'section-label',
  'cards',
  'topics',
  'stats',
  'steps',
  'compare',
];

export const blockSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: blockKindEnum },
    align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
    /** Blocos de texto. */
    content: richTextSchema,
    /** kind = "cards": no máximo 3, cada um com título curto E corpo de UMA frase. */
    cards: { type: 'array', items: cardSchema },
    /** kind = "topics": no máximo 5, cada um uma linha de 3 a 10 palavras. */
    topics: { type: 'array', items: richTextSchema },
    /** kind = "stats": 1 a 4 métricas {value curto com dígito, label de 1 a 6 palavras}. */
    stats: { type: 'array', items: statSchema },
    /** kind = "steps": 3 a 5 etapas em sequência, uma linha cada. */
    steps: { type: 'array', items: richTextSchema },
    /** kind = "compare": exatamente 2 lados {label, points de 1 a 3 itens}. */
    sides: { type: 'array', items: compareSideSchema },
  },
  required: ['kind'],
};

export const slideSchema = {
  type: 'object',
  properties: {
    layout: { type: 'string', enum: ['cover', 'section', 'content', 'closing'] },
    blocks: { type: 'array', items: blockSchema },
  },
  required: ['layout', 'blocks'],
};

export const generateResponseSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slides: { type: 'array', items: slideSchema },
    chat: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'slides', 'chat'],
};

export const improveResponseSchema = {
  type: 'object',
  properties: {
    blocks: { type: 'array', items: blockSchema },
  },
  required: ['blocks'],
};
