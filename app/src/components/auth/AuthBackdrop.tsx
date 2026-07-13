/**
 * O fundo vivo da tela de login: o shader Warp (WebGL) nas cores da marca, coberto
 * por camadas que existem por motivo, não por enfeite —
 *
 *   scrims    garantem contraste do texto por cima de um fundo que se mexe;
 *   vinheta   fecha as bordas e empurra o olho pro centro (onde está o campo);
 *   grão      tira o aspecto "gradiente de CSS" e dá textura de filme.
 *
 * O shader nunca é o caminho crítico: carrega sob demanda e, se o WebGL não
 * existir ou o chunk falhar de verdade, cai num fundo estático equivalente (as
 * mesmas cores, os mesmos orbes do Hero). Preferência de menos movimento NÃO
 * remove o shader: só congela a animação (speed 0). A tela nunca fica preta nem
 * sem identidade.
 */
import { Component, Suspense, lazy, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Uma falha transitória de rede no chunk não pode custar o fundo da tela:
// o import tenta uma segunda vez antes de entregar pro ShaderBoundary.
const Warp = lazy(() =>
  import('@paper-design/shaders-react')
    .catch(() => import('@paper-design/shaders-react'))
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
 *
 * O contraste do texto NÃO é resolvido aqui abafando o fundo: quem garante
 * legibilidade são os próprios componentes (pílula de vidro escuro, sombra no
 * texto, halo atrás da coluna de conteúdo). Ver AuthScreen e AuthField.
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

/** Grão fino em SVG (feTurbulence), embutido pra não custar uma requisição. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)'/%3E%3C/svg%3E\")";

/** WebGL pode simplesmente não existir (VM, driver capado, flag desligada). */
function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface ShaderBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Se o shader estourar (contexto WebGL perdido, chunk que não baixou), o fundo
 * estático entra no lugar. Um fundo bonito não vale derrubar a tela de login.
 */
class ShaderBoundary extends Component<ShaderBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** O plano B: mesmas cores, mesma direção de luz, sem WebGL. */
function StaticBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(125%_100%_at_50%_-10%,rgba(45,219,96,0.20),transparent_60%)]" />
      <div
        className="absolute -left-[12%] top-[8%] h-[560px] w-[560px] rounded-full opacity-[0.28]"
        style={{
          background: 'radial-gradient(circle, #2ddb60 0%, transparent 65%)',
          filter: 'blur(90px)',
          animation: 'aurora-drift-a 60s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-[10%] bottom-[6%] h-[480px] w-[480px] rounded-full opacity-[0.18]"
        style={{
          background: 'radial-gradient(circle, #7af2a5 0%, transparent 65%)',
          filter: 'blur(90px)',
          animation: 'aurora-drift-b 60s ease-in-out infinite',
        }}
      />
    </div>
  );
}

interface AuthBackdropProps {
  /**
   * O "estouro" de luz do momento do login: o fundo avança e acende. Não é um
   * estado novo do shader (uniform não muda, WebGL não é re-renderizado) — é uma
   * transição CSS de transform/filter por cima da mesma tela, que custa nada.
   */
  surge: boolean;
}

export function AuthBackdrop({ surge }: AuthBackdropProps) {
  const reduced = useReducedMotion();
  const [webGlOk] = useState(supportsWebGl);
  // O shader monta SEMPRE que houver WebGL. Preferência de menos movimento
  // congela a animação (speed 0 renderiza um frame parado, ainda lindo) em vez
  // de trocar o fundo — desmontar aqui era exatamente o bug do "fundo sumiu"
  // pra quem tinha reduce motion ligado no sistema ou nas Configurações.
  const useShader = webGlOk;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050607]">
      <div
        className="absolute inset-0 transition-[transform,filter] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: surge ? 'scale(1.16)' : 'scale(1)',
          filter: surge ? 'brightness(1.5) saturate(1.25)' : 'brightness(1) saturate(1)',
        }}
      >
        {useShader ? (
          <ShaderBoundary fallback={<StaticBackdrop />}>
            {/* O fallback do Suspense é o fundo estático: enquanto o shader baixa,
                a tela já está pintada e na identidade certa. */}
            <Suspense fallback={<StaticBackdrop />}>
              <Warp
                {...WARP}
                speed={reduced ? 0 : WARP.speed}
                colors={WARP_COLORS}
                style={{ width: '100%', height: '100%' }}
              />
            </Suspense>
          </ShaderBoundary>
        ) : (
          <StaticBackdrop />
        )}
      </div>

      {/* Overlay de profundidade e contraste, o gradiente vertical do design. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050607]/40 via-transparent to-[#050607]/70" />
      {/* Grão: textura de filme, quase invisível, e é pra ser. */}
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
