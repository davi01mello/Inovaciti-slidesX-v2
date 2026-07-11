/**
 * Card de apresentação usado na Home e na grade da página Apresentações.
 * As ações (abrir, renomear, duplicar, exportar, lixeira) vivem no
 * PresentationActionsMenu, compartilhado com a visão em lista.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PresentationCardArt } from '@/components/home/PresentationCardArt';
import { SlideComposition } from '@/components/present/SlideComposition';
import { PresentationActionsMenu } from '@/components/presentations/PresentationActionsMenu';
import { StatusBadge } from '@/components/presentations/StatusBadge';
import { presentationsStore } from '@/stores/presentationsStore';
import { formatRelative } from '@/lib/time';
import type { Presentation } from '@/types/presentation';

export function PresentationCard({ presentation }: { presentation: Presentation }) {
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renaming]);

  // A capa do card é o primeiro slide composto no template (não mais um fundo genérico).
  const coverSlide = presentation.slides[0] ?? null;

  function open() {
    navigate(`/workspace/${presentation.id}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !renaming) open();
      }}
      className="group relative cursor-pointer overflow-visible rounded-2xl border border-white/5 bg-surface-2 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_0_0_1px_var(--color-brand-glow-soft),0_24px_48px_-20px_rgba(0,0,0,0.7),0_8px_24px_-12px_rgba(45,219,96,0.25)]"
    >
      <div className="relative overflow-hidden rounded-t-2xl">
        <div className="transition-transform duration-500 ease-out group-hover:scale-[1.045]">
          {coverSlide ? (
            <div className="relative h-[150px] overflow-hidden bg-black">
              {/* Recorte central 16:9 que sempre cobre a área da capa. */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 'max(100%, 267px)', aspectRatio: '16 / 9' }}
              >
                <SlideComposition slide={coverSlide} />
              </div>
            </div>
          ) : (
            <PresentationCardArt seed={presentation.id} title={presentation.title} />
          )}
        </div>
        {/* Véu de brilho que passa pela arte no hover. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
          }}
        />
        <StatusBadge status={presentation.status} className="absolute right-2.5 top-2.5 backdrop-blur-md" />
      </div>

      <div className="relative px-4 pb-4 pt-3.5">
        {renaming ? (
          <input
            ref={renameRef}
            defaultValue={presentation.title}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => {
              presentationsStore.updateTitle(presentation.id, event.target.value.trim() || 'Sem título');
              setRenaming(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'Escape') setRenaming(false);
            }}
            className="w-full rounded-md border border-brand/40 bg-surface-3 px-2 py-1 text-[13px] font-semibold text-ink outline-none"
          />
        ) : (
          <div className="line-clamp-2 min-h-[35px] text-[13px] font-semibold leading-[1.35] tracking-[-0.005em] text-ink transition-colors duration-200 group-hover:text-brand-glow">
            {presentation.title}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] text-ink-muted">
            {presentation.slides.length} slides · {formatRelative(presentation.updatedAt)}
          </div>
          <PresentationActionsMenu
            presentation={presentation}
            onRenameRequest={() => setRenaming(true)}
            placement="up"
          />
        </div>
      </div>
    </div>
  );
}
