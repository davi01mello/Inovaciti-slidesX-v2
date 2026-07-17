import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { ELEMENTS, ELEMENT_COLORS, elementColorLabel, elementShapeLabel, hasElements } from '@/services/elementsManifest';
import { ICONS, ICON_CATEGORIES, iconCategoryLabel, iconNameLabel, hasIcons } from '@/services/iconsManifest';
import { addSessionUpload, listSessionUploads, type SessionUpload } from '@/services/sessionUploads';
import { writeInsertPayload } from '@/services/insertDnd';
import { generateAiImage } from '@/services/imageGenClient';
import { fileToSlideImage, pickImageFiles, IMAGE_ACCEPT_ATTR, type LoadedImage } from '@/lib/imageFile';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { FloatingTextKind } from '@/lib/blocks';

/**
 * Dock de inserção do workspace, no espírito do Canva: um rail vertical fixo ao
 * lado do palco (Texto / Elementos / Imagens) que abre um painel deslizante.
 * É O lugar pra colocar coisas no slide — nada de menus soltos espalhados.
 *
 * Todo item aceita os dois gestos: CLICAR insere no centro do slide, ARRASTAR
 * solta exatamente onde você quiser (ver services/insertDnd.ts). O painel fecha
 * clicando fora, com Esc, ou no × — nunca prende o usuário.
 */

interface InsertDockProps {
  onInsertText: (kind: FloatingTextKind) => void;
  onInsertElement: (assetKey: string) => void;
  onInsertImage: (image: LoadedImage) => void;
}

type DockTab = 'text' | 'brand' | 'images';

const TAB_TITLE: Record<DockTab, string> = { text: 'Texto', brand: 'Marca CITi', images: 'Imagens' };

