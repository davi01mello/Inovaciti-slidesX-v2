/**
 * Thumbnail de apresentação estilo "mini capa": fundo quase preto, bolha de chrome
 * líquido sangrando por um canto e o título real da apresentação em tipografia bold.
 * Determinística por seed (id): a mesma apresentação sempre ganha a mesma arte,
 * apresentações diferentes variam paleta e composição.
 */
import { LiquidBlob, type BlobVariant } from '@/components/ui/LiquidBlob';

const VARIANTS: BlobVariant[] = ['emerald', 'abyss', 'violet', 'cyan'];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface PresentationCardArtProps {
  seed: string;
  title: string;
  height?: number;
  /** Miniatura densa (linhas da lista): tipografia e respiros reduzidos. */
  compact?: boolean;
}

export function PresentationCardArt({ seed, title, height = 150, compact = false }: PresentationCardArtProps) {
  const h = hashSeed(seed);
  const variant = VARIANTS[h % VARIANTS.length] ?? 'emerald';
  const onRight = h % 2 === 0;
  const blobSize = height * (1.2 + (h % 3) * 0.2);
  // Duas primeiras letras "fortes" do título viram o monograma da mini capa.
  const monogram = title
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      className="relative overflow-hidden"
      style={{ height, background: 'linear-gradient(160deg, #08090b 0%, #030404 70%)' }}
    >
      <div
        className="absolute"
        style={{
          [onRight ? 'right' : 'left']: `-${Math.round(blobSize * 0.34)}px`,
          bottom: `-${Math.round(blobSize * 0.3)}px`,
          transform: `rotate(${(h % 5) * 14 - 28}deg)`,
        }}
      >
        <LiquidBlob size={blobSize} variant={variant} animated={false} />
      </div>
      {/* O título mora no corpo do card; a arte carrega só o gesto da marca. */}
      <div className={`relative flex h-full flex-col justify-between ${compact ? 'p-2' : 'p-[18px]'}`}>
        <span className={`inline-flex rounded-full bg-brand/80 ${compact ? 'h-[2px] w-4' : 'h-[3px] w-7'}`} />
        <div
          className={`font-bold leading-none tracking-[-0.03em] text-slide-fg/90 ${compact ? 'text-[11px]' : 'text-[22px]'}`}
          style={{ textAlign: onRight ? 'left' : 'right' }}
        >
          {monogram}
        </div>
      </div>
    </div>
  );
}
