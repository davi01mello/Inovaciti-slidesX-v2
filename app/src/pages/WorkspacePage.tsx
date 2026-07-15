import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { SlideComposition } from '@/components/present/SlideComposition';
import { useDeckPlan } from '@/services/deckPlan';
import { SlideThumbnails } from '@/components/workspace/SlideThumbnails';
import { FormattingToolbar } from '@/components/workspace/FormattingToolbar';
import { InsertDock } from '@/components/workspace/InsertDock';
import { DeckColorControl } from '@/components/workspace/DeckColorControl';
import { CitiOrb } from '@/components/ui/CitiOrb';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { presentationsStore, usePresentation } from '@/stores/presentationsStore';
import { AiClientError } from '@/services/aiClient';
import { canExportPresentation, exportPresentationAsPptx } from '@/lib/exportPptx';
import { exportPresentationToCanva } from '@/services/canvaClient';
import { writeBackToNotion } from '@/services/notionClient';
import { fileToSlideImage, pickImageFiles, type LoadedImage } from '@/lib/imageFile';
import { isInsertDrag, readInsertPayload } from '@/services/insertDnd';
import { addSessionUpload, getSessionUpload } from '@/services/sessionUploads';
import { pushToast } from '@/lib/toast';
import type { FloatingTextKind } from '@/lib/blocks';
import type { Block, BlockRect, Slide } from '@/types/slide';

/**
 * Largura do palco do slide: cabe SEMPRE na viewport sem rolagem vertical.
 * 310px é a soma do chrome fixo (header 64 + barra de ações 44 + respiros + tira
 * de miniaturas ~150); o fator 1.7778 converte a altura restante em largura 16:9.
 */
const SLIDE_STAGE_WIDTH = 'min(920px, 100%, calc((100vh - 310px) * 1.7778))';

/**
 * Workspace WYSIWYG: o palco é a PRÓPRIA composição no template oficial —
 * clicou no texto, edita ali. Não existe mais "tela de edição" separada:
 * o que você vê é exatamente o slide da apresentação e do export.
 */
