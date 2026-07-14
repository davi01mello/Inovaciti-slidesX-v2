/**
 * Miniatura 16:9 de cada tom. Mora em arquivo próprio porque é consumida em dois
 * lugares (o passo Direção e o resumo final), e não pertence a nenhum dos dois.
 */
import { cn } from '@/lib/cn';
import type { VisualStyle } from '@/types/creation';

interface StylePreviewSpec {
  className: string;
  blocks: { className: string }[];
}

const STYLE_PREVIEW: Record<VisualStyle, StylePreviewSpec> = {
  minimal: {
    className: 'bg-[#0a0b0d] px-[14%] justify-center',
    blocks: [
      { className: 'h-1 w-10 rounded-full bg-[#09E880]/50' },
      { className: 'mt-4 h-3 w-[70%] rounded-full bg-[#F7F7F7]' },
      { className: 'mt-2 h-2 w-[52%] rounded-full bg-white/35' },
      { className: 'mt-6 h-1.5 w-[38%] rounded-full bg-white/15' },
    ],
  },
  balanced: {
    className: 'bg-gradient-to-br from-[#0b0e11] to-[#050708] px-[11%] justify-center',
    blocks: [
      { className: 'h-1.5 w-12 rounded-full bg-[#09E880]' },
      { className: 'mt-3 h-3 w-[78%] rounded-full bg-[#F7F7F7]' },
      { className: 'mt-1.5 h-1.5 w-[56%] rounded-full bg-white/40' },
      { className: 'mt-4 h-9 w-[42%] rounded-lg border border-[#09E880]/30 bg-[#09E880]/15' },
    ],
  },
  bold: {
    className: 'bg-gradient-to-br from-[#0b140d] via-[#0a0e11] to-[#030503] px-[11%] justify-center',
    blocks: [
      { className: 'h-5 w-[86%] rounded-md bg-[#F7F7F7]' },
      { className: 'mt-2 h-5 w-[62%] rounded-md bg-[#09E880]' },
      { className: 'mt-3.5 h-1.5 w-[48%] rounded-full bg-white/40' },
    ],
  },
};

export function StylePreview({ style, className }: { style: VisualStyle; className?: string }) {
  const preview = STYLE_PREVIEW[style];
  return (
    <div
      aria-hidden="true"
      // Sem largura própria: estica pro tamanho do pai (card no passo Direção,
      // swatch reduzido no resumo).
      className={cn('flex aspect-[16/9] flex-col rounded-xl border border-white/[0.06]', preview.className, className)}
    >
      {preview.blocks.map((block, i) => (
        <div key={i} className={block.className} />
      ))}
    </div>
  );
}
