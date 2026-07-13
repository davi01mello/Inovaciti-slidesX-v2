import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { isEmpty, renderRich, fromPlain, type RichText } from '@/lib/richText';
import { RichEditable } from '@/components/workspace/RichEditable';
import { DecorationsLayer } from '@/components/present/DecorationsLayer';
import { FloatingTextLayer } from '@/components/present/FloatingTextLayer';
import { TransformBox } from '@/components/present/TransformBox';
import { cn } from '@/lib/cn';
import { composeSlide, type ComposedItem, type ComposedSlide } from '@/services/templateComposition';
import { clampBelowLogoSafe, manifestFor, type TemplateManifest, type Zone } from '@/services/templateManifest';
import type { Block, BlockRect, Slide, TextBlock } from '@/types/slide';

/**
 * Composição de slide sobre os templates oficiais do CITi.
 *
 * O fundo de cada arquétipo é a arte real do template (limpa, sem texto) e os
 * textos são compostos por cima nas zonas que o MANIFESTO do template declara
 * (templateManifest.ts) — mesma lógica de um designer preenchendo placeholders
 * no Figma, mas com os retângulos como dados, nunca constantes soltas.
 *
 * Três modos, um único render (fonte de verdade visual):
 * - leitura: apresentação, miniaturas e home;
 * - editable: cada texto vira um RichEditable NO LUGAR (WYSIWYG de verdade);
 * - artOnly: esconde só os textos (visibility) pro export rasterizar a arte e
 *   emitir os textos como caixas de texto reais no PPTX.
 *
 * Simetria é regra: títulos quebram com `text-wrap: balance` (nunca órfãos),
 * textos de uma linha se espremem levemente pra caber em UMA linha (LineFit),
 * e nenhum texto invade a área protegida da logo (clampBelowLogoSafe).
 *
 * Todas as medidas usam unidades de container (cqw/cqh), então o mesmo
 * componente renderiza fiel em qualquer tamanho: apresentação, palco do
 * workspace, miniaturas e a rasterização de export (1920x1080).
 */

const GREEN = '#2ddb60';
const GREEN_GLOW = '0 0 1.1cqw rgba(45,219,96,0.4)';
const CARD_BG = 'linear-gradient(180deg, rgba(17,25,20,0.78), rgba(6,9,7,0.72))';
const CARD_BORDER = '1px solid rgba(45,219,96,0.16)';

/* ------------------------------------------------------------------------ */
/* Contexto de edição                                                        */
/* ------------------------------------------------------------------------ */

interface CompositionContextValue {
  editable: boolean;
  commitContent: (blockId: string, content: RichText) => void;
  commitItem: (blockId: string, index: number, content: RichText) => void;
  addItem: (blockId: string) => void;
  /** Área de conteúdo customizada pelo usuário (mover/redimensionar), se houver. */
  contentZoneOverride?: BlockRect;
  /** true só quando editable E o handler de mover/redimensionar foi de fato passado. */
  contentZoneEditable: boolean;
  commitContentZone: (rect: BlockRect) => void;
  resetContentZone: () => void;
}

const CompositionContext = createContext<CompositionContextValue>({
  editable: false,
  commitContent: () => {},
  commitItem: () => {},
  addItem: () => {},
  contentZoneEditable: false,
  commitContentZone: () => {},
  resetContentZone: () => {},
});

interface SlideCompositionProps {
  slide: Slide;
  className?: string;
  /** Edição no lugar: os textos viram RichEditable e commitam via onBlockChange. */
  editable?: boolean;
  onBlockChange?: (blockId: string, patch: Partial<Block>) => void;
  /** Move/redimensiona um elemento visual (Decoration) — habilita a camada interativa. */
  onDecorationMove?: (decorationId: string, rect: BlockRect) => void;
  onDecorationDelete?: (decorationId: string) => void;
  /** Remove uma caixa de texto livre (a camada flutuante precisa disso no modo edição). */
  onBlockDelete?: (blockId: string) => void;
  /** Move/redimensiona a área de conteúdo (título+corpo) como uma unidade. */
  onContentZoneMove?: (rect: BlockRect) => void;
  onContentZoneReset?: () => void;
  /** Export: esconde os textos (mantendo a arte) pra rasterizar só o fundo. */
  artOnly?: boolean;
}