export function InsertDock({ onInsertText, onInsertElement, onInsertImage }: InsertDockProps) {
  const [tab, setTab] = useState<DockTab | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Clique fora (no palco, no chat, onde for) fecha o painel. Esc também.
  useEffect(() => {
    if (!tab) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setTab(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setTab(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tab]);

  const showElements = hasElements();
  const showIcons = hasIcons();

  return (
    // No FLUXO do layout (não flutuando por cima): abrir um painel empurra o
    // palco pra direita em vez de cobrir o slide — como no Canva.
    <div className="flex flex-none items-center">
      <div ref={rootRef} className="flex items-center">
        <div className="glass-deep flex flex-col gap-1 rounded-2xl p-1.5">
          <RailButton icon="text" label="Texto" active={tab === 'text'} onClick={() => setTab((t) => (t === 'text' ? null : 'text'))} />
          {(showElements || showIcons) && (
            <RailButton
              icon="sparkle-design"
              label="Marca"
              active={tab === 'brand'}
              onClick={() => setTab((t) => (t === 'brand' ? null : 'brand'))}
            />
          )}
          <RailButton
            icon="file-image"
            label="Imagens"
            active={tab === 'images'}
            onClick={() => setTab((t) => (t === 'images' ? null : 'images'))}
          />
        </div>

        {tab && (
          <div className="glass-deep ml-2.5 flex max-h-[min(560px,calc(100vh-260px))] w-[288px] animate-dock-panel-in flex-col overflow-hidden rounded-2xl">
            <div className="flex flex-none items-center justify-between px-4 pb-2 pt-3.5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-secondary">{TAB_TITLE[tab]}</div>
              <button
                type="button"
                onClick={() => setTab(null)}
                aria-label="Fechar painel"
                className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink"
              >
                <Icon name="x" size={11} strokeWidth={2.4} />
              </button>
            </div>
            <p className="flex-none px-4 pb-2.5 text-[11px] leading-snug text-ink-muted">
              Clique pra inserir no centro, ou arraste pro slide.
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {tab === 'text' && <TextTab onInsert={onInsertText} />}
              {tab === 'brand' && <BrandTab onInsert={onInsertElement} />}
              {tab === 'images' && <ImagesTab onInsert={onInsertImage} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RailButton({ icon, label, active, onClick }: { icon: IconName; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-[58px] flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-2 transition-colors duration-150',
        active ? 'bg-brand/[0.16] text-brand' : 'text-ink-secondary hover:bg-white/[0.06] hover:text-ink',
      )}
    >
      <Icon name={icon} size={17} />
      <span className="text-[9.5px] font-semibold tracking-[0.02em]">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Texto — três opções, com preview no tamanho em que nascem no slide          */
/* -------------------------------------------------------------------------- */

const TEXT_OPTIONS: { kind: FloatingTextKind; label: string; fontSize: string; weight: number; opacity: number }[] = [
  // Os tamanhos espelham a hierarquia da caixa livre (FloatingTextLayer.specFor):
  // título 2.5cqw, subtítulo 1.75cqw, corpo 1.5cqw.
  { kind: 'title-2', label: 'Adicionar um título', fontSize: '22px', weight: 800, opacity: 1 },
  { kind: 'subtitle', label: 'Adicionar um subtítulo', fontSize: '16px', weight: 600, opacity: 0.9 },
  { kind: 'body', label: 'Adicionar um corpo de texto', fontSize: '13px', weight: 400, opacity: 0.75 },
];

function TextTab({ onInsert }: { onInsert: (kind: FloatingTextKind) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {TEXT_OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          draggable
          onDragStart={(event: DragEvent) => writeInsertPayload(event.dataTransfer, { type: 'text', kind: option.kind })}
          onClick={() => onInsert(option.kind)}
          className="cursor-grab rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left transition-all duration-150 hover:border-brand/35 hover:bg-brand/[0.07] active:cursor-grabbing"
        >
          <span
            className="block truncate text-ink"
            style={{
              fontFamily: 'var(--font-slide)',
              fontSize: option.fontSize,
              fontWeight: option.weight,
              opacity: option.opacity,
              letterSpacing: option.weight >= 700 ? '-0.02em' : undefined,
              lineHeight: 1.25,
            }}
          >
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Marca CITi — TUDO da identidade num painel só, em duas seções:              */
/*   ELEMENTOS 3D (as bolhas) e ÍCONES (os pictogramas oficiais).             */
/* -------------------------------------------------------------------------- */

/** Cabeçalho de seção do painel: o traço da marca + título, como nos slides. */
function SectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-0.5 pb-1.5 pt-1">
      <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-gradient-to-r from-brand to-brand/30" />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-secondary">{label}</span>
    </div>
  );
}

function BrandTab({ onInsert }: { onInsert: (assetKey: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {hasElements() && (
        <div>
          <SectionHeading label="Elementos 3D" />
          <ElementsTab onInsert={onInsert} />
        </div>
      )}
      {hasIcons() && (
        <div>
          <SectionHeading label="Ícones CITi" />
          <IconsTab onInsert={onInsert} />
        </div>
      )}
    </div>
  );
}

function ElementsTab({ onInsert }: { onInsert: (assetKey: string) => void }) {
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const visible = useMemo(() => (colorFilter ? ELEMENTS.filter((e) => e.color === colorFilter) : ELEMENTS), [colorFilter]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <ColorChip active={colorFilter === null} onClick={() => setColorFilter(null)} label="Todas" />
        {ELEMENT_COLORS.map((color) => (
          <ColorChip
            key={color}
            active={colorFilter === color}
            onClick={() => setColorFilter(color)}
            label={elementColorLabel(color)}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map((asset) => (
          <button
            key={asset.key}
            type="button"
            draggable
            onDragStart={(event: DragEvent) => writeInsertPayload(event.dataTransfer, { type: 'element', assetKey: asset.key })}
            onClick={() => onInsert(asset.key)}
            title={`${elementShapeLabel(asset.shape)} · ${elementColorLabel(asset.color)}`}
            className="group flex aspect-square cursor-grab items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] p-1.5 transition-all duration-150 hover:border-brand/40 hover:bg-brand/[0.07] active:cursor-grabbing"
          >
            <img
              src={asset.src}
              alt=""
              draggable={false}
              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-110"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ícones — pictogramas da marca (pilares, valores, áreas...), filtrável por
   categoria. Traço branco + verde: lê bem no painel escuro E nos templates
   (que são escuros por padrão) — por isso o traço não é preto no arquivo.    */
/* -------------------------------------------------------------------------- */

function IconsTab({ onInsert }: { onInsert: (assetKey: string) => void }) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const visible = useMemo(
    () => (categoryFilter ? ICONS.filter((i) => i.category === categoryFilter) : ICONS),
    [categoryFilter],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <ColorChip active={categoryFilter === null} onClick={() => setCategoryFilter(null)} label="Todas" />
        {ICON_CATEGORIES.map((category) => (
          <ColorChip
            key={category}
            active={categoryFilter === category}
            onClick={() => setCategoryFilter(category)}
            label={iconCategoryLabel(category)}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map((asset) => (
          <button
            key={asset.key}
            type="button"
            draggable
            onDragStart={(event: DragEvent) => writeInsertPayload(event.dataTransfer, { type: 'element', assetKey: asset.key })}
            onClick={() => onInsert(asset.key)}
            aria-label={`${iconNameLabel(asset.name)} · ${iconCategoryLabel(asset.category)}`}
            className="group relative flex aspect-square cursor-grab items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] p-1.5 transition-all duration-150 hover:border-brand/40 hover:bg-brand/[0.07] active:cursor-grabbing"
          >
            <img
              src={asset.src}
              alt=""
              draggable={false}
              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-110"
            />
            {/* Nome do ícone: nasce escondido, aparece no hover. O nome do arquivo é a
                única pista do que o pictograma significa — sem isso a pessoa insere às
                cegas. Posicionado ACIMA (não abaixo) porque a grade tem várias linhas e
                um tooltip embaixo ficaria coberto pela linha seguinte. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0b0d10] px-2 py-1 text-[10px] font-medium text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {iconNameLabel(asset.name)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors duration-150',
        active ? 'bg-brand/20 text-brand' : 'bg-white/[0.05] text-ink-muted hover:bg-white/[0.09] hover:text-ink-secondary',
      )}
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Imagens — upload direto pro slide + recentes da sessão                      */
/* -------------------------------------------------------------------------- */

function ImagesTab({ onInsert }: { onInsert: (image: LoadedImage) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReading, setReading] = useState(false);
  const [recents, setRecents] = useState<SessionUpload[]>(() => listSessionUploads());

  async function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const files = pickImageFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
    if (files.length === 0) {
      pushToast('Só consigo receber imagens (JPEG, PNG ou WebP).');
      return;
    }
    setReading(true);
    try {
      for (const file of files) {
        const image = await fileToSlideImage(file);
        addSessionUpload(image);
        onInsert(image);
      }
      setRecents(listSessionUploads());
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui ler essa imagem.');
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(event) => void handlePick(event)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isReading}
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/[0.16] bg-white/[0.03] px-4 py-5 text-center transition-all duration-150 hover:border-brand/45 hover:bg-brand/[0.06] disabled:cursor-wait"
      >
        {isReading ? (
          <Spinner size="sm" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/30 bg-brand/[0.12] text-brand">
            <Icon name="import" size={16} />
          </span>
        )}
        <span className="text-[12.5px] font-semibold text-ink">{isReading ? 'Preparando…' : 'Enviar Imagem'}</span>
        <span className="text-[11px] leading-snug text-ink-muted">Ou arraste um arquivo direto pro slide</span>
      </button>

      <AiImageGenerator onInsert={onInsert} />

      {recents.length > 0 && (
        <div>
          <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Recentes</div>
          <div className="grid grid-cols-3 gap-1.5">
            {recents.map((image) => (
              <button
                key={image.id}
                type="button"
                draggable
                onDragStart={(event: DragEvent) => writeInsertPayload(event.dataTransfer, { type: 'image', uploadId: image.id })}
                onClick={() => onInsert(image)}
                title="Clique pra inserir, ou arraste pro slide"
                className="group aspect-square cursor-grab overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03] transition-all duration-150 hover:border-brand/40 active:cursor-grabbing"
              >
                <img
                  src={image.dataUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Gerar com IA — ação mais cara do editor, aviso de custo sempre visível      */
/* -------------------------------------------------------------------------- */

function AiImageGenerator({ onInsert }: { onInsert: (image: LoadedImage) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setGenerating] = useState(false);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      pushToast('Descreve a imagem em algumas palavras antes de gerar.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateAiImage(trimmed);
      const image: LoadedImage = { dataUrl: result.dataUrl, mimeType: 'image/png', width: result.width, height: result.height };
      addSessionUpload(image);
      onInsert(image);
      pushToast('Imagem gerada e adicionada ao slide.');
      setPrompt('');
      setOpen(false);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Não consegui gerar a imagem agora.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Gera uma imagem única com IA — mais lenta e mais cara que os elementos prontos. Use com moderação."
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-brand/30 bg-brand/[0.12] text-brand">
          <Icon name="sparkles" size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-ink">Gerar imagem com IA</span>
          <span className="block text-[10.5px] leading-snug text-ink-muted">Mais cara que os elementos prontos</span>
        </span>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} className="flex-none text-ink-muted" />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Descreva a imagem, ex: um foguete decolando, estilo 3D"
            maxLength={600}
            rows={3}
            disabled={isGenerating}
            className="w-full resize-none rounded-lg border border-white/[0.09] bg-black/20 px-2.5 py-2 text-[12px] text-ink placeholder:text-ink-muted focus:border-brand/40 focus:outline-none disabled:opacity-60"
          />
          <p className="text-[10.5px] leading-snug text-ink-muted">
            Custo real de API por imagem gerada — evite gerar sem necessidade. Prefira os elementos prontos quando servirem.
          </p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || prompt.trim().length < 3}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#36E66A] to-brand px-3 py-2 text-[12px] font-semibold text-[#07130b] transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <Spinner size="sm" /> : <Icon name="sparkles" size={13} />}
            {isGenerating ? 'Gerando…' : 'Gerar imagem'}
          </button>
        </div>
      )}
    </div>
  );
}
