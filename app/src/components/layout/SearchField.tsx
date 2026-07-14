import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Kbd';
import { useHotkey } from '@/hooks/useHotkey';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { usePresentations } from '@/stores/presentationsStore';
import { TEMPLATES } from '@/data/templates';
import { formatRelative } from '@/lib/time';

const MAX_RESULTS = 5;
const MAX_TEMPLATE_RESULTS = 3;

/** Busca real: apresentações do usuário (abre o workspace) e templates (abre a galeria). */
export function SearchField() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const presentations = usePresentations();

  useOnClickOutside([containerRef], () => setOpen(false), open);

  useHotkey({
    key: 'k',
    metaOrCtrl: true,
    onTrigger: (event) => {
      event.preventDefault();
      inputRef.current?.focus();
    },
  });

  useHotkey({
    key: 'Escape',
    onTrigger: () => {
      setOpen(false);
      inputRef.current?.blur();
    },
  });

  const query = value.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return { presentations: [], templates: [] };
    return {
      presentations: presentations.filter((p) => p.title.toLowerCase().includes(query)).slice(0, MAX_RESULTS),
      templates: TEMPLATES.filter(
        (t) => t.name.toLowerCase().includes(query) || t.tag.toLowerCase().includes(query),
      ).slice(0, MAX_TEMPLATE_RESULTS),
    };
  }, [query, presentations]);

  const hasResults = results.presentations.length > 0 || results.templates.length > 0;

  function closeAnd(path: string) {
    setValue('');
    setOpen(false);
    navigate(path);
  }

  return (
    <div ref={containerRef} className="relative max-w-[640px] flex-1">
      <div className="group flex h-11 items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-4 transition-all duration-200 focus-within:border-white/[0.16] focus-within:bg-white/[0.06]">
        <Icon name="search" size={16} className="flex-none text-ink-muted" />
        <input
          ref={inputRef}
          id="main-search"
          type="text"
          placeholder="Buscar apresentações ou templates..."
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            const first = results.presentations[0];
            if (first) closeAnd(`/workspace/${first.id}`);
            else if (results.templates[0]) closeAnd('/templates');
          }}
          className="flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-muted"
        />
        {value.length === 0 && (
          <div className="flex flex-none gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        )}
      </div>

      {open && query.length > 0 && (
        <div className="glass-deep absolute inset-x-0 top-[52px] z-[60] animate-menu-in rounded-2xl p-1.5">
          {!hasResults ? (
            <div className="px-3 py-3 text-[12.5px] text-ink-muted">
              Nada com esse nome. Que tal criar uma apresentação nova?
            </div>
          ) : (
            <>
              {results.presentations.length > 0 && (
                <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Apresentações
                </div>
              )}
              {results.presentations.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => closeAnd(`/workspace/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-100 hover:bg-white/[0.04]"
                >
                  <Icon name="presentations" size={14} className="flex-none text-brand" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{p.title}</span>
                  <span className="flex-none text-[11px] text-ink-muted">{formatRelative(p.updatedAt)}</span>
                </button>
              ))}
              {results.templates.length > 0 && (
                <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Templates
                </div>
              )}
              {results.templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => closeAnd('/templates')}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-100 hover:bg-white/[0.04]"
                >
                  <Icon name="templates" size={14} className="flex-none text-brand-glow" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{t.name}</span>
                  <span className="flex-none text-[11px] text-ink-muted">{t.tag}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
