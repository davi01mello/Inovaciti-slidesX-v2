/**
 * Lixeira real: soft-delete com restauração. Itens são purgados de vez após
 * 30 dias (a faxina roda no boot do store) ou manualmente. A página guarda o
 * estado dos diálogos de confirmação; cada linha (TrashRow) mostra a barra de
 * retenção com o prazo escoando.
 */
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrashRow } from '@/components/lixeira/TrashRow';
import { TrashEmptyState } from '@/components/lixeira/TrashEmptyState';
import { presentationsStore, useTrashedPresentations, TRASH_RETENTION_DAYS } from '@/stores/presentationsStore';
import { pushToast } from '@/lib/toast';
import type { Presentation } from '@/types/presentation';

export function LixeiraPage() {
  const trashed = useTrashedPresentations();
  const [purgeTarget, setPurgeTarget] = useState<Presentation | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  function restore(presentation: Presentation) {
    presentationsStore.restoreFromTrash(presentation.id);
    pushToast(`"${presentation.title}" voltou pras suas apresentações.`);
  }

  function purge() {
    if (purgeTarget) {
      presentationsStore.purge(purgeTarget.id);
      pushToast('Excluída de vez.');
    }
    setPurgeTarget(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="h-px w-6 bg-gradient-to-r from-danger to-transparent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-danger">
              Zona de retenção
            </span>
          </div>
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">Lixeira</h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            O que chegar aqui fica {TRASH_RETENTION_DAYS} dias disponível pra restaurar. Depois some de vez.
          </p>
        </div>
        {trashed.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmEmpty(true)}
            className="rounded-control border border-danger/30 bg-danger-soft px-4 py-2.5 text-[13px] font-semibold text-danger transition-colors duration-150 hover:bg-danger/[0.18]"
          >
            Esvaziar Lixeira
          </button>
        )}
      </div>

      {trashed.length === 0 ? (
        <TrashEmptyState />
      ) : (
        <div className="flex flex-col gap-1.5">
          {trashed.map((p, index) => (
            <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}>
              <TrashRow presentation={p} onRestore={restore} onPurgeRequest={setPurgeTarget} />
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={purgeTarget !== null}
        title={`Excluir "${purgeTarget?.title}" de vez?`}
        description="Essa ação não tem volta. O storyboard some deste navegador."
        confirmLabel="Excluir de vez"
        tone="danger"
        onConfirm={purge}
        onCancel={() => setPurgeTarget(null)}
      />

      <ConfirmDialog
        open={confirmEmpty}
        title="Esvaziar a Lixeira?"
        description={`${trashed.length} ${trashed.length === 1 ? 'apresentação some' : 'apresentações somem'} de vez deste navegador. Essa ação não tem volta.`}
        confirmLabel="Esvaziar"
        tone="danger"
        onConfirm={() => {
          presentationsStore.emptyTrash();
          setConfirmEmpty(false);
          pushToast('Lixeira esvaziada.');
        }}
        onCancel={() => setConfirmEmpty(false)}
      />
    </>
  );
}
