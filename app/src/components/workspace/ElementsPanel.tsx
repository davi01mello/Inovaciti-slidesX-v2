import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { ELEMENTS, ELEMENT_COLORS, elementColorLabel, elementShapeLabel, hasElements } from '@/services/elementsManifest';

interface ElementsPanelProps {
  onSelect: (assetKey: string) => void;
  onClose: () => void;
  anchor: 'above' | 'below';
}

/**
 * Popover com a biblioteca de elementos visuais 3D da marca (blobs), filtrável por cor.
 * Some sozinho se app/src/assets/elements/ ainda não tem nenhum arquivo (ver elementsManifest.ts).
 */
export function ElementsPanel({ onSelect, onClose, anchor }: ElementsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [onClose]);

  const visible = useMemo(
    () => (colorFilter ? ELEMENTS.filter((e) => e.color === colorFilter) : ELEMENTS),
    [colorFilter],
  );

  if (!hasElements()) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute left-0 z-30 w-[300px] animate-menu-in rounded-xl border border-white/[0.08] bg-surface-3 p-1.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)]',
        anchor === 'above' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
      )}
    >
      <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        Elementos visuais
      </div>

      <div className="flex flex-wrap gap-1 px-1.5 pb-2">
        <ColorChip active={colorFilter === null} onClick={() => setColorFilter(null)} label="Todas" />
        {ELEMENT_COLORS.map((color) => (
          <ColorChip
            key={color}
            active={colorFilter === color}
            onClick={() => setColorFilter(color)}
            label={elementColorLabel(color)}
          />
        ))}
      </div>

      <div className="grid max-h-[280px] grid-cols-4 gap-1.5 overflow-y-auto px-1.5 pb-1.5">
        {visible.map((asset) => (
          <button
            key={asset.key}
            type="button"
            onClick={() => onSelect(asset.key)}
            title={`${elementShapeLabel(asset.shape)} · ${elementColorLabel(asset.color)}`}
            className="group flex aspect-square items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5 transition-colors duration-150 hover:border-white/[0.16] hover:bg-white/[0.05]"
          >
            <img src={asset.src} alt="" draggable={false} className="h-full w-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors duration-150',
        active ? 'bg-brand/20 text-brand' : 'bg-white/[0.04] text-ink-muted hover:bg-white/[0.08] hover:text-ink-secondary',
      )}
    >
      {label}
    </button>
  );
}
