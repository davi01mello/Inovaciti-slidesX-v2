/**
 * A tela de login: logo, a frase da casa, o campo único e o apoio do passo atual.
 *
 * A headline NÃO muda entre os passos, de propósito — ela é a âncora da marca. O
 * que muda é o campo e o texto de apoio, e é essa combinação (moldura firme, miolo
 * vivo) que dá a sensação de um fluxo só em vez de três telas.
 *
 * Tudo entra escalonado e sai junto: a saída daqui é o primeiro gesto da transição
 * pro app (quem coreografa é o AuthStage).
 */
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { cn } from '@/lib/cn';
import logo from '@/assets/citi-slides-logo.png';
import { AuthField } from './AuthField';
import type { AuthFlow } from './useAuthFlow';

const EASE = [0.16, 1, 0.3, 1] as const;

const CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  exit: {
    opacity: 0,
    y: -28,
    filter: 'blur(10px)',
    transition: { duration: 0.42, ease: EASE },
  },
};

const ITEM: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } },
};

/** Progresso do fluxo. Some quando só há um passo — um pontinho sozinho não informa nada. */
function StepDots({ index, total }: { index: number; total: number }) {
  if (total < 2) return null;
  return (
    <div className="flex items-center justify-center gap-2" role="presentation">
      {Array.from({ length: total }, (_, dot) => (
        <span
          key={dot}
          // O ponto inativo é branco/40 e não branco/15: sobre o verde claro do
          // shader, um cinza fraco desaparece por completo.
          className={cn(
            'h-1.5 rounded-full shadow-[0_1px_6px_rgba(0,0,0,0.6)] transition-all duration-500',
            dot === index ? 'w-6 bg-brand' : dot < index ? 'w-1.5 bg-brand/70' : 'w-1.5 bg-white/40',
          )}
        />
      ))}
    </div>
  );
}

interface AuthScreenProps {
  flow: AuthFlow;
}

export function AuthScreen({ flow }: AuthScreenProps) {
  const { step, index, total, canGoBack, back } = flow;

  return (
    <motion.div
      variants={CONTAINER}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto px-6 py-12"
    >
      {/* O shader é vivo e claro por natureza, e é pra ser. Quem garante o contraste
          do texto é este halo: um assento escuro atrás da coluna de conteúdo, com
          borda difusa. Ele não achata o fundo (as bordas da tela seguem acesas),
          só dá chão pra tipografia no miolo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[46rem] w-[52rem] max-w-[130vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgba(5,6,7,0.86), rgba(5,6,7,0.62) 55%, transparent 100%)',
          filter: 'blur(28px)',
        }}
      />

      <motion.img
        variants={ITEM}
        src={logo}
        alt="CITi Slides"
        className="relative mb-9 h-14 w-auto object-contain drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]"
      />

      <motion.h1
        variants={ITEM}
        className="relative m-0 text-center text-[clamp(1.85rem,5.5vw,3.15rem)] font-light italic leading-[1.1] tracking-[-0.02em] text-ink text-balance"
        style={{ textShadow: '0 2px 26px rgba(0,0,0,0.6), 0 0 52px rgba(45,219,96,0.22)' }}
      >
        Fazemos a Mágica Acontecer
      </motion.h1>

      <motion.div variants={ITEM} className="relative mt-10 w-full max-w-xl">
        <AuthField
          step={step}
          value={flow.value}
          onChange={flow.setValue}
          onSubmit={flow.submit}
          submitting={flow.submitting}
          error={flow.error}
          errorNonce={flow.errorNonce}
        />
      </motion.div>

      <motion.div variants={ITEM} className="relative mt-5">
        <StepDots index={index} total={total} />
      </motion.div>

      {/* Apoio + voltar: o bloco tem altura mínima pra troca de passo não sacudir a
          coluna. O texto é ink-secondary (e não ink-muted) com sombra: sobre um fundo
          que se mexe e clareia, cinza fraco simplesmente some. */}
      <motion.div
        variants={ITEM}
        className="relative mt-7 flex min-h-[5.5rem] flex-col items-center gap-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="m-0 max-w-md text-center text-[15px] font-light leading-relaxed text-ink-secondary text-pretty"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.75)' }}
          >
            {step.support.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </motion.p>
        </AnimatePresence>

        {canGoBack && (
          <button
            type="button"
            onClick={back}
            className="rounded-full border border-white/10 bg-black/35 px-3.5 py-1.5 text-[13px] text-ink-secondary backdrop-blur-md transition-colors duration-300 hover:border-brand/40 hover:text-brand-glow"
          >
            Voltar para o usuário
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
