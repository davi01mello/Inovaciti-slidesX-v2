/**
 * Linha da visão em lista: densa, alinhada em colunas (miniatura, nome,
 * status, slides, atualização, ações). Mesmas ações do card da grade.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PresentationCardArt } from '@/components/home/PresentationCardArt';
import { PresentationActionsMenu } from '@/components/presentations/PresentationActionsMenu';
import { StatusBadge } from '@/components/presentations/StatusBadge';
import { presentationsStore } from '@/stores/presentationsStore';
import { formatRelative } from '@/lib/time';
import type { Presentation } from '@/types/presentation';

/** Template de colunas compartilhado entre o cabeçalho e as linhas. */
export const LIST_GRID_COLS = 'grid-cols-[88px_minmax(0,1fr)_106px_82px_110px_34px]';

export function PresentationListRow({ presentation }: { presentation: Presentation }) {
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renaming]);

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
      className={`group grid ${LIST_GRID_COLS} cursor-pointer items-center gap-4 rounded-xl border border-white/[0.05] bg-surface px-3 py-2 transition-all duration-200 hover:border-brand/25 hover:bg-surface-2`}
    >
      <div className="overflow-hidden rounded-lg border border-white/[0.05]">
        <PresentationCardArt seed={presentation.id} title={presentation.title} height={46} compact />
      </div>

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
        <div className="truncate text-[13.5px] font-semibold tracking-[-0.005em] text-ink transition-colors duration-200 group-hover:text-brand-glow">
          {presentation.title}
        </div>
      )}

      <div>
        <StatusBadge status={presentation.status} />
      </div>
      <div className="text-[12px] tabular-nums text-ink-muted">
        {presentation.slides.length} {presentation.slides.length === 1 ? 'slide' : 'slides'}
      </div>
      <div className="text-[12px] text-ink-muted">{formatRelative(presentation.updatedAt)}</div>

      <PresentationActionsMenu
        presentation={presentation}
        onRenameRequest={() => setRenaming(true)}
        placement="down"
      />
    </div>
  );
}

/** Cabeçalho fixo das colunas da lista. */
export function PresentationListHeader() {
  return (
    <div
      aria-hidden="true"
      className={`grid ${LIST_GRID_COLS} items-center gap-4 px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted/70`}
    >
      <span />
      <span>Nome</span>
      <span>Status</span>
      <span>Slides</span>
      <span>Atualizada</span>
      <span />
    </div>
  );
}
