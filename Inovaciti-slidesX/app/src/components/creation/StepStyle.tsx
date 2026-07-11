import { STYLE_OPTIONS } from '@/data/creationOptions';
import { OptionCard } from '@/components/creation/OptionCard';
import { StepHeader } from '@/components/creation/StepHeader';
import { cn } from '@/lib/cn';
import type { VisualStyle } from '@/types/creation';

interface StepStyleProps {
  value: VisualStyle | null;
  onChange: (style: VisualStyle) => void;
}

interface StylePreviewSpec {
  className: string;
  blocks: { className: string }[];
}

/** Miniaturas 16:9 de cada estilo — também usadas no resumo final. */
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
      className={cn(
        // Sem largura própria: estica pro tamanho do pai (card no passo 3,
        // swatch reduzido no resumo).
        'flex aspect-[16/9] flex-col rounded-xl border border-white/[0.06]',
        preview.className,
        className,
      )}
    >
      {preview.blocks.map((block, i) => (
        <div key={i} className={block.className} />
      ))}
    </div>
  );
}

export function StepStyle({ value, onChange }: StepStyleProps) {
  return (
    <div>
      <StepHeader
        kicker="Estilo"
        title="Qual é o clima?"
        subtitle="Isso define o quanto o slide respira, o peso da tipografia, o quanto ele impõe presença."
      />

      <div role="radiogroup" aria-label="Estilo visual" className="mt-8 grid gap-4 md:grid-cols-3">
        {STYLE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <OptionCard key={option.value} selected={selected} onSelect={() => onChange(option.value)}>
              <div className="overflow-hidden rounded-xl">
                <StylePreview
                  style={option.value}
                  className="transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-4 text-[18px] font-semibold tracking-[-0.01em] text-ink">{option.label}</div>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink-secondary">{option.description}</p>
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}
