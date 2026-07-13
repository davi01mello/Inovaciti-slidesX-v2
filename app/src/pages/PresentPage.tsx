import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SlideComposition } from '@/components/present/SlideComposition';
import { usePresentation } from '@/stores/presentationsStore';
import { cn } from '@/lib/cn';

/**
 * Modo apresentação de verdade: SÓ o slide, ocupando a tela inteira.
 *
 * O fullscreen do navegador é pedido ainda no clique de "Apresentar" (ver
 * WorkspacePage.handlePresent — depois da navegação o gesto se perde). Aqui
 * não existe HUD nenhum: nada de contador, barra ou dicas. Navegação:
 * clique / → / espaço / PageDown avançam, ← / PageUp voltam, Home/End saltam,
 * F alterna tela cheia e Esc sai da apresentação. O cursor some sozinho.
 */
export function PresentPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const presentation = usePresentation(id);
  const [index, setIndex] = useState(0);
  const [cursorIdle, setCursorIdle] = useState(false);
  const idleTimerRef = useRef<number>(0);

  const total = presentation?.slides.length ?? 0;

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  const leave = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    navigate(`/workspace/${id}`);
  }, [navigate, id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          event.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          goPrev();
          break;
        case 'Home':
          event.preventDefault();
          setIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setIndex(Math.max(0, total - 1));
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
          else void document.documentElement.requestFullscreen?.().catch(() => {});
          break;
        case 'Escape':
          // Em tela cheia o navegador consome o primeiro Esc pra sair do
          // fullscreen; este handler pega o Esc seguinte (ou o único, em janela).
          if (!document.fullscreenElement) leave();
          break;
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, leave, total]);

  // Cursor some após 2s parado — apresentação limpa até no ponteiro.
  useEffect(() => {
    function wake() {
      setCursorIdle(false);
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setCursorIdle(true), 2000);
    }
    wake();
    document.addEventListener('mousemove', wake);
    return () => {
      document.removeEventListener('mousemove', wake);
      window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Saindo da página (voltar do navegador incluído), devolve a tela normal.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  if (!presentation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-ink">
        <p>Apresentação não encontrada.</p>
      </div>
    );
  }

  const slide = presentation.slides[index];
  if (!slide) return null;

  return (
    <div
      className={cn(
        'flex h-dvh w-screen items-center justify-center overflow-hidden bg-black',
        cursorIdle && 'cursor-none',
      )}
      onClick={goNext}
      onContextMenu={(event) => {
        // Botão direito volta um slide — padrão de apresentadores de verdade.
        event.preventDefault();
        goPrev();
      }}
    >
      {/* O slide no maior 16:9 que cabe na tela: em monitores 16:9 é a tela inteira. */}
      <div className="relative aspect-[16/9]" style={{ width: 'min(100vw, calc(100dvh * 1.7778))' }}>
        <SlideComposition slide={slide} />
      </div>
    </div>
  );
}
