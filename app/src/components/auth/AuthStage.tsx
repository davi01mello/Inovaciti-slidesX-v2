/**
 * O palco: a cortina que cobre a viewport enquanto o app não pode aparecer.
 *
 * É AQUI que o fundo mora, e não dentro da tela de login, de propósito. O login e
 * a transição compartilham o MESMO shader; se cada um montasse o seu, o canvas
 * WebGL seria recriado no meio da animação e piscaria. O fundo fica; o que troca
 * por cima dele é o miolo (tela de login, depois a saudação).
 *
 * ORDEM DE ENTRADA (o fundo vem primeiro, e o conteúdo espera por ele):
 *   o palco monta e o fundo começa a se estabelecer (plano B na hora, shader em
 *   crossfade assim que compila). Só quando ele avisa que está pronto (onReady) a
 *   tela de login entra, escalonada. Antes era o contrário: o texto chegava numa
 *   tela quase preta e o fundo "aparecia" depois, de repente. Se o fundo demorar
 *   demais, o AuthBackdrop libera assim mesmo (teto de 1,4s): fundo bonito não
 *   segura o login.
 *
 * COREOGRAFIA DO LOGIN ACEITO (cada ato espera o anterior sair de cena):
 *   0.00s  a tela de login sai, e o app monta ATRÁS da cortina
 *   0.00s  o fundo avança e acende (o "surge")
 *   0.40s  com a tela já fora, a luz verde abre e a saudação entra
 *   1.45s  a cortina dissolve e revela o app, que já está pronto embaixo
 *
 * A dissolução anima SÓ opacidade: uma propriedade de compositor, que segue lisa
 * mesmo com a thread principal ocupada montando o app atrás da cortina.
 *
 * Menos movimento não pula a transição, só a suaviza: sem scale, sem bloom, mas
 * com os mesmos tempos de respiro. Cortar pra 0,25s era o que fazia a home entrar
 * de supetão. (MotionConfig cuida disso sozinho: reducedMotion desliga só as
 * chaves posicionais, e opacidade continua animando.)
 */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AuthBackdrop } from './AuthBackdrop';
import { AuthScreen } from './AuthScreen';
import { LaunchOverlay } from './LaunchOverlay';
import { useAuthFlow } from './useAuthFlow';
import type { AuthStepId } from './authSteps';

/**
 * O respiro entre o shader dar sinal de vida e o conteúdo começar a subir.
 *
 * Medido, não chutado: com o crossfade de 1s em ease-out, aos 420ms o fundo já
 * está por volta de 60% e claramente formado, mas ainda assentando. A tela de
 * login nasce sobre um fundo que existe, e não sobre um retângulo escuro (com
 * 240ms ela chegava com o fundo em 34%, ainda parecendo que a UI veio antes).
 */
const CONTENT_SETTLE_MS = 420;

/**
 * A cortina só começa a sair depois que a saudação já se apresentou.
 *
 * A curva é easeInOut, e não a EASE da casa. EASE é uma expo-out: perfeita pra
 * algo ENTRANDO (parte rápido, assenta macio), péssima pra algo SAINDO. Aplicada a
 * um fade-out, ela derrubava quase toda a opacidade nos primeiros 150ms e o app
 * aparecia num estalo. Medido: a cortina já estava em 0.29 no primeiro frame
 * capturado. Com easeInOut a saída começa devagar, acelera no meio e assenta, que
 * é o que dá a sensação de cortina subindo em vez de corte de câmera.
 */
const DISSOLVE_DELAY_S = 1.45;
const DISSOLVE_S = 0.75;
const DISSOLVE_DELAY_REDUCED_S = 1.3;
const DISSOLVE_REDUCED_S = 0.8;

interface AuthStageProps {
  steps: AuthStepId[];
  /** Login aceito: o app pode montar (ainda escondido atrás da cortina). */
  onAuthenticated: () => void;
  /** A cortina saiu de cena, o palco pode ser desmontado. */
  onRevealed: () => void;
}

export function AuthStage({ steps, onAuthenticated, onRevealed }: AuthStageProps) {
  const reduced = useReducedMotion();
  const [backdropReady, setBackdropReady] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const flow = useAuthFlow(steps, (name) => {
    setDisplayName(name);
    setLaunching(true);
    onAuthenticated();
  });

  const handleBackdropReady = useCallback(() => setBackdropReady(true), []);

  useEffect(() => {
    if (!backdropReady) return;
    const id = window.setTimeout(() => setShowContent(true), CONTENT_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [backdropReady]);

  const curtain: Variants = {
    idle: { opacity: 1 },
    launching: {
      opacity: 0,
      transition: reduced
        ? { duration: DISSOLVE_REDUCED_S, delay: DISSOLVE_DELAY_REDUCED_S, ease: 'easeInOut' }
        : { duration: DISSOLVE_S, delay: DISSOLVE_DELAY_S, ease: 'easeInOut' },
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
        <AuthBackdrop surge={launching} onReady={handleBackdropReady} />

        <AnimatePresence>
          {showContent && !launching && <AuthScreen key="screen" flow={flow} />}
        </AnimatePresence>

        {launching && <LaunchOverlay displayName={displayName} />}
      </motion.div>
    </MotionConfig>
  );
}
