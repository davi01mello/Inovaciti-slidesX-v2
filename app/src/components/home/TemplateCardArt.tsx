/**
 * Arte de template: mini capa com a bolha líquida da casa. Determinística por template
 * (variant vem do dado), com composições levemente diferentes por id pra série não carimbar.
 */
import { LiquidBlob } from '@/components/ui/LiquidBlob';
import type { PresentationTemplate } from '@/types/template';

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TemplateCardArt({ template }: { template: PresentationTemplate }) {
  const h = hashId(template.id);
  const onRight = h % 2 === 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: 'linear-gradient(165deg, #090a0c 0%, #030404 75%)' }}
    >
      <div
        className="absolute"
        style={{
          [onRight ? 'right' : 'left']: '-22%',
          bottom: '-34%',
          transform: `rotate(${(h % 4) * 16 - 24}deg)`,
        }}
      >
        <LiquidBlob size={190} variant={template.blob} animated={false} />
      </div>
      {/* Só o gesto da marca — nome e tag ficam no corpo do card, sem duplicar. */}
      <div className="relative flex h-full flex-col justify-between p-3.5">
        <span className="inline-flex h-[2.5px] w-6 rounded-full bg-brand/80" />
        <div className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-brand/85">{template.tag}</div>
      </div>
    </div>
  );
}
