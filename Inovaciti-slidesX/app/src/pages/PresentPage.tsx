import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SlideComposition } from '@/components/present/SlideComposition';
import { usePresentation } from '@/stores/presentationsStore';
import { canExportPresentation, exportPresentationAsPptx } from '@/lib/exportPptx';
import { exportPresentationToCanva } from '@/services/canvaClient';
import { pushToast } from '@/lib/toast';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export function PresentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const presentation = usePresentation(id);
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [canvaExporting, setCanvaExporting] = useState(false);

  const total = presentation?.slides.length ?? 0;

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void document.documentElement.requestFullscreen();
        }
      }
      if (event.key === 'Escape') {
        // Em tela cheia, Esc é capturado pelo navegador pra sair do fullscreen.
        if (!document.fullscreenElement) navigate(`/workspace/${id}`);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, navigate, id]);

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
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-ink">
        <p>Apresentação não encontrada.</p>
      </div>
    );
  }

  const slide = presentation.slides[index];
  if (!slide) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#050708]">
      <header className="flex h-14 flex-none items-center justify-between border-b border-white/[0.04] bg-app-bg/85 px-6 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate(`/workspace/${presentation.id}`)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:text-ink"
        >
          <Icon name="chevron-right" size={13} className="rotate-180" />
          Voltar ao workspace
        </button>
        <div className="text-[13px] font-medium text-ink-secondary">
          {presentation.title}
          <span className="ml-2 text-ink-muted">
            · {index + 1} / {total}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportCanva}
            disabled={!canExport || canvaExporting}
            title={canExport ? undefined : 'Adicione slides antes de exportar'}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="compass" size={13} />
            {canvaExporting ? 'Abrindo...' : 'Abrir no Canva'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport || exporting}
            title={canExport ? undefined : 'Adicione slides antes de exportar'}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/[0.08] px-3 text-[13px] font-medium text-brand transition-colors duration-150 hover:bg-brand/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="import" size={13} />
            {exporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8 py-8">
        <div className="w-full max-w-[1240px]">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/[0.05] shadow-[0_28px_80px_-32px_rgba(0,0,0,0.7)]">
            <SlideComposition slide={slide} />
          </div>
        </div>
      </div>

      <div className="flex flex-none flex-col items-center gap-4 px-8 pb-7">
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-surface text-ink-secondary transition-all duration-150 hover:border-white/[0.15] hover:text-ink disabled:opacity-30"
            aria-label="Slide anterior"
          >
            <Icon name="chevron-right" size={16} className="rotate-180" />
          </button>

          <div className="flex flex-col items-center gap-2.5">
            {total <= 14 ? (
              <div className="flex items-center gap-2">
                {presentation.slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Ir para o slide ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === index ? 'w-6 bg-brand' : 'w-1.5 bg-white/20 hover:bg-white/40',
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                  style={{ width: `${((index + 1) / total) * 100}%` }}
                />
              </div>
            )}
            <div className="text-[11px] font-medium tabular-nums text-ink-muted">
              <span className="text-ink-secondary">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
              <span className="ml-3 hidden text-ink-muted/70 sm:inline">← → navegar · F tela cheia · Esc sair</span>
            </div>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={index === total - 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-surface text-ink-secondary transition-all duration-150 hover:border-white/[0.15] hover:text-ink disabled:opacity-30"
            aria-label="Próximo slide"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
