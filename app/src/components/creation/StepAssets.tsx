import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StepHeader } from '@/components/creation/StepHeader';
import { Icon } from '@/components/ui/Icon';
import { createId } from '@/lib/id';
import { pushToast } from '@/lib/toast';
import { fileToSlideImage } from '@/lib/imageFile';
import { fileToLogoCutout } from '@/lib/logoCutout';
import { cn } from '@/lib/cn';
import type { DraftAssetFile } from '@/types/creation';

/**
 * O PASSO DE ANEXOS.
 *
 * O BUG QUE ESTE ARQUIVO TINHA era silencioso e total: ele guardava
 * `{ id, name, kind, sizeLabel }` e JOGAVA OS BYTES FORA. O `File` nunca era lido.
 * A pessoa anexava a foto, via a foto na lista, e a foto simplesmente NÃO EXISTIA pro
 * resto do sistema. Nada quebrava, nada avisava: o anexo só não fazia nada.
 *
 * Agora cada arquivo é LIDO no momento em que entra:
 *   FOTO  vira CONTEÚDO. Ocupa um slide de miolo (arquétipo media): texto numa coluna,
 *         imagem emoldurada na outra. Nunca na capa, no separador ou no fecho.
 *   LOGO  tem o fundo removido na hora (flood-fill a partir das bordas, ver
 *         lib/logoCutout.ts) e entra sozinho no canto mais vazio da arte da capa.
 *
 * Os PIXELS ficam no rascunho, em memória, e vão parar no SLIDE. Nunca no meta da
 * apresentação: guardar a data URL nos dois lugares estoura a cota do localStorage
 * com três fotos, e o app para de salvar sem avisar ninguém.
 */

