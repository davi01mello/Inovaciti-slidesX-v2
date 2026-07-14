/**
 * O fundo vivo da tela de login: o shader Warp (WebGL2) nas cores da marca.
 *
 * TRÊS GARANTIAS, e cada linha aqui existe por uma delas.
 *
 * 1. A tela nunca fica preta. O plano B (BackdropBase) está montado SEMPRE, por
 *    baixo, e pinta no primeiro frame. O shader é melhoria progressiva: entra em
 *    crossfade por cima quando (e só quando) está de fato desenhando. Qualquer
 *    falha (WebGL2 ausente, chunk que não baixou, exceção no mount, canvas que
 *    nunca apareceu, GPU perdida no meio) só remove a camada de cima e revela o
 *    que já estava lá. Não existe estado intermediário.
 *
 * 2. O fundo chega ANTES do conteúdo. O chunk é aquecido no boot do app (fetch no
 *    nível do módulo) e o shader monta imediatamente, sem espera artificial. Quando
 *    ele está vivo, avisa o palco (onReady) e só então a tela de login entra. Era o
 *    inverso antes: texto primeiro, fundo depois, e o fundo "aparecia" de repente.
 *
 * 3. O crossfade é ANIMADO EM JS, não em CSS. O corte global de reduce-motion
 *    (index.css) zera transition-duration com !important, o que transformava o
 *    fade de 1s do shader num piscar seco: ele surgia como uma imagem colada.
 *    Em JS a curva é minha, e o respeito à preferência é explícito e auditável
 *    (menos movimento = deriva calma e sem scale, nunca congelamento).
 *
 * Por que tanta cerca? A lib exige WebGL2 e, quando ele falta, estoura DENTRO de
 * uma função async dela: vira unhandled rejection, que error boundary NÃO captura.
 * Um boundary sozinho aqui era proteção de mentira.
 */
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { StaticBackdrop } from './BackdropBase';
import { EASE } from './easing';

const loadShader = () => import('@paper-design/shaders-react');

/**
 * Aquecimento no boot: o chunk (27KB gzip) começa a baixar assim que este módulo é
 * avaliado, muito antes de qualquer render. Quando a tela monta, em geral só falta
 * compilar o programa WebGL. É a diferença entre o fundo chegar em ~200ms e chegar
 * em ~1s. Falha aqui é irrelevante: o lazy abaixo tenta de novo e, se insistir em
 * quebrar, o plano B assume.
 */
void loadShader().catch(() => {});

const Warp = lazy(() =>
  loadShader()
    .catch(() => loadShader())
    .then((module) => ({ default: module.Warp })),
);

/**
 * A ordem importa: a primeira é o preto de fundo, as outras três são os verdes da
 * marca. Valores fixados pelo design, não mexer sem intenção.
 */
const WARP_COLORS = [
  'hsl(200, 20%, 3%)', // Preto Profundo  #050607
  'hsl(136, 71%, 51%)', // Verde CITi      #2DDB60
  'hsl(147, 87%, 25%)', // Verde escuro derivado
  'hsl(141, 78%, 72%)', // Verde Glow      #7AF2A5
];

/**
 * Tuning do shader, exatamente como o design pediu.
 *
 *   proportion 0.3          balanço das cores. Quanto menor, mais preto aparece.
 *   swirl / swirlIterations / distortion   intensidade dos redemoinhos.
 *   shape "checks" + shapeScale 0.1        padrão base.
 *   speed 0.9               velocidade da animação.
 */
const WARP = {
  proportion: 0.3,
  softness: 1,
  distortion: 0.25,
  swirl: 0.85,
  swirlIterations: 10,
  shape: 'checks',
  shapeScale: 0.1,
  scale: 1,
  rotation: 0,
  speed: 0.9,
} as const;

/** Menos movimento = deriva calma, não congelamento. O fundo segue vivo. */
const WARP_CALM_SPEED = 0.35;

/**
 * Custo controlado num shader de tela cheia:
 *
 *   minPixelRatio 1   sem supersampling. O default da lib renderiza a 2x até em
 *                     tela 1x (4x mais fragmentos por frame). Num warp difuso a
 *                     diferença é invisível; o custo, não.
 *   maxPixelCount     teto de ~2x 1080p. Telas 4K e Retina renderizam nesse teto e
 *                     sobem por CSS, de novo invisível num fundo desfocado, e é o
 *                     que impede o login de esquentar notebook fraco.
 */
const WARP_MIN_PIXEL_RATIO = 1;
const WARP_MAX_PIXEL_COUNT = 1920 * 1080 * 2;

/** O crossfade de chegada. Ease-out: o fundo se estabelece cedo e assenta devagar. */
const FADE_IN_S = 1;

/** Depois do mount, quanto tempo o canvas tem pra aparecer antes de desistirmos. */
const WATCHDOG_TIMEOUT_MS = 4000;
const WATCHDOG_POLL_MS = 100;

/**
 * Teto de espera do conteúdo. Se em 1,2s o shader não deu sinal de vida, a tela de
 * login entra assim mesmo sobre o plano B: fundo bonito não vale segurar o login.
 */
const READY_FALLBACK_MS = 1200;

/** Grão fino em SVG (feTurbulence), embutido pra não custar uma requisição. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)'/%3E%3C/svg%3E\")";

/** A lib só fala WebGL2, e WebGL1 disponível não conta. Detectar errado aqui era
 *  o fundo preto: o mount estourava fora do alcance do boundary. */
function supportsWebGl2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

