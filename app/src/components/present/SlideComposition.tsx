import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { isEmpty, renderRich, fromPlain, type RichText } from '@/lib/richText';
import { RichEditable } from '@/components/workspace/RichEditable';
import { DecorationsLayer } from '@/components/present/DecorationsLayer';
import { FloatingTextLayer } from '@/components/present/FloatingTextLayer';
import { TransformBox } from '@/components/present/TransformBox';
import { FitBox } from '@/components/present/fit';
import { useOverflowAudit } from '@/hooks/useOverflowAudit';
import { clampLines, justifyIfWide, MAX_MEASURE } from '@/lib/textFit';
import { ArtDebugOverlay } from '@/components/present/ArtDebugOverlay';
import { cn } from '@/lib/cn';
import { createId } from '@/lib/id';
import { composeSlide, type ComposedSlide } from '@/services/slideArchetype';
import {
  composeArtAs,
  glassOpacityFor,
  zoneAspect,
  type Composition,
  type PlacedZone,
  type Zone,
} from '@/services/artZones';
import { artById, fallbackArt } from '@/services/deckArt';
import { chromeFor, DEFAULT_TONE, type SlideChrome } from '@/services/tone';
import type { TemplateArt } from '@/services/templateArt.generated';
import logoBranco from '@/assets/logos/logo-citi30-branco.png';
import logoPreto from '@/assets/logos/logo-citi30-preto.png';
import { MAX_CARDS, MAX_TOPICS, type Block, type BlockRect, type CardItem, type Slide, type TextBlock } from '@/types/slide';

/**
 * A COMPOSIÇÃO DO SLIDE.
 *
 * Um render só, três modos (fonte de verdade visual única — é isso que faz o
 * palco, a miniatura, a apresentação e o export mostrarem o MESMO pixel):
 *   leitura   apresentação, miniaturas, home
 *   editable  cada texto vira um RichEditable NO LUGAR (WYSIWYG de verdade)
 *   artOnly   esconde só os textos, pro export rasterizar a arte e emitir os
 *             textos como caixas de texto reais no PPTX
 *
 * O que este componente NÃO decide: onde o texto vai (artZones mede a arte), qual
 * arte é essa (deckArt planeja o deck inteiro), nem que cor é o acento (tone.ts).
 * Ele desenha. É por isso que arrastar a barra de cor repinta tudo sem tocar numa
 * letra do texto.
 *
 * TUDO em unidades de container (cqw/cqh), nunca px. O mesmo componente renderiza
 * fiel no palco, na miniatura de 172px e no raster de 1920x1080.
 *
 * ARMADILHA REAL: `aspect-ratio` NÃO impede o conteúdo de crescer. Se um filho tem
 * altura em px maior que a caixa, a caixa ESTICA e o alinhamento quebra (três
 * miniaturas com alturas diferentes e rótulos desalinhados). Filhos em cqh/cqw +
 * overflow hidden resolvem, e é por isso que não existe um único px aqui dentro.
 */

/* ------------------------------------------------------------------------ */
/* Contexto de edição                                                        */
/* ------------------------------------------------------------------------ */

interface CompositionContextValue {
  editable: boolean;
  chrome: SlideChrome;
  commitContent: (blockId: string, content: RichText) => void;
  commitTopic: (blockId: string, index: number, content: RichText) => void;
  commitCard: (blockId: string, index: number, field: 'title' | 'body', content: RichText) => void;
  addTopic: (blockId: string) => void;
  addCard: (blockId: string) => void;
  contentZoneOverride?: BlockRect;
  contentZoneEditable: boolean;
  commitContentZone: (rect: BlockRect) => void;
  resetContentZone: () => void;
}

const NEUTRAL_CHROME = chromeFor(DEFAULT_TONE, false);

const CompositionContext = createContext<CompositionContextValue>({
  editable: false,
  chrome: NEUTRAL_CHROME,
  commitContent: () => {},
  commitTopic: () => {},
  commitCard: () => {},
  addTopic: () => {},
  addCard: () => {},
  contentZoneEditable: false,
  commitContentZone: () => {},
  resetContentZone: () => {},
});

const useChrome = () => useContext(CompositionContext).chrome;

interface SlideCompositionProps {
  slide: Slide;
  /** O tom do deck (0 = Gelo, 0.5 = Azul, 1 = Verde). */
  tone?: number;
  /** A escolha do diretor de arte pra este slide. Sem ela, cai numa escolha estável pelo id. */
  art?: { artId: string; arrangementId: string };
  className?: string;
  editable?: boolean;
  onBlockChange?: (blockId: string, patch: Partial<Block>) => void;
  onDecorationMove?: (decorationId: string, rect: BlockRect) => void;
  onDecorationDelete?: (decorationId: string) => void;
  onBlockDelete?: (blockId: string) => void;
  onContentZoneMove?: (rect: BlockRect) => void;
  onContentZoneReset?: () => void;
  /** Export: esconde os textos (mantendo a arte) pra rasterizar só o fundo. */
  artOnly?: boolean;
  /** Overlay de depuração: heatmap da grade medida + o retângulo do arranjo escolhido. */
  debug?: boolean;
}