export function SlideComposition({
  slide,
  className,
  editable = false,
  onBlockChange,
  onDecorationMove,
  onDecorationDelete,
  onBlockDelete,
  onContentZoneMove,
  onContentZoneReset,
  artOnly = false,
}: SlideCompositionProps) {
  const plan = useMemo(() => composeSlide(slide), [slide]);
  const manifest = useMemo(() => manifestFor(plan.archetype, slide.id), [plan.archetype, slide.id]);
  const floatingBlocks = useMemo(
    () => slide.blocks.filter((b): b is TextBlock => b.kind !== 'bullets' && !!b.floating),
    [slide.blocks],
  );

  const ctx = useMemo<CompositionContextValue>(
    () => ({
      editable: editable && !!onBlockChange,
      commitContent: (blockId, content) => onBlockChange?.(blockId, { content } as Partial<Block>),
      commitItem: (blockId, index, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'bullets') return;
        const items = [...block.items];
        if (isEmpty(content) && items.length > 1) items.splice(index, 1);
        else items[index] = content;
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      addItem: (blockId) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'bullets') return;
        onBlockChange?.(blockId, { items: [...block.items, fromPlain('Novo tópico')] } as Partial<Block>);
      },
      contentZoneOverride: slide.contentZoneOverride,
      contentZoneEditable: editable && !!onContentZoneMove,
      commitContentZone: (rect) => onContentZoneMove?.(rect),
      resetContentZone: () => onContentZoneReset?.(),
    }),
    [editable, onBlockChange, slide.blocks, slide.contentZoneOverride, onContentZoneMove, onContentZoneReset],
  );

  return (
    <CompositionContext.Provider value={ctx}>
      <div
        data-slide-export={artOnly ? 'art' : undefined}
        data-slide-stage=""
        className={cn('relative h-full w-full overflow-hidden bg-[#040605]', className)}
        style={{
          containerType: 'size',
          color: 'var(--color-slide-fg)',
          fontFamily: 'var(--font-slide)',
        }}
      >
        <img src={manifest.src} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {plan.archetype === 'cover' && <CoverLayout plan={plan} manifest={manifest} />}
        {plan.archetype === 'statement' && <StatementLayout plan={plan} manifest={manifest} />}
        {plan.archetype === 'cards' && <CardsLayout plan={plan} manifest={manifest} />}
        {plan.archetype === 'rows' && <RowsLayout plan={plan} manifest={manifest} />}
        {plan.archetype === 'bignumber' && <BigNumberLayout plan={plan} manifest={manifest} />}
        {slide.decorations && slide.decorations.length > 0 && (
          <DecorationsLayer
            decorations={slide.decorations}
            editable={ctx.editable && !!onDecorationMove}
            onMove={(decorationId, rect) => onDecorationMove?.(decorationId, rect)}
            onDelete={(decorationId) => onDecorationDelete?.(decorationId)}
          />
        )}
        <FloatingTextLayer
          blocks={floatingBlocks}
          editable={ctx.editable}
          onContentChange={(blockId, content) => onBlockChange?.(blockId, { content } as Partial<Block>)}
          onMove={(blockId, rect) => onBlockChange?.(blockId, { rect } as Partial<Block>)}
          onDelete={(blockId) => onBlockDelete?.(blockId)}
        />
      </div>
    </CompositionContext.Provider>
  );
}

/* ------------------------------------------------------------------------ */
/* Zonas do manifesto                                                        */
/* ------------------------------------------------------------------------ */

