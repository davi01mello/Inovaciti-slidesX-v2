import { useMemo, useSyncExternalStore } from 'react';
import { createId } from '@/lib/id';
import { loadJson, saveJson } from '@/lib/storage';
import { cloneBlock, makeFloatingTextBlock, makeTextBlock, type FloatingTextKind } from '@/lib/blocks';
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

/** Proporção do palco — o rect é normalizado, então converter entre eixos passa por aqui. */
const STAGE_ASPECT = 16 / 9;

/**
 * Elementos da marca são artes QUADRADAS. Eles já foram salvos com rects
 * quadrados em coordenadas normalizadas (0.18 x 0.18), que num palco 16:9
 * viram um retângulo deitado — na época a arte era só encaixada dentro dele
 * (object-contain), então parecia certo. Agora a arte ocupa o rect inteiro
 * (é o que faz esticar um lado ter efeito), então o rect legado é reescrito
 * pro tamanho que a arte de fato ocupava, no mesmo centro.
 */
function migrateDecorationRects(pres: Presentation): Presentation {
  let changed = false;
  const slides = pres.slides.map((slide) => {
    if (!slide.decorations?.length) return slide;
    const decorations = slide.decorations.map((d) => {
      if (d.src) return d; // upload: o rect já carrega a proporção real da foto
      const artSide = Math.min(d.rect.width * STAGE_ASPECT, d.rect.height);
      const width = artSide / STAGE_ASPECT;
      const height = artSide;
      if (Math.abs(width - d.rect.width) < 0.001 && Math.abs(height - d.rect.height) < 0.001) return d;
      changed = true;
      return {
        ...d,
        rect: clampRect({
          x: d.rect.x + d.rect.width / 2 - width / 2,
          y: d.rect.y + d.rect.height / 2 - height / 2,
          width,
          height,
        }),
      };
    });
    return { ...slide, decorations };
  });
  return changed ? { ...pres, slides } : pres;
}

