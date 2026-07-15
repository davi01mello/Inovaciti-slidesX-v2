import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { accentFor, clampTone, toneBandOf, toneGradientCss, TONE_BANDS } from '@/services/tone';
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
  /** Barra mais baixa e compacta, pra caber numa faixa estreita (workspace). */
  compact?: boolean;
  /** Rótulos de faixa (Gelo/Azul/Verde) clicáveis abaixo do trilho. */
  showLabels?: boolean;
  className?: string;
}

export function ToneBar({
  value,
  onChange,
  showPreview = true,
  compact = false,
  showLabels = true,
  className,
}: ToneBarProps) {
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
   * ARMADILHA: no extremo Gelo o acento é quase branco, e um marcador branco em cima
   * de um trilho branco é um marcador invisível. O anel branco de 2px resolve o lado
   * verde (contraste contra a cor viva) e a sombra resolve o lado claro (contraste
   * contra o branco). O halo só existe onde ele é luz e não sujeira: some no claro.
   */
  const misty = tone < 0.28;
  // Dimensões do trilho premium. Alto e arredondado no wizard; mais baixo no compacto.
  const trackH = compact ? 26 : 40;
  const knob = compact ? 22 : 30;

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
      {/* Halo ambiente: um brilho suave na cor atual por baixo da barra, dá profundidade. */}
      <div className="relative" style={{ paddingBlock: compact ? 3 : 5 }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 rounded-full blur-xl"
          style={{
            top: '18%',
            bottom: '18%',
            background: track,
            opacity: misty ? 0.28 : 0.5,
            transition: 'opacity 200ms ease',
          }}
        />

        {/* Trilho: retângulo arredondado com o degradê OKLab e profundidade de vidro. */}
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
          className="relative w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            height: trackH,
            borderRadius: Math.round(trackH * 0.42),
            background: track,
            // Anel de 1px + gloss no topo + sombra interna embaixo: o trilho ganha corpo,
            // vira uma peça de vidro pintada, não uma linha.
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -6px 12px -6px rgba(0,0,0,0.45), 0 6px 22px -10px rgba(0,0,0,0.7)',
          }}
        >
          {/* Gloss superior: um brilho que corre no topo do vidro. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[3%] top-[6%]"
            style={{
              height: '38%',
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0))',
            }}
          />

          {/* Marcador: núcleo branco com um miolo da cor atual e um anel que brilha. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2"
            style={{
              left: `${tone * 100}%`,
              transform: `translate(-50%, -50%) scale(${dragging ? 1.12 : 1})`,
              transition: dragging ? 'none' : 'transform 160ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div
              className="grid place-items-center rounded-full"
              style={{
                width: knob,
                height: knob,
                background: '#fff',
                boxShadow: `0 2px 10px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.06)${
                  misty ? '' : `, 0 0 16px -1px ${accent}`
                }`,
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: Math.round(knob * 0.46),
                  height: Math.round(knob * 0.46),
                  background: accent,
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rótulos de faixa: presets clicáveis, o ativo pintado na cor atual. */}
      {showLabels && (
      <div className={cn('flex justify-between', compact ? 'mt-2' : 'mt-3')}>
        {TONE_BANDS.map((b) => {
          const active = b.label === band.label;
          return (
            <button
              key={b.label}
              type="button"
              onClick={() => onChange(b.at)}
              className={cn(
                'text-[11.5px] font-semibold tracking-[0.04em] transition-colors duration-200',
                active ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary',
              )}
              style={active ? { color: misty ? '#e8f6f1' : accent } : undefined}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      )}

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
