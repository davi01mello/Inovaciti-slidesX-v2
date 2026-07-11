/**
 * Peças compartilhadas pelas cenas do guia rápido. Mantêm o palco coeso:
 * a mesma área útil, o mesmo mini-slide escuro dos decks gerados e o mesmo
 * selo de confirmação verde — pra cada demo parecer parte do mesmo filme.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Área útil de uma cena: centraliza o conteúdo dentro do palco. */
export function DemoScene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center p-10', className)}>{children}</div>
  );
}

/** Mini-slide no formato dos decks gerados: 16:9, preto profundo, respiro verde. */
export function SlideCanvas({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#050607] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]',
        className,
      )}
      style={{ aspectRatio: '16 / 9' }}
    >
      {/* O mesmo brilho de canto dos slides reais: luz verde discreta no topo direito. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 85% -10%, rgba(45,219,96,0.10) 0%, transparent 60%)' }}
      />
      <div className="relative flex h-full flex-col p-[7%]">{children}</div>
    </div>
  );
}

/** Conteúdo de um slide de exemplo: kicker, título com acento verde, divisor e índice. */
export function MockSlideContent({
  kicker,
  lead,
  accent,
  index,
}: {
  kicker: string;
  lead: string;
  accent: string;
  index: string;
}) {
  return (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">{kicker}</div>
      <div className="flex flex-1 items-center">
        <div className="text-[clamp(22px,3vw,34px)] font-bold leading-[1.05] tracking-[-0.03em] text-slide-fg">
          {lead} <span className="text-slide-hl">{accent}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="h-[2px] w-10 rounded-full bg-brand/80" />
        <span className="font-mono text-[11px] text-brand/70">{index}</span>
      </div>
    </>
  );
}

/** Selo redondo de confirmação, verde com check preto. */
export function CheckBadge() {
  return (
    <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand text-[#0A1210]">
      <svg
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 13 4 4L19 7" />
      </svg>
    </span>
  );
}