export function SlideComposition({
  slide,
  tone = DEFAULT_TONE,
  art,
  className,
  editable = false,
  onBlockChange,
  onDecorationMove,
  onDecorationDelete,
  onBlockDelete,
  onContentZoneMove,
  onContentZoneReset,
  artOnly = false,
  debug = false,
}: SlideCompositionProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const plan = useMemo(() => composeSlide(slide), [slide]);

  const templateArt: TemplateArt = useMemo(
    () => (art ? (artById(art.artId) ?? fallbackArt(slide.id, tone, plan.archetype)) : fallbackArt(slide.id, tone, plan.archetype)),
    [art, slide.id, tone, plan.archetype],
  );

  const composition: Composition = useMemo(
    () => composeArtAs(templateArt, plan.archetype, art?.arrangementId ?? ''),
    [templateArt, plan.archetype, art?.arrangementId],
  );

  const chrome = useMemo(() => chromeFor(tone, templateArt.light), [tone, templateArt.light]);

  const floatingBlocks = useMemo(
    () => slide.blocks.filter((b): b is TextBlock => b.kind !== 'cards' && b.kind !== 'topics' && !!b.floating),
    [slide.blocks],
  );

  const ctx = useMemo<CompositionContextValue>(
    () => ({
      editable: editable && !!onBlockChange,
      chrome,
      commitContent: (blockId, content) => onBlockChange?.(blockId, { content } as Partial<Block>),
      commitTopic: (blockId, index, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'topics') return;
        const items = [...block.items];
        if (isEmpty(content) && items.length > 1) items.splice(index, 1);
        else items[index] = content;
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      commitCard: (blockId, index, field, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'cards') return;
        const items = block.items.map((item, i) => (i === index ? { ...item, [field]: content } : item));
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      addTopic: (blockId) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'topics' || block.items.length >= MAX_TOPICS) return;
        onBlockChange?.(blockId, { items: [...block.items, fromPlain('Novo tópico')] } as Partial<Block>);
      },
      addCard: (blockId) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'cards' || block.items.length >= MAX_CARDS) return;
        const item: CardItem = { id: createId(), title: fromPlain('Novo card'), body: fromPlain('') };
        onBlockChange?.(blockId, { items: [...block.items, item] } as Partial<Block>);
      },
      contentZoneOverride: slide.contentZoneOverride,
      contentZoneEditable: editable && !!onContentZoneMove,
      commitContentZone: (rect) => onContentZoneMove?.(rect),
      resetContentZone: () => onContentZoneReset?.(),
    }),
    [editable, onBlockChange, chrome, slide.blocks, slide.contentZoneOverride, onContentZoneMove, onContentZoneReset],
  );

  useOverflowAudit(stageRef, `slide ${slide.id.slice(0, 6)} [${plan.archetype}]`);

  const A = plan.archetype;

  return (
    <CompositionContext.Provider value={ctx}>
      <div
        ref={stageRef}
        data-slide-export={artOnly ? 'art' : undefined}
        data-slide-stage=""
        data-archetype={A}
        data-art={templateArt.id}
        data-arrangement={composition.arrangementId}
        lang="pt-BR"
        className={cn('relative h-full w-full overflow-hidden', className)}
        style={
          {
            containerType: 'size',
            background: templateArt.light ? '#eef4f2' : '#040605',
            color: chrome.ink,
            fontFamily: 'var(--font-slide)',
            // O DESTAQUE ACOMPANHA A BARRA DE COR. O verde deixou de ser fixo: os
            // trechos marcados (--color-slide-hl) usam o mesmo acento do tom do deck,
            // já resolvido pra arte clara/escura. Arrastar a barra repinta o destaque junto.
            '--color-slide-hl': chrome.accent,
            // RITMO VERTICAL: um espaçamento base e todos os respiros são múltiplos
            // dele. Nada de gaps arbitrários espalhados pelo componente.
            '--rhythm-base': '0.9cqh',
            '--rhythm': '0.9cqh',
            hyphens: 'auto',
          } as CSSProperties
        }
      >
        <img src={templateArt.src} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

        {/* O véu entra ATRÁS do texto, com opacidade proporcional à ocupação medida. */}
        <Veil zone={composition.header} chrome={chrome} />
        <Veil zone={composition.content} chrome={chrome} />
        <Veil zone={composition.aside} chrome={chrome} />

        <BrandMark composition={composition} light={templateArt.light} />

        {A === 'cover' && <HeroLayout plan={plan} c={composition} variant="cover" />}
        {A === 'closing' && <HeroLayout plan={plan} c={composition} variant="closing" />}
        {A === 'section' && <SectionLayout plan={plan} c={composition} />}
        {A === 'statement' && <StatementLayout plan={plan} c={composition} />}
        {A === 'bignumber' && <BigNumberLayout plan={plan} c={composition} />}
        {A === 'cards' && <CardsLayout plan={plan} c={composition} />}
        {A === 'topics' && <TopicsLayout plan={plan} c={composition} />}
        {A === 'split' && <SplitLayout plan={plan} c={composition} />}
        {A === 'media' && <MediaLayout plan={plan} c={composition} slide={slide} />}

        {slide.decorations && slide.decorations.length > 0 && (
          <DecorationsLayer
            decorations={slide.decorations}
            editable={ctx.editable && !!onDecorationMove}
            onMove={(id, rect) => onDecorationMove?.(id, rect)}
            onDelete={(id) => onDecorationDelete?.(id)}
          />
        )}
        <FloatingTextLayer
          blocks={floatingBlocks}
          editable={ctx.editable}
          onContentChange={(id, content) => onBlockChange?.(id, { content } as Partial<Block>)}
          onMove={(id, rect) => onBlockChange?.(id, { rect } as Partial<Block>)}
          onDelete={(id) => onBlockDelete?.(id)}
        />

        {debug && <ArtDebugOverlay art={templateArt} composition={composition} />}
      </div>
    </CompositionContext.Provider>
  );
}

