import { createId } from '@/lib/id';
import { fromGeneratedSlide, toGeneratedSlide } from '@/lib/generatedSlide';
import type { ChatMessage } from '@/types/chat';
import type { DraftAsset, PresentationGoal, VisualStyle } from '@/types/creation';
import type { GeneratedBlock, GeneratedSlide } from '@/types/generated';
import type { Slide } from '@/types/slide';

/** Categorias de falha que o front trata de forma diferente (toast, retry, orientação). */
export type AiErrorCategory = 'network' | 'timeout' | 'rate_limit' | 'bad_response' | 'server' | 'unavailable';

/** Erro "amigável" pra mostrar direto na UI (chat, toast, etc.), a mensagem já vem pronta em pt-BR. */
export class AiClientError extends Error {
  readonly category: AiErrorCategory;

  constructor(message: string, category: AiErrorCategory = 'server') {
    super(message);
    this.name = 'AiClientError';
    this.category = category;
  }
}

const GENERIC_ERROR = 'Deu erro por aqui. Tenta de novo em instantes.';

const KNOWN_CATEGORIES: readonly AiErrorCategory[] = ['network', 'timeout', 'rate_limit', 'bad_response', 'server', 'unavailable'];

function categoryFromStatus(status: number, serverCategory: string | null): AiErrorCategory {
  if (serverCategory && (KNOWN_CATEGORIES as readonly string[]).includes(serverCategory)) {
    return serverCategory as AiErrorCategory;
  }
  if (status === 504) return 'timeout';
  if (status === 429 || status === 503) return 'rate_limit';
  if (status === 502) return 'bad_response';
  return 'server';
}

async function fetchOnce(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetchOnce(path, body);
  } catch {
    // Falha de rede: uma nova tentativa silenciosa antes de desistir (a request
    // provavelmente nem chegou no servidor, e o backend deduplica jobs de imagem).
    try {
      res = await fetchOnce(path, body);
    } catch {
      throw new AiClientError(
        'Não consegui falar com o servidor. Confere se a API está rodando (ver api/README.md).',
        'network',
      );
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: unknown; category?: unknown } | null;
    const message = data && typeof data.error === 'string' ? data.error : null;
    const serverCategory = data && typeof data.category === 'string' ? data.category : null;
    throw new AiClientError(message || GENERIC_ERROR, categoryFromStatus(res.status, serverCategory));
  }

  return (await res.json()) as T;
}

interface GenerateResponse {
  title?: string;
  slides: GeneratedSlide[];
  chat: string[];
}

export interface GeneratePresentationResult {
  /** Nome curto da apresentação, batizado pela IA (vazio se o modelo não mandou). */
  title: string;
  slides: Slide[];
  chatMessages: ChatMessage[];
}

export async function generatePresentation(params: {
  idea: string;
  /** Quantidade exata de slides escolhida no wizard. */
  slideCount: number;
  goal: PresentationGoal;
  /** Público em texto livre. Vazio significa "deduza da ideia". */
  audience: string;
  style: VisualStyle;
  assets: DraftAsset[];
}): Promise<GeneratePresentationResult> {
  const data = await postJson<GenerateResponse>('/api/presentations/generate', {
    idea: params.idea,
    slideCount: params.slideCount,
    goal: params.goal,
    audience: params.audience,
    style: params.style,
    assets: params.assets.map((a) => ({ name: a.name, kind: a.kind })),
  });

  if (data.slides.length === 0) {
    throw new AiClientError('Não consegui montar os slides dessa vez. Tenta gerar de novo.');
  }

  const now = Date.now();
  return {
    title: typeof data.title === 'string' ? data.title.trim().slice(0, 60) : '',
    slides: data.slides.map(fromGeneratedSlide),
    chatMessages: data.chat.map((text, i) => ({
      id: createId(),
      author: 'ai' as const,
      text,
      createdAt: now + i,
    })),
  };
}

/** Presente quando o pedido do usuário virou uma edição de verdade em UM slide (ver api/src/intelligence/chat.ts). */
export interface ChatEdit {
  /** 1-based, no mesmo índice do array `slides` mandado na request (slideIndex - 1). */
  slideIndex: number;
  instruction: string;
}

export interface ChatReply {
  reply: string;
  edit?: ChatEdit;
}

interface ChatResponse {
  reply: string;
  edit?: ChatEdit;
}

/** Imagem anexada no chat, já reduzida pelo front, pronta pra ir inline pro modelo. */
export interface ChatImagePayload {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export async function sendChatMessage(params: {
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slides: Slide[];
  history: ChatMessage[];
  message: string;
  attachments?: ChatImagePayload[];
  /** Slide aberto no editor no momento (1-based) -- resolve "esse slide"/"aqui" sem o usuário dizer o número. */
  currentSlideIndex?: number;
}): Promise<ChatReply> {
  const data = await postJson<ChatResponse>('/api/chat', {
    idea: params.idea,
    goal: params.goal,
    style: params.style,
    slides: params.slides.map(toGeneratedSlide),
    history: params.history.map((m) => ({ author: m.author, text: m.text })),
    message: params.message,
    attachments: params.attachments ?? [],
    currentSlideIndex: params.currentSlideIndex,
  });
  return { reply: data.reply, edit: data.edit };
}

interface ImproveResponse {
  blocks: GeneratedBlock[];
}

export async function improveSlideRemote(params: {
  idea: string;
  goal: PresentationGoal;
  style: VisualStyle;
  slide: Slide;
  otherSlides: Slide[];
  /** Instrução concreta (veio do chat). Ausente = pedido genérico de "ângulo novo". */
  instruction?: string;
}): Promise<GeneratedBlock[]> {
  const data = await postJson<ImproveResponse>('/api/slides/improve', {
    idea: params.idea,
    goal: params.goal,
    style: params.style,
    slide: toGeneratedSlide(params.slide),
    otherSlides: params.otherSlides.map(toGeneratedSlide),
    instruction: params.instruction,
  });
  if (data.blocks.length === 0) {
    throw new AiClientError('Não consegui melhorar esse slide dessa vez. Tenta de novo.');
  }
  return data.blocks;
}
