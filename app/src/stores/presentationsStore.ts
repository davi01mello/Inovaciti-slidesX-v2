import { useMemo, useSyncExternalStore } from 'react';
import { createId } from '@/lib/id';
import { loadJson, saveJson } from '@/lib/storage';
import { cloneBlock, makeEmptyBlockOfKind, makeTextBlock } from '@/lib/blocks';
import { clampRect } from '@/lib/rect';
import { applyGeneratedBlocksToSlide } from '@/lib/generatedSlide';
import { AiClientError, generatePresentation, improveSlideRemote } from '@/services/aiClient';
import type { CreationDraft } from '@/types/creation';
import type { ChatMessage } from '@/types/chat';
import type { Presentation, PresentationStatus } from '@/types/presentation';
import type { Block, BlockRect, Decoration, Slide, SlideLayout } from '@/types/slide';

const STORAGE_KEY = 'citi-slides:presentations:v3';

/** Itens na Lixeira são apagados de vez depois disso (a UI da Lixeira mostra a contagem). */
export const TRASH_RETENTION_DAYS = 30;

interface PresentationsState {
  presentations: Presentation[];
}

type Listener = () => void;

function loadInitial(): PresentationsState {
  const stored = loadJson<PresentationsState>(STORAGE_KEY);
  if (stored && Array.isArray(stored.presentations)) {
    // Faxina da Lixeira no boot: purga o que passou do período de retenção.
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return {
      presentations: stored.presentations.filter((p) => !p.deletedAt || p.deletedAt > cutoff),
    };
  }
  return { presentations: [] };
}

let state: PresentationsState = loadInitial();
const listeners = new Set<Listener>();

