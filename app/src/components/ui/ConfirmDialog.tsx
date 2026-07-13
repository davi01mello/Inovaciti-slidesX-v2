/**
 * Diálogo de confirmação do app — substitui o confirm() nativo.
 * Vidro escuro, foco preso nos botões, Escape cancela, clique no backdrop cancela.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="glass-deep w-full max-w-[400px] animate-dialog-in rounded-2xl p-6"
      >
        <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="mb-0 mt-2 text-[13px] leading-[1.55] text-ink-muted">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control px-4 py-2.5 text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-white/[0.05] hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-control px-4 py-2.5 text-[13px] font-semibold transition-all duration-150',
              tone === 'danger'
                ? 'border border-danger/30 bg-danger-soft text-danger hover:bg-danger/[0.18]'
                : 'bg-gradient-to-b from-[#36E66A] to-brand text-[#0A1210] shadow-[0_8px_20px_-8px_rgba(45,219,96,0.5)] hover:-translate-y-px',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