/* ------------------------------------------------------------------------ */
/* Peças estruturais                                                         */
/* ------------------------------------------------------------------------ */

function ZoneBox({
  zone,
  className,
  style,
  children,
}: {
  zone: Zone;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
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

/**
 * O VÉU: a rede de segurança do contraste.
 *
 * Quando nenhum arranjo fica limpo (numa arte carregada, TODOS sujam), um gradiente
 * suave entra atrás do texto com opacidade proporcional à ocupação MEDIDA daquela
 * zona naquela arte. Arte limpa → véu zero e a arte aparece inteira. Arte carregada
 * → véu o quanto precisar.
 *
 * É elipse e não retângulo de propósito: um retângulo semitransparente sobre a arte
 * tem BORDA, e borda reta no meio de uma escultura orgânica entrega o truque na hora.
 * A elipse dissolve nas pontas e ninguém vê que existe.
 */
function Veil({ zone, chrome }: { zone?: PlacedZone; chrome: SlideChrome }) {
  if (!zone || zone.veil <= 0) return null;
  const pad = 0.05;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        left: `${Math.max(0, zone.x - pad) * 100}%`,
        top: `${Math.max(0, zone.y - pad) * 100}%`,
        width: `${Math.min(1, zone.width + pad * 2) * 100}%`,
        height: `${Math.min(1, zone.height + pad * 2) * 100}%`,
        background: `radial-gradient(ellipse 74% 62% at 50% 50%, rgba(${chrome.veilRgb}, ${zone.veil}) 0%, rgba(${chrome.veilRgb}, ${(zone.veil * 0.82).toFixed(3)}) 42%, rgba(${chrome.veilRgb}, 0) 76%)`,
      }}
    />
  );
}

/**
 * A marca. O canto foi MEDIDO na arte (o mais vazio dos dois), então ela nunca cai
 * em cima da escultura. Em arte clara, a logo preta — a branca sumiria.
 */
function BrandMark({ composition, light }: { composition: Composition; light: boolean }) {
  return (
    <ZoneBox zone={composition.logo}>
      <img
        src={light ? logoPreto : logoBranco}
        alt=""
        className={cn('h-full w-full object-contain', composition.logoSide === 'left' ? 'object-left' : 'object-right')}
        draggable={false}
      />
    </ZoneBox>
  );
}

