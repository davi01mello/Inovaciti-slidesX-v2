/**
 * Cena do palco: o modo apresentação passando slides sozinho, com contador,
 * setas e atalhos — e o lembrete de que o deck sai em PPTX pra levar onde
 * quiser. Fecha o tour mostrando o destino final do fluxo.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import { DemoScene, MockSlideContent, SlideCanvas } from './primitives';

const SLIDES = [
  { kicker: 'CITi · Sympla', lead: 'Play no', accent: 'futuro', index: '01' },
  { kicker: 'Cases', lead: 'Provas, não', accent: 'promessas', index: '02' },
  { kicker: 'Fechamento', lead: 'Bora construir', accent: 'juntos', index: '03' },
];

export function PresentDemo() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 3200);
    return () => window.clearInterval(interval);
  }, []);

  const slide = SLIDES[current];

  return (
    <DemoScene className="gap-5">
      <SlideCanvas className="w-[min(580px,86%)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="flex h-full flex-col"
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -22 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            {slide && <MockSlideContent {...slide} />}
          </motion.div>
        </AnimatePresence>
      </SlideCanvas>

      <div className="flex w-[min(580px,86%)] items-center justify-between">
        {/* Controle de navegação: a seta da direita "acende" a cada avanço. */}
        <div className="glass flex items-center gap-3 rounded-full px-4 py-2">
          <Icon name="chevron-right" size={11} className="rotate-180 text-ink-muted" />
          <span className="font-mono text-[11.5px] tracking-[0.1em] text-ink-secondary">
            {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          </span>
          <motion.span
            key={current}
            className="flex"
            initial={{ scale: 1.35, color: '#2ddb60' }}
            animate={{ scale: 1, color: '#8a93a0' }}
            transition={{ duration: 0.5 }}
          >
            <Icon name="chevron-right" size={11} />
          </motion.span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <span className="ml-1">navegam no telão</span>
        </div>

        <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium text-ink-secondary">
          <Icon name="import" size={13} className="text-brand" />
          Exporta em PPTX
        </div>
      </div>
    </DemoScene>
  );
}