/** Área absoluta declarada no manifesto (retângulo normalizado 0..1). */
function ZoneBox({ zone, className, style, children }: { zone: Zone; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={cn('absolute', className)}
      style={{
        left: `${zone.x * 100}%`,
        top: `${zone.y * 100}%`,
        width: `${zone.width * 100}%`,
        height: `${zone.height * 100}%`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Zona principal de conteúdo: protegida da logo e encolhida quando há banner. */
function effectiveContentZone(manifest: TemplateManifest, hasBanner: boolean, override?: BlockRect): Zone {
  if (override) return override;
  const zone = clampBelowLogoSafe(manifest.content, manifest.logoSafe);
  if (hasBanner && manifest.banner) {
    const bottom = manifest.banner.y - 0.03;
    return { ...zone, height: Math.max(0.15, bottom - zone.y) };
  }
  return zone;
}

/**
 * Área de conteúdo do template (título + corpo) como uma unidade movível.
 * No modo edição vira um TransformBox: alça de mover no topo, oito alças de
 * redimensionar (cantos E lados) e um botão de restaurar a posição do template.
 * O corpo NÃO arrasta — os textos lá dentro precisam continuar clicáveis e
 * selecionáveis; quem move é a alça.
 */
function ContentZoneFrame({ zone, className, style, children }: { zone: Zone; className?: string; style?: CSSProperties; children: ReactNode }) {
  const ctx = useContext(CompositionContext);
  const editable = ctx.contentZoneEditable;
  const rect = ctx.contentZoneOverride ?? { x: zone.x, y: zone.y, width: zone.width, height: zone.height };

  return (
    <TransformBox
      kind="zone"
      rect={rect}
      onChange={(next) => ctx.commitContentZone(next)}
      interactive={editable}
      selected={editable}
      onSelect={() => {}}
      bodyDraggable={false}
      grip
      tone="subtle"
      revealOnHover
      minWidth={0.15}
      minHeight={0.12}
      className={className}
      style={style}
      chrome={
        ctx.contentZoneOverride ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              ctx.resetContentZone();
            }}
            title="Restaurar posição padrão do template"
            aria-label="Restaurar posição padrão do template"
            className="absolute -left-2.5 -top-[62px] z-10 flex h-6 w-6 items-center justify-center rounded-md border border-white/20 bg-surface-3 text-ink-secondary shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition-colors duration-150 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M4 10a6 6 0 1 1 1.76 4.24.75.75 0 1 1 1.06-1.06A4.5 4.5 0 1 0 5.5 10a.75.75 0 0 1-1.5 0Z" />
              <path d="M4 5.5v3a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 0-1.5H5.5v-2.25a.75.75 0 0 0-1.5 0Z" />
            </svg>
          </button>
        ) : null
      }
    >
      <div className="relative h-full w-full">{children}</div>
    </TransformBox>
  );
}

/* ------------------------------------------------------------------------ */
/* Texto: uma linha sempre que couber, balance quando quebrar                 */
/* ------------------------------------------------------------------------ */

interface LineFitProps {
  /** Encolhe a fonte até este fator pra fechar em UMA linha; abaixo disso, quebra. */
  minScale?: number;
  /** Como quebrar quando não couber em uma linha. */
  wrap?: 'balance' | 'pretty';
  exportText?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * A regra de ouro da simetria: se o texto fecha em UMA linha com uma redução
 * leve de fonte, ele fica em uma linha. Se precisar quebrar, quebra equilibrado
 * (`text-wrap: balance`) — nunca uma palavra órfã sobrando na última linha.
 */
function LineFit({ minScale = 0.82, wrap = 'balance', exportText = true, className, style, children }: LineFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  // null = quebra normal (balance); número = escala de fonte pra fechar em 1 linha.
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const probe = probeRef.current;
    if (!outer || !probe) return;
    const measure = () => {
      const available = outer.clientWidth;
      const natural = probe.scrollWidth;
      if (available <= 0 || natural <= 0) return;
      const ratio = available / natural;
      setScale(ratio >= 1 ? 1 : ratio >= minScale ? ratio * 0.995 : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(probe);
    return () => observer.disconnect();
  }, [minScale, children]);

  return (
    <div ref={outerRef} className={cn('relative w-full', className)} style={style}>
      {/* Sonda invisível: mede a largura natural do texto em UMA linha. */}
      <span
        ref={probeRef}
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', visibility: 'hidden', pointerEvents: 'none' }}
      >
        {children}
      </span>
      <div
        data-export-text={exportText ? '' : undefined}
        style={{
          fontSize: scale !== null ? `${scale}em` : undefined,
          whiteSpace: scale !== null ? 'nowrap' : undefined,
          textWrap: scale === null ? wrap : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Especificação tipográfica de um pedaço de texto do template. */
interface TextSpec {
  fontSize: string;
  weight?: number;
  lineHeight?: number;
  letterSpacing?: string;
  color?: string;
  /** Espreme pra 1 linha quando couber (LineFit). Default: true. */
  fitLine?: boolean;
  wrap?: 'balance' | 'pretty';
  minScale?: number;
}

/**
 * Hierarquia real nos textos de apoio: um título extra inserido pelo usuário
 * NÃO pode renderizar do mesmo tamanho que um corpo. A base é o spec de apoio
 * de cada layout; o kind do bloco escala a partir dela — são estes os tamanhos
 * que o painel "Texto" do dock espelha nos previews.
 */
function supportSpecFor(kind: Block['kind'], base: TextSpec): TextSpec {
  const baseSize = Number.parseFloat(base.fontSize);
  switch (kind) {
    case 'title-1':
    case 'title-2':
      return {
        fontSize: `${(baseSize * 1.66).toFixed(2)}cqw`,
        weight: 800,
        lineHeight: 1.18,
        letterSpacing: '-0.02em',
        color: 'rgba(247,247,247,0.96)',
        minScale: 0.8,
      };
    case 'title-3':
      return {
        fontSize: `${(baseSize * 1.4).toFixed(2)}cqw`,
        weight: 700,
        lineHeight: 1.25,
        letterSpacing: '-0.015em',
        color: 'rgba(247,247,247,0.94)',
        minScale: 0.82,
      };
    case 'subtitle':
      return { ...base, fontSize: `${(baseSize * 1.17).toFixed(2)}cqw`, weight: 500, color: 'rgba(247,247,247,0.82)' };
    default:
      return base;
  }
}

interface SlideTextProps {
  block: TextBlock;
  spec: TextSpec;
  /** Alinhamento do design desta zona; 'left' salvo é tratado como "não mexeu". */
  designAlign: 'left' | 'center';
  multiline?: boolean;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Um texto do template: no modo leitura renderiza runs seguros com LineFit;
 * no modo edição vira um RichEditable NO MESMO LUGAR, com a mesma tipografia.
 */
function SlideText({ block, spec, designAlign, multiline = false, ariaLabel, className, style }: SlideTextProps) {
  const ctx = useContext(CompositionContext);
  // 'left' é o default de armazenamento (indistinguível de "não mexeu"), então o
  // design da zona vence; center/right/justify explícitos do usuário vencem o design.
  const align = block.align !== 'left' ? block.align : designAlign;

  const baseStyle: CSSProperties = {
    fontSize: spec.fontSize,
    fontWeight: spec.weight ?? 400,
    lineHeight: spec.lineHeight ?? 1.5,
    letterSpacing: spec.letterSpacing,
    color: spec.color,
    textAlign: align,
    ...style,
  };

  if (ctx.editable) {
    return (
      <div data-block-id={block.id} data-align={align} className={cn('w-full', className)} style={baseStyle}>
        <RichEditable
          value={block.content}
          onCommit={(next) => ctx.commitContent(block.id, next)}
          placeholder={ariaLabel}
          multiline={multiline}
          ariaLabel={ariaLabel}
          style={{ textWrap: spec.wrap ?? 'balance' } as CSSProperties}
        />
      </div>
    );
  }

  if (isEmpty(block.content)) return null;

  return (
    <div data-block-id={block.id} className={cn('w-full', className)} style={baseStyle}>
      {spec.fitLine === false ? (
        <div data-export-text="" style={{ textWrap: spec.wrap ?? 'pretty' } as CSSProperties}>
          {renderRich(block.content)}
        </div>
      ) : (
        <LineFit minScale={spec.minScale ?? 0.82} wrap={spec.wrap ?? 'balance'}>
          {renderRich(block.content)}
        </LineFit>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Arquétipos                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Capa: a logo do CITi é ELEMENTO DE DESIGN — o wordmark grande ancorando o
 * canto superior esquerdo, com o texto distribuído numa coluna à esquerda
 * (kicker, título display, subtítulo), deixando a escultura respirar à direita.
 */
function CoverLayout({ plan, manifest }: { plan: ComposedSlide; manifest: TemplateManifest }) {
  const ctx = useContext(CompositionContext);
  const contentZone = effectiveContentZone(manifest, !!plan.highlight, ctx.contentZoneOverride);
  return (
    <>
      <ZoneBox zone={manifest.logo.zone}>
        <img src={manifest.logo.src} alt="" className="h-full w-full object-contain object-left-top" draggable={false} />
      </ZoneBox>

      <ContentZoneFrame zone={contentZone}>
        <FitText>
          <div className="flex w-full flex-col items-start" style={{ gap: '3cqh' }}>
            {plan.label && <EyebrowLabel block={plan.label} designAlign="left" withDash />}
            {plan.headline && (
              <SlideText
                block={plan.headline}
                designAlign="left"
                ariaLabel="Título da capa"
                spec={{
                  fontSize: plan.headline.kind === 'title-1' ? '4.9cqw' : '4.1cqw',
                  weight: 800,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  minScale: 0.78,
                }}
              />
            )}
            {plan.support.map((block) => (
              <SlideText
                key={block.id}
                block={block}
                designAlign="left"
                multiline
                ariaLabel="Subtítulo"
                spec={supportSpecFor(block.kind, {
                  fontSize: '1.55cqw',
                  lineHeight: 1.6,
                  color: 'rgba(247,247,247,0.75)',
                  minScale: 0.86,
                })}
                style={{ maxWidth: '44cqw' }}
              />
            ))}
          </div>
        </FitText>
      </ContentZoneFrame>
      {plan.highlight && manifest.banner && <BannerStrip block={plan.highlight} zone={manifest.banner} />}
    </>
  );
}

function StatementLayout({ plan, manifest }: { plan: ComposedSlide; manifest: TemplateManifest }) {
  const ctx = useContext(CompositionContext);
  const contentZone = effectiveContentZone(manifest, !!plan.highlight, ctx.contentZoneOverride);
  return (
    <>
      <BrandChrome manifest={manifest} />
      <ContentZoneFrame zone={contentZone}>
        <FitText anchor="center">
          <div className="flex w-full flex-col items-center text-center" style={{ gap: '2.8cqh' }}>
            {plan.label && <EyebrowLabel block={plan.label} designAlign="center" />}
            {plan.headline && (
              <SlideText
                block={plan.headline}
                designAlign="center"
                ariaLabel="Título"
                spec={{ fontSize: '3.7cqw', weight: 800, lineHeight: 1.12, letterSpacing: '-0.025em', minScale: 0.8 }}
              />
            )}
            <TitleDash />
            {plan.support.map((block) => (
              <SlideText
                key={block.id}
                block={block}
                designAlign="center"
                multiline
                ariaLabel="Texto de apoio"
                spec={supportSpecFor(block.kind, {
                  fontSize: '1.5cqw',
                  lineHeight: 1.65,
                  color: 'rgba(247,247,247,0.7)',
                  minScale: 0.88,
                })}
                style={{ maxWidth: '54cqw', marginInline: 'auto' }}
              />
            ))}
          </div>
        </FitText>
      </ContentZoneFrame>
      {plan.highlight && manifest.banner && <BannerStrip block={plan.highlight} zone={manifest.banner} />}
    </>
  );
}

function CardsLayout({ plan, manifest }: { plan: ComposedSlide; manifest: TemplateManifest }) {
  const items = plan.items;
  const ctx = useContext(CompositionContext);
  const contentZone = effectiveContentZone(manifest, !!plan.highlight, ctx.contentZoneOverride);
  // 2 cards ficam elegantes mais estreitos e centrados; 3+ ocupam a zona inteira.
  const slim = items.length <= 2;
  return (
    <>
      <BrandChrome manifest={manifest} />
      {manifest.header && <TemplateHeader plan={plan} zone={manifest.header} />}
      <ContentZoneFrame zone={contentZone}>
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
            gap: '2.2cqw',
            paddingInline: slim ? '9cqw' : undefined,
          }}
        >
          {items.map((item, i) => (
            <TemplateCard key={`${item.blockId}-${item.index}`} order={i} item={item} />
          ))}
        </div>
        <AddItemButton items={items} />
      </ContentZoneFrame>
      {plan.highlight && manifest.banner && <BannerStrip block={plan.highlight} zone={manifest.banner} />}
    </>
  );
}

function RowsLayout({ plan, manifest }: { plan: ComposedSlide; manifest: TemplateManifest }) {
  const items = plan.items;
  const ctx = useContext(CompositionContext);
  const contentZone = effectiveContentZone(manifest, !!plan.highlight, ctx.contentZoneOverride);
  return (
    <>
      <BrandChrome manifest={manifest} />
      {manifest.header && <TemplateHeader plan={plan} zone={manifest.header} />}
      <ContentZoneFrame zone={contentZone}>
        <div className="flex h-full flex-col" style={{ gap: '1.5cqh' }}>
          {items.map((item, i) => (
            <TemplateRow key={`${item.blockId}-${item.index}`} order={i} item={item} />
          ))}
        </div>
        <AddItemButton items={items} />
      </ContentZoneFrame>
      {plan.highlight && manifest.banner && <BannerStrip block={plan.highlight} zone={manifest.banner} />}
    </>
  );
}

function BigNumberLayout({ plan, manifest }: { plan: ComposedSlide; manifest: TemplateManifest }) {
  const ctx = useContext(CompositionContext);
  const contentZone = effectiveContentZone(manifest, !!plan.highlight, ctx.contentZoneOverride);
  return (
    <>
      <BrandChrome manifest={manifest} />
      <ContentZoneFrame zone={contentZone}>
        <FitText anchor="center">
          <div className="flex w-full flex-col items-center text-center" style={{ gap: '2.6cqh' }}>
            {plan.label && <EyebrowLabel block={plan.label} designAlign="center" />}
            {plan.headline && (
              <SlideText
                block={plan.headline}
                designAlign="center"
                ariaLabel="Título"
                spec={{ fontSize: '2.7cqw', weight: 700, lineHeight: 1.2, letterSpacing: '-0.015em', minScale: 0.84 }}
              />
            )}
            <TitleDash />
            {plan.metric && (
              <div
                className="rounded-[1.6cqw]"
                style={{
                  border: CARD_BORDER,
                  background: CARD_BG,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  padding: '2.2cqh 5.5cqw',
                }}
              >
                <SlideText
                  block={plan.metric}
                  designAlign="center"
                  ariaLabel="Número em destaque"
                  spec={{ fontSize: '5.4cqw', weight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', minScale: 0.7 }}
                />
              </div>
            )}
            {plan.support.map((block) => (
              <SlideText
                key={block.id}
                block={block}
                designAlign="center"
                multiline
                ariaLabel="Texto de apoio"
                spec={supportSpecFor(block.kind, {
                  fontSize: '1.5cqw',
                  lineHeight: 1.6,
                  color: 'rgba(247,247,247,0.7)',
                  minScale: 0.88,
                })}
                style={{ maxWidth: '52cqw', marginInline: 'auto' }}
              />
            ))}
          </div>
        </FitText>
      </ContentZoneFrame>
      {plan.highlight && manifest.banner && <BannerStrip block={plan.highlight} zone={manifest.banner} />}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Peças do template                                                         */
/* ------------------------------------------------------------------------ */

/**
 * Guarda de overflow das zonas do template: o conteúdo é medido no tamanho
 * natural e escalado pra caber na zona — 'top' ancora no topo, 'center'
 * centraliza na vertical. Junto com o LineFit (que resolve linha a linha),
 * garante que NADA jamais vaza da zona que o design reservou.
 */
function FitText({ anchor = 'top', children }: { anchor?: 'top' | 'center'; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const centerTransform = anchor === 'center' ? 'translateY(-50%) ' : '';

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      inner.style.transform = centerTransform.trim() || 'none';
      const outerRect = outer.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      if (outerRect.width <= 0 || outerRect.height <= 0) return;
      const next = Math.max(
        0.35,
        Math.min(1, outerRect.width / Math.max(innerRect.width, 1), outerRect.height / Math.max(innerRect.height, 1)),
      );
      setScale(next);
      inner.style.transform = `${centerTransform}scale(${next})`;
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [centerTransform]);

  useEffect(() => {
    const inner = innerRef.current;
    if (inner) inner.style.transform = `${centerTransform}scale(${scale})`;
  }, [scale, centerTransform]);

  return (
    <div ref={outerRef} className="relative h-full w-full">
      <div
        ref={innerRef}
        className="absolute left-0 w-full"
        style={{
          top: anchor === 'center' ? '50%' : 0,
          transformOrigin: anchor === 'center' ? 'left center' : 'top left',
          transform: `${centerTransform}scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Logo CITi na zona que o manifesto reservou pra marca nos slides internos. */
function BrandChrome({ manifest }: { manifest: TemplateManifest }) {
  return (
    <ZoneBox zone={manifest.logo.zone}>
      <img src={manifest.logo.src} alt="" className="h-full w-full object-contain object-left" draggable={false} />
    </ZoneBox>
  );
}

/** Rótulo pequeno verde (kicker) — editável como qualquer texto. */
function EyebrowLabel({ block, designAlign, withDash = false }: { block: TextBlock; designAlign: 'left' | 'center'; withDash?: boolean }) {
  const ctx = useContext(CompositionContext);
  if (!ctx.editable && isEmpty(block.content)) return null;
  return (
    <div className={cn('flex w-full items-center', designAlign === 'center' && 'justify-center')} style={{ gap: '1.1cqw' }}>
      {withDash && (
        <span aria-hidden="true" className="rounded-full" style={{ width: '3.2cqw', height: '0.4cqh', background: GREEN, boxShadow: GREEN_GLOW }} />
      )}
      <SlideText
        block={block}
        designAlign={designAlign}
        ariaLabel="Rótulo"
        className="uppercase"
        spec={{ fontSize: '1.05cqw', weight: 600, lineHeight: 1.4, letterSpacing: '0.3em', color: GREEN }}
        style={{ width: 'auto', textShadow: GREEN_GLOW }}
      />
    </div>
  );
}

/** Traço verde curto que assina os títulos do template. */
function TitleDash() {
  return (
    <span
      aria-hidden="true"
      className="rounded-full"
      style={{ width: '4.2cqw', height: '0.42cqh', background: GREEN, boxShadow: GREEN_GLOW }}
    />
  );
}

/** Título + traço do topo (arquétipos cards e rows), centrados na zona do manifesto. */
function TemplateHeader({ plan, zone }: { plan: ComposedSlide; zone: Zone }) {
  return (
    <ZoneBox zone={zone}>
      <FitText anchor="center">
        <div className="flex w-full flex-col items-center text-center" style={{ gap: '1.5cqh' }}>
          {plan.label && <EyebrowLabel block={plan.label} designAlign="center" />}
          {plan.headline && (
            <SlideText
              block={plan.headline}
              designAlign="center"
              ariaLabel="Título"
              spec={{ fontSize: '2.7cqw', weight: 800, lineHeight: 1.12, letterSpacing: '-0.025em', minScale: 0.8 }}
            />
          )}
          <TitleDash />
          {plan.support.map((block) => (
            <SlideText
              key={block.id}
              block={block}
              designAlign="center"
              multiline
              ariaLabel="Texto de apoio"
              spec={supportSpecFor(block.kind, {
                fontSize: '1.25cqw',
                lineHeight: 1.5,
                color: 'rgba(247,247,247,0.65)',
                minScale: 0.88,
              })}
              style={{ maxWidth: '52cqw', marginInline: 'auto' }}
            />
          ))}
        </div>
      </FitText>
    </ZoneBox>
  );
}

/** Texto de um item de lista (card/linha): leitura com LineFit, edição no lugar. */
function ItemText({ item, spec, anchor = 'top', ariaLabel }: { item: ComposedItem; spec: TextSpec; anchor?: 'top' | 'center'; ariaLabel: string }) {
  const ctx = useContext(CompositionContext);

  const baseStyle: CSSProperties = {
    fontSize: spec.fontSize,
    fontWeight: spec.weight ?? 400,
    lineHeight: spec.lineHeight ?? 1.5,
    color: spec.color,
  };

  if (ctx.editable) {
    return (
      <div className={cn('w-full', anchor === 'center' && 'self-center')} style={baseStyle}>
        <RichEditable
          value={item.content}
          onCommit={(next) => ctx.commitItem(item.blockId, item.index, next)}
          placeholder={ariaLabel}
          multiline
          ariaLabel={ariaLabel}
          style={{ textWrap: 'pretty' } as CSSProperties}
        />
      </div>
    );
  }

  return (
    <FitText anchor={anchor}>
      <div style={baseStyle}>
        <LineFit minScale={0.86} wrap="pretty">
          {renderRich(item.content)}
        </LineFit>
      </div>
    </FitText>
  );
}

function TemplateCard({ order, item }: { order: number; item: ComposedItem }) {
  return (
    <div
      className="flex min-h-0 flex-col rounded-[1.7cqw]"
      style={{
        border: CARD_BORDER,
        background: CARD_BG,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '2.6cqh 2.2cqw',
      }}
    >
      <span
        className="font-extrabold"
        style={{ fontSize: '3.2cqw', lineHeight: 1, letterSpacing: '-0.02em', color: GREEN, textShadow: GREEN_GLOW }}
      >
        {String(order + 1).padStart(2, '0')}
      </span>
      <span
        aria-hidden="true"
        className="rounded-full"
        style={{ marginTop: '2cqh', width: '2.4cqw', height: '0.35cqh', background: 'rgba(45,219,96,0.65)' }}
      />
      <div className="min-h-0 flex-1" style={{ marginTop: '2cqh' }}>
        <ItemText
          item={item}
          ariaLabel={`Card ${order + 1}`}
          spec={{ fontSize: '1.5cqw', weight: 500, lineHeight: 1.5, color: 'rgba(247,247,247,0.92)' }}
        />
      </div>
      <div className="flex flex-none items-center" style={{ marginTop: '1.8cqh', gap: '1.3cqw' }}>
        <IconBadge index={order} size="3.1cqw" />
        <span aria-hidden="true" style={{ width: '1px', height: '2.4cqw', background: 'rgba(45,219,96,0.3)' }} />
      </div>
    </div>
  );
}

function TemplateRow({ order, item }: { order: number; item: ComposedItem }) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center rounded-[1.4cqw]"
      style={{
        border: '1px solid rgba(45,219,96,0.13)',
        background: 'linear-gradient(90deg, rgba(15,22,17,0.72), rgba(6,9,7,0.62))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '1.2cqh 2.2cqw',
        gap: '1.8cqw',
      }}
    >
      <span
        className="flex-none text-center font-extrabold tabular-nums"
        style={{ width: '5cqw', fontSize: '2.4cqw', lineHeight: 1, color: GREEN, textShadow: GREEN_GLOW }}
      >
        {String(order + 1).padStart(2, '0')}
      </span>
      <span aria-hidden="true" className="self-stretch" style={{ width: '1px', margin: '0.8cqh 0', background: 'rgba(45,219,96,0.25)' }} />
      <IconBadge index={order} size="2.9cqw" />
      <div className="min-h-0 flex-1 self-stretch">
        <ItemText
          item={item}
          anchor="center"
          ariaLabel={`Tópico ${order + 1}`}
          spec={{ fontSize: '1.5cqw', weight: 500, lineHeight: 1.45, color: 'rgba(247,247,247,0.92)' }}
        />
      </div>
    </div>
  );
}

/** Botão de novo tópico — só no modo edição, fora da arte final. */
function AddItemButton({ items }: { items: ComposedItem[] }) {
  const ctx = useContext(CompositionContext);
  const lastItem = items[items.length - 1];
  if (!ctx.editable || !lastItem || items.length >= 6) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.addItem(lastItem.blockId)}
      className="absolute -bottom-1 left-0 inline-flex translate-y-full items-center rounded-md border border-dashed border-white/[0.16] px-2 py-1 font-medium text-white/50 transition-colors duration-150 hover:border-brand/40 hover:text-brand"
      style={{ fontSize: '1cqw', gap: '0.5cqw' }}
    >
      + Novo tópico
    </button>
  );
}

/** Faixa de fecho (bloco de destaque): vidro + ícone, na zona do manifesto. */
function BannerStrip({ block, zone }: { block: TextBlock; zone: Zone }) {
  return (
    <ZoneBox
      zone={zone}
      className="flex items-center rounded-[1.6cqw]"
      style={{
        border: CARD_BORDER,
        background: CARD_BG,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '0 2.2cqw',
        gap: '1.6cqw',
      }}
    >
      <IconBadge index={2} size="3cqw" />
      <span aria-hidden="true" className="self-stretch" style={{ width: '1px', margin: '2.2cqh 0', background: 'rgba(45,219,96,0.3)' }} />
      <div className="min-h-0 flex-1 self-center">
        <SlideText
          block={block}
          designAlign="left"
          multiline
          ariaLabel="Destaque"
          spec={{ fontSize: '1.5cqw', weight: 500, lineHeight: 1.5, color: 'rgba(247,247,247,0.92)', minScale: 0.8 }}
        />
      </div>
    </ZoneBox>
  );
}

/* ------------------------------------------------------------------------ */
/* Ícones do template (lupa, cubo, gráfico) — os mesmos glifos das artes.     */
/* ------------------------------------------------------------------------ */

const TEMPLATE_ICON_PATHS: string[][] = [
  // Lupa
  ['M11 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z', 'm15 15 4 4'],
  // Cubo 3D
  ['m12 3 7.5 4.3v9.4L12 21l-7.5-4.3V7.3L12 3Z', 'M12 12l7.5-4.3M12 12 4.5 7.7M12 12v9'],
  // Gráfico subindo
  ['M5 20v-5M10 20v-9M15 20v-6', 'm6 9 4.5-4.5L14 8l5-5', 'M16 3h3v3'],
];

function IconBadge({ index, size }: { index: number; size: string }) {
  const paths = TEMPLATE_ICON_PATHS[index % TEMPLATE_ICON_PATHS.length] ?? [];
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: size, height: size, border: '1px solid rgba(45,219,96,0.3)', color: GREEN }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ width: '54%', height: '54%' }}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
