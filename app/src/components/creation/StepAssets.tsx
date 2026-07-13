import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StepHeader } from '@/components/creation/StepHeader';
import { Icon } from '@/components/ui/Icon';
import { createId } from '@/lib/id';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { DraftAsset } from '@/types/creation';

interface StepAssetsProps {
  assets: DraftAsset[];
  onChange: (assets: DraftAsset[]) => void;
}

/** Limite prometido na interface — validado de verdade aqui. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.pdf'];

function isAccepted(file: File): boolean {
  if (file.type.startsWith('image/') || file.type === 'application/pdf') return true;
  // Alguns sistemas soltam arquivos sem MIME type; cai pra extensão.
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function inferKind(file: File): DraftAsset['kind'] {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/') || ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return name.includes('logo') ? 'logo' : 'image';
  }
  return 'other';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_STYLES: Record<DraftAsset['kind'], { icon: 'file-pdf' | 'brand' | 'file-image'; className: string }> = {
  pdf: { icon: 'file-pdf', className: 'border-danger/20 bg-danger-soft text-danger' },
  logo: { icon: 'brand', className: 'border-brand/25 bg-brand/[0.08] text-brand' },
  image: { icon: 'file-image', className: 'border-white/5 bg-surface-2 text-ink-secondary' },
  other: { icon: 'file-image', className: 'border-white/5 bg-surface-2 text-ink-secondary' },
};

export function StepAssets({ assets, onChange }: StepAssetsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Contador em vez de boolean: dragleave dispara ao passar sobre filhos do dropzone.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  function addFiles(list: Iterable<File>) {
    const next = [...assets];
    for (const file of list) {
      if (!isAccepted(file)) {
        pushToast(`"${file.name}" não é PNG, JPG, SVG ou PDF, então ignorei.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        pushToast(`"${file.name}" passa de 20MB, então ignorei.`);
        continue;
      }
      if (next.some((a) => a.name === file.name && a.sizeLabel === formatSize(file.size))) {
        pushToast(`"${file.name}" já está na lista.`);
        continue;
      }
      next.push({ id: createId(), name: file.name, kind: inferKind(file), sizeLabel: formatSize(file.size) });
    }
    if (next.length !== assets.length) onChange(next);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list) return;
    addFiles(Array.from(list));
    event.target.value = '';
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeAsset(id: string) {
    onChange(assets.filter((a) => a.id !== id));
  }

  return (
    <div>
      <StepHeader
        kicker="Bagagem"
        title="Tem algo que precisa entrar?"
        subtitle="Logo, manual de marca, alguma imagem específica, um PDF de referência. Pode pular esta etapa, sempre dá pra anexar dentro do workspace."
      />

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-10 transition-all duration-200',
              dragging
                ? 'scale-[1.01] border-brand/55 bg-brand/[0.07] shadow-[0_0_0_4px_rgba(45,219,96,0.1)]'
                : 'border-white/[0.10] bg-surface/50 hover:border-brand/30 hover:bg-brand/[0.03]',
            )}
          >
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200',
                dragging
                  ? 'border-brand/50 bg-brand/15 text-brand shadow-[0_0_24px_-6px_rgba(45,219,96,0.7)]'
                  : 'border-brand/25 bg-brand/[0.06] text-brand',
              )}
            >
              <Icon name="import" size={22} />
            </div>
            <div className="mt-4 text-[15px] font-semibold text-ink">
              {dragging ? 'Pode soltar' : 'Solte os arquivos ou clique aqui'}
            </div>
            <div className="mt-1 text-[12.5px] text-ink-muted">PNG, JPG, SVG, PDF · até 20MB cada</div>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleFiles}
          />
        </div>

        <div className="flex min-h-[240px] flex-col rounded-2xl border border-white/[0.05] bg-surface/60">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
            <span className="text-[12.5px] font-semibold text-ink-secondary">Anexados</span>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-muted">
              {assets.length} {assets.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </div>

          {assets.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="text-[13px] text-ink-muted">Nada por aqui ainda.</span>
              <span className="text-[12px] leading-[1.55] text-ink-muted/70">
                Dica: logo em PNG com fundo transparente costuma render um resultado bem melhor.
              </span>
            </div>
          ) : (
            <ul className="flex max-h-[240px] flex-1 flex-col gap-1.5 overflow-y-auto p-3">
              <AnimatePresence initial={false}>
                {assets.map((asset) => {
                  const kindStyle = KIND_STYLES[asset.kind];
                  return (
                    <motion.li
                      key={asset.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="flex flex-none items-center gap-3 rounded-xl border border-white/[0.05] bg-surface px-3.5 py-2.5"
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 flex-none items-center justify-center rounded-lg border',
                          kindStyle.className,
                        )}
                      >
                        <Icon name={kindStyle.icon} size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{asset.name}</div>
                        <div className="mt-0.5 text-[11px] text-ink-muted">
                          {asset.kind.toUpperCase()} · {asset.sizeLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.id)}
                        aria-label={`Remover ${asset.name}`}
                        className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                      >
                        Remover
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