interface ShaderBoundaryProps {
  children: ReactNode;
}

/**
 * Se o shader estourar durante render (chunk quebrado, erro síncrono de mount),
 * esta camada some e pronto: o plano B já está desenhado por baixo.
 */
class ShaderBoundary extends Component<ShaderBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface WarpLayerProps {
  speed: number;
  /** O shader começou a desenhar de verdade. */
  onLive: () => void;
  /** Nunca desenhou, ou perdeu a GPU no meio da sessão. */
  onFailure: () => void;
}

/**
 * A camada do shader. Nasce invisível e só faz o crossfade quando está VIVO: a lib
 * monta num passo assíncrono que pode falhar sem lançar nada capturável, então quem
 * decide é o watchdog olhando o DOM, não a árvore React.
 *
 * O sinal de vida exige DUAS provas. `data-paper-shader` a lib grava em mais de um
 * elemento (um <style> e a div do shader), então "o primeiro que aparecer" podia ser
 * o <style>. E o canvas sozinho não prova nada: ele entra no DOM antes do getContext
 * e fica lá mesmo quando o mount morre no meio. Vida = marca da lib + canvas real.
 */
function WarpLayer({ speed, onLive, onFailure }: WarpLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let canvas: HTMLCanvasElement | null = null;
    const startedAt = performance.now();
    const handleContextLost = () => onFailure();

    const pollId = window.setInterval(() => {
      const marked = host.querySelector('[data-paper-shader]');
      const mountedCanvas = host.querySelector('canvas');

      if (marked && mountedCanvas) {
        window.clearInterval(pollId);
        canvas = mountedCanvas;
        canvas.addEventListener('webglcontextlost', handleContextLost);
        setLive(true);
        onLive();
        return;
      }
      if (performance.now() - startedAt > WATCHDOG_TIMEOUT_MS) {
        window.clearInterval(pollId);
        onFailure();
      }
    }, WATCHDOG_POLL_MS);

    return () => {
      window.clearInterval(pollId);
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
    };
  }, [onLive, onFailure]);

  return (
    <motion.div
      ref={hostRef}
      // data-shader-layer: âncora estável pra inspeção (é por aqui que se verifica,
      // de fora, se o crossfade está mesmo acontecendo em vez de piscar).
      data-shader-layer="true"
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: live ? 1 : 0 }}
      transition={{ duration: FADE_IN_S, ease: 'easeOut' }}
    >
      <Warp
        {...WARP}
        speed={speed}
        colors={WARP_COLORS}
        minPixelRatio={WARP_MIN_PIXEL_RATIO}
        maxPixelCount={WARP_MAX_PIXEL_COUNT}
        style={{ width: '100%', height: '100%' }}
      />
    </motion.div>
  );
}

interface AuthBackdropProps {
  /**
   * O "estouro" de luz do momento do login: o fundo avança e acende. Só duas
   * propriedades, as duas de compositor (scale e opacity), pra seguir liso mesmo
   * com a thread principal ocupada montando o app atrás da cortina.
   */
  surge: boolean;
  /** O fundo está estabelecido: o palco pode trazer a tela de login. */
  onReady: () => void;
}

export function AuthBackdrop({ surge, onReady }: AuthBackdropProps) {
  const reduced = useReducedMotion();
  const [webGl2] = useState(supportsWebGl2);
  const [shaderFailed, setShaderFailed] = useState(false);

  // onReady dispara UMA vez, venha por onde vier: shader vivo, ausência de WebGL2,
  // falha, ou o teto de espera. O conteúdo nunca fica refém do fundo.
  const readyFired = useRef(false);
  const signalReady = useCallback(() => {
    if (readyFired.current) return;
    readyFired.current = true;
    onReady();
  }, [onReady]);

  const handleShaderFailure = useCallback(() => {
    setShaderFailed(true);
    signalReady();
  }, [signalReady]);

  useEffect(() => {
    if (!webGl2) {
      signalReady();
      return;
    }
    const id = window.setTimeout(signalReady, READY_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [webGl2, signalReady]);

  const showShader = webGl2 && !shaderFailed;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050607]">
      <motion.div
        className="absolute inset-0"
        initial={false}
        // O avanço do fundo é transform puro. Menos movimento pula o scale (é
        // justamente o tipo de movimento que a preferência pede pra evitar) e fica
        // só com a luz, que é opacidade.
        animate={{ scale: surge && !reduced ? 1.16 : 1 }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        <StaticBackdrop />

        {showShader && (
          <ShaderBoundary>
            {/* Sem fallback de Suspense: enquanto o chunk resolve, o plano B por
                baixo já está pintado. Trocar camadas aqui era o "pulo" do fundo. */}
            <Suspense fallback={null}>
              <WarpLayer
                speed={reduced ? WARP_CALM_SPEED : WARP.speed}
                onLive={signalReady}
                onFailure={handleShaderFailure}
              />
            </Suspense>
          </ShaderBoundary>
        )}
      </motion.div>

      {/* O véu do surge: a luz que "acende" o sistema no login aceito. */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        initial={false}
        animate={{ opacity: surge ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          background:
            'radial-gradient(80% 80% at 50% 42%, rgba(122,242,165,0.5), rgba(45,219,96,0.22) 45%, transparent 75%)',
        }}
      />

      {/* Overlay de profundidade e contraste, o gradiente vertical do design. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050607]/40 via-transparent to-[#050607]/70" />
      {/* Grão: textura de filme, quase invisível, e é pra ser. */}
      <div className="absolute inset-0 opacity-[0.045] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