/** A zona principal, movível pelo usuário no editor (o motor decide; o humano pode discordar). */
function ContentFrame({
  zone,
  children,
  className,
}: {
  zone: PlacedZone;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(CompositionContext);
  const rect = ctx.contentZoneOverride ?? { x: zone.x, y: zone.y, width: zone.width, height: zone.height };

  return (
    <TransformBox
      kind="zone"
      rect={rect}
      onChange={(next) => ctx.commitContentZone(next)}
      interactive={ctx.contentZoneEditable}
      selected={ctx.contentZoneEditable}
      onSelect={() => {}}
      bodyDraggable={false}
      grip
      tone="subtle"
      revealOnHover
      minWidth={0.15}
      minHeight={0.12}
      className={className}
      chrome={
        ctx.contentZoneOverride ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              ctx.resetContentZone();
            }}
            title="Restaurar a posição que o motor escolheu"
            aria-label="Restaurar a posição que o motor escolheu"
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
/* Tipografia                                                                */
/* ------------------------------------------------------------------------ */

interface TypeSpec {
  /** Em `em`, que dentro de um FitBox É o número em cqw. */
  size: number;
  weight?: number;
  lineHeight?: number;
  letterSpacing?: string;
  color?: string;
  /** Título nunca deixa órfã na última linha; corpo quebra bonito. */
  wrap?: 'balance' | 'pretty';
  align?: 'left' | 'center' | 'justify';
  /** Camada 3: teto de linhas. */
  clamp?: number;
  uppercase?: boolean;
  /** Texto corrido: limita a MEDIDA da linha (ver MAX_MEASURE). Títulos não usam. */
  prose?: boolean;
}

function SlideText({
  block,
  spec,
  ariaLabel,
  className,
  style,
}: {
  block: TextBlock;
  spec: TypeSpec;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ctx = useContext(CompositionContext);
  // 'left' salvo é indistinguível de "não mexi": o design da zona vence.
  // center/right/justify explícitos do usuário vencem o design.
  const align = block.align !== 'left' ? block.align : (spec.align ?? 'left');

  const base: CSSProperties = {
    fontSize: `${spec.size}em`,
    fontWeight: spec.weight ?? 400,
    lineHeight: spec.lineHeight ?? 1.5,
    letterSpacing: spec.letterSpacing,
    color: spec.color ?? ctx.chrome.ink,
    textAlign: align,
    textTransform: spec.uppercase ? 'uppercase' : undefined,
    overflowWrap: 'anywhere',
    // TÍTULO NÃO HIFENIZA. "Conferên-cia" quebrado no meio num título de card é
    // amadorismo visível a três metros. Hífen é recurso de texto corrido, onde ele
    // fecha o rio de espaço da justificação; num título ele só chama atenção.
    hyphens: spec.wrap === 'balance' ? 'manual' : 'auto',
    ...(spec.prose ? { maxWidth: MAX_MEASURE, marginInline: align === 'center' ? 'auto' : undefined } : {}),
    ...style,
  };

  if (ctx.editable) {
    return (
      <div data-block-id={block.id} className={cn('w-full', className)} style={base}>
        <RichEditable
          value={block.content}
          onCommit={(next) => ctx.commitContent(block.id, next)}
          placeholder={ariaLabel}
          multiline
          ariaLabel={ariaLabel}
          style={{ textWrap: spec.wrap ?? 'pretty' } as CSSProperties}
        />
      </div>
    );
  }

  if (isEmpty(block.content)) return null;

  return (
    <div data-block-id={block.id} className={cn('w-full', className)} style={base}>
      <div
        data-export-text=""
        data-fit-guard=""
        style={{
          textWrap: spec.wrap ?? 'pretty',
          ...(spec.clamp ? clampLines(spec.clamp) : {}),
        } as CSSProperties}
      >
        {renderRich(block.content)}
      </div>
    </div>
  );
}

/** O rótulo verde (kicker): traço + texto em maiúsculas. */
function Label({ block, center = false }: { block: TextBlock | null; center?: boolean }) {
  const chrome = useChrome();
  const ctx = useContext(CompositionContext);
  if (!block || (!ctx.editable && isEmpty(block.content))) return null;
  return (
    <div className={cn('flex w-full items-center', center && 'justify-center')} style={{ gap: '0.9em' }}>
      <span
        aria-hidden="true"
        className="flex-none rounded-full"
        style={{ width: '2.6em', height: '0.16em', background: chrome.accent, boxShadow: chrome.accentGlow }}
      />
      <SlideText
        block={block}
        ariaLabel="Rótulo"
        spec={{
          size: 0.95,
          weight: 600,
          lineHeight: 1.4,
          letterSpacing: '0.28em',
          color: chrome.accent,
          uppercase: true,
          wrap: 'balance',
          clamp: 1,
        }}
        style={{ width: 'auto', textShadow: chrome.accentTextGlow }}
      />
    </div>
  );
}

/** O traço curto que assina os títulos. */
function Rule({ center = false, width = '3.4em' }: { center?: boolean; width?: string }) {
  const chrome = useChrome();
  return (
    <span
      aria-hidden="true"
      className={cn('block rounded-full', center && 'mx-auto')}
      style={{
        width,
        height: '0.16em',
        background: chrome.accent,
        boxShadow: chrome.accentGlow,
        marginBlock: 'calc(1.6 * var(--rhythm))',
      }}
    />
  );
}

/** Empilha o conteúdo com o RITMO do slide. Nada de gap arbitrário. */
function Stack({ gap = 2, center = false, children }: { gap?: number; center?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn('flex w-full flex-col', center && 'items-center text-center')}
      style={{ gap: `calc(${gap} * var(--rhythm))` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Arquétipos: peças de herói                                                */
/* ------------------------------------------------------------------------ */

/** Capa e encerramento: UM bloco grande. A arte é a estrela. */
function HeroLayout({ plan, c, variant }: { plan: ComposedSlide; c: Composition; variant: 'cover' | 'closing' }) {
  const chrome = useChrome();
  const center = c.align === 'center';
  const titleSize = variant === 'cover' ? 4.4 : 3.9;

  return (
    <>
      <ContentFrame zone={c.content}>
        <FitBox anchor={variant === 'cover' ? 'bottom' : 'center'} minScale={0.84}>
          <Stack gap={2.4} center={center}>
            <Label block={plan.label} center={center} />
            {plan.headline && (
              <SlideText
                block={plan.headline}
                ariaLabel="Título"
                spec={{
                  size: titleSize,
                  weight: 800,
                  lineHeight: 1.04,
                  letterSpacing: '-0.03em',
                  wrap: 'balance',
                  align: center ? 'center' : 'left',
                  clamp: 3,
                }}
              />
            )}
            {plan.subtitle && (
              <SlideText
                block={plan.subtitle}
                ariaLabel="Subtítulo"
                spec={{ prose: true,
                  size: 1.5,
                  weight: 400,
                  lineHeight: 1.5,
                  color: chrome.inkSoft,
                  wrap: 'balance',
                  align: center ? 'center' : 'left',
                  clamp: 2,
                }}
              />
            )}
            {/* Sem faixa no arranjo, o destaque não pode simplesmente sumir: ele vira
                filete inline. Texto que o usuário escreveu nunca desaparece do slide. */}
            {plan.highlight && !c.banner && <HighlightLine block={plan.highlight} />}
            {plan.extra.map((b) => (
              <SlideText
                key={b.id}
                block={b}
                ariaLabel="Texto"
                spec={{ size: 1.2, lineHeight: 1.6, color: chrome.inkFaint, align: center ? 'center' : 'left' }}
              />
            ))}
          </Stack>
        </FitBox>
      </ContentFrame>
      {plan.highlight && c.banner && <Banner block={plan.highlight} zone={c.banner} />}
    </>
  );
}

/** Separador: um respiro. Rótulo e título, e nada mais. */
function SectionLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const center = c.align === 'center';
  return (
    <ContentFrame zone={c.content}>
      <FitBox anchor="center" minScale={0.84}>
        <Stack gap={2.2} center={center}>
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título da seção"
              spec={{
                size: 3.9,
                weight: 800,
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 3,
              }}
            />
          )}
          <Rule center={center} />
        </Stack>
      </FitBox>
    </ContentFrame>
  );
}

/** Afirmação central: a tese, e o parágrafo que a sustenta. */
function StatementLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const chrome = useChrome();
  const center = c.align === 'center';
  const bodyAlign = center ? 'center' : justifyIfWide(c.content.width, 1.32);

  return (
    <ContentFrame zone={c.content}>
      <FitBox anchor="center">
        <Stack gap={2} center={center}>
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: 3,
                weight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 3,
              }}
            />
          )}
          {plan.body && (
            <SlideText
              block={plan.body}
              ariaLabel="Parágrafo"
              spec={{ size: 1.32, lineHeight: 1.62, color: chrome.inkSoft, wrap: 'pretty',
                prose: true, align: bodyAlign }}
            />
          )}
          {plan.subtitle && (
            <SlideText
              block={plan.subtitle}
              ariaLabel="Apoio"
              spec={{ prose: true, size: 1.15, lineHeight: 1.55, color: chrome.inkFaint, align: center ? 'center' : 'left' }}
            />
          )}
          {plan.highlight && <HighlightLine block={plan.highlight} />}
        </Stack>
      </FitBox>
    </ContentFrame>
  );
}

