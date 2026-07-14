import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { SlideComposition } from '@/components/present/SlideComposition';
import { buildTestDeck } from '@/harness/deck';
import { planFor } from '@/services/deckPlan';
import { composeSlide } from '@/services/slideArchetype';
import { findOverflowing } from '@/lib/textFit';
import { toneBandOf, toneGradientCss } from '@/services/tone';
import type { Slide } from '@/types/slide';

/**
 * O HARNESS VISUAL.
 *
 * Não entra no bundle de produção: o Vite só constrói index.html por padrão, e
 * este arquivo tem entrada própria (harness.html). Em dev ele é servido; em build
 * ele nem é olhado.
 *
 * Serve pra UMA coisa: OLHAR os slides. Foi olhando que cada bug feio apareceu —
 * nenhum deles aparecia no typecheck, no lint ou nos números.
 *
 *   ?tone=1&debug=1   liga o overlay de medição
 *   ?tone=0.55        renderiza o deck inteiro naquele tom
 */

const TONES = [1, 0.55, 0.12];

function useQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    tone: params.has('tone') ? Number(params.get('tone')) : null,
    debug: params.get('debug') === '1',
    only: params.get('only'),
  };
}

/** O teste de NÃO-VAZAMENTO: roda no navegador, em cima do DOM de verdade. */
function OverflowReport({ deckKey }: { deckKey: string }) {
  const [report, setReport] = useState<string>('medindo...');

  useMemo(() => {
    window.setTimeout(() => {
      const stages = Array.from(document.querySelectorAll<HTMLElement>('[data-slide-stage]'));
      let total = 0;
      const bad: string[] = [];
      for (const stage of stages) {
        const over = findOverflowing(stage);
        total += over.length;
        for (const o of over) {
          bad.push(`${stage.dataset['archetype']}: +${o.over}px "${(o.el.textContent ?? '').slice(0, 30)}"`);
        }
      }
      setReport(
        total === 0
          ? `NADA VAZOU — ${stages.length} slides, 0 containers estourados`
          : `VAZOU: ${total} container(s)\n${bad.join('\n')}`,
      );
    }, 900);
  }, [deckKey]);

  const ok = report.startsWith('NADA');
  return (
    <div
      data-overflow-report={ok ? 'ok' : 'fail'}
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 999,
        padding: '10px 14px',
        borderRadius: 10,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        maxWidth: 420,
        background: ok ? 'rgba(20,120,60,0.95)' : 'rgba(170,30,40,0.96)',
        color: '#fff',
        fontWeight: 700,
      }}
    >
      {report}
    </div>
  );
}

function Stage({ slide, tone, art, debug }: { slide: Slide; tone: number; art?: { artId: string; arrangementId: string }; debug: boolean }) {
  const plan = composeSlide(slide);
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <SlideComposition slide={slide} tone={tone} art={art} debug={debug} />
      </div>
      <figcaption
        style={{
          marginTop: 6,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          color: '#9aa4ae',
          display: 'flex',
          gap: 8,
        }}
      >
        <b style={{ color: '#e6edf3' }}>{plan.archetype}</b>
        <span>{art?.artId}</span>
        <span>{art?.arrangementId}</span>
      </figcaption>
    </figure>
  );
}

function Harness() {
  const { tone: qTone, debug, only } = useQuery();
  const slides = useMemo(() => buildTestDeck(), []);
  const tones = qTone !== null ? [qTone] : TONES;

  return (
    <div style={{ padding: 24, background: '#08090a', minHeight: '100vh' }}>
      {tones.map((tone) => {
        const plan = planFor('harness-deck-0001', tone, slides);
        const shown = only ? slides.filter((s) => composeSlide(s).archetype === only) : slides;
        return (
          <section key={tone} style={{ marginBottom: 40 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <h2 style={{ color: '#fff', font: '700 18px/1.2 system-ui', margin: 0 }}>
                tone {tone.toFixed(2)} · {toneBandOf(tone).label}
              </h2>
              <div
                style={{
                  height: 14,
                  width: 260,
                  borderRadius: 999,
                  background: toneGradientCss('90deg', 24),
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                }}
              />
            </header>
            <div
              data-deck={String(tone)}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 22 }}
            >
              {shown.map((slide) => (
                <Stage key={slide.id} slide={slide} tone={tone} art={plan.art.get(slide.id)} debug={debug} />
              ))}
            </div>
          </section>
        );
      })}
      <OverflowReport deckKey={tones.join(',')} />
    </div>
  );
}

createRoot(document.getElementById('harness')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
