import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import logo from '@/assets/logos/citi-slides-logo.png';
import { Icon } from '@/components/ui/Icon';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  stepLabel: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Moldura do wizard de criação. Regra de ouro: a tela inteira cabe na
 * viewport — header, conteúdo e rodapé de navegação são fixos, então o botão
 * de continuar nunca exige rolagem. O conteúdo central rola internamente só
 * como rede de segurança em janelas muito baixas.
 */
export function WizardShell({ step, totalSteps, stepLabel, children, footer }: WizardShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app-bg">
      <header className="relative z-20 flex h-16 flex-none items-center justify-between border-b border-white/[0.05] bg-app-bg/85 px-8 backdrop-blur-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
        >
          <Icon name="chevron-right" size={14} className="rotate-180" />
          Voltar
        </Link>
        <img
          src={logo}
          alt="CITi Slides"
          className="absolute left-1/2 top-1/2 h-8 w-auto -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-surface px-3.5 py-1.5 text-[11.5px] font-medium text-ink-muted">
          <span className="text-ink-secondary">{stepLabel}</span>
          <span className="text-white/15">·</span>
          <span className="tabular-nums">
            {step}/{totalSteps}
          </span>
        </div>
      </header>

      <div className="h-[2px] w-full flex-none bg-white/[0.04]">
        <motion.div
          className="h-full rounded-r-full bg-gradient-to-r from-brand to-brand-glow shadow-[0_0_12px_rgba(45,219,96,0.55)]"
          initial={false}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* Luz ambiente: dois brilhos de marca muito discretos, atrás de tudo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/[0.05] blur-[120px]" />
          <div className="absolute -bottom-48 right-[-10%] h-[380px] w-[520px] rounded-full bg-brand/[0.03] blur-[110px]" />
        </div>
        <div className="relative mx-auto flex min-h-full w-full max-w-[1040px] flex-col justify-center px-8 py-7">
          {children}
        </div>
      </main>

      <footer className="z-20 flex-none border-t border-white/[0.05] bg-app-bg/85 px-8 backdrop-blur-md">
        {footer}
      </footer>
    </div>
  );
}
