import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { accentAtLightness, accentFor, clampTone, toneBandOf, toneGradientCss, TONE_BANDS } from '@/services/tone';
import { coversForTone } from '@/services/deckArt';
import { cn } from '@/lib/cn';

/**
 * A BARRA DE COR.
 *
 * Uma apresentação inteira nasce de UM número, e este é o controle desse número.
 * Ele faz duas coisas ao mesmo tempo: escolhe as ARTES do deck e pinta o CROMO.
 *
 * Três decisões que fazem a diferença entre uma barra bonita e um input[range]:
 *
 * 1. O TRILHO É PINTADO PELA MESMA FUNÇÃO QUE PINTA O SLIDE (tone.ts). Não é uma
 *    aproximação decorativa: a cor exata que está embaixo do dedo é a cor exata que
 *    vai sair no rótulo do slide. WYSIWYG de verdade.
 *
 * 2. INTERPOLAÇÃO EM OKLab. Um `linear-gradient` de três paradas seria interpolado
 *    pelo navegador em sRGB, e sRGB ACINZENTA o meio — justo onde mora o azul, que é
 *    a cor mais importante do eixo. Amostrando 28 paradas do OKLab, os trechos que
 *    sobram pro navegador ficam curtos demais pra sujar.
 *
 * 3. O PREVIEW SÃO AS CAPAS DE VERDADE. Três miniaturas das artes reais que aquele
 *    tom traz, trocando enquanto se arrasta. A pessoa VÊ a decisão antes de tomá-la,
 *    em vez de adivinhar o que "0.42" significa.
 */

const STEP = 0.02;
const BIG_STEP = 0.1;

interface ToneBarProps {
  value: number;
  onChange: (tone: number) => void;
  /** As três capas ao vivo. Desligado no header do workspace, onde não cabe. */
  showPreview?: boolean;
  className?: string;
}

export function ToneBar({ value, onChange, showPreview = true, className }: ToneBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const tone = clampTone(value);
  const accent = accentFor(tone);
  const band = toneBandOf(tone);

  // O trilho é caro de montar (28 conversões OKLab) e NUNCA muda: memoiza uma vez.
  const track = useMemo(() => toneGradientCss('90deg', 28), []);
  const covers = useMemo(() => coversForTone(tone, 3), [tone]);

  /**
   * O ACENTO SOBRE A PRÓPRIA BARRA.
   *
   * ARMADILHA: no extremo Névoa o acento é quase branco, e um marcador branco em cima
   * de um trilho branco é um marcador invisível. O anel branco de 2px resolve o lado
   * verde (contraste contra a cor viva) e a sombra resolve o lado claro (contraste
   * contra o branco). O halo só existe onde ele é luz e não sujeira: some no claro.
   */
  const misty = tone < 0.28;
  const halo = misty ? 'none' : `0 0 0 6px ${accentAtLightness(tone, 0.62)}22, 0 0 18px -2px ${accent}`;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      onChange(clampTone((clientX - rect.left) / rect.width));
    },
    [onChange],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setFromClientX(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(event.clientX);
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = {
      ArrowRight: tone + STEP,
      ArrowUp: tone + STEP,
      ArrowLeft: tone - STEP,
      ArrowDown: tone - STEP,
      PageUp: tone + BIG_STEP,
      PageDown: tone - BIG_STEP,
      Home: 0,
      End: 1,
    };
    const next = map[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(clampTone(next));
  };

  return (
    <div className={cn('select-none', className)}>
      {/* Trilho */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Cor da apresentação"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number(tone.toFixed(2))}
        aria-valuetext={`${band.label}, ${Math.round(tone * 100)} por cento no eixo de cor`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={onKeyDown}
        className="relative h-[15px] w-full cursor-pointer rounded-full outline-none"
        style={{
          background: track,
          // Anel interno de 1px + sombra interna: dá corpo ao trilho e o descola do fundo.
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.24), inset 0 2px 5px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Marcador */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2"
          style={{
            left: `${tone * 100}%`,
            transform: `translate(-50%, -50%) scale(${dragging ? 1.16 : 1})`,
            transition: dragging ? 'none' : 'transform 160ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 24,
              height: 24,
              background: accent,
              border: '2px solid #fff',
              boxShadow: `${halo}${halo === 'none' ? '' : ', '}0 2px 8px rgba(0,0,0,0.45)`,
            }}
          />
        </div>
      </div>

      {/* Rótulos de faixa */}
      <div className="mt-2.5 flex justify-between">
        {TONE_BANDS.map((b) => {
          const active = b.label === band.label;
          return (
            <button
              key={b.label}
              type="button"
              onClick={() => onChange(b.at)}
              className={cn(
                'text-[11.5px] font-semibold tracking-[0.06em] transition-colors duration-200',
                active ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary',
              )}
              style={active ? { color: misty ? '#e8f6f1' : accent } : undefined}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Preview: as capas REAIS que este tom traz. */}
      {showPreview && (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {covers.map((art) => (
            <div
              key={art.id}
              className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-black"
              style={{ aspectRatio: '16 / 9' }}
            >
              <img src={art.src} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * O tom aplicado ao vivo, sem re-render do deck a cada pixel do arrasto.
 *
 * Arrastar dispara dezenas de eventos por segundo, e cada um replaneja a arte do deck
 * inteiro (38 artes x N slides). Sem isto, a barra engasga. O estado local responde na
 * hora (a barra é fluida) e o deck só é recalculado quando o quadro seguinte chega.
 */
export function useLiveTone(committed: number, commit: (tone: number) => void): [number, (tone: number) => void] {
  const [local, setLocal] = useState(committed);
  const frame = useRef(0);

  useEffect(() => setLocal(committed), [committed]);

  const set = useCallback(
    (tone: number) => {
      setLocal(tone);
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => commit(tone));
    },
    [commit],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return [local, set];
}
