import { useMemo, useSyncExternalStore } from 'react';
import { createId } from '@/lib/id';
import { loadJson, saveJson } from '@/lib/storage';
import { pushToast } from '@/lib/toast';
import { playSound } from '@/lib/sound';
import { cloneBlock, makeFloatingTextBlock, makeTextBlock, type FloatingTextKind } from '@/lib/blocks';
import { clampRect } from '@/lib/rect';
import { applyGeneratedBlocksToSlide } from '@/lib/generatedSlide';
import { AiClientError, generatePresentation, improveSlideRemote } from '@/services/aiClient';
import { clampTone, DEFAULT_TONE } from '@/services/tone';
import { emptiestCorner, composeArtAs } from '@/services/artZones';
import { artById, planDeckArt } from '@/services/deckArt';
import { deckRoles } from '@/services/slideArchetype';
import type { LoadedImage } from '@/lib/imageFile';
import type { CreationDraft, DraftAsset } from '@/types/creation';
import type { ChatMessage } from '@/types/chat';
import type { Presentation, PresentationStatus } from '@/types/presentation';
import {
  isListBlock,
  MAX_CARDS,
  MAX_COMPARE_POINTS,
  MAX_STATS,
  MAX_STEPS,
  MAX_TOPICS,
  type Block,
  type BlockRect,
  type CompareSide,
  type Decoration,
  type Slide,
  type SlideBrandMark,
  type SlideLayout,
  type StatItem,
  type TopicsBlock,
  type ZoneKey,
} from '@/types/slide';

// v4: cards e tópicos viraram tipos DIFERENTES (antes era tudo "bullets"), e o
// deck ganhou `tone`. Os decks v3 são migrados na leitura, não descartados.
const STORAGE_KEY = 'citi-slides:presentations:v3';

/** Itens na Lixeira são apagados de vez depois disso (a UI da Lixeira mostra a contagem). */
export const TRASH_RETENTION_DAYS = 30;

/**
 * localStorage é por navegador/máquina — não tem limpeza de servidor. Sem um teto,
 * a lista ativa cresce pra sempre até estourar a cota do navegador. Passou disso,
 * a mais antiga cai pra Lixeira (não é apagada na hora: ainda dá pra restaurar ou
 * exportar pro Canva dentro do TRASH_RETENTION_DAYS).
 */
export const ACTIVE_PRESENTATIONS_LIMIT = 20;

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

/**
 * Decks antigos: "bullets" viravam cinco caixotes empilhados, que é o defeito que
 * este trabalho veio consertar. Um bullet legado é uma LINHA, então ele vira o que
 * sempre foi: um TÓPICO (lista leve, sem caixa), no teto de 5.
 *
 * Migrar em vez de descartar: o deck do usuário é dele.
 */
function migrateBlocks(pres: Presentation): Presentation {
  let changed = false;

  const slides = pres.slides.map((slide) => {
    const blocks = slide.blocks.map((block): Block => {
      // O bloco legado NÃO satisfaz o tipo Block novo (ele tinha "bullets" e rect
      // obrigatório), então a migração trabalha em cima do formato cru.
      const legacy = block as unknown as {
        id: string;
        kind: string;
        align: Block['align'];
        items?: unknown[];
        content?: unknown;
        rect?: BlockRect;
        floating?: boolean;
      };

      if (legacy.kind === 'bullets') {
        changed = true;
        return {
          id: legacy.id,
          kind: 'topics',
          align: legacy.align,
          items: ((legacy.items ?? []) as TopicsBlock['items']).slice(0, MAX_TOPICS),
        };
      }

      // O rect de um bloco do FLUXO era decoração morta: o motor de zonas nunca o leu.
      if (legacy.kind !== 'cards' && legacy.kind !== 'topics' && legacy.rect && !legacy.floating) {
        changed = true;
        const { rect: _rect, ...rest } = legacy;
        return rest as unknown as Block;
      }

      return block;
    });
    return { ...slide, blocks };
  });

  const tone = typeof pres.tone === 'number' ? clampTone(pres.tone) : DEFAULT_TONE;
  if (!changed && tone === pres.tone) return pres;
  return { ...pres, tone, slides };
}