export function WorkspacePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const presentation = usePresentation(id);
  const deckPlan = useDeckPlan(presentation);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [improvingSlideId, setImprovingSlideId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [canvaExporting, setCanvaExporting] = useState(false);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [stageDragOver, setStageDragOver] = useState(false);

  useEffect(() => {
    if (!presentation) return;
    if (!currentSlideId || !presentation.slides.some((s) => s.id === currentSlideId)) {
      setCurrentSlideId(presentation.slides[0]?.id ?? null);
    }
  }, [presentation, currentSlideId]);

  const currentSlide: Slide | null = useMemo(() => {
    if (!presentation || !currentSlideId) return null;
    return presentation.slides.find((s) => s.id === currentSlideId) ?? presentation.slides[0] ?? null;
  }, [presentation, currentSlideId]);

  const slideNumber = useMemo(() => {
    if (!presentation || !currentSlide) return 0;
    return presentation.slides.findIndex((s) => s.id === currentSlide.id) + 1;
  }, [presentation, currentSlide]);

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!presentation) return;
      presentationsStore.updateTitle(presentation.id, title);
    },
    [presentation],
  );

  const handleAddSlide = useCallback(() => {
    if (!presentation) return;
    const newId = presentationsStore.addSlide(presentation.id, currentSlideId);
    setCurrentSlideId(newId);
  }, [presentation, currentSlideId]);

  const handleDuplicate = useCallback(
    (slideId: string) => {
      if (!presentation) return;
      const newId = presentationsStore.duplicateSlide(presentation.id, slideId);
      if (newId) setCurrentSlideId(newId);
    },
    [presentation],
  );

  const handleDelete = useCallback(
    (slideId: string) => {
      if (!presentation) return;
      const index = presentation.slides.findIndex((s) => s.id === slideId);
      const fallback = presentation.slides[index - 1] ?? presentation.slides[index + 1] ?? null;
      presentationsStore.deleteSlide(presentation.id, slideId);
      if (fallback) setCurrentSlideId(fallback.id);
    },
    [presentation],
  );

  const handleReorder = useCallback(
    (slideId: string, targetIndex: number) => {
      if (!presentation) return;
      presentationsStore.reorderSlide(presentation.id, slideId, targetIndex);
    },
    [presentation],
  );

  const handleImprove = useCallback(async () => {
    if (!presentation || !currentSlide) return;
    setImprovingSlideId(currentSlide.id);
    try {
      await presentationsStore.improveSlide(presentation.id, currentSlide.id);
      pushToast('Repensei este slide com um ângulo novo.');
    } catch (err) {
      const message = err instanceof AiClientError ? err.message : 'Não consegui melhorar esse slide agora.';
      pushToast(message);
    } finally {
      setImprovingSlideId(null);
    }
  }, [presentation, currentSlide]);

  const handleBlockChange = useCallback(
    (blockId: string, patch: Partial<Block>) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.updateBlock(presentation.id, currentSlide.id, blockId, patch);
    },
    [presentation, currentSlide],
  );

  const handleInsertText = useCallback(
    (kind: FloatingTextKind) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.addFloatingText(presentation.id, currentSlide.id, kind);
    },
    [presentation, currentSlide],
  );

  const handleBlockDelete = useCallback(
    (blockId: string) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.deleteBlock(presentation.id, currentSlide.id, blockId);
    },
    [presentation, currentSlide],
  );

  const handleInsertElement = useCallback(
    (assetKey: string) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.addDecoration(presentation.id, currentSlide.id, assetKey);
    },
    [presentation, currentSlide],
  );

  const handleInsertImage = useCallback(
    (image: LoadedImage, at?: { x: number; y: number }) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.addImageDecoration(
        presentation.id,
        currentSlide.id,
        { src: image.dataUrl, width: image.width, height: image.height },
        at,
      );
    },
    [presentation, currentSlide],
  );

  /**
   * Drop no palco: tanto o que veio arrastado do dock (texto, elemento, imagem
   * recente) quanto arquivos do computador. Em ambos os casos a coisa nasce
   * EXATAMENTE onde o cursor soltou.
   */
  const handleStageDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setStageDragOver(false);
      if (!presentation || !currentSlide) return;

      const box = event.currentTarget.getBoundingClientRect();
      const at = {
        x: (event.clientX - box.left) / box.width,
        y: (event.clientY - box.top) / box.height,
      };

      const payload = readInsertPayload(event.dataTransfer);
      if (payload) {
        if (payload.type === 'text') {
          presentationsStore.addFloatingText(presentation.id, currentSlide.id, payload.kind, at);
        } else if (payload.type === 'element') {
          presentationsStore.addDecoration(presentation.id, currentSlide.id, payload.assetKey, at);
        } else {
          const upload = getSessionUpload(payload.uploadId);
          if (upload) handleInsertImage(upload, at);
        }
        return;
      }

      const files = pickImageFiles(Array.from(event.dataTransfer.files));
      if (files.length === 0) {
        if (event.dataTransfer.files.length > 0) pushToast('Só consigo receber imagens (JPEG, PNG ou WebP).');
        return;
      }
      void (async () => {
        try {
          for (const file of files) {
            const image = await fileToSlideImage(file);
            addSessionUpload(image);
            handleInsertImage(image, at);
          }
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Não consegui ler essa imagem.');
        }
      })();
    },
    [presentation, currentSlide, handleInsertImage],
  );

  const handleDecorationMove = useCallback(
    (decorationId: string, rect: BlockRect) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.moveDecoration(presentation.id, currentSlide.id, decorationId, rect);
    },
    [presentation, currentSlide],
  );

  const handleDecorationDelete = useCallback(
    (decorationId: string) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.removeDecoration(presentation.id, currentSlide.id, decorationId);
    },
    [presentation, currentSlide],
  );

  const handleContentZoneMove = useCallback(
    (rect: BlockRect) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.setContentZone(presentation.id, currentSlide.id, rect);
    },
    [presentation, currentSlide],
  );

  const handleContentZoneReset = useCallback(() => {
    if (!presentation || !currentSlide) return;
    presentationsStore.resetContentZone(presentation.id, currentSlide.id);
  }, [presentation, currentSlide]);

  const handleUndo = useCallback(() => {
    if (presentation) presentationsStore.undo(presentation.id);
  }, [presentation]);

  const handleRedo = useCallback(() => {
    if (presentation) presentationsStore.redo(presentation.id);
  }, [presentation]);

  // Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z (ou Ctrl+Y) refaz — exceto dentro de um
  // campo de texto, onde o undo nativo do navegador é o correto.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      if (key === 'y' || (key === 'z' && event.shiftKey)) handleRedo();
      else handleUndo();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  /** Apresentar: pede fullscreen AINDA no gesto do clique (depois de navegar o
   * navegador não reconheceria mais como ação do usuário) e então navega. */
  const handlePresent = useCallback(() => {
    if (!presentation) return;
    void document.documentElement.requestFullscreen?.().catch(() => {
      /* sem suporte/permissão: apresenta em janela mesmo */
    });
    navigate(`/apresentar/${presentation.id}`);
  }, [presentation, navigate]);

  const canExport = presentation ? canExportPresentation(presentation) : false;

  const handleExport = useCallback(async () => {
    if (!presentation) return;
    setExporting(true);
    try {
      await exportPresentationAsPptx(presentation);
      pushToast('PPTX exportado. Confere na pasta de downloads.');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui exportar o PPTX agora.');
    } finally {
      setExporting(false);
    }
  }, [presentation]);

  const handleExportCanva = useCallback(async () => {
    if (!presentation) return;
    // Abre a aba já aqui, ainda dentro do gesto de clique síncrono -- se esperar a resposta
    // da API (pode levar vários segundos) pra chamar window.open, o navegador não reconhece
    // mais isso como ação do usuário e bloqueia o pop-up silenciosamente (sem erro nenhum).
    const popup = window.open('', '_blank');
    setCanvaExporting(true);
    try {
      const editUrl = await exportPresentationToCanva(presentation);
      if (popup) {
        popup.location.href = editUrl;
      } else {
        // Mesmo o open síncrono foi bloqueado (configuração restritiva do navegador).
        window.open(editUrl, '_blank', 'noopener,noreferrer');
      }
      pushToast('Aberto no Canva numa nova aba.');
    } catch (err) {
      popup?.close();
      pushToast(err instanceof Error ? err.message : 'Não consegui abrir no Canva agora.');
    } finally {
      setCanvaExporting(false);
    }
  }, [presentation]);

  const handleNotionSync = useCallback(async () => {
    if (!presentation?.notionPageId) return;
    setNotionSyncing(true);
    try {
      const url = `${window.location.origin}/workspace/${presentation.id}`;
      await writeBackToNotion(presentation.notionPageId, url);
      presentationsStore.markNotionSynced(presentation.id);
      pushToast('Link salvo na página do Notion.');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui salvar o link no Notion agora.');
    } finally {
      setNotionSyncing(false);
    }
  }, [presentation]);

  if (!presentation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-8 text-center">
        <div>
          <h1 className="text-xl font-semibold text-ink">Não achei essa apresentação</h1>
          <p className="mt-2 text-sm text-ink-muted">Pode ter sido removida, ou o link ficou antigo.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-control border border-border-subtle bg-surface-2 px-5 py-2.5 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-3"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-bg">
      <WorkspaceHeader
        title={presentation.title}
        updatedAt={presentation.updatedAt}
        onTitleChange={handleTitleChange}
        onPresent={handlePresent}
        onExport={handleExport}
        canExport={canExport}
        exporting={exporting}
        onExportCanva={handleExportCanva}
        canvaExporting={canvaExporting}
        canUndo={presentationsStore.canUndo(presentation.id)}
        canRedo={presentationsStore.canRedo(presentation.id)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showNotionSync={Boolean(presentation.notionPageId)}
        onNotionSync={handleNotionSync}
        notionSyncing={notionSyncing}
        notionSynced={Boolean(presentation.notionSyncedAt)}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,30%)_1fr]">
        <ChatPanel
          presentationId={presentation.id}
          messages={presentation.chat}
          idea={presentation.meta.idea}
          goal={presentation.meta.goal}
          style={presentation.meta.style}
          slides={presentation.slides}
          busy={presentation.status === 'generating'}
        />
        {/* Palco central: dimensionado pra viver INTEIRO na viewport, sem rolagem —
         * nada de botão ou aviso escondido abaixo da dobra. O dock de inserção
         * fica à esquerda, no fluxo: abrir um painel empurra o palco, nunca o cobre. */}
        <section className="flex min-h-0 items-center gap-4 overflow-hidden py-4 pl-4 pr-6">
          {currentSlide && (
            <InsertDock
              onInsertText={handleInsertText}
              onInsertElement={handleInsertElement}
              onInsertImage={(image) => handleInsertImage(image)}
            />
          )}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
          {presentation.status === 'generating' && presentation.slides.length === 0 && <GeneratingNotice />}
          {presentation.slides.length === 0 && presentation.generationError && (
            <GenerationErrorNotice
              message={presentation.generationError}
              onRetry={() => presentationsStore.retryGeneration(presentation.id)}
            />
          )}
          {currentSlide && (
            <div className="flex min-h-0 flex-col" style={{ width: SLIDE_STAGE_WIDTH }}>
              <div className="mb-2.5 flex h-9 items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[11.5px] font-medium text-ink-muted">
                    Slide {slideNumber} de {presentation.slides.length}
                  </span>
                  <DeckColorControl presentationId={presentation.id} tone={deckPlan.tone} />
                </div>
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={improvingSlideId === currentSlide.id}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand/45 bg-brand/[0.16] px-3.5 text-[12.5px] font-semibold text-brand shadow-[0_6px_18px_-8px_rgba(45,219,96,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:border-brand/70 hover:bg-brand/[0.26] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  title="Regenerar este slide considerando o contexto da apresentação"
                >
                  {improvingSlideId === currentSlide.id ? <Spinner size="sm" /> : <Icon name="sparkles" size={13} />}
                  {improvingSlideId === currentSlide.id ? 'Melhorando…' : 'Melhorar Slide'}
                </button>
              </div>
              <div
                className={
                  'relative aspect-[16/9] w-full overflow-hidden rounded-2xl border bg-black transition-all duration-200 ' +
                  (stageDragOver
                    ? 'border-brand/60 shadow-[0_0_0_4px_rgba(45,219,96,0.15),0_40px_80px_-40px_rgba(0,0,0,0.7)]'
                    : 'border-white/[0.06] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]')
                }
                onDragOver={(event) => {
                  if (!isInsertDrag(event.dataTransfer)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'copy';
                  setStageDragOver(true);
                }}
                onDragLeave={(event) => {
                  // Só apaga o realce quando o ponteiro sai DE VERDADE do palco —
                  // atravessar um filho dispara dragleave e piscaria o overlay.
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setStageDragOver(false);
                }}
                onDrop={handleStageDrop}
              >
                <SlideComposition
                  tone={deckPlan.tone}
                  art={currentSlide ? deckPlan.art.get(currentSlide.id) : undefined}
                  slide={currentSlide}
                  editable
                  onBlockChange={handleBlockChange}
                  onBlockDelete={handleBlockDelete}
                  onDecorationMove={handleDecorationMove}
                  onDecorationDelete={handleDecorationDelete}
                  onContentZoneMove={handleContentZoneMove}
                  onContentZoneReset={handleContentZoneReset}
                />
                {stageDragOver && (
                  <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#040705]/55 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2.5 rounded-full border border-brand/40 bg-[#06110a]/90 px-4 py-2 text-[12.5px] font-semibold text-brand">
                      <Icon name="file-image" size={14} />
                      Solte pra adicionar ao slide
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </section>
      </div>

      <SlideThumbnails
        slides={presentation.slides}
        deckPlan={deckPlan}
        currentSlideId={currentSlide?.id ?? ''}
        onSelect={setCurrentSlideId}
        onAdd={handleAddSlide}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {currentSlide && <FormattingToolbar presentationId={presentation.id} slideId={currentSlide.id} />}
    </div>
  );
}

function GeneratingNotice() {
  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-2 px-8 py-10 text-center">
      <CitiOrb size={170} active />
      <div className="mt-2">
        <div className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Montando Sua Apresentação</div>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-muted">
          Estamos fazendo a mágica acontecer. Leva só alguns segundos.
        </p>
      </div>
    </div>
  );
}

function GenerationErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-4 rounded-2xl border border-[#ff8a8a]/20 bg-[#ff8a8a]/[0.04] px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ff8a8a]/25 bg-[#ff8a8a]/[0.08] text-[#ff8a8a]">
        <Icon name="sparkles" size={20} />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-ink">Não consegui gerar dessa vez</div>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-muted">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-control border border-border-subtle bg-surface-2 px-5 py-2.5 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-3"
      >
        Tentar De Novo
      </button>
    </div>
  );
}
