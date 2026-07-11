/**
 * Cena da edição: um mini-slide com um título contentEditable DE VERDADE.
 * O usuário clica, digita e vê o slide mudar na hora — é a promessa do passo
 * acontecendo na mão dele, não um vídeo. A dica pulsante some depois do
 * primeiro toque e uma barrinha de formatação aparece enquanto o foco dura.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { DemoScene, SlideCanvas } from './primitives';

export function EditorDemo() {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  return (
    <DemoScene className="gap-5">
      <SlideCanvas className="w-[min(600px,88%)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Nossa solução</div>

        <div className="relative mt-4">
          {/* Barrinha de formatação decorativa, aparece junto com o foco. */}
          <AnimatePresence>
            {focused && (
              <motion.div
                className="glass absolute -top-11 left-0 z-[1] flex items-center gap-1 rounded-lg px-1.5 py-1"
                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                <ToolbarChip>
                  <b>B</b>
                </ToolbarChip>
                <ToolbarChip>
                  <i>I</i>
                </ToolbarChip>
                <ToolbarChip>Aa</ToolbarChip>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            role="textbox"
            aria-label="Título do slide, editável"
            onFocus={() => {
              setFocused(true);
              setTouched(true);
            }}
            onBlur={() => setFocused(false)}
            className={cn(
              '-mx-2 -my-1 cursor-text rounded-lg px-2 py-1 text-[clamp(22px,2.6vw,30px)] font-bold leading-[1.1] tracking-[-0.03em] text-slide-fg outline-none transition-shadow duration-200',
              focused
                ? 'bg-white/[0.02] shadow-[0_0_0_2px_rgba(45,219,96,0.45)]'
                : 'hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]',
            )}
            style={{ caretColor: '#2ddb60' }}
          >
            Tecnologia que resolve de verdade
          </div>
        </div>

        <p className="mt-3 max-w-[75%] text-[12.5px] leading-[1.6] text-[#AEB6BF]">
          Times de estudantes construindo produtos reais, com a energia de quem quer mostrar serviço.
        </p>

        <div className="mt-auto flex items-center justify-between">
          <span className="h-[2px] w-10 rounded-full bg-brand/80" />
          <span className="font-mono text-[11px] text-brand/70">04</span>
        </div>
      </SlideCanvas>

      {/* Slot fixo embaixo: dica pulsante antes do toque, confirmação depois. */}
      <div className="flex h-9 items-center">
        <AnimatePresence mode="wait">
          {touched ? (
            <motion.span
              key="done"
              className="text-[12px] text-ink-muted"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              Isso. Todo bloco do workspace é editável assim.
            </motion.span>
          ) : (
            <motion.span
              key="hint"
              className="flex items-center gap-2 rounded-full border border-brand/30 bg-brand/[0.07] px-4 py-2 text-[12px] font-medium text-brand"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: [0, -4, 0] }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                opacity: { duration: 0.4, delay: 0.5 },
                y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <Icon name="edit" size={12} />
              Clique no título e edite você mesmo
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </DemoScene>
  );
}

function ToolbarChip({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] text-ink-secondary">
      {children}
    </span>
  );
}
