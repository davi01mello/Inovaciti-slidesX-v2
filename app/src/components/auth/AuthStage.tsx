/**
 * O palco: a cortina que cobre a viewport inteira enquanto o app não pode aparecer.
 *
 * É AQUI que o fundo mora, e não dentro da tela de login — de propósito. O login e
 * a transição compartilham o MESMO shader; se cada um montasse o seu, o canvas
 * WebGL seria recriado no meio da animação e piscaria. O fundo fica; o que troca
 * por cima dele é o miolo (tela de login → saudação).
 *
 * Coreografia do login aceito:
 *   0.00s  a tela de login sai (sobe, desfoca, some)
 *   0.00s  o fundo avança e acende (o "surge")   ── e o app monta ATRÁS da cortina
 *   ~0.4s  a luz verde abre e a saudação entra
 *   1.15s  a cortina inteira dissolve pra frente e revela o app já pronto
 *
 * Quem pediu menos movimento pula tudo isso: a cortina só apaga (0.4s no total).
 */
import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AuthBackdrop } from './AuthBackdrop';
import { AuthScreen } from './AuthScreen';
import { LaunchOverlay } from './LaunchOverlay';
import { useAuthFlow } from './useAuthFlow';
import type { AuthStepId } from './authSteps';

const EASE = [0.16, 1, 0.3, 1] as const;

/** A cortina só começa a sair depois que a saudação já se apresentou. */
const DISSOLVE_DELAY_S = 1.15;
const DISSOLVE_S = 0.7;

interface AuthStageProps {
  steps: AuthStepId[];
  /** Login aceito: o app pode montar (ainda escondido atrás da cortina). */
  onAuthenticated: () => void;
  /** A cortina saiu de cena — o palco pode ser desmontado. */
  onRevealed: () => void;
}

export function AuthStage({ steps, onAuthenticated, onRevealed }: AuthStageProps) {
  const reduced = useReducedMotion();
  const [launching, setLaunching] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const flow = useAuthFlow(steps, (name) => {
    setDisplayName(name);
    setLaunching(true);
    onAuthenticated();
  });

  const curtain: Variants = {
    idle: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    launching: {
      opacity: 0,
      scale: reduced ? 1 : 1.12,
      filter: reduced ? 'blur(0px)' : 'blur(26px)',
      transition: reduced
        ? { duration: 0.25, delay: 0.15, ease: 'linear' }
        : { duration: DISSOLVE_S, delay: DISSOLVE_DELAY_S, ease: EASE },
    },
  };

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <motion.div
        // initial={false}: o palco já nasce na tela. Quem faz entrada aqui é o
        // conteúdo (escalonado), não a cortina.
        initial={false}
        variants={curtain}
        animate={launching ? 'launching' : 'idle'}
        onAnimationComplete={(state) => {
          if (state === 'launching') onRevealed();
        }}
        className="fixed inset-0 z-[200] overflow-hidden bg-[#050607]"
      >
        <AuthBackdrop surge={launching} />

        <AnimatePresence>{!launching && <AuthScreen key="screen" flow={flow} />}</AnimatePresence>

        {launching && <LaunchOverlay displayName={displayName} />}
      </motion.div>
    </MotionConfig>
  );
}
