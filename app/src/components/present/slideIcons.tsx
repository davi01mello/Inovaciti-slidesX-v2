import type { CSSProperties } from 'react';
import type { SlideIconName } from '@/types/slide';

/**
 * OS ÍCONES DE SLIDE: o vocabulário visual que a IA pode pedir por item.
 *
 * São ícones de TRAÇO (stroke), no estilo da referência oficial da marca:
 * linha fina, cantos arredondados, desenhados em `currentColor` — quem dá a cor
 * é o cromo do slide (accent), então arrastar a barra de cor repinta os ícones
 * junto com o resto.
 *
 * Eles NÃO são os pictogramas da página Marca (aqueles são artes WebP complexas);
 * são a camada utilitária: busca, gráfico, usuários, cadeado... exatamente o
 * conjunto que o deck de referência usa nos cards, painéis e faixas.
 *
 * Export PPTX: os ícones não têm data-export-text, então entram no RASTER de
 * fundo do slide — que é o comportamento certo (ícone não é texto editável).
 *
 * SYNC_WITH: SLIDE_ICONS em types/slide.ts e api/src/types.ts (os nomes válidos).
 */

const PATHS: Record<SlideIconName, string[]> = {
  busca: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z', 'm16.5 16.5 4 4'],
  grafico: ['M4 20h16', 'M7 16v-4M12 16V8M17 16v-6', 'm6 9 4.2-3.2 3.3 2.1L18 4.5', 'm15 4.5h3v3'],
  usuarios: [
    'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Z',
    'M3.5 19.4c.5-3 2.8-4.9 5.5-4.9s5 1.9 5.5 4.9',
    'M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.7c1.7.6 2.8 2 3.1 4',
  ],
  documento: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M14 3v5h5', 'M9 13h6M9 16.5h4'],
  calendario: ['M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6Z', 'M8 3.5V8M16 3.5V8M3.5 10.5h17'],
  lista: ['M9 6h11M9 12h11M9 18h11', 'M4.5 6h.01M4.5 12h.01M4.5 18h.01'],
  cadeado: ['M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-6.5A1.5 1.5 0 0 1 6.5 11Z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3', 'M12 14.5v2.5'],
  cubo: ['m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z', 'm4.7 7.4 7.3 4.1 7.3-4.1', 'M12 11.5V21'],
  alvo: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z', 'M12 12h.01'],
  raio: ['M13 3 5.5 13.5H11L10 21l8-11h-5.5L13 3Z'],
  escudo: ['M12 3 5 5.8v5.4c0 4.4 3 8 7 9.8 4-1.8 7-5.4 7-9.8V5.8L12 3Z', 'm9 11.8 2.2 2.2 4-4.4'],
  relogio: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3 2'],
  engrenagem: [
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
    'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.5c0-.4.1-.8.1-1.2Z',
  ],
  dados: ['M12 8.5c4.1 0 7.5-1.2 7.5-2.8S16.1 3 12 3 4.5 4.2 4.5 5.8 7.9 8.5 12 8.5Z', 'M4.5 5.8V18c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V5.8', 'M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8'],
  foguete: ['M12 15c5-3.5 6.5-8 6-11-3-.5-7.5 1-11 6l-3.5 1L2 14.5l3-1 5.5 5.5-1 3 3.5-1.5 1-3.5Z', 'M9.5 14.5 12 12', 'M5 19c-.8.8-1.5 2.5-1.5 2.5S5.2 20.8 6 20'],
  check: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm8.2 12.2 2.6 2.6 5-5.4'],
  aspas: ['M10 6.5c-3 1-4.5 3-4.5 6V18H10v-6H7.4c.2-2 1.2-3.4 3-4.2L10 6.5Z', 'M19 6.5c-3 1-4.5 3-4.5 6V18H19v-6h-2.6c.2-2 1.2-3.4 3-4.2L19 6.5Z'],
  cifrao: ['M12 3.5v17', 'M16.5 7.2c-.7-1.3-2.3-2-4.4-2-2.4 0-4.1 1.2-4.1 3.1 0 4.3 8.9 2.2 8.9 6.6 0 2-1.9 3.3-4.6 3.3-2.3 0-4-.9-4.7-2.4'],
};

interface SlideIconProps {
  name: SlideIconName;
  /** Tamanho em unidades de fonte do contexto (em). */
  size?: string;
  className?: string;
  style?: CSSProperties;
}

/** O ícone de traço puro, na cor do contexto (currentColor). */
export function SlideIcon({ name, size = '1.2em', className, style }: SlideIconProps) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, flex: 'none', ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

interface IconBadgeProps {
  name: SlideIconName;
  /** Cor do traço e da borda (o accent do cromo). */
  color: string;
  /** Diâmetro do círculo, em unidades de fonte do contexto. */
  size?: string;
  /** Brilho opcional do cromo (accentGlow). */
  glow?: string;
  className?: string;
}

/**
 * O CÍRCULO DE ÍCONE da referência: contorno fino no accent, fundo quase
 * imperceptível, ícone de traço no centro. É a assinatura visual dos cards.
 */
export function IconBadge({ name, color, size = '2.6em', glow, className }: IconBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        border: `1px solid ${color}55`,
        background: `${color}0d`,
        color,
        boxShadow: glow && glow !== 'none' ? glow : undefined,
      }}
    >
      <SlideIcon name={name} size="46%" />
    </span>
  );
}
