/**
 * Vitrine dos elementos visuais 3D da marca (as "bolhas"): mesma lógica da vitrine
 * de logos — escolhe a cor, vê a grade de formas, copia ou baixa. Só exibição;
 * não interfere em nada do editor (o picker de inserir elemento no slide vive
 * no InsertDock do workspace).
 */
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { ELEMENTS, ELEMENT_COLORS, elementColorLabel, elementShapeLabel, hasElements } from '@/services/elementsManifest';

/** Swatch de cada variação — sólidas usam a cor real, degradês usam o gradiente. */
const COLOR_SWATCH: Record<string, string> = {
  azul: '#2E6FF2',
  preto: '#0a0a0a',
  roxo: '#8B3FF2',
  verde: '#2ddb60',
  'gradiente-azul-verde': 'linear-gradient(135deg, #2E6FF2, #2ddb60)',
  'gradiente-roxo-azul-verde': 'linear-gradient(135deg, #8B3FF2, #2E6FF2, #2ddb60)',
};

async function copyElement(src: string) {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('no clipboard');
    const blob = await (await fetch(src)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('encode failed');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    pushToast('Elemento copiado. Cole onde quiser.');
  } catch {
    pushToast('Não consegui copiar aqui. Use o botão de baixar.');
  }
}

function downloadElement(src: string, name: string) {
  const link = document.createElement('a');
  link.href = src;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function ElementsShowcase() {
  const colors = ELEMENT_COLORS;
  const [color, setColor] = useState(colors[0] ?? '');

  if (!hasElements() || colors.length === 0) return null;

  const items = ELEMENTS.filter((e) => e.color === color);

  return (
    <Card className="p-6 px-7">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="m-0 flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand/30" />
          Elementos do CITi
        </h2>
        <span className="text-[11.5px] text-ink-muted">Escolha a cor, depois copie ou baixe</span>
      </div>

      {/* Cor da variação. */}
      <div className="flex flex-wrap items-center gap-2">
        {colors.map((option) => {
          const active = color === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                active
                  ? 'border-brand/40 bg-brand/[0.08] text-ink'
                  : 'border-white/[0.07] bg-white/[0.02] text-ink-secondary hover:border-white/[0.16] hover:text-ink',
              )}
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  background: COLOR_SWATCH[option] ?? '#2ddb60',
                  boxShadow: active ? '0 0 0 2px rgba(45,219,96,0.55)' : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                }}
              />
              {elementColorLabel(option)}
            </button>
          );
        })}
      </div>

      {/* Grade de formas na cor escolhida. */}
      <div className="mt-5 grid grid-cols-4 gap-3">
        {items.map((item) => {
          const fileName = `citi-elemento-${item.key.replace(/\//g, '-')}.webp`;
          return (
            <div
              key={item.key}
              className="group relative flex h-[140px] flex-col overflow-hidden rounded-2xl border border-white/[0.06]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'radial-gradient(120% 120% at 50% 38%, #0d1216 0%, #050708 72%)' }}
              />
              <img
                src={item.src}
                alt={elementLabelFor(item.key)}
                className="relative z-[1] m-auto h-[74px] w-auto max-w-[70%] object-contain"
              />
              <div className="relative z-[1] px-3 pb-2.5 text-[11px] font-medium text-ink-secondary">
                {elementShapeLabel(item.shape)}
              </div>

              <div className="absolute right-2 top-2 z-[2] flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => void copyElement(item.src)}
                  aria-label="Copiar elemento"
                  title="Copiar"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-ink-secondary backdrop-blur-md transition-colors duration-150 hover:border-brand/35 hover:text-brand"
                >
                  <Icon name="paste" size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => downloadElement(item.src, fileName)}
                  aria-label="Baixar elemento"
                  title="Baixar"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-ink-secondary backdrop-blur-md transition-colors duration-150 hover:border-brand/35 hover:text-brand"
                >
                  <Icon name="import" size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mb-0 mt-4 text-[11.5px] leading-[1.5] text-ink-muted">
        As mesmas bolhas 3D que você insere solta num slide pelo editor, aqui só pra visualizar, copiar ou
        baixar em PNG.
      </p>
    </Card>
  );
}

function elementLabelFor(key: string): string {
  const [color, shape] = key.split('/');
  return `${elementShapeLabel(shape ?? key)} ${elementColorLabel(color ?? '')}`;
}