/** Número em destaque: o número é a peça, o resto é legenda. */
function BigNumberLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const chrome = useChrome();
  const center = c.align === 'center';

  return (
    <ContentFrame zone={c.content}>
      <FitBox anchor="center">
        <Stack gap={1.8} center={center}>
          <Label block={plan.label} center={center} />
          {plan.metric && (
            <SlideText
              block={plan.metric}
              ariaLabel="Número em destaque"
              spec={{
                size: 6.6,
                weight: 800,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: chrome.accent,
                align: center ? 'center' : 'left',
                clamp: 1,
              }}
              style={{ textShadow: chrome.accentTextGlow }}
            />
          )}
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: 2.1,
                weight: 700,
                lineHeight: 1.16,
                letterSpacing: '-0.02em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 2,
              }}
            />
          )}
          {plan.body && (
            <SlideText
              block={plan.body}
              ariaLabel="Parágrafo"
              spec={{
                size: 1.26,
                lineHeight: 1.6,
                color: chrome.inkSoft,
                wrap: 'pretty',
                prose: true,
                align: center ? 'center' : justifyIfWide(c.content.width, 1.26),
              }}
            />
          )}
          {plan.subtitle && (
            <SlideText
              block={plan.subtitle}
              ariaLabel="Apoio"
              spec={{ prose: true, size: 1.1, lineHeight: 1.5, color: chrome.inkFaint, align: center ? 'center' : 'left' }}
            />
          )}
        </Stack>
      </FitBox>
    </ContentFrame>
  );
}

/* ------------------------------------------------------------------------ */
/* O grupo de título (arquétipos com header)                                 */
/* ------------------------------------------------------------------------ */

/**
 * O grupo de título dos arquétipos com header (cards, topics).
 *
 * O PARÁGRAFO mora aqui, junto do título, e não é opcional: slide de conteúdo sem
 * body é slide raso, e slide raso é defeito. Num slide de cards, o corpo é a
 * introdução que dá sentido aos três cards; sem ele, os cards ficam boiando.
 */
function Header({ plan, zone, align }: { plan: ComposedSlide; zone: PlacedZone; align: 'left' | 'center' }) {
  const chrome = useChrome();
  const center = align === 'center';
  return (
    <ZoneBox zone={zone}>
      <FitBox anchor="center" minScale={0.82}>
        <Stack gap={1.5} center={center}>
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: 2.5,
                weight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 2,
              }}
            />
          )}
          {plan.body && (
            <SlideText
              block={plan.body}
              ariaLabel="Parágrafo"
              spec={{
                size: 1.16,
                lineHeight: 1.58,
                color: chrome.inkSoft,
                wrap: 'pretty',
                prose: true,
                align: center ? 'center' : justifyIfWide(zone.width, 1.16),
                clamp: 5,
              }}
            />
          )}
          {plan.subtitle && (
            <SlideText
              block={plan.subtitle}
              ariaLabel="Subtítulo"
              spec={{ prose: true,
                size: 1.08,
                lineHeight: 1.5,
                color: chrome.inkFaint,
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 2,
              }}
            />
          )}
        </Stack>
      </FitBox>
    </ZoneBox>
  );
}

/* ------------------------------------------------------------------------ */
/* CARDS                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * CARDS: no máximo 3, e eles têm ALTURA IDÊNTICA com alinhamento interno perfeito.
 *
 * COMO, e é aqui que o deck antigo falhava:
 *
 * Com fluxo natural (`grid-template-rows: auto auto auto 1fr`), a linha do título
 * cresce quando o título quebra em duas linhas — e aí, num card com título de uma
 * linha e outro de duas, o filete e o corpo começam em ALTURAS DIFERENTES. Três
 * cards que deveriam ser irmãos viram três desalinhados. Foi exatamente isso que
 * produziu a assimetria que o deck tinha.
 *
 * A correção é LINHAS FIXAS: número, título (2 linhas RESERVADAS, tenha o título
 * uma ou duas) e filete têm altura declarada. O corpo pega o resto (1fr). Aí, com
 * qualquer texto, os três cards são geometricamente idênticos: mesmo número na
 * mesma linha de base, mesmo filete na mesma altura, corpo começando no mesmo y.
 *
 * A simetria não é sorte. É construída.
 */
