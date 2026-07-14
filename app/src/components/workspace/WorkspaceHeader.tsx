import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

/** Mesmo teto do presentationsStore — o input trava aqui, o store garante lá. */
const TITLE_MAX_LENGTH = 60;

interface WorkspaceHeaderProps {
  title: string;
  updatedAt: number;
  onTitleChange: (title: string) => void;
  onPresent: () => void;
  onExport: () => void;
  canExport: boolean;
  exporting: boolean;
  onExportCanva: () => void;
  canvaExporting: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Só aparece quando a apresentação veio de uma página do Notion (ver notionPageId). */
  showNotionSync?: boolean;
  onNotionSync?: () => void;
  notionSyncing?: boolean;
  notionSynced?: boolean;
}

/**
 * Header do workspace, organizado em três territórios:
 * esquerda = navegação e identidade (voltar, nome, salvo);
 * meio-direita = histórico (desfazer/refazer);
 * direita = saída do trabalho (menu Exportar único + Apresentar).
 */
export function WorkspaceHeader({
  title,
  updatedAt,
  onTitleChange,
  onPresent,
  onExport,
  canExport,
  exporting,
  onExportCanva,
  canvaExporting,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showNotionSync = false,
  onNotionSync,
  notionSyncing = false,
  notionSynced = false,
}: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  // O rascunho do nome vive em estado LOCAL enquanto se edita: antes, cada tecla ia
  // direto pro store, que devolvia "Sem título" a cada apagada — impossível limpar o campo.
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(title);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const clean = draft.trim();
    if (clean !== title) onTitleChange(clean);
  }

  function cancel() {
    setEditing(false);
    setDraft(title);
  }

  return (
    <header className="flex h-[64px] flex-none items-center gap-3 border-b border-white/[0.04] bg-app-bg/85 px-5 backdrop-blur-md">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink"
      >
        <Icon name="chevron-right" size={14} className="rotate-180" />
        Voltar
      </button>

      <div className="mx-1 h-5 w-px bg-border-subtle" />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') cancel();
            }}
            aria-label="Nome da apresentação"
            className="min-w-0 max-w-[420px] flex-1 rounded-md border border-brand/35 bg-surface-2 px-2.5 py-1 text-[14.5px] font-semibold text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="max-w-[420px] truncate rounded-md px-2 py-1 text-left text-[14.5px] font-semibold text-ink transition-colors duration-150 hover:bg-white/[0.03]"
            title="Renomear apresentação"
          >
            {title}
          </button>
        )}
        <SavedDot updatedAt={updatedAt} />
      </div>

      {/* Histórico: um par sólido, agrupado — some a impressão de botão fantasma. */}
      <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.10] bg-white/[0.05] p-0.5">
        <HistoryButton icon="undo" label="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={onUndo} />
        <HistoryButton icon="redo" label="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo} />
      </div>

      <div className="mx-1.5 h-6 w-px bg-white/[0.10]" />

      <div className="flex items-center gap-2">
        {showNotionSync && (
          <SecondaryButton
            icon={notionSynced ? 'check' : 'restore'}
            onClick={() => onNotionSync?.()}
            busy={notionSyncing}
            disabled={notionSyncing}
            title={
              notionSynced
                ? 'Link já foi salvo na página do Notion. Clique pra atualizar de novo.'
                : 'Escreve o link desta apresentação de volta na página do Notion de origem'
            }
          >
            {notionSyncing ? 'Salvando…' : notionSynced ? 'Salvo no Notion' : 'Salvar no Notion'}
          </SecondaryButton>
        )}
        <SecondaryButton
          icon="compass"
          onClick={onExportCanva}
          busy={canvaExporting}
          disabled={!canExport || canvaExporting}
          title={canExport ? 'Enviar esta apresentação pro Canva' : 'Adicione slides antes de exportar'}
        >
          {canvaExporting ? 'Abrindo…' : 'Abrir no Canva'}
        </SecondaryButton>
        <SecondaryButton
          icon="import"
          onClick={onExport}
          busy={exporting}
          disabled={!canExport || exporting}
          title={canExport ? 'Baixar o .pptx editável' : 'Adicione slides antes de exportar'}
        >
          {exporting ? 'Exportando…' : 'Exportar PPTX'}
        </SecondaryButton>
        <button
          type="button"
          onClick={onPresent}
          className="ml-0.5 inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-[#36E66A] to-brand px-4 text-[13px] font-semibold tracking-[-0.005em] text-[#0A1210] shadow-[0_8px_22px_-8px_rgba(45,219,96,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_26px_-8px_rgba(45,219,96,0.75),inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-0"
        >
          <Icon name="presentations" size={14} />
          Apresentar
        </button>
      </div>
    </header>
  );
}

function HistoryButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: 'undo' | 'redo';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-150 hover:bg-white/[0.10] hover:text-ink disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/**
 * Ação secundária do header: superfície sólida de verdade (não um fantasma
 * transparente) com borda visível e texto claro — legível sobre qualquer fundo.
 */
function SecondaryButton({
  icon,
  onClick,
  children,
  busy = false,
  disabled = false,
  title,
}: {
  icon: 'import' | 'compass' | 'restore' | 'check';
  onClick: () => void;
  children: React.ReactNode;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3.5 text-[13px] font-semibold text-ink',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-150',
        'hover:border-white/[0.20] hover:bg-white/[0.11]',
        'disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-ink-muted',
      )}
    >
      {busy ? <Spinner size="sm" /> : <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

/**
 * Autosave reduzido à sua essência: um ponto verde vivo. Sem "salvo há X minutos" —
 * o pulso ao salvar e o tooltip dizem tudo.
 */
function SavedDot({ updatedAt }: { updatedAt: number }) {
  const [justSaved, setJustSaved] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setJustSaved(true);
    const timeout = window.setTimeout(() => setJustSaved(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [updatedAt]);

  return (
    <span
      title="Salvo automaticamente neste navegador"
      aria-label="Salvo automaticamente"
      className={cn(
        'h-1.5 w-1.5 flex-none rounded-full bg-brand transition-all duration-300',
        justSaved ? 'scale-150 shadow-[0_0_12px_rgba(45,219,96,0.9)]' : 'shadow-[0_0_8px_rgba(45,219,96,0.5)]',
      )}
    />
  );
}