function loadInitial(): PresentationsState {
  const stored = loadJson<PresentationsState>(STORAGE_KEY);
  if (stored && Array.isArray(stored.presentations)) {
    // Faxina da Lixeira no boot: purga o que passou do período de retenção.
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return {
      presentations: stored.presentations
        .filter((p) => !p.deletedAt || p.deletedAt > cutoff)
        .map(migrateDecorationRects),
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

/* --------------------------------------------------------------------------
 * Histórico de undo/redo — por apresentação, em memória (nunca persiste).
 * Cada mutação de conteúdo grava um snapshot dos slides ANTES de acontecer.
 * Gestos contínuos (arrastar caixa, redimensionar elemento) chamam a mesma
 * ação dezenas de vezes por segundo: a chave + janela de tempo colapsa tudo
 * numa entrada só, então um Ctrl+Z desfaz o gesto inteiro, não um pixel.
 * ------------------------------------------------------------------------ */

interface History {
  undo: Slide[][];
  redo: Slide[][];
}

const histories = new Map<string, History>();
let lastGesture: { pid: string; key: string; at: number } | null = null;
const HISTORY_LIMIT = 60;
const GESTURE_WINDOW_MS = 900;

function historyFor(pid: string): History {
  let history = histories.get(pid);
  if (!history) {
    history = { undo: [], redo: [] };
    histories.set(pid, history);
  }
  return history;
}

/** Grava o estado atual dos slides como ponto de retorno da ação `key`. */
function recordHistory(pid: string, key: string): void {
  const pres = state.presentations.find((p) => p.id === pid);
  if (!pres) return;
  const now = Date.now();
  if (lastGesture && lastGesture.pid === pid && lastGesture.key === key && now - lastGesture.at < GESTURE_WINDOW_MS) {
    // Continuação do mesmo gesto: a entrada existente já guarda o estado pré-gesto.
    lastGesture.at = now;
    return;
  }
  lastGesture = { pid, key, at: now };
  const history = historyFor(pid);
  history.undo.push(structuredClone(pres.slides));
  if (history.undo.length > HISTORY_LIMIT) history.undo.shift();
  history.redo = [];
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
  addFloatingText(id: string, slideId: string, kind: FloatingTextKind, at?: { x: number; y: number }): string;
  deleteBlock(id: string, slideId: string, blockId: string): void;
  undo(id: string): void;
  redo(id: string): void;
  canUndo(id: string): boolean;
  canRedo(id: string): boolean;
  addDecoration(id: string, slideId: string, assetKey: string, at?: { x: number; y: number }): string;
  addImageDecoration(
    id: string,
    slideId: string,
    image: { src: string; width: number; height: number },
    at?: { x: number; y: number },
  ): string;
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
    recordHistory(id, 'add-slide');
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
    recordHistory(id, `duplicate-slide:${slideId}`);
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
    recordHistory(id, `delete-slide:${slideId}`);
    updatePresentation(id, (p) => {
      if (p.slides.length <= 1) return p;
      return { ...p, slides: p.slides.filter((s) => s.id !== slideId) };
    });
  },

  reorderSlide(id, slideId, targetIndex) {
    recordHistory(id, `reorder-slide:${slideId}`);
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
    recordHistory(id, `improve:${slideId}:${Date.now()}`);
    updatePresentation(id, (p) => ({
      ...p,
      slides: p.slides.map((s) => (s.id === slideId ? applyGeneratedBlocksToSlide(s, blocks) : s)),
    }));
  },

  updateBlock(id, slideId, blockId, patch) {
    // Arrastar/redimensionar dispara isso dezenas de vezes: a chave por
    // bloco+campo colapsa o gesto numa entrada só do histórico.
    recordHistory(id, `block:${blockId}:${'rect' in patch ? 'rect' : 'content'}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.id === blockId ? mergeBlockPatch(b, patch) : b)),
      })),
    );
  },

  addFloatingText(id, slideId, kind, at?) {
    const pres = state.presentations.find((p) => p.id === id);
    const slide = pres?.slides.find((s) => s.id === slideId);
    const floatingCount = slide?.blocks.filter((b) => b.kind !== 'bullets' && b.floating).length ?? 0;
    const newBlock = makeFloatingTextBlock(kind, floatingCount, at);
    recordHistory(id, `add-text:${newBlock.id}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({ ...s, blocks: [...s.blocks, newBlock] })),
    );
    return newBlock.id;
  },

  deleteBlock(id, slideId, blockId) {
    recordHistory(id, `delete-block:${blockId}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => {
        const target = s.blocks.find((b) => b.id === blockId);
        if (!target) return s;
        // Caixas livres sempre podem sair; do fluxo do template fica ao menos um bloco.
        const isFloating = target.kind !== 'bullets' && !!target.floating;
        if (!isFloating && s.blocks.filter((b) => b.kind === 'bullets' || !b.floating).length <= 1) return s;
        return { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) };
      }),
    );
  },

  undo(id) {
    const history = historyFor(id);
    const snapshot = history.undo.pop();
    if (!snapshot) return;
    const pres = state.presentations.find((p) => p.id === id);
    if (!pres) return;
    history.redo.push(structuredClone(pres.slides));
    lastGesture = null;
    updatePresentation(id, (p) => ({ ...p, slides: snapshot }));
  },

  redo(id) {
    const history = historyFor(id);
    const snapshot = history.redo.pop();
    if (!snapshot) return;
    const pres = state.presentations.find((p) => p.id === id);
    if (!pres) return;
    history.undo.push(structuredClone(pres.slides));
    lastGesture = null;
    updatePresentation(id, (p) => ({ ...p, slides: snapshot }));
  },

  canUndo(id) {
    return (histories.get(id)?.undo.length ?? 0) > 0;
  },

  canRedo(id) {
    return (histories.get(id)?.redo.length ?? 0) > 0;
  },

  addDecoration(id, slideId, assetKey, at?) {
    recordHistory(id, 'add-decoration');
    // Arrastado do dock, nasce onde soltou. Clicado, cai no centro com um
    // deslocamento por elemento existente — inserir vários seguidos não empilha.
    const pres = state.presentations.find((p) => p.id === id);
    const slide = pres?.slides.find((s) => s.id === slideId);
    const count = slide?.decorations?.length ?? 0;
    const size = 0.18;
    // O palco é 16:9: mesma fração nos dois eixos sairia achatada, então a
    // altura compensa a proporção e o elemento nasce quadrado de verdade.
    const height = size * (16 / 9);
    const offset = (count % 5) * 0.03;
    const rect = at
      ? { x: at.x - size / 2, y: at.y - height / 2, width: size, height }
      : { x: 0.41 + offset, y: 0.5 - height / 2 + offset, width: size, height };
    const decoration: Decoration = {
      id: createId(),
      assetKey,
      rect: clampRect(rect),
    };
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        decorations: [...(s.decorations ?? []), decoration],
      })),
    );
    return decoration.id;
  },

  addImageDecoration(id, slideId, image, at) {
    recordHistory(id, 'add-image');
    // O rect vive em frações de um palco 16:9 — converte a proporção real da
    // imagem (px) pra fração de largura equivalente, senão a área clicável fica
    // esticada em volta da foto (object-contain esconde, mas o hit-area entrega).
    const aspect = image.height > 0 ? image.width / image.height : 1;
    let heightFrac = 0.42;
    let widthFrac = aspect * heightFrac * (9 / 16);
    if (widthFrac > 0.55) {
      heightFrac *= 0.55 / widthFrac;
      widthFrac = 0.55;
    }
    const center = at ?? { x: 0.5, y: 0.5 };
    const decoration: Decoration = {
      id: createId(),
      assetKey: 'upload',
      src: image.src,
      rect: clampRect({
        x: Math.min(Math.max(center.x - widthFrac / 2, 0), 1 - widthFrac),
        y: Math.min(Math.max(center.y - heightFrac / 2, 0), 1 - heightFrac),
        width: widthFrac,
        height: heightFrac,
      }),
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
    recordHistory(id, `deco:${decorationId}`);
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
    recordHistory(id, `remove-deco:${decorationId}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        decorations: (s.decorations ?? []).filter((d) => d.id !== decorationId),
      })),
    );
  },

  setContentZone(id, slideId, rect) {
    recordHistory(id, `zone:${slideId}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({ ...s, contentZoneOverride: clampRect(rect) })),
    );
  },

  resetContentZone(id, slideId) {
    recordHistory(id, `zone-reset:${slideId}`);
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
    histories.delete(id);
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
