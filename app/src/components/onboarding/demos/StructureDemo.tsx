/**
 * Cena da estrutura: os slides sugeridos entram em cascata e, em loop, um deles
 * troca de posição com animação de layout — a promessa do passo é "reordene à
 * vontade", então o palco mostra exatamente isso acontecendo, com os números
 * se reajustando na hora.
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { DemoScene } from './primitives';

interface OutlineItem {
  id: string;
  title: string;
}

const BASE_ORDER: OutlineItem[] = [
  { id: 'capa', title: 'Capa · Play no futuro' },
  { id: 'quem', title: 'Quem é o CITi' },
  { id: 'cases', title: 'Cases que provam' },
  { id: 'como', title: 'Como a gente trabalha' },
  { id: 'proximos', title: 'Próximos passos' },
];

/** A linha que sobe e desce no loop, encenando a reordenação. */
const MOVING_ID = 'como';

function reorder(items: OutlineItem[], moved: boolean): OutlineItem[] {
  if (!moved) return items;
  const from = items.findIndex((item) => item.id === MOVING_ID);
  if (from < 0) return items;
  const next = [...items];
  const [target] = next.splice(from, 1);
  if (!target) return items;
  next.splice(1, 0, target);
  return next;
}

export function StructureDemo() {
  const [moved, setMoved] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const interval = window.setInterval(() => {
      setMoved((m) => !m);
      setPulse(true);
      timers.push(window.setTimeout(() => setPulse(false), 900));
    }, 3000);
    return () => {
      window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const items = reorder(BASE_ORDER, moved);

  return (
    <DemoScene>
      <div className="w-[min(480px,86%)]">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Estrutura sugerida</span>
          <span className="text-[11px] text-ink-muted">5 slides · Pitch</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {items.map((item, position) => {
            const highlighted = pulse && item.id === MOVING_ID;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 26 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  layout: { type: 'spring', stiffness: 380, damping: 32 },
                  opacity: { duration: 0.4, delay: position * 0.09 },
                  x: { duration: 0.4, delay: position * 0.09 },
                }}
                className={cn(
                  'flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-colors duration-300',
                  highlighted
                    ? 'border-brand/50 bg-brand/[0.07] shadow-[0_0_24px_-8px_rgba(45,219,96,0.5)]'
                    : 'border-white/[0.07] bg-white/[0.03]',
                )}
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-brand/25 bg-brand/[0.08] font-mono text-[11px] font-semibold text-brand">
                  {String(position + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 truncate text-[13px] font-medium text-ink">{item.title}</span>
                <Grip />
              </motion.div>
            );
          })}
        </div>

        <p className="m-0 mt-3.5 px-1 text-[11.5px] text-ink-muted">A IA sugere a ordem, você arrasta como quiser.</p>
      </div>
    </DemoScene>
  );
}

/** Pega de arrasto: seis pontinhos, o affordance clássico de "me arraste". */
function Grip() {
  return (
    <span aria-hidden="true" className="grid flex-none grid-cols-2 gap-[3px] opacity-35">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-ink-secondary" />
      ))}
    </span>
  );
}
