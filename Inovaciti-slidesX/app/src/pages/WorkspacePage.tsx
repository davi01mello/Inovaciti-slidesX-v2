import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { SlideCanvas } from '@/components/workspace/SlideCanvas';
import { SlideComposition } from '@/components/present/SlideComposition';
import { SlideThumbnails } from '@/components/workspace/SlideThumbnails';
import { FormattingToolbar } from '@/components/workspace/FormattingToolbar';
import { CitiOrb } from '@/components/ui/CitiOrb';
import { Icon } from '@/components/ui/Icon';
import { presentationsStore, usePresentation } from '@/stores/presentationsStore';
import { AiClientError } from '@/services/aiClient';
import { canExportPresentation, exportPresentationAsPptx } from '@/lib/exportPptx';
import { exportPresentationToCanva } from '@/services/canvaClient';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { Block, BlockRect, Slide } from '@/types/slide';

/**
 * Largura do palco do slide: cabe SEMPRE na viewport sem rolagem vertical.
 * 330px é a soma do chrome fixo (header 64 + barra de ações 48 + respiros + tira
 * de miniaturas ~150); o fator 1.7778 converte a altura restante em largura 16:9.
 */
const SLIDE_STAGE_WIDTH = 'min(920px, 100%, calc((100vh - 330px) * 1.7778))';

export function WorkspacePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const presentation = usePresentation(id);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [improvingSlideId, setImprovingSlideId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [canvaExporting, setCanvaExporting] = useState(false);
  // O slide abre na COMPOSIÇÃO (o template com os textos posicionados, exatamente
  // como será apresentado). O usuário troca pro editor de conteúdo quando quiser.
  const [contentMode, setContentMode] = useState(false);

  useEffect(() => {
    if (!presentation) return;
    if (!currentSlideId || !presentation.slides.some((s) => s.id === currentSlideId)) {
      setCurrentSlideId(presentation.slides[0]?.id ?? null);
    }
  }, [presentation, currentSlideId]);

  // Ao trocar de slide, volta pra visão padrão (a composição no template).
  useEffect(() => {
    setContentMode(false);
  }, [currentSlideId]);

  const currentSlide: Slide | null = useMemo(() => {
    if (!presentation || !currentSlideId) return null;
    return presentation.slides.find((s) => s.id === currentSlideId) ?? presentation.slides[0] ?? null;
  }, [presentation, currentSlideId]);

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

  const handleBlockDelete = useCallback(
    (blockId: string) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.deleteBlock(presentation.id, currentSlide.id, blockId);
    },
    [presentation, currentSlide],
  );

  const handleBlockDuplicate = useCallback(
    (blockId: string) => {
      if (!presentation || !currentSlide) return;
      const src = currentSlide.blocks.find((b) => b.id === blockId);
      if (!src) return;
      presentationsStore.insertBlockAfter(presentation.id, currentSlide.id, blockId, src.kind);
    },
    [presentation, currentSlide],
  );

  const handleInsertBlock = useCallback(
    (kind: Block['kind']) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.insertBlockAfter(presentation.id, currentSlide.id, null, kind);
    },
    [presentation, currentSlide],
  );

  const handleBlockKindChange = useCallback(
    (blockId: string, kind: Block['kind']) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.changeBlockKind(presentation.id, currentSlide.id, blockId, kind);
    },
    [presentation, currentSlide],
  );

  const handleBlockMove = useCallback(
    (blockId: string, rect: BlockRect) => {
      if (!presentation || !currentSlide) return;
      presentationsStore.moveBlock(presentation.id, currentSlide.id, blockId, rect);
    },
    [presentation, currentSlide],
  );

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
        onPresent={() => navigate(`/apresentar/${presentation.id}`)}
        onExport={handleExport}
        canExport={canExport}
        exporting={exporting}
        onExportCanva={handleExportCanva}
        canvaExporting={canvaExporting}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,30%)_1fr]">
        <ChatPanel
          presentationId={presentation.id}
          messages={presentation.chat}
          idea={presentation.meta.idea}
          size={presentation.meta.size}
          style={presentation.meta.style}
          slides={presentation.slides}
        />
        {/* Palco central: dimensionado pra viver INTEIRO na viewport, sem rolagem —
         * nada de botão ou aviso escondido abaixo da dobra. */}
        <section className="flex min-h-0 flex-col items-center justify-center overflow-hidden px-10 py-4">
          {presentation.status === 'generating' && presentation.slides.length === 0 && <GeneratingNotice />}
          {presentation.slides.length === 0 && presentation.generationError && (
            <GenerationErrorNotice
              message={presentation.generationError}
              onRetry={() => presentationsStore.retryGeneration(presentation.id)}
            />
          )}
          {currentSlide && (
            <div className="flex min-h-0 flex-col" style={{ width: SLIDE_STAGE_WIDTH }}>
              {contentMode ? (
                <div className="flex min-h-0 flex-col">
                  <div className="mb-3 flex h-9 items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-semibold text-ink-secondary">
                      <Icon name="edit" size={11} />
                      Editando Conteúdo
                    </span>
                    <button
                      type="button"
                      onClick={() => setContentMode(false)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/25 bg-brand/[0.06] px-3 text-[12px] font-medium text-brand transition-colors duration-150 hover:bg-brand/[0.1]"
                    >
                      <Icon name="sparkles" size={12} />
                      Ver no Template
                    </button>
                  </div>
                  <SlideCanvas
                    slide={currentSlide}
                    onBlockChange={handleBlockChange}
                    onBlockMove={handleBlockMove}
                    onBlockDelete={handleBlockDelete}
                    onBlockDuplicate={handleBlockDuplicate}
                    onBlockKindChange={handleBlockKindChange}
                    onInsertBlock={handleInsertBlock}
                    onImprove={handleImprove}
                    isImproving={improvingSlideId === currentSlide.id}
                  />
                </div>
              ) : (
                <ComposedView slide={currentSlide} onEditContent={() => setContentMode(true)} />
              )}
            </div>
          )}
        </section>
      </div>

      <SlideThumbnails
        slides={presentation.slides}
        currentSlideId={currentSlide?.id ?? ''}
        onSelect={setCurrentSlideId}
        onAdd={handleAddSlide}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {currentSlide && contentMode && (
        <FormattingToolbar presentationId={presentation.id} slideId={currentSlide.id} />
      )}
    </div>
  );
}

/** O slide composto no template oficial, com a porta pro editor de conteúdo. */
function ComposedView({ slide, onEditContent }: { slide: Slide; onEditContent: () => void }) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex h-9 items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.07] px-3 py-1.5 text-[11.5px] font-semibold text-brand">
          <Icon name="sparkles" size={11} />
          Template CITi Aplicado
        </span>
        <button
          type="button"
          onClick={onEditContent}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] font-medium text-ink-secondary transition-colors duration-150 hover:border-white/[0.16] hover:text-ink"
        >
          <Icon name="edit" size={12} />
          Editar Conteúdo
        </button>
      </div>
      <div
        className={cn(
          'relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black',
          'shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]',
        )}
      >
        <SlideComposition slide={slide} />
      </div>
      <p className="m-0 mt-2.5 text-center text-[11.5px] text-ink-muted">
        É assim que o slide aparece na apresentação. Os textos se encaixam sozinhos no template.
      </p>
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
          Isso leva só alguns segundos. O storyboard aparece aqui assim que estiver pronto pra você revisar.
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
