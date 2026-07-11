/**
 * Cena do briefing: a ideia se digita sozinha num campo de vidro, com caret verde
 * piscando, e quando o texto termina os chips de tamanho e estilo "se escolhem"
 * com um pop. A cena roda em loop enquanto o passo está aberto. Com movimento
 * reduzido, tudo aparece pronto de uma vez.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/stores/settingsStore';
import { CheckBadge, DemoScene } from './primitives';

const BRIEF =
  'Pitch do CITi pra Sympla. Quero apresentar quem a gente é, três cases fortes e fechar com um convite pra parceria.';
/** Espelham as opções reais do wizard (data/creationOptions). */
const CHOICES = ['Pitch ou diretoria · 6 a 8 slides', 'Estilo Preciso'];
const TYPE_SPEED = 26;
const HOLD_AFTER = 4600;

export function BriefingDemo() {
  const { reduceMotion } = useSettings();
  const [chars, setChars] = useState(reduceMotion ? BRIEF.length : 0);
  const [showChoices, setShowChoices] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    let interval = 0;
    let timeouts: number[] = [];

    function cycle() {
      timeouts.forEach((t) => window.clearTimeout(t));
      timeouts = [];
      setChars(0);
      setShowChoices(false);
      interval = window.setInterval(() => {
        setChars((current) => {
          if (current >= BRIEF.length) {
            window.clearInterval(interval);
            timeouts.push(window.setTimeout(() => setShowChoices(true), 480));
            timeouts.push(window.setTimeout(cycle, HOLD_AFTER));
            return current;
          }
          return current + 1;
        });
      }, TYPE_SPEED);
    }

    cycle();
    return () => {
      window.clearInterval(interval);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [reduceMotion]);

  const typing = chars < BRIEF.length;

  return (
    <DemoScene>
      <div className="glass w-[min(560px,88%)] rounded-2xl p-7">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Seu briefing</span>
          <span className="text-[11px] text-ink-muted">{typing ? 'Escrevendo…' : 'Pronto'}</span>
        </div>

        <div className="mt-4 min-h-[110px] rounded-xl border border-white/[0.07] bg-black/30 p-4 text-[14px] leading-[1.7] text-ink-secondary">
          {BRIEF.slice(0, chars)}
          {typing && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-glow rounded-full bg-brand" />
          )}
        </div>

        {/* Os chips nascem com pop de mola quando o briefing termina. */}
        <div className="mt-4 flex min-h-[38px] flex-wrap items-center gap-2.5">
          <AnimatePresence>
            {showChoices &&
              CHOICES.map((choice, index) => (
                <motion.span
                  key={choice}
                  className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/[0.08] px-4 py-2 text-[12px] font-medium text-ink"
                  initial={{ opacity: 0, scale: 0.7, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26, delay: index * 0.14 }}
                >
                  <CheckBadge />
                  {choice}
                </motion.span>
              ))}
          </AnimatePresence>
        </div>

        <div className="mt-3 h-5">
          <AnimatePresence>
            {showChoices && (
              <motion.p
                className="m-0 text-[11.5px] text-ink-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.35 }}
              >
                Pronto, é só disso que a IA precisa.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DemoScene>
  );
}