function emit() {
  saveJson(STORAGE_KEY, state);
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState(): PresentationsState {
  return state;
}

function updatePresentation(id: string, patch: (p: Presentation) => Presentation): void {
  const now = Date.now();
  state = {
    ...state,
    presentations: state.presentations.map((p) => (p.id === id ? { ...patch(p), updatedAt: now } : p)),
  };
  emit();
}

function updateSlideInPresentation(pres: Presentation, slideId: string, patch: (s: Slide) => Slide): Presentation {
  return { ...pres, slides: pres.slides.map((s) => (s.id === slideId ? patch(s) : s)) };
}

/** Nome temporário enquanto a IA gera o storyboard (e batiza a apresentação). */
const PLACEHOLDER_TITLE = 'Nova Apresentação';
/** Título nunca passa disso — o header limita igual. */
const TITLE_MAX_LENGTH = 60;

function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function sanitizeTitle(raw: string): string {
  return capitalizeFirst(raw.trim().slice(0, TITLE_MAX_LENGTH).trim());
}

/** Dispara a geração real (Gemini) e popula a apresentação quando a resposta chegar.
 * Roda em background — createFromDraft/retryGeneration retornam antes disso terminar. */
async function runGeneration(id: string): Promise<void> {
  const pres = state.presentations.find((p) => p.id === id);
  if (!pres) return;
  try {
    const result = await generatePresentation({
      idea: pres.meta.idea,
      size: pres.meta.size,
      style: pres.meta.style,
      assets: pres.meta.assets,
    });
    if (!state.presentations.some((p) => p.id === id)) return; // apresentação pode ter sido apagada nesse meio tempo

    const firstBubble = result.chatMessages[0];
    const aiTitle = sanitizeTitle(result.title);
    updatePresentation(id, (p) => ({
      ...p,
      // A IA batiza a apresentação — a menos que o usuário já tenha renomeado no meio tempo.
      title: aiTitle && p.title === PLACEHOLDER_TITLE ? aiTitle : p.title,
      // Com a composição por template, o slide nasce pronto pra apresentar:
      // não existe mais a etapa de "gerar versão final" em imagem.
      status: 'ready',
      slides: result.slides,
      chat: firstBubble ? [firstBubble] : [],
      generationError: undefined,
    }));

    // Escalona as bolhas seguintes do chat pra dar a sensação de "alguém digitando".
    result.chatMessages.slice(1).forEach((message, index) => {
      window.setTimeout(() => {
        if (!state.presentations.some((p) => p.id === id)) return;
        updatePresentation(id, (p) => ({ ...p, chat: [...p.chat, message] }));
      }, 900 * (index + 1));
    });
  } catch (err) {
    if (!state.presentations.some((p) => p.id === id)) return;
    const message = err instanceof AiClientError ? err.message : 'Deu erro ao gerar a apresentação.';
    updatePresentation(id, (p) => ({ ...p, status: 'draft', generationError: message }));
  }
}

export interface PresentationsApi {
  createFromDraft(draft: CreationDraft): string;
  retryGeneration(id: string): void;
  updateTitle(id: string, title: string): void;
  addSlide(id: string, afterSlideId: string | null, layout?: SlideLayout): string;
  duplicateSlide(id: string, slideId: string): string;
  improveSlide(id: string, slideId: string): Promise<void>;
  deleteSlide(id: string, slideId: string): void;
  reorderSlide(id: string, slideId: string, targetIndex: number): void;
  updateBlock(id: string, slideId: string, blockId: string, patch: Partial<Block>): void;
  moveBlock(id: string, slideId: string, blockId: string, rect: BlockRect): void;
  insertBlockAt(id: string, slideId: string, kind: Block['kind'], rect: BlockRect): string;
  insertBlockAfter(id: string, slideId: string, afterBlockId: string | null, kind: Block['kind']): string;
  deleteBlock(id: string, slideId: string, blockId: string): void;
  reorderBlock(id: string, slideId: string, blockId: string, targetIndex: number): void;
  changeBlockKind(id: string, slideId: string, blockId: string, kind: Block['kind']): void;
  addDecoration(id: string, slideId: string, assetKey: string): string;
  updateDecoration(id: string, slideId: string, decorationId: string, patch: Partial<Decoration>): void;
  moveDecoration(id: string, slideId: string, decorationId: string, rect: BlockRect): void;
  removeDecoration(id: string, slideId: string, decorationId: string): void;
  setContentZone(id: string, slideId: string, rect: BlockRect): void;
  resetContentZone(id: string, slideId: string): void;
  appendChatMessage(id: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage;
  setStatus(id: string, status: PresentationStatus): void;
  duplicate(id: string): string | null;
  moveToTrash(id: string): void;
  restoreFromTrash(id: string): void;
  purge(id: string): void;
  emptyTrash(): void;
  get(id: string): Presentation | null;
}

export const presentationsStore = {
  subscribe,
  getState,

  createFromDraft(draft: CreationDraft): string {
    const id = createId();
    const now = Date.now();
    const size = draft.size ?? 'balanced';
    const style = draft.style ?? 'balanced';
    // Cria o "casco" da apresentação na hora (navegação instantânea pro workspace, igual antes) e
    // dispara a geração real em background — o workspace mostra um estado de carregamento até
    // status sair de 'generating' (ver WorkspacePage).
    const presentation: Presentation = {
      id,
      title: PLACEHOLDER_TITLE,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
      meta: { idea: draft.idea, size, style, assets: draft.assets },
      slides: [],
      chat: [],
    };
    state = { ...state, presentations: [presentation, ...state.presentations] };
    emit();

    void runGeneration(id);

    return id;
  },

  retryGeneration(id) {
    updatePresentation(id, (p) => ({ ...p, status: 'generating', generationError: undefined }));
    void runGeneration(id);
  },

  updateTitle(id, title) {
    const clean = sanitizeTitle(title);
    updatePresentation(id, (p) => ({ ...p, title: clean === '' ? 'Sem Título' : clean }));
  },

  addSlide(id, afterSlideId, layout = 'content') {
    const newSlide: Slide = {
      id: createId(),
      layout,
      blocks: [makeTextBlock('title-2', 'Novo slide')],
    };
    updatePresentation(id, (p) => {
      const index = afterSlideId ? p.slides.findIndex((s) => s.id === afterSlideId) : p.slides.length - 1;
      const insertAt = index === -1 ? p.slides.length : index + 1;
      const next = [...p.slides];
      next.splice(insertAt, 0, newSlide);
      return { ...p, slides: next };
    });
    return newSlide.id;
  },

  duplicateSlide(id, slideId) {
    let copyId = '';
    updatePresentation(id, (p) => {
      const index = p.slides.findIndex((s) => s.id === slideId);
      if (index === -1) return p;
      const source = p.slides[index];
      if (!source) return p;
      const copy: Slide = {
        id: createId(),
        layout: source.layout,
        blocks: source.blocks.map((b) => cloneBlock(b)),
        decorations: source.decorations?.map((d) => ({ ...d, id: createId() })),
      };
      copyId = copy.id;
      const next = [...p.slides];
      next.splice(index + 1, 0, copy);
      return { ...p, slides: next };
    });
    return copyId;
  },

  deleteSlide(id, slideId) {
    updatePresentation(id, (p) => {
      if (p.slides.length <= 1) return p;
      return { ...p, slides: p.slides.filter((s) => s.id !== slideId) };
    });
  },

  reorderSlide(id, slideId, targetIndex) {
    updatePresentation(id, (p) => {
      const from = p.slides.findIndex((s) => s.id === slideId);
      if (from === -1) return p;
      const clamped = Math.max(0, Math.min(targetIndex, p.slides.length - 1));
      if (from === clamped) return p;
      const next = [...p.slides];
      const [item] = next.splice(from, 1);
      if (!item) return p;
      next.splice(clamped, 0, item);
      return { ...p, slides: next };
    });
  },

  async improveSlide(id, slideId) {
    const pres = state.presentations.find((p) => p.id === id);
    const slide = pres?.slides.find((s) => s.id === slideId);
    if (!pres || !slide) return;
    const otherSlides = pres.slides.filter((s) => s.id !== slideId);
    const blocks = await improveSlideRemote({
      idea: pres.meta.idea,
      size: pres.meta.size,
      style: pres.meta.style,
      slide,
      otherSlides,
    });
    updatePresentation(id, (p) => ({
      ...p,
      slides: p.slides.map((s) => (s.id === slideId ? applyGeneratedBlocksToSlide(s, blocks) : s)),
    }));
  },

  updateBlock(id, slideId, blockId, patch) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === blockId ? mergeBlockPatch(b, patch) : b)),
      })),
    );
  },

  moveBlock(id, slideId, blockId, rect) {
    this.updateBlock(id, slideId, blockId, { rect: clampRect(rect) } as Partial<Block>);
  },

  insertBlockAt(id, slideId, kind, rect) {
    const newBlock = kind === 'bullets'
      ? { ...makeEmptyBlockOfKind(kind), rect: clampRect(rect) }
      : { ...makeEmptyBlockOfKind(kind), rect: clampRect(rect) };
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({ ...s, blocks: [...s.blocks, newBlock] })),
    );
    return newBlock.id;
  },

  insertBlockAfter(id, slideId, afterBlockId, kind) {
    // Offset the default rect proportionally to how many blocks of the same kind
    // already exist, so consecutive inserts don't stack directly on top of each other.
    const pres = state.presentations.find((p) => p.id === id);
    const slide = pres?.slides.find((s) => s.id === slideId);
    const sameKindCount = slide?.blocks.filter((b) => b.kind === kind).length ?? 0;
    const newBlock = makeEmptyBlockOfKind(kind, sameKindCount);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => {
        const index = afterBlockId ? s.blocks.findIndex((b) => b.id === afterBlockId) : s.blocks.length - 1;
        const insertAt = index === -1 ? s.blocks.length : index + 1;
        const next = [...s.blocks];
        next.splice(insertAt, 0, newBlock);
        return { ...s, blocks: next };
      }),
    );
    return newBlock.id;
  },

  deleteBlock(id, slideId, blockId) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => {
        if (s.blocks.length <= 1) return s;
        return { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) };
      }),
    );
  },

  reorderBlock(id, slideId, blockId, targetIndex) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => {
        const from = s.blocks.findIndex((b) => b.id === blockId);
        if (from === -1) return s;
        const clamped = Math.max(0, Math.min(targetIndex, s.blocks.length - 1));
        if (from === clamped) return s;
        const next = [...s.blocks];
        const [item] = next.splice(from, 1);
        if (!item) return s;
        next.splice(clamped, 0, item);
        return { ...s, blocks: next };
      }),
    );
  },

  changeBlockKind(id, slideId, blockId, kind) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        blocks: s.blocks.map((b) => {
          if (b.id !== blockId) return b;
          if (b.kind === kind) return b;
          const rect = b.rect;
          if (kind === 'bullets') {
            const items = b.kind === 'bullets' ? b.items : b.content.length > 0 ? [b.content] : [[]];
            return { id: b.id, kind: 'bullets', align: b.align, items, rect };
          }
          const content = b.kind === 'bullets' ? b.items[0] ?? [] : b.content;
          return { id: b.id, kind, align: b.align, content, rect };
        }),
      })),
    );
  },

  addDecoration(id, slideId, assetKey) {
    // Empilha os novos elementos com um pequeno deslocamento — inserir vários seguidos
    // não deixa todos exatamente empilhados no centro.
    const pres = state.presentations.find((p) => p.id === id);
    const slide = pres?.slides.find((s) => s.id === slideId);
    const count = slide?.decorations?.length ?? 0;
    const offset = (count % 5) * 0.03;
    const size = 0.18;
    const decoration: Decoration = {
      id: createId(),
      assetKey,
      rect: clampRect({ x: 0.41 + offset, y: 0.41 + offset, width: size, height: size }),
    };
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        decorations: [...(s.decorations ?? []), decoration],
      })),
    );
    return decoration.id;
  },

  updateDecoration(id, slideId, decorationId, patch) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        decorations: (s.decorations ?? []).map((d) =>
          d.id === decorationId
            ? { ...d, ...patch, rect: patch.rect ? clampRect(patch.rect) : d.rect }
            : d,
        ),
      })),
    );
  },

  moveDecoration(id, slideId, decorationId, rect) {
    this.updateDecoration(id, slideId, decorationId, { rect });
  },

  removeDecoration(id, slideId, decorationId) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        decorations: (s.decorations ?? []).filter((d) => d.id !== decorationId),
      })),
    );
  },

  setContentZone(id, slideId, rect) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({ ...s, contentZoneOverride: clampRect(rect) })),
    );
  },

  resetContentZone(id, slideId) {
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({ ...s, contentZoneOverride: undefined })),
    );
  },

  appendChatMessage(id, message) {
    const full: ChatMessage = { id: createId(), createdAt: Date.now(), ...message };
    updatePresentation(id, (p) => ({ ...p, chat: [...p.chat, full] }));
    return full;
  },

  setStatus(id, status) {
    updatePresentation(id, (p) => ({ ...p, status }));
  },

  /** Cópia profunda com ids novos em slides e blocos. */
  duplicate(id) {
    const source = state.presentations.find((p) => p.id === id);
    if (!source) return null;
    const now = Date.now();
    const copy: Presentation = {
      ...source,
      id: createId(),
      title: `${source.title} (cópia)`,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
      slides: source.slides.map((s) => ({
        ...s,
        id: createId(),
        blocks: s.blocks.map((b) => cloneBlock(b)),
        decorations: s.decorations?.map((d) => ({ ...d, id: createId() })),
      })),
      chat: source.chat.map((m) => ({ ...m })),
    };
    state = { ...state, presentations: [copy, ...state.presentations] };
    emit();
    return copy.id;
  },

  moveToTrash(id) {
    updatePresentation(id, (p) => ({ ...p, deletedAt: Date.now() }));
  },

  restoreFromTrash(id) {
    updatePresentation(id, (p) => ({ ...p, deletedAt: undefined }));
  },

  purge(id) {
    state = { ...state, presentations: state.presentations.filter((p) => p.id !== id) };
    emit();
  },

  emptyTrash() {
    state = { ...state, presentations: state.presentations.filter((p) => !p.deletedAt) };
    emit();
  },

  get(id) {
    return state.presentations.find((p) => p.id === id) ?? null;
  },
} satisfies PresentationsApi & { subscribe: typeof subscribe; getState: typeof getState };

