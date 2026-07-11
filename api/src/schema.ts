/**
 * Schemas de "structured output" do Gemini (subconjunto de OpenAPI: type/properties/items/enum/required).
 * Não há suporte confiável a union/oneOf nesse subconjunto, então o bloco é modelado como um único
 * objeto com "content" (blocos de texto) OU "items" (bullets) — normalize.ts valida qual dos dois
 * preencher de acordo com "kind".
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

const blockKindEnum = [
  'title-1',
  'title-2',
  'title-3',
  'subtitle',
  'body',
  'highlight',
  'section-label',
  'bullets',
];

export const blockSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: blockKindEnum },
    align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
    content: richTextSchema,
    items: { type: 'array', items: richTextSchema },
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
