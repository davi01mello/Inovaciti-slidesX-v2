/**
 * Guia rápido do CITi Slides: experiência imersiva de tela cheia com seis cenas
 * animadas que percorrem o fluxo real do app, do briefing ao modo de apresentação.
 * Texto à esquerda, palco vivo à direita (com uma inclinação 3D sutil que segue o
 * cursor), progresso clicável embaixo. Navega por botões, pontos e teclado
 * (setas avançam e voltam, Esc fecha).
 *
 * Montado uma vez em App.tsx e controlado pelo onboardingStore — hoje quem abre é
 * o botão "Ver guia rápido" do card da sidebar. O estado do passo vive dentro do
 * overlay, então cada abertura recomeça da primeira cena. O último passo desagua
 * no wizard (/nova), fechando o ciclo do onboarding com ação de verdade.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { TOUR_STEPS } from '@/components/onboarding/steps';
import { closeOnboarding, useOnboardingOpen } from '@/stores/onboardingStore';
import { useSettings } from '@/stores/settingsStore';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/cn';
import logo from '@/assets/logos/citi-slides-logo.png';

/** O mesmo grão de material do AppShell, pro overlay não parecer "chapado". */
const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function OnboardingTour() {
  const open = useOnboardingOpen();
  return <AnimatePresence>{open && <TourOverlay />}</AnimatePresence>;
}

function TourOverlay() {
  const navigate = useNavigate();
  const { reduceMotion } = useSettings();
  const [index, setIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trava o scroll da página enquanto o tour cobre a tela.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Foco entra no overlay pra navegação por teclado funcionar de imediato.
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  // Teclado: setas navegam, Esc fecha. Setas são ignoradas com o foco num campo
  // editável (a cena de edição tem um bloco contentEditable de verdade).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeOnboarding();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const step = TOUR_STEPS[index];
  if (!step) return null;

  const isFirst = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;
  const Demo = step.demo;
  const primaryLabel = isFirst ? 'Começar o tour' : isLast ? 'Criar minha primeira apresentação' : 'Avançar';

  function advance() {
    if (isLast) {
      closeOnboarding();
      navigate('/nova');
      return;
    }
    setIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
  }

  return (
    <motion.div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Guia rápido do CITi Slides"
      className="fixed inset-0 z-[70] overflow-hidden bg-[#030405] outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <TourBackdrop />

        <motion.div
          className="relative z-[1] flex h-full flex-col"
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Topo: marca à esquerda, contador e saída à direita. */}
          <header className="flex items-center justify-between px-10 py-6">
            <img src={logo} alt="CITi Slides" className="h-9 w-auto object-contain" />
            <div className="flex items-center gap-4">
              <span className="font-mono text-[12px] tracking-[0.08em] text-ink-muted">
                {String(index + 1).padStart(2, '0')} / {String(TOUR_STEPS.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={closeOnboarding}
                className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12.5px] font-medium text-ink-secondary transition-colors duration-150 hover:border-white/[0.16] hover:text-ink"
              >
                Pular tour
                <Kbd>esc</Kbd>
              </button>
            </div>
          </header>

          {/* Corpo: narrativa à esquerda, palco vivo à direita. */}
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(360px,440px)_minmax(0,1fr)] items-center gap-[5vw] px-[5.5vw]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                className="min-w-0"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                  <span aria-hidden="true" className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
                  {step.kicker}
                </div>
                <h2 className="m-0 mt-4 text-[clamp(30px,3.2vw,42px)] font-bold leading-[1.06] tracking-[-0.03em] text-ink">
                  {step.title}{' '}
                  <span className="bg-gradient-to-r from-brand to-brand-glow bg-clip-text text-transparent">
                    {step.accent}
                  </span>
                </h2>
                <p className="m-0 mt-4 max-w-[400px] text-[14.5px] leading-[1.75] text-ink-secondary">
                  {step.description}
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  {!isFirst && (
                    <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                      Voltar
                    </Button>
                  )}
                  <Button onClick={advance}>
                    {primaryLabel}
                    <Icon name="chevron-right" size={12} />
                  </Button>
                  {isLast && (
                    <Button variant="ghost" onClick={closeOnboarding}>
                      Explorar por conta
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <TiltStage reduceMotion={reduceMotion}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.97, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.985, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Demo />
                </motion.div>
              </AnimatePresence>
            </TiltStage>
          </div>

          {/* Rodapé: progresso clicável no centro, atalhos à direita. */}
          <footer className="grid grid-cols-[1fr_auto_1fr] items-center px-10 pb-7 pt-4">
            <span />
            <div className="flex items-center gap-2.5">
              {TOUR_STEPS.map((tourStep, stepIndex) => (
                <button
                  key={tourStep.id}
                  type="button"
                  onClick={() => setIndex(stepIndex)}
                  aria-label={`Ir para ${tourStep.kicker}`}
                  className="group flex h-6 items-center"
                >
                  <span
                    className={cn(
                      'block h-[5px] rounded-full transition-all duration-300',
                      stepIndex === index
                        ? 'w-11 bg-brand shadow-[0_0_12px_rgba(45,219,96,0.6)]'
                        : stepIndex < index
                          ? 'w-5 bg-brand/40 group-hover:bg-brand/60'
                          : 'w-5 bg-white/10 group-hover:bg-white/20',
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1.5 text-[11px] text-ink-muted">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
              <span className="ml-1">navegam</span>
            </div>
          </footer>
        </motion.div>
      </MotionConfig>
    </motion.div>
  );
}

/** Fundo do tour: orbes verdes em deriva lenta, grão de material e vinheta. */
function TourBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute -left-[10%] top-[-20%] h-[55vh] w-[55vh] rounded-full opacity-[0.16]"
        style={{
          background: 'radial-gradient(circle, rgba(45,219,96,0.55) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'aurora-drift-a 26s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-25%] right-[-8%] h-[60vh] w-[60vh] rounded-full opacity-[0.12]"
        style={{
          background: 'radial-gradient(circle, rgba(122,242,165,0.5) 0%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'aurora-drift-b 32s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: GRAIN_DATA_URI }} />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
      />
    </div>
  );
}

/**
 * Palco das demos: um painel de vidro escuro 16:10 com uma inclinação 3D sutil
 * que segue o cursor (springs, nunca brusca). Com movimento reduzido o palco
 * fica plano e parado.
 */
function TiltStage({ reduceMotion, children }: { reduceMotion: boolean; children: ReactNode }) {
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [3.5, -3.5]), { stiffness: 140, damping: 22 });
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-4.5, 4.5]), { stiffness: 140, damping: 22 });

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  }

  function onMouseLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <div
      className="flex min-h-0 items-center justify-center"
      style={{ perspective: 1400 }}
      onMouseMove={reduceMotion ? undefined : onMouseMove}
      onMouseLeave={reduceMotion ? undefined : onMouseLeave}
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.9),0_0_0_1px_rgba(45,219,96,0.05)]"
        style={{
          rotateX: reduceMotion ? 0 : rotateX,
          rotateY: reduceMotion ? 0 : rotateY,
          // 16:10 limitado por largura E altura: 99vh ≈ 62vh de altura na proporção.
          width: 'min(860px, 100%, 99vh)',
          aspectRatio: '16 / 10',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(165deg, #0a0d10 0%, #060809 55%, #080b0d 100%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
        <div className="absolute inset-0">{children}</div>
      </motion.div>
    </div>
  );
}