function mergeBlockPatch(block: Block, patch: Partial<Block>): Block {
  const alignPatch: { align?: Block['align'] } =
    'align' in patch && patch.align ? { align: patch.align } : {};
  const rectPatch: { rect?: BlockRect } = 'rect' in patch && patch.rect ? { rect: clampRect(patch.rect) } : {};
  if (block.kind === 'bullets') {
    const p = patch as Partial<Block> & { items?: (typeof block)['items'] };
    return { ...block, ...alignPatch, ...rectPatch, ...(p.items ? { items: p.items } : {}) };
  }
  const p = patch as Partial<Block> & { content?: (typeof block)['content'] };
  return { ...block, ...alignPatch, ...rectPatch, ...(p.content ? { content: p.content } : {}) };
}

/** Apresentações ativas (fora da Lixeira), da mais recente pra mais antiga. */
export function usePresentations(): Presentation[] {
  const snapshot = useSyncExternalStore(presentationsStore.subscribe, presentationsStore.getState);
  return useMemo(() => snapshot.presentations.filter((p) => !p.deletedAt), [snapshot]);
}

/** Conteúdo da Lixeira, do apagado mais recentemente pro mais antigo. */
export function useTrashedPresentations(): Presentation[] {
  const snapshot = useSyncExternalStore(presentationsStore.subscribe, presentationsStore.getState);
  return useMemo(
    () =>
      snapshot.presentations
        .filter((p) => p.deletedAt)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [snapshot],
  );
}

export function usePresentation(id: string | undefined): Presentation | null {
  const snapshot = useSyncExternalStore(presentationsStore.subscribe, presentationsStore.getState);
  if (!id) return null;
  return snapshot.presentations.find((p) => p.id === id) ?? null;
}
