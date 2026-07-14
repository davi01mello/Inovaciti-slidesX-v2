import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { listNotionPages, getNotionPageContent, type NotionPageSummary } from '@/services/notionClient';
import { formatRelative } from '@/lib/time';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';

interface NotionImportButtonProps {
  onImport: (text: string, pageId: string) => void;
}

/**
 * Puxa o briefing direto de uma página do Notion em vez de copiar e colar. Lista
 * só as páginas que alguém compartilhou manualmente com a integração no Notion
 * (ver api/.env.example) -- se vier vazio, é isso que está faltando, não um bug.
 */
export function NotionImportButton({ onImport }: NotionImportButtonProps) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<NotionPageSummary[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  async function handleToggle() {
    setOpen((current) => !current);
    if (pages !== null) return;
    setLoadingList(true);
    setError(null);
    try {
      setPages(await listNotionPages());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui listar as páginas do Notion.');
    } finally {
      setLoadingList(false);
    }
  }

  async function handlePick(page: NotionPageSummary) {
    setImportingId(page.id);
    try {
      const text = await getNotionPageContent(page.id);
      onImport(text, page.id);
      pushToast(`Briefing importado de "${page.title}".`);
      setOpen(false);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui importar essa página.');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => void handleToggle()}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink-secondary transition-all duration-150 hover:border-brand/35 hover:bg-brand/[0.06] hover:text-ink"
      >
        <Icon name="import" size={12} className="text-brand" />
        Importar do Notion
      </button>

      {open && (
        <div className="glass-deep absolute right-0 top-[calc(100%+8px)] z-30 max-h-[320px] w-[320px] animate-dock-panel-in overflow-y-auto rounded-2xl p-2">
          {loadingList && (
            <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-ink-muted">
              <Spinner size="sm" />
              Buscando páginas…
            </div>
          )}

          {!loadingList && error && <div className="px-3 py-4 text-[12px] leading-snug text-ink-muted">{error}</div>}

          {!loadingList && !error && pages !== null && pages.length === 0 && (
            <div className="px-3 py-4 text-[12px] leading-snug text-ink-muted">
              Nenhuma página compartilhada com a integração ainda. Abre a página no Notion, clica em ••• e conecta
              com "CITi Slides".
            </div>
          )}

          {!loadingList && !error && pages !== null && pages.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => void handlePick(page)}
                  disabled={importingId !== null}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.06] disabled:cursor-wait',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{page.title}</span>
                  {importingId === page.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="flex-none text-[10.5px] text-ink-muted">
                      {formatRelative(new Date(page.lastEditedTime).getTime())}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
