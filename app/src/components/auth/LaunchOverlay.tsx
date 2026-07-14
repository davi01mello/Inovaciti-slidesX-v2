/**
 * O miolo da transição login para app: a luz verde que "abre" o sistema e a saudação.
 *
 * Aparece depois que a tela de login já saiu e enquanto o app monta ATRÁS da
 * cortina. Quando o AuthStage dissolve, o que está embaixo já está pronto. Sem
 * spinner, sem tela branca: o carregamento acontece dentro da animação.
 */
import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { firstNameOf } from '@/stores/userStore';

/**
 * A saudação espera a tela de login TERMINAR de sair (0.45s, ver AuthScreen) antes
 * de entrar. Sem essa pausa, "Fazemos Mágica..." subindo e "Bem-vindo" nascendo
 * disputavam o centro da tela ao mesmo tempo, e era isso que parecia grosseiro.
 */
const ENTER_DELAY_S = 0.4;

interface LaunchOverlayProps {
  /** Vazio pra quem não tem nome pessoal salvo: aí a saudação é genérica. */
  displayName: string;
}

export function LaunchOverlay({ displayName }: LaunchOverlayProps) {
  const reduced = useReducedMotion();
  const first = firstNameOf(displayName);
  const greeting = first ? `Bem-vindo, ${first}` : 'Bem-vindo de volta';

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute h-[42vmin] w-[42vmin] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(122,242,165,0.95), rgba(45,219,96,0.45) 45%, transparent 70%)',
          }}
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.4, 4.4], opacity: [0, 0.85, 0] }}
          // ATENÇÃO: com keyframes e `times`, o Framer lê um `ease` em ARRAY como
          // "uma curva por segmento". Passar a cubic-bezier [0.16,1,0.3,1] aqui vira
          // 4 easings inválidos e a animação simplesmente não roda (o bloom não
          // aparecia). Em keyframes, easing tem que ser string ou array DE curvas.
          transition={{ delay: ENTER_DELAY_S, duration: 1.25, times: [0, 0.32, 1], ease: 'easeOut' }}
        />
      )}

      {/* A saudação entra, segura o palco sozinha e começa a se recolher já dentro
          da janela da dissolução da cortina: ela nunca some num corte, vai junto
          com a luz.

          Menos movimento NÃO significa "aparecer pronta na tela". Significa sem
          deslocamento e sem desfoque: o fade fica, com os mesmos tempos. Mostrar a
          saudação instantaneamente (era o que este ramo fazia) é justamente o que
          fazia a entrada na home parecer um corte seco. */}
      <motion.p
        className="relative m-0 text-center text-[clamp(1.5rem,4vw,2.5rem)] font-light italic tracking-[-0.02em] text-ink"
        style={{ textShadow: '0 0 40px rgba(45,219,96,0.35)' }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(10px)' }}
        animate={
          reduced
            ? { opacity: [0, 1, 1, 0] }
            : {
                opacity: [0, 1, 1, 0],
                y: [14, 0, 0, -10],
                filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(6px)'],
              }
        }
        transition={{
          delay: ENTER_DELAY_S,
          duration: 1.5,
          times: reduced ? [0, 0.28, 0.72, 1] : [0, 0.3, 0.75, 1],
          ease: 'easeOut',
        }}
      >
        {greeting}
      </motion.p>
    </div>
  );
}
