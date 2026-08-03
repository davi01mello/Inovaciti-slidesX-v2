/**
 * Biblioteca de apresentações. A página é só composição e estado:
 * - StatusTiles: visão geral por status que também é o filtro.
 * - PresentationsToolbar: busca, ordenação e alternância grade/lista.
 * - Grade responsiva de PresentationCard ou lista densa de PresentationListRow.
 * A preferência de visualização persiste entre sessões.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { PresentationCard } from '@/components/home/PresentationCard';
import { PresentationListRow, PresentationListHeader } from '@/components/presentations/PresentationListRow';
import { PresentationsToolbar } from '@/components/presentations/PresentationsToolbar';
import { StatusTiles } from '@/components/presentations/StatusTiles';
import {
  PresentationsEmptyState,
  PresentationsNoResults,
} from '@/components/presentations/PresentationsEmptyState';
import {
  countByStatus,
  filterPresentations,
  sortPresentations,
  type SortOrder,
  type StatusFilter,
  type ViewMode,
} from '@/components/presentations/presentationFilters';
import { presentationsStore, usePresentations } from '@/stores/presentationsStore';
import { loadJson, saveJson } from '@/lib/storage';
import { parsePptxFile } from '@/lib/pptxImport';
import { pushToast } from '@/lib/toast';

const VIEW_STORAGE_KEY = 'citi-slides:presentations:view';

function loadInitialView(): ViewMode {
  const stored = loadJson<ViewMode>(VIEW_STORAGE_KEY);
  return stored === 'list' ? 'list' : 'grid';
}

export function PresentationsPage() {
  const navigate = useNavigate();
  const presentations = usePresentations();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [sort, setSort] = useState<SortOrder>('recentes');
  const [view, setView] = useState<ViewMode>(loadInitialView);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => countByStatus(presentations), [presentations]);

  const visible = useMemo(
    () => sortPresentations(filterPresentations(presentations, status, query), sort),
    [presentations, status, query, sort],
  );

  // "Gerando" é transitório: se a última geração terminou com o filtro ativo,
  // o tile some — volta pra "Todas" em vez de deixar a lista presa no vazio.
  useEffect(() => {
    if (status === 'generating' && counts.generating === 0) setStatus('todas');
  }, [status, counts.generating]);

  function changeView(next: ViewMode) {
    setView(next);
    saveJson(VIEW_STORAGE_KEY, next);
  }

  function clearFilters() {
    setQuery('');
    setStatus('todas');
  }

  const isFiltering = query.trim().length > 0 || status !== 'todas';

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo depois de um erro
    if (!file) return;

    setImporting(true);
    try {
      const { title, slides, skippedSlides } = await parsePptxFile(file);
      const id = presentationsStore.createFromImportedPptx(title, slides, skippedSlides);
      pushToast(`"${title}" importada — fundo e texto de cada slide viraram camadas soltas, prontas pra editar.`);
      navigate(`/workspace/${id}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui importar esse arquivo.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="h-px w-6 bg-gradient-to-r from-brand to-transparent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Biblioteca</span>
          </div>
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em] text-ink">Apresentações</h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            {presentations.length === 0
              ? 'Tudo que você criar vive aqui.'
              : `${presentations.length} ${presentations.length === 1 ? 'apresentação criada' : 'apresentações criadas'} até agora.`}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
          {/* Traz um .pptx de fora: fundo original + texto extraído como caixas soltas
              (ver lib/pptxImport.ts) — não tenta encaixar nos nossos arquétipos. */}
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            aria-label="Importar apresentação"
            title="Importar apresentação (.pptx)"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.08] bg-surface px-4 text-[13px] font-medium text-ink-secondary transition-all duration-150 hover:border-brand/35 hover:bg-brand/[0.06] hover:text-ink disabled:cursor-wait disabled:opacity-70"
          >
            {importing ? <Spinner size="sm" /> : <Icon name="import" size={15} className="text-brand" />}
            {importing ? 'Importando…' : 'Importar .pptx'}
          </button>
          {/* FAB em liquid glass: só o "+", com o nome no tooltip/aria. */}
          <button
            type="button"
            onClick={() => navigate('/nova')}
            aria-label="Nova apresentação"
            title="Nova apresentação"
            className="glass group flex h-12 w-12 flex-none items-center justify-center rounded-full text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_36px_-12px_rgba(45,219,96,0.55)] active:translate-y-0"
          >
            <Icon name="plus" size={18} className="transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>
      </div>

      {presentations.length === 0 ? (
        <PresentationsEmptyState />
      ) : (
        <>
          <StatusTiles counts={counts} active={status} onChange={setStatus} />

          <PresentationsToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={changeView}
            resultCount={visible.length}
            isFiltering={isFiltering}
          />

          {visible.length === 0 ? (
            <PresentationsNoResults onClear={clearFilters} />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(228px,1fr))] gap-4">
              {visible.map((p, index) => (
                <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                  <PresentationCard presentation={p} />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <PresentationListHeader />
              <div className="flex flex-col gap-1.5">
                {/* fade-in (sem transform): o transform residual do fade-up criaria
                  * stacking context e esconderia o menu atrás das linhas seguintes. */}
                {visible.map((p, index) => (
                  <div
                    key={p.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                  >
                    <PresentationListRow presentation={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
