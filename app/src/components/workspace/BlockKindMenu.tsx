import { useEffect, useRef } from 'react';
import { BLOCK_KIND_META, BLOCK_KIND_ORDER } from '@/types/slide';
import type { Block } from '@/types/slide';
import { cn } from '@/lib/cn';

interface BlockKindMenuProps {
  onSelect: (kind: Block['kind']) => void;
  onClose: () => void;
  selectedKind?: Block['kind'];
  anchor: 'above' | 'below';
}

export function BlockKindMenu({ onSelect, onClose, selectedKind, anchor }: BlockKindMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        'absolute left-0 z-30 w-[240px] animate-menu-in rounded-xl border border-white/[0.08] bg-surface-3 p-1.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)]',
        anchor === 'above' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
      )}
    >
      <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        Adicionar bloco
      </div>
      <ul className="flex flex-col">
        {BLOCK_KIND_ORDER.map((kind) => {
          const meta = BLOCK_KIND_META[kind];
          const active = kind === selectedKind;
          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => onSelect(kind)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150',
                  active ? 'bg-white/[0.06] text-ink' : 'text-ink-secondary hover:bg-white/[0.04] hover:text-ink',
                )}
              >
                <div className="flex-1">
                  <div className="text-[13px] font-medium leading-tight">{meta.label}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-ink-muted">{meta.hint}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
