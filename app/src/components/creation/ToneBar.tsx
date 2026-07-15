import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { accentFor, clampTone, toneBandOf, toneGradientCss, TONE_BANDS } from '@/services/tone';
import { coversForTone } from '@/services/deckArt';
import { cn } from '@/lib/cn';

/**
 * A BARRA DE COR — "Filament", um instrumento de precisão.
 *
 * Uma apresentação inteira nasce de UM número, e este é o controle desse número:
 * escolhe as ARTES do deck e pinta o CROMO, ao vivo.
 *
 * O que torna esta barra premium NÃO é ornamento (gloss, joia, brilho), é PRECISÃO:
 *
 * 1. UM TRILHO FINO RECUADO com o degradê OKLab REAL (toneGradientCss). A cor exata
 *    embaixo da agulha é a cor exata que sai no slide: WYSIWYG de verdade.
 *
 * 2. A AGULHA DE CALIBRE: um fio branco com um NÚCLEO VIVO da cor atual (accentFor).
 *    O indicador literalmente segura a cor do deck. Anel escuro de 1px + sombra
 *    garantem que ele sobreviva no extremo Gelo (quase branco), onde branco sobre
 *    branco sumiria.
 *
 * 3. O LEITOR-HERÓI: uma amostra grande + o nome da cor + o hex, numa LINHA PRÓPRIA
 *    acima do trilho (no modo cheio) ou num CLUSTER FIXO À ESQUERDA (no compacto). O
 *    nome vive fora do caminho da agulha: ela NUNCA cobre o nome, em tom nenhum —
 *    nem no verde no talo. O bug de "a cor tapa o nome" morre por geometria, não por
 *    condicional. A prova está nos tons 0, 0.5 e 1.0.
 */

const STEP = 0.02;
const BIG_STEP = 0.1;
const EASE = [0.16, 1, 0.3, 1] as const;

/** rgba a partir de um hex #rrggbb — pra halos e anéis translúcidos do acento. */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

interface ToneBarProps {
  value: number;
  onChange: (tone: number) => void;
  /** As três capas ao vivo (só no modo cheio, onde há espaço). */
  showPreview?: boolean;
  /** Barra de uma linha pra faixa estreita do workspace: leitor à esquerda, trilho à direita. */
  compact?: boolean;
  className?: string;
}

export function ToneBar({ value, onChange, showPreview = true, compact = false, className }: ToneBarProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const tone = clampTone(value);
  const accent = accentFor(tone);
  const band = toneBandOf(tone);
  const pct = tone * 100;

  // O trilho é caro de montar (conversões OKLab) e NUNCA muda: memoiza uma vez.
  const track = useMemo(() => toneGradientCss('90deg', 28), []);
  const covers = useMemo(() => coversForTone(tone, 3), [tone]);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const rect = railRef.current?.getBoundingClientRect();
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
    if (dragging) setFromClientX(event.clientX);
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

  const railH = compact ? 8 : 10;
  const needleH = compact ? 20 : 26;
  const coreD = compact ? 9 : 12;

  /* O TRILHO: fio recuado + agulha de calibre com núcleo vivo. Compartilhado pelos dois modos. */
  const rail = (
    <div
      ref={railRef}
      role="slider"
      tabIndex={0}
      aria-label="Cor da apresentação"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(tone.toFixed(2))}
      aria-valuetext={`${band.label}, ${Math.round(pct)} por cento no eixo de cor`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onKeyDown={onKeyDown}
      className="relative flex cursor-pointer touch-none items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      style={{ height: compact ? 24 : 34 }}
    >
      {/* Luz de acento migrando sob a agulha — a "mesa" acende na cor escolhida (só no cheio). */}
      {!compact && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2"
          style={{
            left: `${pct}%`,
            width: 96,
            height: 84,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${rgba(accent, 0.22)} 0%, transparent 68%)`,
            filter: 'blur(4px)',
          }}
        />
      )}

      {/* Trilho fino recuado, com o degradê OKLab REAL e uma sombra projetada na cor atual. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full"
        style={{
          height: railH,
          background: track,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 2px rgba(0,0,0,0.5), 0 6px 16px -8px ${rgba(accent, 0.6)}`,
        }}
      />

      {/* A agulha: fio branco + núcleo vivo da cor. Anel escuro pra sobreviver no Gelo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2"
        style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 3,
            height: needleH,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.5)',
            transform: dragging ? 'scaleY(1.08)' : 'none',
            transition: 'transform 140ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: coreD,
              height: coreD,
              background: accent,
              boxShadow: `0 0 0 1.5px #fff, 0 0 0 2.5px rgba(0,0,0,0.22)${compact ? '' : `, 0 0 10px ${rgba(accent, 0.6)}`}`,
              transform: dragging ? 'scale(1.14)' : 'scale(1)',
              transition: 'transform 140ms cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </div>
      </div>
    </div>
  );

  /* O NOME DA COR, com crossfade suave ao cruzar as faixas. Largura mínima trava o jitter. */
  const nameEl = (className: string) => (
    <span className="relative inline-flex" style={{ minWidth: compact ? 36 : 58 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={band.label}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: EASE }}
          className={cn('font-semibold', className)}
          style={{ color: accent }}
        >
          {band.label}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  /* ------------------------------------------------------------------ */
  /* Modo COMPACTO (workspace): leitor à esquerda, trilho à direita.     */
  /* O nome fica fora do caminho da agulha — nunca é coberto.            */
  /* ------------------------------------------------------------------ */
  if (compact) {
    return (
      <div className={cn('flex select-none items-center gap-2.5', className)}>
        <span
          aria-hidden="true"
          className="h-4 w-4 flex-none rounded-md"
          style={{ background: accent, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 8px ${rgba(accent, 0.5)}` }}
        />
        {nameEl('text-[12px] leading-none')}
        <div className="min-w-0 flex-1 pr-1">{rail}</div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Modo CHEIO (wizard): leitor-herói acima, trilho, presets, capas.    */
  /* ------------------------------------------------------------------ */
  return (
    <div className={cn('select-none', className)}>
      {/* Leitor-herói: amostra grande + eyebrow + nome + hex. Vive ACIMA do trilho. */}
      <div className="mb-3.5 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-10 w-10 flex-none rounded-xl"
          style={{ background: accent, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 18px ${rgba(accent, 0.4)}` }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Tom do deck</div>
          <div className="mt-0.5 leading-none">{nameEl('text-[19px] leading-none tracking-[-0.01em]')}</div>
        </div>
        <span className="font-mono text-[11.5px] tabular-nums text-ink-muted">{accent.toUpperCase()}</span>
      </div>

      {rail}

      {/* Presets ancorados na fração REAL do degradê (0 / 0.5 / 1), não justify-between. */}
      <div className="relative mt-2 h-[16px]">
        {TONE_BANDS.map((b) => {
          const active = b.label === band.label;
          const pos: CSSProperties =
            b.at === 0
              ? { left: 0 }
              : b.at === 1
                ? { right: 0 }
                : { left: '50%', transform: 'translateX(-50%)' };
          return (
            <button
              key={b.label}
              type="button"
              onClick={() => onChange(b.at)}
              className={cn(
                'absolute top-0 text-[11px] font-semibold tracking-[0.04em] transition-colors duration-200',
                active ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary',
              )}
              style={active ? { ...pos, color: accentFor(b.at) } : pos}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Preview: as capas REAIS que este tom traz. */}
      {showPreview && (
        <div className="mt-4 grid grid-cols-3 gap-2">
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