function loadInitial(): PresentationsState {
  const stored = loadJson<PresentationsState>(STORAGE_KEY);
  if (stored && Array.isArray(stored.presentations)) {
    // Faxina da Lixeira no boot: purga o que passou do período de retenção.
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return {
      presentations: stored.presentations
        .filter((p) => !p.deletedAt || p.deletedAt > cutoff)
        .map(migrateDecorationRects)
        .map(migrateBlocks),
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

/**
 * Mantém só as ACTIVE_PRESENTATIONS_LIMIT mais recentes (por updatedAt, mesmo
 * critério do sort "Recentes" da biblioteca) fora da Lixeira. O excedente cai pra
 * Lixeira — não some na hora, e a pessoa é avisada pra exportar pro Canva antes do
 * prazo de retenção acabar. Roda depois de qualquer ação que possa fazer a lista
 * ativa crescer (criar, duplicar, restaurar da lixeira).
 */
function enforceActiveLimit(): void {
  const active = state.presentations.filter((p) => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
  if (active.length <= ACTIVE_PRESENTATIONS_LIMIT) return;

  const overflow = active.slice(ACTIVE_PRESENTATIONS_LIMIT);
  const overflowIds = new Set(overflow.map((p) => p.id));
  const now = Date.now();
  state = {
    ...state,
    presentations: state.presentations.map((p) => (overflowIds.has(p.id) ? { ...p, deletedAt: now } : p)),
  };
  emit();

  pushToast(
    overflow.length === 1
      ? '1 apresentação mais antiga foi pra Lixeira (limite de 20 ativas). Exporte pro Canva antes que ela suma de vez.'
      : `${overflow.length} apresentações mais antigas foram pra Lixeira (limite de 20 ativas). Exporte pro Canva antes que sumam de vez.`,
  );
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

/* --------------------------------------------------------------------------
 * OS ANEXOS PENDENTES.
 *
 * Os pixels ficam AQUI, em memória, entre criar a apresentação (síncrono) e a
 * geração terminar (assíncrona). Quando os slides existem, a foto vai pro slide
 * e este mapa é esvaziado. Nunca persiste: guardar a data URL no meta E no slide
 * estourava a cota do localStorage com três fotos.
 * ------------------------------------------------------------------------ */

interface PendingAssets {
  photos: LoadedImage[];
  logo?: LoadedImage;
}

const pendingAssets = new Map<string, PendingAssets>();

/** Índices igualmente espaçados: duas fotos num deck de 10 não podem cair coladas. */
function spread(count: number, take: number): number[] {
  if (take <= 0 || count <= 0) return [];
  if (take >= count) return Array.from({ length: count }, (_, i) => i);
  const step = count / take;
  return Array.from({ length: take }, (_, i) => Math.floor(i * step + step / 2));
}

/**
 * A FOTO DO USUÁRIO VIRA CONTEÚDO: ela ocupa um slide de miolo (arquétipo media).
 *
 * Só entra em slide de conteúdo SEM LISTA. Um slide com três cards já tem duas
 * colunas ocupadas; a foto seria uma terceira e nada caberia. E jamais na capa, no
 * separador ou no fecho, onde o texto é o herói e a foto brigaria com ele.
 *
 * Devolve os slides novos e quantas fotos sobraram sem lugar — sobrar é raro (o
 * prompt reserva slides de texto puro pras fotos), mas se acontecer, o usuário
 * fica sabendo em vez de a foto sumir em silêncio.
 */
function attachPhotos(slides: Slide[], photos: LoadedImage[]): { slides: Slide[]; unplaced: number } {
  if (photos.length === 0) return { slides, unplaced: 0 };

  const candidates = slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.layout === 'content' && !slide.blocks.some(isListBlock));

  const picks = spread(candidates.length, photos.length);
  const assignment = new Map<number, LoadedImage>();
  picks.forEach((candidateIndex, photoIndex) => {
    const target = candidates[candidateIndex];
    const photo = photos[photoIndex];
    if (target && photo) assignment.set(target.index, photo);
  });

  const next = slides.map((slide, index) => {
    const photo = assignment.get(index);
    return photo ? { ...slide, image: { src: photo.dataUrl, width: photo.width, height: photo.height } } : slide;
  });

  return { slides: next, unplaced: photos.length - assignment.size };
}

/**
 * O LOGO DO CLIENTE entra sozinho no canto MAIS VAZIO da arte da capa.
 *
 * A mesma grade de ocupação que decide onde o texto vai decide isto. Nenhum canto
 * é chutado, e o logo nunca cai em cima da escultura nem em cima da marca da CITi.
 */
function attachLogo(pres: Presentation, logo: LoadedImage): Slide[] {
  const cover = pres.slides.find((s) => s.layout === 'cover');
  if (!cover) return pres.slides;

  const plan = planDeckArt(pres.id, pres.tone, deckRoles(pres.slides));
  const choice = plan.get(cover.id);
  const art = choice ? artById(choice.artId) : undefined;
  if (!art || !choice) return pres.slides;

  const composition = composeArtAs(art, 'cover', choice.arrangementId);
  const corner = emptiestCorner(art, composition);

  // A moldura é a proporção real do logo, encaixada na altura do canto.
  const aspect = logo.height > 0 ? logo.width / logo.height : 1;
  const height = corner.height;
  const width = Math.min(corner.width * 1.6, height * aspect * (9 / 16));

  const decoration: Decoration = {
    id: createId(),
    assetKey: 'upload',
    src: logo.dataUrl,
    rect: clampRect({
      x: corner.x + corner.width / 2 - width / 2,
      y: corner.y + corner.height / 2 - height / 2,
      width,
      height,
    }),
  };

  return pres.slides.map((s) =>
    s.id === cover.id ? { ...s, decorations: [...(s.decorations ?? []), decoration] } : s,
  );
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
      slideCount: pres.meta.slideCount,
      goal: pres.meta.goal,
      audience: pres.meta.audience,
      style: pres.meta.style,
      assets: pres.meta.assets,
    });
    if (!state.presentations.some((p) => p.id === id)) return; // apresentação pode ter sido apagada nesse meio tempo

    const aiTitle = sanitizeTitle(result.title);
    const assets = pendingAssets.get(id);
    const { slides, unplaced } = attachPhotos(result.slides, assets?.photos ?? []);

    updatePresentation(id, (p) => {
      const withPhotos: Presentation = {
        ...p,
        // A IA batiza a apresentação — a menos que o usuário já tenha renomeado no meio tempo.
        title: aiTitle && p.title === PLACEHOLDER_TITLE ? aiTitle : p.title,
        // O slide nasce pronto pra apresentar: não existe etapa de "gerar imagem final".
        status: 'ready',
        slides,
        chat: [],
        generationError: undefined,
      };
      return assets?.logo ? { ...withPhotos, slides: attachLogo(withPhotos, assets.logo) } : withPhotos;
    });
    pendingAssets.delete(id);
    playSound('presentationReady');

    const bubbles = [...result.chatMessages];
    const placed = (assets?.photos.length ?? 0) - unplaced;
    if (placed > 0) {
      bubbles.push({
        id: createId(),
        author: 'ai',
        text:
          placed === 1
            ? 'Coloquei a sua foto num slide de miolo, com o texto ao lado dela.'
            : `Coloquei as suas ${placed} fotos em slides de miolo, cada uma com o texto ao lado.`,
        createdAt: Date.now(),
      });
    }
    // Honestidade: se uma foto não coube, a pessoa fica sabendo AGORA, não na frente do cliente.
    if (unplaced > 0) {
      bubbles.push({
        id: createId(),
        author: 'ai',
        text: `${unplaced} ${unplaced === 1 ? 'foto não entrou' : 'fotos não entraram'}: os slides que sobraram têm listas, e lista mais foto não cabe na mesma tela. Dá pra arrastar ${unplaced === 1 ? 'ela' : 'elas'} pro slide que você quiser pelo painel de imagens.`,
        createdAt: Date.now(),
      });
    }
    if (assets?.logo) {
      bubbles.push({
        id: createId(),
        author: 'ai',
        text: 'O logo que você anexou entrou no canto mais vazio da capa, com o fundo já removido.',
        createdAt: Date.now(),
      });
    }

    const firstBubble = bubbles[0];
    if (firstBubble) updatePresentation(id, (p) => ({ ...p, chat: [firstBubble] }));

    // Escalona as bolhas seguintes do chat pra dar a sensação de "alguém digitando".
    bubbles.slice(1).forEach((message, index) => {
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
  /** Ver lib/pptxImport.ts — cria a apresentação já pronta, sem passar pela IA. */
  createFromImportedPptx(title: string, slides: Slide[], skippedSlides: number): string;
  /** Arrasta a barra de cor: repinta o deck inteiro (artes + cromo) sem tocar no texto. */
  setTone(id: string, tone: number): void;
  markNotionSynced(id: string): void;
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
  setZone(id: string, slideId: string, zone: ZoneKey, rect: BlockRect | undefined): void;
  setContentZone(id: string, slideId: string, rect: BlockRect): void;
  resetContentZone(id: string, slideId: string): void;
  setBrandMark(id: string, slideId: string, mark: SlideBrandMark | undefined): void;
  /** Escolha manual do fundo deste slide (id de TemplateArt). undefined = volta ao automático. */
  setSlideArt(id: string, slideId: string, artId: string | undefined): void;
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
    const goal = draft.goal ?? 'inform';
    const style = draft.style ?? 'balanced';

    // Os PIXELS ficam em memória até os slides existirem; só a FICHA é persistida.
    // Guardar a data URL nos dois lugares estoura o localStorage (ver DraftAsset).
    pendingAssets.set(id, {
      photos: draft.assets.filter((a) => a.kind === 'image' && a.image).map((a) => a.image!),
      logo: draft.assets.find((a) => a.kind === 'logo' && a.image)?.image,
    });
    const assetMeta: DraftAsset[] = draft.assets.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      sizeLabel: a.sizeLabel,
    }));
    // Cria o "casco" da apresentação na hora (navegação instantânea pro workspace, igual antes) e
    // dispara a geração real em background — o workspace mostra um estado de carregamento até
    // status sair de 'generating' (ver WorkspacePage).
    const presentation: Presentation = {
      id,
      title: PLACEHOLDER_TITLE,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
      tone: clampTone(draft.tone),
      meta: {
        idea: draft.idea,
        slideCount: draft.slideCount,
        goal,
        audience: draft.audience.trim(),
        style,
        assets: assetMeta,
      },
      slides: [],
      chat: [],
      notionPageId: draft.notionPageId,
    };
    state = { ...state, presentations: [presentation, ...state.presentations] };
    emit();
    enforceActiveLimit();

    void runGeneration(id);

    return id;
  },

  /**
   * Apresentação vinda de um .pptx importado (ver lib/pptxImport.ts): os slides já
   * chegam PRONTOS (fundo + texto solto, extraídos do arquivo original), sem
   * passar pela geração via IA — status nasce direto em 'ready'.
   */
  createFromImportedPptx(title, slides, skippedSlides) {
    const id = createId();
    const now = Date.now();
    const chat: ChatMessage[] =
      skippedSlides > 0
        ? [
            {
              id: createId(),
              author: 'ai',
              text: `Importei o arquivo, mas ${skippedSlides} ${skippedSlides === 1 ? 'slide não pôde' : 'slides não puderam'} ser lidos e ${skippedSlides === 1 ? 'ficou de fora' : 'ficaram de fora'}.`,
              createdAt: now,
            },
          ]
        : [];
    const presentation: Presentation = {
      id,
      title: sanitizeTitle(title) || PLACEHOLDER_TITLE,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
      tone: DEFAULT_TONE,
      meta: {
        idea: `Importado de "${title}"`,
        slideCount: slides.length,
        goal: 'inform',
        audience: '',
        style: 'balanced',
        assets: [],
      },
      slides,
      chat,
    };
    state = { ...state, presentations: [presentation, ...state.presentations] };
    emit();
    enforceActiveLimit();
    return id;
  },

  /**
   * O EIXO DE COR. Um número muda o deck inteiro: as artes (o diretor de arte
   * remonta o plano) e o cromo (rótulo, traço, número do card, borda, destaque).
   * Nenhuma letra do texto é tocada — é por isso que dá pra arrastar ao vivo.
   */
  setTone(id, tone) {
    updatePresentation(id, (p) => ({ ...p, tone: clampTone(tone) }));
  },

  /** Marca que o link já foi escrito de volta na página do Notion de origem. */
  markNotionSynced(id) {
    updatePresentation(id, (p) => ({ ...p, notionSyncedAt: Date.now() }));
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
      blocks: [makeTextBlock('title-2', 'Novo slide'), makeTextBlock('body', '')],
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
        ...(source.image ? { image: { ...source.image } } : {}),
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
      goal: pres.meta.goal,
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
    const floatingCount = slide?.blocks.filter((b) => !isListBlock(b) && b.floating).length ?? 0;
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
        const isFloating = !isListBlock(target) && !!target.floating;
        if (!isFloating && s.blocks.filter((b) => isListBlock(b) || !b.floating).length <= 1) return s;
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

  /**
   * Move/redimensiona QUALQUER zona do slide (header, content, aside, banner).
   * rect undefined = restaura a decisão do motor pra aquela zona. O override
   * legado de conteúdo é limpo junto, senão ele ressuscitaria no reset.
   */
  setZone(id, slideId, zone, rect) {
    recordHistory(id, `zone:${zone}:${slideId}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => {
        const overrides = { ...(s.zoneOverrides ?? {}) };
        if (rect) overrides[zone] = clampRect(rect);
        else delete overrides[zone];
        return {
          ...s,
          zoneOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
          ...(zone === 'content' ? { contentZoneOverride: undefined } : {}),
        };
      }),
    );
  },

  setContentZone(id, slideId, rect) {
    presentationsStore.setZone(id, slideId, 'content', rect);
  },

  resetContentZone(id, slideId) {
    presentationsStore.setZone(id, slideId, 'content', undefined);
  },

  /** Sobrescreve a marca CITi do canto: mover/redimensionar/apagar. undefined = volta ao motor. */
  setBrandMark(id, slideId, mark) {
    recordHistory(id, `brand:${slideId}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        brandMark: mark ? { ...mark, ...(mark.rect ? { rect: clampRect(mark.rect) } : {}) } : undefined,
      })),
    );
  },

  /**
   * Escolha manual do fundo deste slide, tirada da galeria "Fundos". undefined
   * (ou um id que sumiu do catálogo) devolve o slide pro diretor de arte automático.
   */
  setSlideArt(id, slideId, artId) {
    const resolved = artId && artById(artId) ? artId : undefined;
    recordHistory(id, `art:${slideId}`);
    updatePresentation(id, (p) =>
      updateSlideInPresentation(p, slideId, (s) => ({
        ...s,
        artOverride: resolved,
      })),
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
    enforceActiveLimit();
    return copy.id;
  },

  moveToTrash(id) {
    updatePresentation(id, (p) => ({ ...p, deletedAt: Date.now() }));
  },

  restoreFromTrash(id) {
    updatePresentation(id, (p) => ({ ...p, deletedAt: undefined }));
    enforceActiveLimit();
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
  const alignPatch: { align?: Block['align'] } = 'align' in patch && patch.align ? { align: patch.align } : {};

  if (block.kind === 'cards') {
    const p = patch as { items?: (typeof block)['items'] };
    // O TETO vale aqui também: nenhum caminho do app consegue passar de 3 cards.
    return { ...block, ...alignPatch, ...(p.items ? { items: p.items.slice(0, MAX_CARDS) } : {}) };
  }
  if (block.kind === 'topics') {
    const p = patch as { items?: (typeof block)['items']; markers?: (typeof block)['markers'] };
    return {
      ...block,
      ...alignPatch,
      ...(p.items ? { items: p.items.slice(0, MAX_TOPICS) } : {}),
      ...('markers' in patch ? { markers: p.markers?.slice(0, MAX_TOPICS) } : {}),
    };
  }
  if (block.kind === 'steps') {
    const p = patch as {
      items?: (typeof block)['items'];
      markers?: (typeof block)['markers'];
      icons?: (typeof block)['icons'];
      iconAssets?: (typeof block)['iconAssets'];
    };
    return {
      ...block,
      ...alignPatch,
      ...(p.items ? { items: p.items.slice(0, MAX_STEPS) } : {}),
      ...('markers' in patch ? { markers: p.markers?.slice(0, MAX_STEPS) } : {}),
      ...('icons' in patch ? { icons: p.icons?.slice(0, MAX_STEPS) } : {}),
      ...('iconAssets' in patch ? { iconAssets: p.iconAssets?.slice(0, MAX_STEPS) } : {}),
    };
  }
  if (block.kind === 'stats') {
    const p = patch as { items?: StatItem[] };
    return { ...block, ...alignPatch, ...(p.items ? { items: p.items.slice(0, MAX_STATS) } : {}) };
  }
  if (block.kind === 'compare') {
    const p = patch as { sides?: CompareSide[] };
    return {
      ...block,
      ...alignPatch,
      ...(p.sides
        ? { sides: p.sides.slice(0, 2).map((s) => ({ ...s, points: s.points.slice(0, MAX_COMPARE_POINTS) })) }
        : {}),
    };
  }

  const p = patch as { content?: (typeof block)['content']; rect?: BlockRect };
  const rectPatch: { rect?: BlockRect } = p.rect ? { rect: clampRect(p.rect) } : {};
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
