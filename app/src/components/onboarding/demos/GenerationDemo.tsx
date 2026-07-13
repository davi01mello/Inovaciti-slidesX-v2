/**
 * Cena da geração: os bastidores do app (GENERATION_STAGES) rodam numa barra de
 * progresso enquanto o slide nasce de um esqueleto com varredura de luz — e no
 * fim a composição revela o resultado com a identidade CITi aplicada. Loop contínuo.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GENERATION_STAGES } from '@/data/generationStages';
import { cn } from '@/lib/cn';
import { CheckBadge, DemoScene, MockSlideContent, SlideCanvas } from './primitives';

/** Quanto tempo o slide pronto fica em cena antes do loop recomeçar. */
const REVEAL_HOLD = 3400;

export function GenerationDemo() {
  const [stageIndex, setStageIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    function run(index: number) {
      if (cancelled) return;
      if (index >= GENERATION_STAGES.length) {
        setDone(true);
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return;
            setDone(false);
            run(0);
          }, REVEAL_HOLD),
        );
        return;
      }
      setStageIndex(index);
      const duration = GENERATION_STAGES[index]?.duration ?? 900;
      timers.push(window.setTimeout(() => run(index + 1), duration));
    }

    run(0);
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const stage = GENERATION_STAGES[stageIndex];
  const progress = done ? 1 : (stageIndex + 1) / GENERATION_STAGES.length;

  return (
    <DemoScene className="gap-5">
      <SlideCanvas className="w-[min(580px,86%)]">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="final"
              className="flex h-full flex-col"
              initial={{ opacity: 0, scale: 1.035 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <MockSlideContent kicker="CITi · Sympla" lead="Play no" accent="futuro" index="01" />
            </motion.div>
          ) : (
            <motion.div
              key="skeleton"
              className="relative flex h-full flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <SkeletonBar className="h-2.5 w-24" delay={0} />
              <div className="flex flex-1 flex-col justify-center gap-3">
                <SkeletonBar className="h-6 w-[72%]" delay={0.15} />
                <SkeletonBar className="h-6 w-[46%] bg-brand/15" delay={0.3} />
              </div>
              <div className="flex items-center justify-between">
                <SkeletonBar className="h-[3px] w-10" delay={0.45} />
                <SkeletonBar className="h-3 w-6" delay={0.6} />
              </div>

              {/* Varredura de luz verde: o "render" passando pelo slide. */}
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-28"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(45,219,96,0.07), transparent)' }}
                animate={{ left: ['-18%', '108%'] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SlideCanvas>

      <div className="w-[min(580px,86%)]">
        <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-glow shadow-[0_0_12px_rgba(45,219,96,0.5)]"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>

        <div className="mt-3 flex h-10 items-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={done ? 'done' : (stage?.id ?? 'stage')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              {done ? (
                <div className="flex items-center gap-2 text-[13px] font-semibold text-brand">
                  <CheckBadge />
                  Pronto. Identidade CITi aplicada.
                </div>
              ) : (
                <>
                  <div className="text-[13px] font-semibold text-ink">{stage?.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-muted">{stage?.detail}</div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DemoScene>
  );
}

function SkeletonBar({ className, delay }: { className: string; delay: number }) {
  return (
    <motion.div
      className={cn('rounded-md bg-white/[0.08]', className)}
      animate={{ opacity: [0.4, 0.85, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}