/** Limite prometido na interface, validado de verdade aqui. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf'];

function isAccepted(file: File): boolean {
  if (file.type.startsWith('image/') || file.type === 'application/pdf') return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function inferKind(file: File): DraftAssetFile['kind'] {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/') || ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return /logo|logotipo|marca/.test(name) ? 'logo' : 'image';
  }
  return 'other';
}

/** SVG e PDF o navegador não rasteriza de forma confiável aqui: entram só como contexto. */
function canReadPixels(file: File): boolean {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_STYLES: Record<DraftAssetFile['kind'], { icon: 'file-pdf' | 'brand' | 'file-image'; className: string }> = {
  pdf: { icon: 'file-pdf', className: 'border-danger/20 bg-danger-soft text-danger' },
  logo: { icon: 'brand', className: 'border-brand/25 bg-brand/[0.08] text-brand' },
  image: { icon: 'file-image', className: 'border-white/5 bg-surface-2 text-ink-secondary' },
  other: { icon: 'file-image', className: 'border-white/5 bg-surface-2 text-ink-secondary' },
};

/** O que cada anexo VAI FAZER. Dizer isso agora é o oposto de jogar os bytes fora em silêncio. */
const KIND_ROLE: Record<DraftAssetFile['kind'], string> = {
  image: 'Vira um slide, com o texto ao lado',
  logo: 'Fundo removido, entra na capa',
  pdf: 'Contexto pro briefing',
  other: 'Contexto pro briefing',
};

interface StepAssetsProps {
  assets: DraftAssetFile[];
  onChange: (assets: DraftAssetFile[]) => void;
}

export function StepAssets({ assets, onChange }: StepAssetsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(0);

  async function addFiles(list: Iterable<File>) {
    const incoming: File[] = [];
    for (const file of list) {
      if (!isAccepted(file)) {
        pushToast(`"${file.name}" não é PNG, JPG, WebP, SVG ou PDF, então ignorei.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        pushToast(`"${file.name}" passa de 20MB, então ignorei.`);
        continue;
      }
      if (assets.some((a) => a.name === file.name && a.sizeLabel === formatSize(file.size))) {
        pushToast(`"${file.name}" já está na lista.`);
        continue;
      }
      incoming.push(file);
    }
    if (incoming.length === 0) return;

    setReading((n) => n + incoming.length);
    const read = await Promise.all(
      incoming.map(async (file): Promise<DraftAssetFile> => {
        const kind = inferKind(file);
        const base: DraftAssetFile = {
          id: createId(),
          name: file.name,
          kind,
          sizeLabel: formatSize(file.size),
        };

        if (!canReadPixels(file)) return base;

        try {
          // AQUI é onde os bytes deixam de ser jogados fora.
          if (kind === 'logo') {
            const cut = await fileToLogoCutout(file);
            if (cut.notice) pushToast(cut.notice);
            return {
              ...base,
              image: { dataUrl: cut.dataUrl, mimeType: 'image/png', width: cut.width, height: cut.height },
              notice: cut.notice,
            };
          }
          return { ...base, image: await fileToSlideImage(file) };
        } catch {
          pushToast(`Não consegui ler "${file.name}". Ele entra como contexto, mas não vira imagem.`);
          return base;
        }
      }),
    );
    setReading((n) => Math.max(0, n - incoming.length));
    onChange([...assets, ...read]);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list) return;
    void addFiles(Array.from(list));
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
    void addFiles(Array.from(event.dataTransfer.files));
  }

  const photos = assets.filter((a) => a.kind === 'image' && a.image).length;

  return (
    <div>
      <StepHeader
        kicker="Bagagem"
        title="Tem algo que precisa entrar?"
        subtitle="Foto vira slide de conteúdo, com o texto ao lado. Logo entra na capa com o fundo removido. PDF entra como contexto do briefing."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex min-h-[190px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-7 transition-all duration-200',
              dragging
                ? 'scale-[1.01] border-brand/55 bg-brand/[0.07] shadow-[0_0_0_4px_rgba(45,219,96,0.1)]'
                : 'border-white/[0.10] bg-surface/50 hover:border-brand/30 hover:bg-brand/[0.03]',
            )}
          >
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200',
                dragging
                  ? 'border-brand/50 bg-brand/15 text-brand shadow-[0_0_24px_-6px_rgba(45,219,96,0.7)]'
                  : 'border-brand/25 bg-brand/[0.06] text-brand',
              )}
            >
              <Icon name="import" size={20} />
            </div>
            <div className="mt-3 text-[15px] font-semibold text-ink">
              {dragging ? 'Pode soltar' : 'Solte os arquivos ou clique aqui'}
            </div>
            <div className="mt-1 text-[12.5px] text-ink-muted">PNG, JPG, WebP, SVG, PDF · até 20MB cada</div>
            {reading > 0 && (
              <div className="mt-2 text-[12px] font-medium text-brand">
                lendo {reading} {reading === 1 ? 'arquivo' : 'arquivos'}...
              </div>
            )}
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

        <div className="flex min-h-[190px] flex-col rounded-2xl border border-white/[0.05] bg-surface/60">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
            <span className="text-[12.5px] font-semibold text-ink-secondary">Anexados</span>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-muted">
              {assets.length} {assets.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </div>

          {assets.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 text-center">
              <span className="text-[13px] text-ink-muted">Nada por aqui ainda.</span>
              <span className="text-[12px] leading-[1.55] text-ink-muted/70">
                Pode pular: dá pra anexar dentro do workspace depois.
              </span>
            </div>
          ) : (
            <ul className="flex max-h-[190px] flex-1 flex-col gap-1.5 overflow-y-auto p-2.5">
              <AnimatePresence initial={false}>
                {assets.map((asset) => {
                  const style = KIND_STYLES[asset.kind];
                  return (
                    <motion.li
                      key={asset.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="flex flex-none items-center gap-3 rounded-xl border border-white/[0.05] bg-surface px-3 py-2"
                    >
                      {/* A miniatura é o PIXEL DE VERDADE: a prova, na tela, de que os
                          bytes existem. Um ícone genérico era o que deixava o bug antigo
                          passar despercebido — a lista parecia funcionar. */}
                      {asset.image ? (
                        <img
                          src={asset.image.dataUrl}
                          alt=""
                          className="h-9 w-9 flex-none rounded-lg border border-white/10 bg-black/40 object-contain"
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-9 w-9 flex-none items-center justify-center rounded-lg border',
                            style.className,
                          )}
                        >
                          <Icon name={style.icon} size={16} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{asset.name}</div>
                        <div className="mt-0.5 truncate text-[11px] text-ink-muted">{KIND_ROLE[asset.kind]}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChange(assets.filter((a) => a.id !== asset.id))}
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

      {photos > 0 && (
        <p className="mb-0 mt-3 text-[12.5px] text-ink-muted">
          {photos === 1 ? 'A sua foto vai ocupar um slide' : `As suas ${photos} fotos vão ocupar ${photos} slides`} de
          miolo, com o texto numa coluna e a imagem na outra.
        </p>
      )}
    </div>
  );
}
