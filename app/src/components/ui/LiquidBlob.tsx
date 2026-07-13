/**
 * A bolha de chrome líquido do CITi — o elemento de assinatura visual da plataforma,
 * eco direto das esculturas 3D dos decks reais (verde esmeralda → ciano → violeta).
 * Feita só com CSS (dois lóbulos com gradientes em camadas + morfologia animada), zero assets.
 *
 * `variant` muda forma/paleta pra arte não parecer carimbada quando aparece em série
 * (cards, hero, páginas). `animated` liga a deriva líquida — desligue em miniaturas.
 */
import { cn } from '@/lib/cn';

export type BlobVariant = 'emerald' | 'abyss' | 'violet' | 'cyan';

interface LiquidBlobProps {
  size?: number;
  variant?: BlobVariant;
  animated?: boolean;
  className?: string;
}

interface Palette {
  /** Corpo principal: iridescência viajando na diagonal, claro → escuro. */
  body: string;
  /** Luz fria varrendo o lado oposto ao specular. */
  rim: string;
  /** Sub-superfície violeta/azul na barriga da bolha. */
  under: string;
  glow: string;
}

const PALETTES: Record<BlobVariant, Palette> = {
  emerald: {
    body: 'radial-gradient(135% 135% at 22% 16%, #eafff2 0%, #6ef29e 10%, #1cc06a 26%, #0b7a52 42%, #0b3f63 62%, #2c2187 80%, #06071f 100%)',
    rim: 'radial-gradient(120% 80% at 82% 30%, rgba(64,225,255,0.5) 0%, rgba(64,225,255,0.12) 32%, transparent 55%)',
    under: 'radial-gradient(90% 70% at 58% 96%, rgba(94,63,255,0.55) 0%, rgba(94,63,255,0.15) 42%, transparent 68%)',
    glow: 'rgba(45, 219, 96, 0.30)',
  },
  abyss: {
    body: 'radial-gradient(140% 140% at 26% 20%, #d9fbe8 0%, #46e58c 12%, #12965c 30%, #0a4f68 52%, #2b1f8f 74%, #05061a 100%)',
    rim: 'radial-gradient(110% 80% at 80% 70%, rgba(122,242,165,0.42) 0%, rgba(122,242,165,0.1) 35%, transparent 58%)',
    under: 'radial-gradient(90% 70% at 40% 98%, rgba(38,108,255,0.5) 0%, rgba(38,108,255,0.14) 45%, transparent 70%)',
    glow: 'rgba(38, 108, 255, 0.24)',
  },
  violet: {
    body: 'radial-gradient(135% 135% at 72% 18%, #f0e9ff 0%, #a98cf7 12%, #5c3ad1 30%, #22317f 52%, #0d7a55 78%, #041610 100%)',
    rim: 'radial-gradient(110% 80% at 22% 76%, rgba(45,219,96,0.48) 0%, rgba(45,219,96,0.12) 38%, transparent 60%)',
    under: 'radial-gradient(90% 70% at 30% 96%, rgba(16,224,107,0.4) 0%, transparent 65%)',
    glow: 'rgba(124, 92, 240, 0.28)',
  },
  cyan: {
    body: 'radial-gradient(140% 140% at 24% 22%, #eafcff 0%, #63e2f2 12%, #128fae 30%, #0b4a7d 52%, #1d9a60 78%, #04130d 100%)',
    rim: 'radial-gradient(110% 80% at 80% 78%, rgba(45,219,96,0.5) 0%, rgba(45,219,96,0.12) 36%, transparent 58%)',
    under: 'radial-gradient(90% 70% at 62% 96%, rgba(94,63,255,0.45) 0%, transparent 66%)',
    glow: 'rgba(63, 217, 232, 0.26)',
  },
};

/** Brilhos speculares compartilhados: a "janela de estúdio" refletida no vidro. */
const SPECULAR_LAYERS =
  'linear-gradient(148deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.25) 7%, transparent 14%), ' +
  'radial-gradient(24% 12% at 64% 74%, rgba(255,255,255,0.5) 0%, transparent 100%)';

export function LiquidBlob({ size = 320, variant = 'emerald', animated = true, className }: LiquidBlobProps) {
  const palette = PALETTES[variant];

  const bodyStyle: React.CSSProperties = {
    background: `${SPECULAR_LAYERS}, ${palette.rim}, ${palette.under}, ${palette.body}`,
    boxShadow:
      'inset 4px 8px 18px rgba(255,255,255,0.22), inset -22px -30px 60px rgba(0,0,0,0.62), inset 0 2px 3px rgba(255,255,255,0.5), 0 34px 68px -26px rgba(0,0,0,0.8)',
  };

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none relative select-none', className)}
      style={{ width: size, height: size }}
    >
      {/* Halo ambiente atrás da escultura. */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '-16%',
          background: `radial-gradient(circle, ${palette.glow} 0%, transparent 60%)`,
          filter: 'blur(30px)',
        }}
      />

      {/* Lóbulo traseiro: transforma a esfera num organismo torcido. */}
      <div
        className="absolute"
        style={{
          ...bodyStyle,
          left: '34%',
          top: '30%',
          width: '62%',
          height: '58%',
          borderRadius: '58% 42% 52% 48% / 50% 58% 42% 50%',
          transform: 'rotate(24deg)',
          filter: 'brightness(0.82) saturate(1.1)',
          animation: animated ? 'blob-float-alt 11s ease-in-out infinite' : undefined,
        }}
      />

      {/* Corpo principal. */}
      <div
        className="absolute"
        style={{
          ...bodyStyle,
          left: 0,
          top: '6%',
          width: '78%',
          height: '76%',
          borderRadius: '46% 54% 58% 42% / 48% 42% 58% 52%',
          animation: animated ? 'blob-morph 16s ease-in-out infinite' : undefined,
        }}
      />

      {/* Gota satélite. */}
      <div
        className="absolute"
        style={{
          ...bodyStyle,
          right: '4%',
          top: '8%',
          width: '19%',
          height: '17%',
          borderRadius: '52% 48% 44% 56% / 48% 56% 44% 52%',
          transform: 'rotate(-14deg)',
          animation: animated ? 'blob-float 8s ease-in-out infinite' : undefined,
        }}
      />
    </div>
  );
}