/** Abaixo desta proporção real, a zona é alta e estreita: cards em PILHA. Acima, em FILEIRA. */
const STACK_BELOW_ASPECT = 2.4;

function CardsRow({ plan, zone }: { plan: ComposedSlide; zone: PlacedZone }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const cards = plan.cards;
  if (!cards || cards.items.length === 0) return null;

  const items = cards.items.slice(0, MAX_CARDS);

  /**
   * A FORMA DA ZONA DECIDE A FORMA DOS CARDS.
   *
   * Numa coluna alta e estreita (o `aside` de um split), três cards lado a lado
   * teriam 200px cada e o corpo viraria letra de bula. Numa faixa larga e baixa,
   * três cards empilhados viram três tiras de letreiro com texto microscópico —
   * e foi exatamente isso que apareceu no primeiro print. A proporção REAL da
   * zona (o slide é 16:9, então fração não é proporção) resolve os dois casos.
   */
  const stacked = zoneAspect(zone) < STACK_BELOW_ASPECT;

  /**
   * A DENSIDADE DO VIDRO vem da OCUPAÇÃO MEDIDA daquela zona naquela arte.
   *
   * Este era o elo que faltava, e o print entregou: eu calculava a densidade e só
   * a usava no blur, deixando o fundo do card fixo em 72%. Sobre a escultura
   * acesa, 72% não tapa nada: o brilho atravessa o card e vira uma mancha cinza
   * atrás das letras, com cara de bug de render.
   *
   * Agora o card é translúcido de verdade sobre o preto liso (a arte aparece, que
   * é o ponto de ter arte) e vai ficando denso na medida exata do que precisa
   * tapar. É o véu, embutido no vidro.
   */
  const glass = glassOpacityFor(zone.cost);

  const shell: CSSProperties = {
    border: `1px solid ${chrome.cardBorder}`,
    background: chrome.cardBg(glass),
    backdropFilter: 'blur(1.2cqw)',
    boxShadow: chrome.light ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
  };

  return (
    <ZoneBox zone={zone}>
      <FitBox anchor="center" minScale={0.82}>
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: stacked ? '1fr' : `repeat(${items.length}, minmax(0, 1fr))`,
            gap: stacked ? '0.9em' : '1.5em',
            alignItems: 'stretch',
          }}
        >
          {items.map((item, i) =>
            stacked ? (
              <div
                key={item.id}
                data-card=""
                className="grid min-h-0 overflow-hidden rounded-[1.1em]"
                style={{ ...shell, gridTemplateColumns: '2.4em 1fr', columnGap: '0.9em', padding: '1.1em 1.2em' }}
              >
                <span
                  className="font-extrabold tabular-nums"
                  style={{
                    fontSize: '1.5em',
                    lineHeight: 1.05,
                    color: chrome.accent,
                    textShadow: chrome.accentTextGlow,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="grid min-w-0" style={{ gridTemplateRows: 'auto 1fr', rowGap: '0.35em' }}>
                  <CardField
                    blockId={cards.id}
                    index={i}
                    field="title"
                    value={item.title}
                    ariaLabel={`Título do card ${i + 1}`}
                    style={{ fontSize: '1.3em', fontWeight: 700, lineHeight: 1.2, color: chrome.ink }}
                    clamp={1}
                  />
                  <CardField
                    blockId={cards.id}
                    index={i}
                    field="body"
                    value={item.body}
                    ariaLabel={`Corpo do card ${i + 1}`}
                    style={{ fontSize: '1em', lineHeight: 1.48, color: chrome.inkSoft, textAlign: 'left' }}
                    clamp={4}
                  />
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                data-card=""
                className="grid min-h-0 overflow-hidden rounded-[1.4em]"
                style={{
                  // AS LINHAS FIXAS. É isto que faz os três cards serem idênticos:
                  // com `auto`, a linha do título cresce quando o título quebra em
                  // duas, e aí o filete e o corpo de um card ficam mais baixos que
                  // os do vizinho. Reservando 2 linhas SEMPRE, tenha o título uma ou
                  // duas, os três cards ficam geometricamente iguais.
                  gridTemplateRows: '1.5em 3.2em 0.9em 1fr',
                  ...shell,
                  padding: '1.5em 1.35em',
                }}
              >
                <span
                  className="font-extrabold tabular-nums"
                  style={{
                    fontSize: '1.5em',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: chrome.accent,
                    textShadow: chrome.accentTextGlow,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <CardField
                  blockId={cards.id}
                  index={i}
                  field="title"
                  value={item.title}
                  ariaLabel={`Título do card ${i + 1}`}
                  style={{
                    fontSize: '1.35em',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    color: chrome.ink,
                    alignSelf: 'end',
                  }}
                  clamp={2}
                />

                <span
                  aria-hidden="true"
                  className="self-center rounded-full"
                  style={{ width: '2em', height: '0.14em', background: chrome.accent, opacity: 0.75 }}
                />

                <CardField
                  blockId={cards.id}
                  index={i}
                  field="body"
                  value={item.body}
                  ariaLabel={`Corpo do card ${i + 1}`}
                  style={{
                    fontSize: '1.02em',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: chrome.inkSoft,
                    // Corpo de card é UMA frase curta numa coluna estreita: justificar
                    // aqui abre rios de espaço na primeira linha (medido no print). Card
                    // é sempre à esquerda.
                    textAlign: 'left',
                  }}
                  clamp={5}
                />
              </div>
            ),
          )}
        </div>
      </FitBox>
      {ctx.editable && items.length < MAX_CARDS && (
        <AddButton onClick={() => ctx.addCard(cards.id)} label="+ Novo card" />
      )}
    </ZoneBox>
  );
}

function CardField({
  blockId,
  index,
  field,
  value,
  ariaLabel,
  style,
  clamp,
}: {
  blockId: string;
  index: number;
  field: 'title' | 'body';
  value: RichText;
  ariaLabel: string;
  style: CSSProperties;
  clamp: number;
}) {
  const ctx = useContext(CompositionContext);

  if (ctx.editable) {
    return (
      <div className="min-h-0 overflow-hidden" style={style}>
        <RichEditable
          value={value}
          onCommit={(next) => ctx.commitCard(blockId, index, field, next)}
          placeholder={ariaLabel}
          multiline
          ariaLabel={ariaLabel}
          style={{ textWrap: field === 'title' ? 'balance' : 'pretty' } as CSSProperties}
        />
      </div>
    );
  }

  if (isEmpty(value)) return <div style={style} />;

  return (
    <div className="min-h-0" style={style}>
      <div
        data-export-text=""
        data-fit-guard=""
        style={{
          textWrap: field === 'title' ? 'balance' : 'pretty',
          overflowWrap: 'anywhere',
          hyphens: field === 'title' ? 'manual' : 'auto',
          ...clampLines(clamp),
        } as CSSProperties}
      >
        {renderRich(value)}
      </div>
    </div>
  );
}

function CardsLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  if (!c.header) return null;
  return (
    <>
      <Header plan={plan} zone={c.header} align={c.align} />
      <CardsRow plan={plan} zone={c.content} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* TÓPICOS                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * TÓPICOS: lista LEVE numerada. Número, filete, linha. SEM CAIXA.
 *
 * Cinco caixotes empilhados foi exatamente o que deixou o deck feio. Um tópico é
 * uma LINHA: ele não tem corpo, não precisa de moldura, não pede peso visual. A
 * grade de três colunas (número, filete, texto) alinha os três em todas as linhas,
 * então a lista tem uma coluna óptica limpa em vez de números dançando.
 */
function TopicsList({ plan, zone }: { plan: ComposedSlide; zone: PlacedZone }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const topics = plan.topics;
  if (!topics || topics.items.length === 0) return null;

  const items = topics.items.slice(0, MAX_TOPICS);

  return (
    <ZoneBox zone={zone}>
      <FitBox anchor="center">
        <ol
          className="grid w-full list-none p-0"
          style={{
            gridTemplateColumns: 'auto auto 1fr',
            columnGap: '1.1em',
            rowGap: 'calc(2.2 * var(--rhythm))',
            alignItems: 'center',
            margin: 0,
          }}
        >
          {items.map((item, i) => (
            <TopicRow key={`${topics.id}-${i}`} blockId={topics.id} index={i} value={item} chrome={chrome} />
          ))}
        </ol>
      </FitBox>
      {ctx.editable && items.length < MAX_TOPICS && (
        <AddButton onClick={() => ctx.addTopic(topics.id)} label="+ Novo tópico" />
      )}
    </ZoneBox>
  );
}

function TopicRow({
  blockId,
  index,
  value,
  chrome,
}: {
  blockId: string;
  index: number;
  value: RichText;
  chrome: SlideChrome;
}) {
  const ctx = useContext(CompositionContext);

  const text = ctx.editable ? (
    <RichEditable
      value={value}
      onCommit={(next) => ctx.commitTopic(blockId, index, next)}
      placeholder={`Tópico ${index + 1}`}
      multiline={false}
      ariaLabel={`Tópico ${index + 1}`}
    />
  ) : (
    <div
      data-export-text=""
      data-fit-guard=""
      style={{ textWrap: 'pretty', overflowWrap: 'anywhere', ...clampLines(2) } as CSSProperties}
    >
      {renderRich(value)}
    </div>
  );

  return (
    <li className="contents">
      <span
        className="font-extrabold tabular-nums"
        style={{
          fontSize: '1.35em',
          lineHeight: 1.35,
          color: chrome.accent,
          textShadow: chrome.accentTextGlow,
          alignSelf: 'center',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        aria-hidden="true"
        className="self-center rounded-full"
        style={{ width: '1.6em', height: '0.12em', background: chrome.accent, opacity: 0.55 }}
      />
      <div
        className="min-w-0"
        style={{ fontSize: '1.3em', fontWeight: 500, lineHeight: 1.42, color: chrome.ink }}
      >
        {text}
      </div>
    </li>
  );
}

function TopicsLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  if (!c.header) return null;
  return (
    <>
      <Header plan={plan} zone={c.header} align={c.align} />
      <TopicsList plan={plan} zone={c.content} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* SPLIT — contexto de um lado, lista do outro                               */
/* ------------------------------------------------------------------------ */

function SplitLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const chrome = useChrome();
  if (!c.aside) return null;

  return (
    <>
      <ContentFrame zone={c.content}>
        <FitBox anchor="center">
          <Stack gap={1.8}>
            <Label block={plan.label} />
            {plan.headline && (
              <SlideText
                block={plan.headline}
                ariaLabel="Título"
                spec={{
                  size: 2.3,
                  weight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.025em',
                  wrap: 'balance',
                  clamp: 3,
                }}
              />
            )}
            {plan.body && (
              <SlideText
                block={plan.body}
                ariaLabel="Parágrafo"
                spec={{
                  size: 1.18,
                  lineHeight: 1.6,
                  color: chrome.inkSoft,
                  wrap: 'pretty',
                prose: true,
                  align: justifyIfWide(c.content.width, 1.18),
                }}
              />
            )}
            {plan.highlight && <HighlightLine block={plan.highlight} />}
          </Stack>
        </FitBox>
      </ContentFrame>
      {plan.cards ? <CardsRow plan={plan} zone={c.aside} /> : <TopicsList plan={plan} zone={c.aside} />}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* MEDIA — a foto do usuário é conteúdo                                      */
/* ------------------------------------------------------------------------ */

/**
 * A FOTO DO USUÁRIO VIRA CONTEÚDO, NÃO ENFEITE.
 *
 * Ela ocupa uma coluna inteira, emoldurada, com o texto na outra. Nunca na capa,
 * no separador ou no fecho — nesses o texto é o herói e a foto brigaria com ele.
 */
function MediaLayout({ plan, c, slide }: { plan: ComposedSlide; c: Composition; slide: Slide }) {
  const chrome = useChrome();
  if (!c.aside || !slide.image) return null;

  return (
    <>
      <ContentFrame zone={c.content}>
        <FitBox anchor="center">
          <Stack gap={1.8}>
            <Label block={plan.label} />
            {plan.headline && (
              <SlideText
                block={plan.headline}
                ariaLabel="Título"
                spec={{
                  size: 2.3,
                  weight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.025em',
                  wrap: 'balance',
                  clamp: 3,
                }}
              />
            )}
            {plan.body && (
              <SlideText
                block={plan.body}
                ariaLabel="Parágrafo"
                spec={{
                  size: 1.18,
                  lineHeight: 1.6,
                  color: chrome.inkSoft,
                  wrap: 'pretty',
                prose: true,
                  align: justifyIfWide(c.content.width, 1.18),
                }}
              />
            )}
            {plan.subtitle && (
              <SlideText
                block={plan.subtitle}
                ariaLabel="Apoio"
                spec={{ prose: true, size: 1.08, lineHeight: 1.5, color: chrome.inkFaint }}
              />
            )}
          </Stack>
        </FitBox>
      </ContentFrame>

      <ZoneBox
        zone={c.aside}
        className="overflow-hidden rounded-[1.6cqw]"
        style={{
          border: `1px solid ${chrome.frameBorder}`,
          boxShadow: chrome.light
            ? '0 2cqh 5cqh -2cqh rgba(0,0,0,0.22)'
            : '0 2cqh 6cqh -2cqh rgba(0,0,0,0.65)',
        }}
      >
        <img
          src={slide.image.src}
          alt={slide.image.alt ?? ''}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </ZoneBox>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Peças compartilhadas                                                      */
/* ------------------------------------------------------------------------ */

/** Frase de síntese: filete lateral na cor do acento, sem caixa. */
function HighlightLine({ block }: { block: TextBlock }) {
  const chrome = useChrome();
  return (
    <div
      className="w-full"
      style={{
        borderLeft: `0.22em solid ${chrome.accent}`,
        paddingLeft: '1.1em',
        marginTop: 'calc(0.8 * var(--rhythm))',
      }}
    >
      <SlideText
        block={block}
        ariaLabel="Destaque"
        spec={{ prose: true, size: 1.22, weight: 600, lineHeight: 1.45, color: chrome.ink, wrap: 'balance', clamp: 3 }}
      />
    </div>
  );
}

/** Faixa de fecho: a frase que fica, sobre vidro. */
function Banner({ block, zone }: { block: TextBlock; zone: PlacedZone }) {
  const chrome = useChrome();
  return (
    <ZoneBox
      zone={zone}
      className="flex items-center overflow-hidden rounded-[1.2cqw]"
      style={{
        border: `1px solid ${chrome.cardBorder}`,
        background: chrome.cardBg(glassOpacityFor(zone.cost)),
        backdropFilter: 'blur(1.2cqw)',
        padding: '0 2cqw',
      }}
    >
      <span
        aria-hidden="true"
        className="mr-[1.4cqw] h-[55%] flex-none rounded-full"
        style={{ width: '0.22cqw', background: chrome.accent, boxShadow: chrome.accentGlow }}
      />
      <FitBox anchor="center" minScale={0.84}>
        <SlideText
          block={block}
          ariaLabel="Destaque"
          spec={{ prose: true, size: 1.22, weight: 500, lineHeight: 1.42, color: chrome.ink, wrap: 'balance', clamp: 2 }}
        />
      </FitBox>
    </ZoneBox>
  );
}

/**
 * O botão de adicionar. Ele SOME no teto — passar de 3 cards ou 5 tópicos precisa
 * ser IMPOSSÍVEL, não desencorajado. Esta é a camada 3 da aplicação da regra.
 */
function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute -bottom-1 left-0 inline-flex translate-y-full items-center rounded-md border border-dashed border-white/[0.16] px-2 py-1 font-medium text-white/50 transition-colors duration-150 hover:border-brand/40 hover:text-brand"
      style={{ fontSize: '1cqw' }}
    >
      {label}
    </button>
  );
}
