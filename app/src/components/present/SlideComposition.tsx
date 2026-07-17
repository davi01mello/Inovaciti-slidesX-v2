import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { isEmpty, renderRich, fromPlain, type RichText } from '@/lib/richText';
import { RichEditable } from '@/components/workspace/RichEditable';
import { DecorationsLayer } from '@/components/present/DecorationsLayer';
import { useLayerSelection } from '@/components/present/useLayerSelection';
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
import { artById, fallbackArt, fallbackFlavor } from '@/services/deckArt';
import { ICONS, iconByKey, iconCategoryLabel, iconNameLabel } from '@/services/iconsManifest';
import { chromeFor, DEFAULT_TONE, type SlideChrome } from '@/services/tone';
import type { TemplateArt } from '@/services/templateArt.generated';
import logoBranco from '@/assets/logos/logo-citi30-branco.png';
import logoPreto from '@/assets/logos/logo-citi30-preto.png';
import { IconBadge, SlideIcon } from '@/components/present/slideIcons';
import {
  isTextBlock,
  MAX_CARDS,
  SLIDE_ICONS,
  MAX_COMPARE_POINTS,
  MAX_STATS,
  MAX_STEPS,
  MAX_TOPICS,
  type Block,
  type BlockRect,
  type CardItem,
  type Slide,
  type SlideBrandMark,
  type SlideIconName,
  type StatItem,
  type TextBlock,
  type ZoneKey,
} from '@/types/slide';

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
  /** Semente de variação visual do slide (0..7) — decide variantes de card, lista, etc. */
  flavor: number;
  commitContent: (blockId: string, content: RichText) => void;
  commitTopic: (blockId: string, index: number, content: RichText) => void;
  commitCard: (blockId: string, index: number, field: 'title' | 'body', content: RichText) => void;
  commitStat: (blockId: string, index: number, field: 'value' | 'label', content: RichText) => void;
  commitStep: (blockId: string, index: number, content: RichText) => void;
  commitCompareLabel: (blockId: string, sideIndex: number, content: RichText) => void;
  commitComparePoint: (blockId: string, sideIndex: number, pointIndex: number, content: RichText) => void;
  /** Sobrescreve o ordinal ("01") de um item de topics/steps. Vazio = volta ao automático. */
  commitListMarker: (blockId: string, index: number, content: RichText) => void;
  /** Sobrescreve o ordinal de um card. Vazio = volta ao automático. */
  commitCardMarker: (blockId: string, index: number, content: RichText) => void;
  /** Troca (ou remove, com undefined) o ícone de um card / métrica / lado —
   * um ícone de traço OU um pictograma da iconografia CITi. */
  commitCardIcon: (blockId: string, index: number, pick: IconPick) => void;
  commitStatIcon: (blockId: string, index: number, pick: IconPick) => void;
  commitCompareIcon: (blockId: string, sideIndex: number, pick: IconPick) => void;
  commitStepIcon: (blockId: string, index: number, pick: IconPick) => void;
  addTopic: (blockId: string) => void;
  addCard: (blockId: string) => void;
  addStat: (blockId: string) => void;
  addStep: (blockId: string) => void;
  addComparePoint: (blockId: string, sideIndex: number) => void;
  /** Overrides de posição das ZONAS do slide (todas móveis no editor). */
  zoneOverrides: Partial<Record<ZoneKey, BlockRect>>;
  zonesEditable: boolean;
  commitZone: (zone: ZoneKey, rect: BlockRect) => void;
  resetZone: (zone: ZoneKey) => void;
}

const NEUTRAL_CHROME = chromeFor(DEFAULT_TONE, false);

const CompositionContext = createContext<CompositionContextValue>({
  editable: false,
  chrome: NEUTRAL_CHROME,
  flavor: 0,
  commitContent: () => {},
  commitTopic: () => {},
  commitCard: () => {},
  commitStat: () => {},
  commitStep: () => {},
  commitCompareLabel: () => {},
  commitComparePoint: () => {},
  commitListMarker: () => {},
  commitCardMarker: () => {},
  commitCardIcon: () => {},
  commitStatIcon: () => {},
  commitCompareIcon: () => {},
  commitStepIcon: () => {},
  addTopic: () => {},
  addCard: () => {},
  addStat: () => {},
  addStep: () => {},
  addComparePoint: () => {},
  zoneOverrides: {},
  zonesEditable: false,
  commitZone: () => {},
  resetZone: () => {},
});

const useChrome = () => useContext(CompositionContext).chrome;

interface SlideCompositionProps {
  slide: Slide;
  /** O tom do deck (0 = Gelo, 0.5 = Azul, 1 = Verde). */
  tone?: number;
  /** A escolha do diretor de arte pra este slide. Sem ela, cai numa escolha estável pelo id. */
  art?: { artId: string; arrangementId: string; flavor?: number };
  className?: string;
  editable?: boolean;
  onBlockChange?: (blockId: string, patch: Partial<Block>) => void;
  onDecorationMove?: (decorationId: string, rect: BlockRect) => void;
  onDecorationDelete?: (decorationId: string) => void;
  onBlockDelete?: (blockId: string) => void;
  /** Editor: mover/redimensionar QUALQUER zona do slide. rect undefined = volta ao motor. */
  onZoneChange?: (zone: ZoneKey, rect: BlockRect | undefined) => void;
  /** Editor: mover/redimensionar/apagar a marca CITi do canto. undefined = volta ao motor. */
  onBrandMarkChange?: (mark: SlideBrandMark | undefined) => void;
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
  onZoneChange,
  onBrandMarkChange,
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
    () => slide.blocks.filter((b): b is TextBlock => isTextBlock(b) && !!b.floating),
    [slide.blocks],
  );

  const flavor = art?.flavor ?? fallbackFlavor(slide.id);

  const ctx = useMemo<CompositionContextValue>(
    () => ({
      editable: editable && !!onBlockChange,
      chrome,
      flavor,
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
      commitStat: (blockId, index, field, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'stats') return;
        const items = block.items.map((item, i) => (i === index ? { ...item, [field]: content } : item));
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      commitStep: (blockId, index, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'steps') return;
        const items = [...block.items];
        if (isEmpty(content) && items.length > 1) items.splice(index, 1);
        else items[index] = content;
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      commitCompareLabel: (blockId, sideIndex, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'compare') return;
        const sides = block.sides.map((side, i) => (i === sideIndex ? { ...side, label: content } : side));
        onBlockChange?.(blockId, { sides } as Partial<Block>);
      },
      commitComparePoint: (blockId, sideIndex, pointIndex, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'compare') return;
        const sides = block.sides.map((side, i) => {
          if (i !== sideIndex) return side;
          const points = [...side.points];
          if (isEmpty(content) && points.length > 1) points.splice(pointIndex, 1);
          else points[pointIndex] = content;
          return { ...side, points };
        });
        onBlockChange?.(blockId, { sides } as Partial<Block>);
      },
      commitListMarker: (blockId, index, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || (block.kind !== 'topics' && block.kind !== 'steps')) return;
        const markers = block.items.map((_, i) => block.markers?.[i] ?? []);
        markers[index] = isEmpty(content) ? [] : content;
        const hasAny = markers.some((m) => m.length > 0);
        onBlockChange?.(blockId, { markers: hasAny ? markers : undefined } as Partial<Block>);
      },
      commitCardMarker: (blockId, index, content) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'cards') return;
        const items = block.items.map((item, i) =>
          i === index ? { ...item, marker: isEmpty(content) ? undefined : content } : item,
        );
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
      addStat: (blockId) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'stats' || block.items.length >= MAX_STATS) return;
        const item: StatItem = { id: createId(), value: fromPlain('0'), label: fromPlain('Nova métrica') };
        onBlockChange?.(blockId, { items: [...block.items, item] } as Partial<Block>);
      },
      addStep: (blockId) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'steps' || block.items.length >= MAX_STEPS) return;
        onBlockChange?.(blockId, { items: [...block.items, fromPlain('Nova etapa')] } as Partial<Block>);
      },
      addComparePoint: (blockId, sideIndex) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'compare') return;
        const sides = block.sides.map((side, i) =>
          i === sideIndex && side.points.length < MAX_COMPARE_POINTS
            ? { ...side, points: [...side.points, fromPlain('Novo ponto')] }
            : side,
        );
        onBlockChange?.(blockId, { sides } as Partial<Block>);
      },
      commitCardIcon: (blockId, index, pick) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'cards') return;
        const items = block.items.map((item, i) =>
          i === index ? { ...item, icon: pick?.icon, iconAsset: pick?.iconAsset } : item,
        );
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      commitStatIcon: (blockId, index, pick) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'stats') return;
        const items = block.items.map((item, i) =>
          i === index ? { ...item, icon: pick?.icon, iconAsset: pick?.iconAsset } : item,
        );
        onBlockChange?.(blockId, { items } as Partial<Block>);
      },
      commitCompareIcon: (blockId, sideIndex, pick) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'compare') return;
        const sides = block.sides.map((side, i) =>
          i === sideIndex ? { ...side, icon: pick?.icon, iconAsset: pick?.iconAsset } : side,
        );
        onBlockChange?.(blockId, { sides } as Partial<Block>);
      },
      commitStepIcon: (blockId, index, pick) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        if (!block || block.kind !== 'steps') return;
        const icons = block.items.map((_, i) => (i === index ? (pick?.icon ?? null) : (block.icons?.[i] ?? null)));
        const iconAssets = block.items.map((_, i) =>
          i === index ? (pick?.iconAsset ?? null) : (block.iconAssets?.[i] ?? null),
        );
        onBlockChange?.(blockId, {
          icons: icons.some(Boolean) ? icons : undefined,
          iconAssets: iconAssets.some(Boolean) ? iconAssets : undefined,
        } as Partial<Block>);
      },
      // O override legado (só conteúdo) continua valendo como fallback do mapa novo.
      zoneOverrides: {
        ...slide.zoneOverrides,
        ...(slide.zoneOverrides?.content || !slide.contentZoneOverride
          ? {}
          : { content: slide.contentZoneOverride }),
      },
      zonesEditable: editable && !!onZoneChange,
      commitZone: (zone, rect) => onZoneChange?.(zone, rect),
      resetZone: (zone) => onZoneChange?.(zone, undefined),
    }),
    [editable, onBlockChange, chrome, flavor, slide.blocks, slide.zoneOverrides, slide.contentZoneOverride, onZoneChange],
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

        <BrandMark
          composition={composition}
          light={templateArt.light}
          mark={slide.brandMark}
          editable={editable && !!onBrandMarkChange}
          onChange={onBrandMarkChange}
        />

        {A === 'cover' && <HeroLayout plan={plan} c={composition} variant="cover" />}
        {A === 'closing' && <HeroLayout plan={plan} c={composition} variant="closing" />}
        {A === 'section' && <SectionLayout plan={plan} c={composition} />}
        {A === 'statement' && <StatementLayout plan={plan} c={composition} />}
        {A === 'quote' && <QuoteLayout plan={plan} c={composition} />}
        {A === 'bignumber' && <BigNumberLayout plan={plan} c={composition} />}
        {A === 'kpis' && <KpisLayout plan={plan} c={composition} />}
        {A === 'cards' && <CardsLayout plan={plan} c={composition} />}
        {A === 'topics' && <TopicsLayout plan={plan} c={composition} />}
        {A === 'compare' && <CompareLayout plan={plan} c={composition} />}
        {A === 'timeline' && <TimelineLayout plan={plan} c={composition} />}
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
 *
 * EDITÁVEL: no editor ela é um TransformBox como qualquer decoração — dá pra
 * mover, redimensionar e apagar (Delete ou o botão da moldura). O override vive
 * em slide.brandMark; sem override, quem manda continua sendo o motor.
 */
function BrandMark({
  composition,
  light,
  mark,
  editable,
  onChange,
}: {
  composition: Composition;
  light: boolean;
  mark?: SlideBrandMark;
  editable: boolean;
  onChange?: (mark: SlideBrandMark | undefined) => void;
}) {
  // Seleção com clique-fora e tecla Delete, igual às decorações. O hook roda
  // sempre (regra dos hooks); os returns condicionais vêm depois.
  const [selectedId, setSelectedId] = useLayerSelection({
    kind: 'zone',
    editable: editable && !!onChange,
    ids: ['brand-mark'],
    onDelete: () => onChange?.({ ...mark, hidden: true }),
  });
  if (mark?.hidden) return null;

  const zone = mark?.rect ?? composition.logo;
  const img = (
    <img
      src={light ? logoPreto : logoBranco}
      alt=""
      className={cn(
        'h-full w-full object-contain',
        mark?.rect ? 'object-center' : composition.logoSide === 'left' ? 'object-left' : 'object-right',
      )}
      draggable={false}
    />
  );

  if (!editable || !onChange) {
    return <ZoneBox zone={zone}>{img}</ZoneBox>;
  }

  return (
    <TransformBox
      kind="zone"
      rect={zone}
      onChange={(rect) => onChange({ ...mark, hidden: undefined, rect })}
      interactive
      selected={selectedId === 'brand-mark'}
      onSelect={() => setSelectedId('brand-mark')}
      onDelete={() => {
        onChange({ ...mark, hidden: true });
        setSelectedId(null);
      }}
      lockAspectOnCorners
      revealOnHover
      minWidth={0.05}
      minHeight={0.03}
      chrome={
        mark ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setSelectedId(null);
            }}
            title="Restaurar a posição que o motor escolheu"
            aria-label="Restaurar a posição que o motor escolheu"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/20 bg-surface-3 text-ink-secondary shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition-colors duration-150 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M4 10a6 6 0 1 1 1.76 4.24.75.75 0 1 1 1.06-1.06A4.5 4.5 0 1 0 5.5 10a.75.75 0 0 1-1.5 0Z" />
              <path d="M4 5.5v3a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 0-1.5H5.5v-2.25a.75.75 0 0 0-1.5 0Z" />
            </svg>
          </button>
        ) : null
      }
    >
      {img}
    </TransformBox>
  );
}

/**
 * QUALQUER zona do slide, movível e redimensionável no editor. O motor decide a
 * posição medindo a arte; o humano pode discordar de CADA zona separadamente —
 * o grupo de título vai pra cá, os cards vão pra lá, a foto vai pra acolá. O
 * override fica salvo por slide e o botão de reset devolve a decisão do motor.
 */
function EditableZone({
  zoneKey,
  zone,
  children,
  className,
  style,
}: {
  zoneKey: ZoneKey;
  zone: PlacedZone;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ctx = useContext(CompositionContext);
  const override = ctx.zoneOverrides[zoneKey];
  const rect = override ?? { x: zone.x, y: zone.y, width: zone.width, height: zone.height };

  if (!ctx.zonesEditable) {
    // Leitura/export: um contêiner posicionado e nada mais. Os filhos entram
    // DIRETO (sem wrapper): zonas com layout flex próprio (a faixa do fecho, a
    // foto emoldurada) dependem de serem o pai imediato dos filhos delas.
    return (
      <div
        className={cn('absolute', className)}
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.width * 100}%`,
          height: `${rect.height * 100}%`,
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <TransformBox
      kind="zone"
      rect={rect}
      onChange={(next) => ctx.commitZone(zoneKey, next)}
      interactive
      selected
      onSelect={() => {}}
      bodyDraggable={false}
      grip
      tone="subtle"
      revealOnHover
      minWidth={0.1}
      minHeight={0.06}
      className={className}
      style={style}
      chrome={
        override ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              ctx.resetZone(zoneKey);
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
      {children}
    </TransformBox>
  );
}

/** Compat: a zona principal (os layouts antigos chamavam ContentFrame). */
function ContentFrame({ zone, children, className }: { zone: PlacedZone; children: ReactNode; className?: string }) {
  return (
    <EditableZone zoneKey="content" zone={zone} className={className}>
      {children}
    </EditableZone>
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

/**
 * O rótulo (kicker): texto em maiúsculas com o traço da marca. À esquerda o traço
 * senta ACIMA do texto (a capa da referência); centrado, ele desce pra BAIXO
 * (o kicker do slide de investimento). Nunca ao lado: o traço é respiro, não seta.
 */
function Label({ block, center = false }: { block: TextBlock | null; center?: boolean }) {
  const chrome = useChrome();
  const ctx = useContext(CompositionContext);
  if (!block || (!ctx.editable && isEmpty(block.content))) return null;
  const dash = (
    <span
      aria-hidden="true"
      className={cn('block flex-none rounded-full', center && 'mx-auto')}
      style={{ width: '2.6em', height: '0.18em', background: chrome.accent, boxShadow: chrome.accentGlow }}
    />
  );
  return (
    <div className={cn('flex w-full flex-col', center && 'items-center text-center')} style={{ gap: '0.8em' }}>
      {!center && dash}
      <SlideText
        block={block}
        ariaLabel="Rótulo"
        spec={{
          size: 1.0,
          weight: 600,
          lineHeight: 1.4,
          letterSpacing: '0.3em',
          color: chrome.accent,
          uppercase: true,
          wrap: 'balance',
          clamp: 1,
          align: center ? 'center' : 'left',
        }}
        style={{ width: center ? '100%' : 'auto', textShadow: chrome.accentTextGlow }}
      />
      {center && dash}
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
  const titleSize = variant === 'cover' ? 4.7 : 4.1;

  return (
    <>
      <ContentFrame zone={c.content}>
        <FitBox anchor={variant === 'cover' ? 'bottom' : 'center'} minScale={0.8}>
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
            {variant === 'closing' && plan.subtitle && <Rule center={center} width="2.8em" />}
            {plan.subtitle && (
              <SlideText
                block={plan.subtitle}
                ariaLabel="Subtítulo"
                spec={{ prose: true,
                  size: 1.7,
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
                size: 4.3,
                weight: 800,
                lineHeight: 1.05,
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

/** Afirmação central: a tese GRANDE, o traço da marca, e o apoio que a sustenta
 * (a régua do "Por que o Discovery?" oficial). */
function StatementLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const chrome = useChrome();
  const center = c.align === 'center';
  // Só a manchete, sem apoio nenhum: modo PÔSTER — o textão gigante e estilizado
  // que segura o slide sozinho, como os statements do deck oficial.
  const poster = !plan.body && !plan.subtitle && !plan.highlight;

  return (
    <ContentFrame zone={c.content}>
      <FitBox anchor="center" minScale={0.76}>
        <Stack gap={2.2} center={center}>
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: poster ? 5 : 3.8,
                weight: 800,
                lineHeight: poster ? 1.02 : 1.08,
                letterSpacing: '-0.032em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 3,
              }}
            />
          )}
          {poster && <Rule center={center} width="3.2em" />}
          {(plan.body || plan.subtitle) && <Rule center={center} width="2.8em" />}
          {plan.body && (
            <SlideText
              block={plan.body}
              ariaLabel="Parágrafo"
              spec={{ size: 1.55, lineHeight: 1.55, color: chrome.inkSoft, wrap: 'pretty',
                prose: true, align: center ? 'center' : 'left' }}
            />
          )}
          {plan.subtitle && (
            <SlideText
              block={plan.subtitle}
              ariaLabel="Apoio"
              spec={{ prose: true, size: 1.3, lineHeight: 1.55, color: chrome.inkFaint, align: center ? 'center' : 'left' }}
            />
          )}
          {plan.highlight && <HighlightLine block={plan.highlight} />}
        </Stack>
      </FitBox>
    </ContentFrame>
  );
}

/** Citação/impacto: a manchete e a frase de síntese vivendo sozinhas, grandes. */
function QuoteLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const chrome = useChrome();
  const center = c.align === 'center';

  return (
    <ContentFrame zone={c.content}>
      <FitBox anchor="center" minScale={0.84}>
        <Stack gap={2.2} center={center}>
          <SlideIcon
            name="aspas"
            size="2.6em"
            style={{ color: chrome.accent, opacity: 0.9, filter: chrome.accentGlow !== 'none' ? 'drop-shadow(0 0 0.5em rgba(45,219,96,0.35))' : undefined }}
          />
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: 4.3,
                weight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.032em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 3,
              }}
            />
          )}
          {plan.highlight && (
            <div
              className="w-full"
              style={
                center
                  ? undefined
                  : { borderLeft: `0.26em solid ${chrome.accent}`, paddingLeft: '1.2em' }
              }
            >
              {center && <Rule center width="2.8em" />}
              <SlideText
                block={plan.highlight}
                ariaLabel="Frase de impacto"
                spec={{
                  prose: true,
                  size: 1.8,
                  weight: 600,
                  lineHeight: 1.38,
                  color: chrome.inkSoft,
                  wrap: 'balance',
                  align: center ? 'center' : 'left',
                  clamp: 3,
                }}
              />
            </div>
          )}
          {plan.extra.map((b) => (
            <SlideText
              key={b.id}
              block={b}
              ariaLabel="Texto"
              spec={{ size: 1.15, lineHeight: 1.55, color: chrome.inkFaint, align: center ? 'center' : 'left' }}
            />
          ))}
        </Stack>
      </FitBox>
    </ContentFrame>
  );
}

/**
 * Número em destaque, na régua do slide de investimento oficial: kicker, título,
 * o número GIGANTE numa pill de vidro, o rótulo como legenda, e o apoio como
 * letra miúda com cadeado (as condições da proposta).
 *
 * Dois caminhos pro número: o bloco `stats` com 1 item (o caminho novo, que a
 * geração usa no formato "numero") e o LEGADO de decks antigos (um title-3 curto
 * com dígito detectado como métrica). Os dois desenham igual.
 */
function BigNumberLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const center = c.align === 'center';
  const stats = plan.stats;
  const stat = stats?.items[0] ?? null;

  const glass = glassOpacityFor(c.content.cost);
  const pill: CSSProperties = {
    border: `1px solid ${chrome.cardBorder}`,
    background: chrome.cardBg(glass),
    backdropFilter: 'blur(1.2cqw)',
    boxShadow: chrome.light ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
    borderRadius: '0.32em',
    padding: '0.34em 0.7em',
  };

  return (
    <ContentFrame zone={c.content}>
      <FitBox anchor="center" minScale={0.76}>
        <Stack gap={2} center={center}>
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: 2.6,
                weight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                wrap: 'balance',
                align: center ? 'center' : 'left',
                clamp: 2,
              }}
            />
          )}
          {stats && stat ? (
            <div className={cn('flex w-full flex-col', center && 'items-center text-center')} style={{ gap: '0.6em' }}>
              <div className={cn('flex', center ? 'justify-center' : 'justify-start')} style={{ width: '100%' }}>
                <div style={pill}>
                  <InlineField
                    value={stat.value}
                    onCommit={(next) => ctx.commitStat(stats.id, 0, 'value', next)}
                    ariaLabel="Número em destaque"
                    balance
                    clamp={1}
                    style={{
                      fontSize: '6.2em',
                      fontWeight: 800,
                      lineHeight: 1.05,
                      letterSpacing: '-0.035em',
                      color: chrome.ink,
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>
              <InlineField
                value={stat.label}
                onCommit={(next) => ctx.commitStat(stats.id, 0, 'label', next)}
                ariaLabel="Rótulo do número"
                clamp={1}
                style={{
                  fontSize: '1.35em',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: chrome.inkSoft,
                  textAlign: center ? 'center' : 'left',
                }}
              />
            </div>
          ) : (
            plan.metric && (
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
            )
          )}
          {plan.body && (
            <SlideText
              block={plan.body}
              ariaLabel="Parágrafo"
              spec={{
                size: 1.35,
                lineHeight: 1.55,
                color: chrome.inkSoft,
                wrap: 'pretty',
                prose: true,
                align: center ? 'center' : 'left',
              }}
            />
          )}
          {plan.subtitle && (
            <div className={cn('flex w-full items-center', center && 'justify-center')} style={{ gap: '0.6em' }}>
              <SlideIcon name="cadeado" size="1.1em" style={{ color: chrome.inkFaint }} />
              <SlideText
                block={plan.subtitle}
                ariaLabel="Apoio"
                spec={{ prose: true, size: 1.08, lineHeight: 1.5, color: chrome.inkFaint, align: center ? 'center' : 'left' }}
                style={{ width: 'auto' }}
              />
            </div>
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
 * O grupo de título dos arquétipos com header (cards, topics, kpis, compare,
 * timeline). Na régua da referência da marca: título GRANDE (o segmento-chave
 * sai na cor de destaque via highlight run), e embaixo o parágrafo de apoio
 * cinza que respira entre o título e o conteúdo.
 */
function Header({ plan, zone, align }: { plan: ComposedSlide; zone: PlacedZone; align: 'left' | 'center' }) {
  const chrome = useChrome();
  const center = align === 'center';
  return (
    <EditableZone zoneKey="header" zone={zone}>
      <FitBox anchor="center" minScale={0.76}>
        <Stack gap={1.6} center={center}>
          <Label block={plan.label} center={center} />
          {plan.headline && (
            <SlideText
              block={plan.headline}
              ariaLabel="Título"
              spec={{
                size: 3.3,
                weight: 800,
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
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
                size: 1.3,
                lineHeight: 1.55,
                color: chrome.inkSoft,
                wrap: 'pretty',
                prose: true,
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
                size: 1.28,
                lineHeight: 1.55,
                color: chrome.inkSoft,
                wrap: 'pretty',
                align: center ? 'center' : 'left',
                clamp: 3,
              }}
            />
          )}
        </Stack>
      </FitBox>
    </EditableZone>
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

function CardsRow({ plan, zone, rows = false, zoneKey = 'content' }: { plan: ComposedSlide; zone: PlacedZone; rows?: boolean; zoneKey?: ZoneKey }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const cards = plan.cards;
  if (!cards || cards.items.length === 0) return null;

  const items = cards.items.slice(0, MAX_CARDS);

  /**
   * A FORMA DA ZONA DECIDE A FORMA DOS CARDS — ou o arranjo decide por ela.
   *
   * Numa coluna alta e estreita (o `aside` de um split), três cards lado a lado
   * teriam 200px cada e o corpo viraria letra de bula: empilha. E o arranjo
   * `cards-rows` FORÇA as faixas full-width (o desenho de linhas numeradas da
   * referência) mesmo em banda larga — é uma escolha do diretor de arte, não
   * uma consequência da proporção.
   */
  const stacked = rows || zoneAspect(zone) < STACK_BELOW_ASPECT;

  // A VARIANTE DE DESENHO do card vem do flavor do slide (o diretor de arte
  // garante que slides de cards consecutivos recebem flavors diferentes):
  //   0 painel numerado · 1 ícone-herói · 2 contorno com barra lateral.
  // Ícone-herói só existe se TODOS os itens têm ícone; senão cai no painel.
  const allHaveIcons = items.every((item) => !!item.icon || !!item.iconAsset);
  const rawVariant = ctx.flavor % 3;
  const variant = rawVariant === 1 && !allHaveIcons ? 0 : rawVariant;

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
    <EditableZone zoneKey={zoneKey} zone={zone}>
      <FitBox anchor="center" minScale={0.78}>
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: stacked ? '1fr' : `repeat(${items.length}, minmax(0, 1fr))`,
            gap: stacked ? '1em' : '1.5em',
            alignItems: 'stretch',
          }}
        >
          {items.map((item, i) =>
            stacked ? (
              // FAIXA (referência p.9): número gigante | linha vertical | ícone | texto.
              <div
                key={item.id}
                data-card=""
                className="flex min-h-0 items-center overflow-hidden rounded-[1.5em]"
                style={{ ...shell, columnGap: '1.15em', padding: '1.3em 1.5em' }}
              >
                <MarkerField
                  value={item.marker}
                  fallback={String(i + 1).padStart(2, '0')}
                  onCommit={(next) => ctx.commitCardMarker(cards.id, i, next)}
                  ariaLabel={`Número do card ${i + 1}`}
                  style={{
                    fontSize: '2.4em',
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: chrome.accent,
                    textShadow: chrome.accentTextGlow,
                    minWidth: '1.5em',
                    flex: 'none',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="self-stretch rounded-full"
                  style={{ width: '0.14em', background: chrome.accent, opacity: 0.45, flex: 'none' }}
                />
                <IconControl icon={item.icon} iconAsset={item.iconAsset} onPick={(p) => ctx.commitCardIcon(cards.id, i, p)}>
                  <ItemIcon icon={item.icon} iconAsset={item.iconAsset} badge size="3em" color={chrome.accent} />
                </IconControl>
                <div className="flex min-w-0 flex-1 flex-col" style={{ rowGap: '0.3em' }}>
                  <CardField
                    blockId={cards.id}
                    index={i}
                    field="title"
                    value={item.title}
                    ariaLabel={`Título do card ${i + 1}`}
                    style={{ fontSize: '1.4em', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', color: chrome.ink }}
                    clamp={2}
                  />
                  <CardField
                    blockId={cards.id}
                    index={i}
                    field="body"
                    value={item.body}
                    ariaLabel={`Corpo do card ${i + 1}`}
                    style={{ fontSize: '1.12em', lineHeight: 1.5, color: chrome.inkSoft, textAlign: 'left' }}
                    clamp={2}
                  />
                </div>
              </div>
            ) : variant === 1 ? (
              // ÍCONE-HERÓI: o ícone grande comanda o card; sem número, sem filete.
              // É o segundo desenho de card do deck: dois slides de cards no mesmo
              // deck nunca saem com a mesma cara.
              <div
                key={item.id}
                data-card=""
                className="grid min-h-0 overflow-hidden rounded-[1.8em]"
                style={{
                  gridTemplateRows: '4em 3.9em 1fr',
                  rowGap: '0.5em',
                  ...shell,
                  padding: '1.6em 1.55em 1.45em',
                }}
              >
                <IconControl icon={item.icon} iconAsset={item.iconAsset} onPick={(p) => ctx.commitCardIcon(cards.id, i, p)}>
                  <ItemIcon
                    icon={item.icon ?? 'alvo'}
                    iconAsset={item.iconAsset}
                    badge
                    size="3.4em"
                    color={chrome.accent}
                    glow={chrome.accentGlow}
                  />
                </IconControl>
                <CardField
                  blockId={cards.id}
                  index={i}
                  field="title"
                  value={item.title}
                  ariaLabel={`Título do card ${i + 1}`}
                  style={{
                    fontSize: '1.5em',
                    fontWeight: 700,
                    lineHeight: 1.22,
                    letterSpacing: '-0.015em',
                    color: chrome.ink,
                    alignSelf: 'end',
                  }}
                  clamp={2}
                />
                <CardField
                  blockId={cards.id}
                  index={i}
                  field="body"
                  value={item.body}
                  ariaLabel={`Corpo do card ${i + 1}`}
                  style={{ fontSize: '1.18em', lineHeight: 1.52, color: chrome.inkSoft, textAlign: 'left' }}
                  clamp={4}
                />
              </div>
            ) : variant === 2 ? (
              // CONTORNO COM BARRA: a barra lateral no acento, número e ícone na
              // mesma linha, sem filete. O terceiro desenho de card.
              <div
                key={item.id}
                data-card=""
                className="grid min-h-0 overflow-hidden rounded-[1.2em]"
                style={{
                  gridTemplateRows: '2em 3.9em 1fr',
                  rowGap: '0.55em',
                  ...shell,
                  borderLeft: `0.32em solid ${chrome.accent}`,
                  padding: '1.5em 1.45em 1.4em',
                }}
              >
                <div className="flex items-center justify-between">
                  <MarkerField
                    value={item.marker}
                    fallback={String(i + 1).padStart(2, '0')}
                    onCommit={(next) => ctx.commitCardMarker(cards.id, i, next)}
                    ariaLabel={`Número do card ${i + 1}`}
                    style={{
                      fontSize: '1.35em',
                      fontWeight: 700,
                      lineHeight: 1,
                      letterSpacing: '0.12em',
                      color: chrome.accent,
                      textShadow: chrome.accentTextGlow,
                    }}
                  />
                  <IconControl icon={item.icon} iconAsset={item.iconAsset} onPick={(p) => ctx.commitCardIcon(cards.id, i, p)}>
                    <ItemIcon icon={item.icon} iconAsset={item.iconAsset} badge={false} size="1.7em" color={chrome.accent} />
                  </IconControl>
                </div>
                <CardField
                  blockId={cards.id}
                  index={i}
                  field="title"
                  value={item.title}
                  ariaLabel={`Título do card ${i + 1}`}
                  style={{
                    fontSize: '1.5em',
                    fontWeight: 700,
                    lineHeight: 1.22,
                    letterSpacing: '-0.015em',
                    color: chrome.ink,
                    alignSelf: 'end',
                  }}
                  clamp={2}
                />
                <CardField
                  blockId={cards.id}
                  index={i}
                  field="body"
                  value={item.body}
                  ariaLabel={`Corpo do card ${i + 1}`}
                  style={{ fontSize: '1.18em', lineHeight: 1.52, color: chrome.inkSoft, textAlign: 'left' }}
                  clamp={4}
                />
              </div>
            ) : (
              // PAINEL NUMERADO (referência p.5/8): número + ícone, título com 2
              // linhas RESERVADAS, filete, corpo. As linhas fixas mantêm os três
              // cards geometricamente idênticos, tenha o título uma linha ou duas.
              <div
                key={item.id}
                data-card=""
                className="grid min-h-0 overflow-hidden rounded-[1.8em]"
                style={{
                  gridTemplateRows: '3em 3.9em 1.3em 1fr',
                  ...shell,
                  padding: '1.6em 1.55em 1.45em',
                }}
              >
                <div className="flex items-start justify-between">
                  <MarkerField
                    value={item.marker}
                    fallback={String(i + 1).padStart(2, '0')}
                    onCommit={(next) => ctx.commitCardMarker(cards.id, i, next)}
                    ariaLabel={`Número do card ${i + 1}`}
                    style={{
                      fontSize: '2.3em',
                      fontWeight: 800,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      color: chrome.accent,
                      textShadow: chrome.accentTextGlow,
                    }}
                  />
                  <IconControl icon={item.icon} iconAsset={item.iconAsset} onPick={(p) => ctx.commitCardIcon(cards.id, i, p)}>
                    <ItemIcon icon={item.icon} iconAsset={item.iconAsset} badge size="2.7em" color={chrome.accent} />
                  </IconControl>
                </div>

                <CardField
                  blockId={cards.id}
                  index={i}
                  field="title"
                  value={item.title}
                  ariaLabel={`Título do card ${i + 1}`}
                  style={{
                    fontSize: '1.5em',
                    fontWeight: 700,
                    lineHeight: 1.22,
                    letterSpacing: '-0.015em',
                    color: chrome.ink,
                    alignSelf: 'end',
                  }}
                  clamp={2}
                />

                <span
                  aria-hidden="true"
                  className="self-center rounded-full"
                  style={{ width: '2em', height: '0.16em', background: chrome.accent, opacity: 0.85 }}
                />

                <CardField
                  blockId={cards.id}
                  index={i}
                  field="body"
                  value={item.body}
                  ariaLabel={`Corpo do card ${i + 1}`}
                  style={{
                    fontSize: '1.18em',
                    fontWeight: 400,
                    lineHeight: 1.52,
                    color: chrome.inkSoft,
                    // Corpo de card é UMA frase curta numa coluna estreita: justificar
                    // abriria rios de espaço. Card é sempre à esquerda.
                    textAlign: 'left',
                  }}
                  clamp={4}
                />
              </div>
            ),
          )}
        </div>
      </FitBox>
      {ctx.editable && items.length < MAX_CARDS && (
        <AddButton onClick={() => ctx.addCard(cards.id)} label="+ Novo card" />
      )}
    </EditableZone>
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
      <CardsRow plan={plan} zone={c.content} rows={c.arrangementId.startsWith('cards-rows')} />
    </>
  );
}

/** O que o usuário escolheu no catálogo: traço, pictograma da marca, ou nada. */
type IconPick = { icon?: SlideIconName; iconAsset?: string } | undefined;

/**
 * O VISUAL do ícone de um item: pictograma da iconografia CITi quando o usuário
 * escolheu um (menorzinho, sem círculo — a arte já é rica), senão o ícone de
 * traço no desenho que o layout pedir (badge com círculo ou traço puro).
 */
function ItemIcon({
  icon,
  iconAsset,
  badge,
  size,
  color,
  glow,
}: {
  icon?: SlideIconName;
  iconAsset?: string;
  badge: boolean;
  size: string;
  color: string;
  glow?: string;
}) {
  if (iconAsset) {
    const src = iconByKey(iconAsset)?.src;
    if (src) {
      return (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ width: `calc(${size} * 0.94)`, height: `calc(${size} * 0.94)`, objectFit: 'contain', flex: 'none' }}
        />
      );
    }
  }
  if (!icon) return null;
  if (badge) return <IconBadge name={icon} color={color} size={size} glow={glow} />;
  return <SlideIcon name={icon} size={size} style={{ color }} />;
}

/**
 * O CONTROLE DE ÍCONE do editor: clicou no ícone, abre o catálogo inteiro — os
 * ícones de traço E a iconografia oficial do CITi (pictogramas) — pra trocar;
 * item sem ícone mostra um "+" tracejado pra adicionar; dá pra remover.
 * Em leitura/export não existe: só o visual do ícone (children).
 */
function IconControl({
  icon,
  iconAsset,
  onPick,
  children,
}: {
  icon?: SlideIconName;
  iconAsset?: string;
  onPick: (pick: IconPick) => void;
  children: ReactNode;
}) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<{ x: number; y: number } | null>(null);

  if (!ctx.editable) return <>{children}</>;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={icon || iconAsset ? 'Trocar ícone' : 'Adicionar ícone'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          const r = btnRef.current?.getBoundingClientRect();
          setPanel(panel ? null : r ? { x: r.left, y: r.bottom + 8 } : null);
        }}
        className="flex-none cursor-pointer"
        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', lineHeight: 0 }}
      >
        {icon || iconAsset ? (
          children
        ) : (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.2em',
              height: '2.2em',
              borderRadius: '50%',
              border: `1px dashed ${chrome.accent}66`,
              color: chrome.accent,
              fontSize: '1em',
              lineHeight: 1,
            }}
          >
            +
          </span>
        )}
      </button>
      {panel &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[998]" onPointerDown={() => setPanel(null)} />
            <div
              className="fixed z-[999] rounded-2xl border border-white/[0.12] p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
              style={{
                left: Math.max(8, Math.min(panel.x, window.innerWidth - 372)),
                top: Math.max(8, Math.min(panel.y, window.innerHeight - 300)),
                width: 356,
                background: 'linear-gradient(180deg, rgba(14, 20, 17, 0.98), rgba(7, 10, 9, 0.98))',
                backdropFilter: 'blur(16px)',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span
                  aria-hidden="true"
                  className="h-[3px] w-5 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${chrome.accent}, transparent)` }}
                />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Ícones
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {SLIDE_ICONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onPick({ icon: name });
                      setPanel(null);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-100 hover:bg-white/10"
                    style={{
                      color: name === icon ? chrome.accent : 'rgba(240, 245, 243, 0.85)',
                      outline: name === icon ? `1px solid ${chrome.accent}` : 'none',
                    }}
                  >
                    <SlideIcon name={name} size="18px" />
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-white/[0.08] pt-2.5">
                <div className="mb-2 flex items-center gap-2 px-0.5">
                  <span
                    aria-hidden="true"
                    className="h-[3px] w-5 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${chrome.accent}, transparent)` }}
                  />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/60">
                    Iconografia CITi
                  </span>
                </div>
                <div className="grid max-h-[168px] grid-cols-8 gap-1 overflow-y-auto pr-1">
                  {ICONS.map((asset) => (
                    <button
                      key={asset.key}
                      type="button"
                      title={`${iconNameLabel(asset.name)} · ${iconCategoryLabel(asset.category)}`}
                      onClick={() => {
                        onPick({ iconAsset: asset.key });
                        setPanel(null);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-100 hover:bg-white/10"
                      style={{ outline: asset.key === iconAsset ? `1px solid ${chrome.accent}` : 'none' }}
                    >
                      <img src={asset.src} alt="" className="h-6 w-6 object-contain" draggable={false} />
                    </button>
                  ))}
                </div>
              </div>
              {(icon || iconAsset) && (
                <button
                  type="button"
                  onClick={() => {
                    onPick(undefined);
                    setPanel(null);
                  }}
                  className="mt-2 w-full rounded-md border border-white/15 px-2 py-1 text-[12px] text-white/70 transition-colors duration-100 hover:text-white"
                >
                  Remover ícone
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

/**
 * O ORDINAL EDITÁVEL ("01", "02"...). Por padrão é automático (a posição do item),
 * mas o usuário pode sobrescrever pra qualquer coisa curta ("1º", "2024", "S1").
 * Esvaziar o campo volta pro automático. Tem data-export-text: no PPTX vira caixa
 * de texto real, editável, como qualquer outro texto do slide.
 */
function MarkerField({
  value,
  fallback,
  onCommit,
  ariaLabel,
  style,
}: {
  value?: RichText;
  fallback: string;
  onCommit: (next: RichText) => void;
  ariaLabel: string;
  style: CSSProperties;
}) {
  const ctx = useContext(CompositionContext);
  const effective = value && !isEmpty(value) ? value : fromPlain(fallback);

  if (ctx.editable) {
    return (
      <div className="min-h-0" style={style}>
        <RichEditable
          value={effective}
          onCommit={onCommit}
          placeholder={fallback}
          multiline={false}
          ariaLabel={ariaLabel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-0" style={style}>
      <div data-export-text="" data-fit-guard="" style={{ whiteSpace: 'nowrap' }}>
        {renderRich(effective)}
      </div>
    </div>
  );
}

/**
 * Campo editável genérico dos blocos estruturados novos (stats, steps, compare).
 * Mesmo contrato do CardField: RichEditable no modo edição; no modo leitura, texto
 * medido pelo export (data-export-text) e vigiado pelo ajuste (data-fit-guard).
 */
function InlineField({
  value,
  onCommit,
  ariaLabel,
  style,
  clamp,
  balance = false,
}: {
  value: RichText;
  onCommit: (next: RichText) => void;
  ariaLabel: string;
  style: CSSProperties;
  clamp: number;
  balance?: boolean;
}) {
  const ctx = useContext(CompositionContext);

  if (ctx.editable) {
    return (
      <div className="min-h-0 overflow-hidden" style={style}>
        <RichEditable
          value={value}
          onCommit={onCommit}
          placeholder={ariaLabel}
          multiline
          ariaLabel={ariaLabel}
          style={{ textWrap: balance ? 'balance' : 'pretty' } as CSSProperties}
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
          textWrap: balance ? 'balance' : 'pretty',
          overflowWrap: 'anywhere',
          hyphens: balance ? 'manual' : 'auto',
          ...clampLines(clamp),
        } as CSSProperties}
      >
        {renderRich(value)}
      </div>
    </div>
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
/**
 * A lista leve, em TRÊS marcações diferentes (o flavor do slide decide):
 *   0  numerada com filete (o clássico da referência)
 *   1  checklist: círculo de contorno com check no acento
 *   2  losango do acento (o bullet geométrico da marca)
 * Com 4+ itens e flavor ímpar, a lista abre em DUAS COLUNAS — mais uma cara
 * possível pro mesmo formato. Nenhum sorteio: tudo vem do flavor determinístico.
 */
function TopicsList({ plan, zone, zoneKey = 'content' }: { plan: ComposedSlide; zone: PlacedZone; zoneKey?: ZoneKey }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const topics = plan.topics;
  if (!topics || topics.items.length === 0) return null;

  const items = topics.items.slice(0, MAX_TOPICS);
  const variant = ctx.flavor % 3;
  const twoCols = items.length >= 4 && ctx.flavor % 2 === 1;
  // DOIS itens não podem parecer uma lista que murchou: viram um DUO de tiles
  // grandes lado a lado (quando a zona é larga), com texto em escala de destaque.
  const duo = items.length === 2 && zoneAspect(zone) >= 1.6;

  return (
    <EditableZone zoneKey={zoneKey} zone={zone}>
      <FitBox anchor={zoneKey === 'aside' ? 'top' : 'center'}>
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: duo ? '1fr 1fr' : twoCols ? '1fr 1fr' : '1fr',
            columnGap: duo ? '2.6em' : '2.2em',
            rowGap: 'calc(2.2 * var(--rhythm))',
          }}
        >
          {items.map((item, i) => (
            <TopicRow
              key={`${topics.id}-${i}`}
              blockId={topics.id}
              index={i}
              value={item}
              marker={topics.markers?.[i]}
              chrome={chrome}
              variant={variant}
              scale={duo ? 1.25 : 1}
            />
          ))}
        </div>
      </FitBox>
      {ctx.editable && items.length < MAX_TOPICS && (
        <AddButton onClick={() => ctx.addTopic(topics.id)} label="+ Novo tópico" />
      )}
    </EditableZone>
  );
}

function TopicRow({
  blockId,
  index,
  value,
  marker,
  chrome,
  variant,
  scale = 1,
}: {
  blockId: string;
  index: number;
  value: RichText;
  marker?: RichText;
  chrome: SlideChrome;
  variant: number;
  /** O DUO (2 itens) sobe a escala do par inteiro. */
  scale?: number;
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

  const bullet =
    variant === 1 ? (
      <IconBadge name="check" color={chrome.accent} size="2em" />
    ) : variant === 2 ? (
      <span
        aria-hidden="true"
        className="flex-none"
        style={{
          width: '0.85em',
          height: '0.85em',
          background: chrome.accent,
          boxShadow: chrome.accentGlow,
          transform: 'rotate(45deg)',
          borderRadius: '0.14em',
        }}
      />
    ) : (
      <>
        <MarkerField
          value={marker}
          fallback={String(index + 1).padStart(2, '0')}
          onCommit={(next) => ctx.commitListMarker(blockId, index, next)}
          ariaLabel={`Número do tópico ${index + 1}`}
          style={{
            fontSize: '1.9em',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: chrome.accent,
            textShadow: chrome.accentTextGlow,
            minWidth: '1.4em',
            flex: 'none',
          }}
        />
        <span
          aria-hidden="true"
          className="flex-none rounded-full"
          style={{ width: '1.7em', height: '0.14em', background: chrome.accent, opacity: 0.55 }}
        />
      </>
    );

  return (
    <div className="flex min-w-0 items-center" style={{ gap: '1.1em', fontSize: `${scale}em` }}>
      {bullet}
      <div
        className="min-w-0 flex-1"
        style={{ fontSize: '1.5em', fontWeight: 500, lineHeight: 1.4, color: chrome.ink }}
      >
        {text}
      </div>
    </div>
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
/* KPIs — painel de métricas, texto pelado                                    */
/* ------------------------------------------------------------------------ */

/**
 * KPIs em DOIS desenhos, os dois da referência da marca:
 *
 *   PAINEL  (arranjos kpis-band/aside/hug): UM card de vidro largo com as métricas
 *           em colunas separadas por divisores verticais — ícone, rótulo verde em
 *           maiúsculas, valor branco bold. É o card de condições do slide de
 *           investimento oficial.
 *   PÔSTER  (arranjos kpis-poster-*): números BRANCOS GIGANTES sem caixa nenhuma,
 *           rótulo embaixo — o "O CITi em números" oficial. A arte respira atrás.
 */
function StatsPanel({ plan, zone, poster }: { plan: ComposedSlide; zone: PlacedZone; poster: boolean }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const stats = plan.stats;
  if (!stats || stats.items.length === 0) return null;

  const items = stats.items.slice(0, MAX_STATS);

  // O PÔSTER só existe pra valores CURTOS ("30", "1ª", "88", "3x"): número gigante
  // com valor longo ("6 semanas") trunca em "6…". Valor comprido demais? O slide
  // rende como PAINEL mesmo no arranjo de pôster — o vidro cabe em qualquer zona.
  const fitsPoster = items.every((item) => item.value.map((r) => r.text).join('').trim().length <= 8);

  if (poster && fitsPoster) {
    const columns = items.length === 4 ? 2 : Math.max(1, items.length);
    return (
      <EditableZone zoneKey="content" zone={zone}>
        <FitBox anchor="center" minScale={0.72}>
          <div
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '2em 2.6em' }}
          >
            {items.map((item, i) => (
              <div key={item.id} className="flex min-w-0 flex-col" style={{ rowGap: '0.15em' }}>
                <InlineField
                  value={item.value}
                  onCommit={(next) => ctx.commitStat(stats.id, i, 'value', next)}
                  ariaLabel={`Valor da métrica ${i + 1}`}
                  balance
                  clamp={1}
                  style={{
                    fontSize: '6.2em',
                    fontWeight: 800,
                    lineHeight: 1.02,
                    letterSpacing: '-0.035em',
                    color: chrome.ink,
                  }}
                />
                <InlineField
                  value={item.label}
                  onCommit={(next) => ctx.commitStat(stats.id, i, 'label', next)}
                  ariaLabel={`Rótulo da métrica ${i + 1}`}
                  clamp={2}
                  style={{ fontSize: '1.45em', fontWeight: 500, lineHeight: 1.35, color: chrome.inkSoft }}
                />
              </div>
            ))}
          </div>
        </FitBox>
        {ctx.editable && items.length < MAX_STATS && (
          <AddButton onClick={() => ctx.addStat(stats.id)} label="+ Nova métrica" />
        )}
      </EditableZone>
    );
  }

  const glass = glassOpacityFor(zone.cost);
  const shell: CSSProperties = {
    border: `1px solid ${chrome.cardBorder}`,
    background: chrome.cardBg(glass),
    backdropFilter: 'blur(1.2cqw)',
    boxShadow: chrome.light ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
  };
  // Em coluna estreita as métricas empilham; em banda larga, ficam lado a lado.
  const stacked = zoneAspect(zone) < STACK_BELOW_ASPECT;

  return (
    <EditableZone zoneKey="content" zone={zone}>
      <FitBox anchor="center" minScale={0.78}>
        <div
          className={cn('flex w-full overflow-hidden', stacked ? 'flex-col' : 'flex-row items-stretch')}
          style={{ ...shell, borderRadius: '1.6em', padding: stacked ? '1.4em 1.6em' : '1.7em 1.9em' }}
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex min-w-0 flex-1 flex-col"
              style={{
                rowGap: '0.55em',
                // O divisor vive na borda do próprio item: vertical entre colunas,
                // horizontal entre linhas quando a zona é estreita e o painel empilha.
                ...(i === 0
                  ? {}
                  : stacked
                    ? { borderTop: `1px solid ${chrome.accentFaint}`, paddingTop: '1.1em', marginTop: '1.1em' }
                    : { borderLeft: `1px solid ${chrome.accentFaint}`, paddingLeft: '1.7em', marginLeft: '1.7em' }),
              }}
            >
              <IconControl icon={item.icon} iconAsset={item.iconAsset} onPick={(p) => ctx.commitStatIcon(stats.id, i, p)}>
                <ItemIcon icon={item.icon} iconAsset={item.iconAsset} badge={false} size="1.9em" color={chrome.accent} />
              </IconControl>
              <InlineField
                value={item.label}
                onCommit={(next) => ctx.commitStat(stats.id, i, 'label', next)}
                ariaLabel={`Rótulo da métrica ${i + 1}`}
                clamp={2}
                style={{
                  fontSize: '0.92em',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: chrome.accent,
                  textShadow: chrome.accentTextGlow,
                }}
              />
              <InlineField
                value={item.value}
                onCommit={(next) => ctx.commitStat(stats.id, i, 'value', next)}
                ariaLabel={`Valor da métrica ${i + 1}`}
                clamp={2}
                style={{ fontSize: '1.9em', fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.015em', color: chrome.ink }}
              />
            </div>
          ))}
        </div>
      </FitBox>
      {ctx.editable && items.length < MAX_STATS && (
        <AddButton onClick={() => ctx.addStat(stats.id)} label="+ Nova métrica" />
      )}
    </EditableZone>
  );
}

function KpisLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  if (!c.header) return null;
  return (
    <>
      <Header plan={plan} zone={c.header} align={c.align} />
      <StatsPanel plan={plan} zone={c.content} poster={c.arrangementId.startsWith('kpis-poster')} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* COMPARAÇÃO — dois painéis de vidro frente a frente                         */
/* ------------------------------------------------------------------------ */

/**
 * Comparação: dois painéis de vidro (o mesmo vidro dos cards, com a densidade
 * medida da arte) lado a lado. O SEGUNDO lado é o lado da proposta: o rótulo e o
 * filete dele saem na cor de destaque, um "depois" que vence o "antes" sem gritar.
 */
function ComparePanels({ plan, zone }: { plan: ComposedSlide; zone: PlacedZone }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const compare = plan.compare;
  if (!compare || compare.sides.length < 2) return null;

  const glass = glassOpacityFor(zone.cost);
  const shell: CSSProperties = {
    border: `1px solid ${chrome.cardBorder}`,
    background: chrome.cardBg(glass),
    backdropFilter: 'blur(1.2cqw)',
    boxShadow: chrome.light ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
  };
  // Dois painéis pedem largura; numa coluna estreita eles empilham.
  const stacked = zoneAspect(zone) < 1.6;

  return (
    <EditableZone zoneKey="content" zone={zone}>
      <FitBox anchor="center" minScale={0.78}>
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: stacked ? '1fr' : '1fr 1fr', gap: stacked ? '1em' : '1.5em' }}
        >
          {compare.sides.slice(0, 2).map((side, si) => (
            // A anatomia da referência: ícone em círculo, rótulo verde em maiúsculas,
            // a AFIRMAÇÃO (primeiro ponto) em bold, filete, e a sustentação em cinza.
            <div
              key={side.id}
              className="flex min-h-0 flex-col overflow-hidden rounded-[1.8em]"
              style={{ ...shell, padding: '1.6em 1.6em 1.45em', rowGap: '0.8em' }}
            >
              <div className="flex items-center" style={{ gap: '1em' }}>
                <IconControl icon={side.icon} iconAsset={side.iconAsset} onPick={(p) => ctx.commitCompareIcon(compare.id, si, p)}>
                  <ItemIcon icon={side.icon} iconAsset={side.iconAsset} badge size="2.9em" color={chrome.accent} />
                </IconControl>
                <InlineField
                  value={side.label}
                  onCommit={(next) => ctx.commitCompareLabel(compare.id, si, next)}
                  ariaLabel={`Rótulo do lado ${si + 1}`}
                  balance
                  clamp={1}
                  style={{
                    fontSize: '1em',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: chrome.accent,
                    textShadow: chrome.accentTextGlow,
                    flex: 1,
                    minWidth: 0,
                  }}
                />
              </div>
              {side.points[0] && (
                <InlineField
                  value={side.points[0]}
                  onCommit={(next) => ctx.commitComparePoint(compare.id, si, 0, next)}
                  ariaLabel={`Afirmação do lado ${si + 1}`}
                  balance
                  clamp={2}
                  style={{
                    fontSize: '1.55em',
                    fontWeight: 700,
                    lineHeight: 1.22,
                    letterSpacing: '-0.015em',
                    color: chrome.ink,
                  }}
                />
              )}
              <span
                aria-hidden="true"
                className="rounded-full"
                style={{ width: '2em', height: '0.16em', background: chrome.accent, opacity: 0.85, flex: 'none' }}
              />
              <div className="flex min-h-0 flex-col" style={{ rowGap: '0.5em' }}>
                {side.points.slice(1).map((point, pi) => (
                  <InlineField
                    key={`${side.id}-${pi + 1}`}
                    value={point}
                    onCommit={(next) => ctx.commitComparePoint(compare.id, si, pi + 1, next)}
                    ariaLabel={`Ponto ${pi + 2} do lado ${si + 1}`}
                    clamp={3}
                    style={{ fontSize: '1.15em', lineHeight: 1.5, color: chrome.inkSoft }}
                  />
                ))}
              </div>
              {ctx.editable && side.points.length < MAX_COMPARE_POINTS && (
                <button
                  type="button"
                  onClick={() => ctx.addComparePoint(compare.id, si)}
                  className="self-start rounded-md border border-dashed border-white/[0.16] px-2 py-0.5 font-medium text-white/50 transition-colors duration-150 hover:border-brand/40 hover:text-brand"
                  style={{ fontSize: '0.72em' }}
                >
                  + Ponto
                </button>
              )}
            </div>
          ))}
        </div>
      </FitBox>
    </EditableZone>
  );
}

function CompareLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  if (!c.header) return null;
  return (
    <>
      <Header plan={plan} zone={c.header} align={c.align} />
      <ComparePanels plan={plan} zone={c.content} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* TIMELINE — etapas numeradas com conector                                   */
/* ------------------------------------------------------------------------ */

/**
 * Timeline: etapas em sequência. Numa banda larga cada etapa vira um CARD DE
 * FASE (a referência "Três fases. Seis semanas."): número gigante na cor da
 * marca, texto bold, filete. Numa coluna estreita, as etapas descem num trilho
 * vertical leve. A proporção da zona decide, como nos cards.
 */
function TimelineSteps({ plan, zone }: { plan: ComposedSlide; zone: PlacedZone }) {
  const ctx = useContext(CompositionContext);
  const chrome = useChrome();
  const steps = plan.steps;
  if (!steps || steps.items.length === 0) return null;

  const items = steps.items.slice(0, MAX_STEPS);
  const horizontal = zoneAspect(zone) >= STACK_BELOW_ASPECT;

  if (horizontal) {
    const glass = glassOpacityFor(zone.cost);
    const shell: CSSProperties = {
      border: `1px solid ${chrome.cardBorder}`,
      background: chrome.cardBg(glass),
      backdropFilter: 'blur(1.2cqw)',
      boxShadow: chrome.light ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
    };
    return (
      <EditableZone zoneKey="content" zone={zone}>
        <FitBox anchor="center" minScale={0.78}>
          <div
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, columnGap: '1.5em', alignItems: 'stretch' }}
          >
            {items.map((item, i) => (
              <div
                key={`${steps.id}-${i}`}
                data-card=""
                className="flex min-w-0 flex-col overflow-hidden rounded-[1.8em]"
                style={{ ...shell, padding: '1.5em 1.5em 1.4em', rowGap: '0.7em' }}
              >
                <IconControl
                  icon={steps.icons?.[i] ?? undefined}
                  iconAsset={steps.iconAssets?.[i] ?? undefined}
                  onPick={(p) => ctx.commitStepIcon(steps.id, i, p)}
                >
                  <ItemIcon
                    icon={steps.icons?.[i] ?? undefined}
                    iconAsset={steps.iconAssets?.[i] ?? undefined}
                    badge
                    size="2.7em"
                    color={chrome.accent}
                  />
                </IconControl>
                <MarkerField
                  value={steps.markers?.[i]}
                  fallback={String(i + 1).padStart(2, '0')}
                  onCommit={(next) => ctx.commitListMarker(steps.id, i, next)}
                  ariaLabel={`Número da etapa ${i + 1}`}
                  style={{
                    fontSize: '2.8em',
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: chrome.accent,
                    textShadow: chrome.accentTextGlow,
                  }}
                />
                <InlineField
                  value={item}
                  onCommit={(next) => ctx.commitStep(steps.id, i, next)}
                  ariaLabel={`Etapa ${i + 1}`}
                  balance
                  clamp={3}
                  style={{ fontSize: '1.4em', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em', color: chrome.ink }}
                />
                <span
                  aria-hidden="true"
                  className="rounded-full"
                  style={{ width: '2em', height: '0.16em', background: chrome.accent, opacity: 0.85, flex: 'none', marginTop: 'auto' }}
                />
              </div>
            ))}
          </div>
        </FitBox>
        {ctx.editable && items.length < MAX_STEPS && (
          <AddButton onClick={() => ctx.addStep(steps.id)} label="+ Nova etapa" />
        )}
      </EditableZone>
    );
  }

  return (
    <EditableZone zoneKey="content" zone={zone}>
      <FitBox anchor="center" minScale={0.8}>
        <ol
          className="grid w-full list-none p-0"
          style={{ gridTemplateColumns: 'auto 1fr', columnGap: '1.1em', rowGap: 'calc(1.8 * var(--rhythm))', margin: 0 }}
        >
          {items.map((item, i) => (
            <li key={`${steps.id}-${i}`} className="contents">
              <div className="flex flex-col items-center" style={{ rowGap: '0.35em' }}>
                <MarkerField
                  value={steps.markers?.[i]}
                  fallback={String(i + 1).padStart(2, '0')}
                  onCommit={(next) => ctx.commitListMarker(steps.id, i, next)}
                  ariaLabel={`Número da etapa ${i + 1}`}
                  style={{
                    fontSize: '1.8em',
                    fontWeight: 800,
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    color: chrome.accent,
                    textShadow: chrome.accentTextGlow,
                  }}
                />
                {i < items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="w-[0.14em] flex-1 rounded-full"
                    style={{ background: chrome.accent, opacity: 0.3, minHeight: '0.8em' }}
                  />
                )}
              </div>
              <div className="flex min-w-0 items-center" style={{ gap: '0.9em' }}>
                <IconControl
                  icon={steps.icons?.[i] ?? undefined}
                  iconAsset={steps.iconAssets?.[i] ?? undefined}
                  onPick={(p) => ctx.commitStepIcon(steps.id, i, p)}
                >
                  <ItemIcon
                    icon={steps.icons?.[i] ?? undefined}
                    iconAsset={steps.iconAssets?.[i] ?? undefined}
                    badge
                    size="2.3em"
                    color={chrome.accent}
                  />
                </IconControl>
                <InlineField
                  value={item}
                  onCommit={(next) => ctx.commitStep(steps.id, i, next)}
                  ariaLabel={`Etapa ${i + 1}`}
                  clamp={2}
                  style={{ fontSize: '1.45em', fontWeight: 500, lineHeight: 1.4, color: chrome.ink, flex: 1, minWidth: 0 }}
                />
              </div>
            </li>
          ))}
        </ol>
      </FitBox>
      {ctx.editable && items.length < MAX_STEPS && (
        <AddButton onClick={() => ctx.addStep(steps.id)} label="+ Nova etapa" />
      )}
    </EditableZone>
  );
}

function TimelineLayout({ plan, c }: { plan: ComposedSlide; c: Composition }) {
  if (!c.header) return null;
  return (
    <>
      <Header plan={plan} zone={c.header} align={c.align} />
      <TimelineSteps plan={plan} zone={c.content} />
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
                  size: 2.8,
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
                  size: 1.3,
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
      {plan.cards ? (
        <CardsRow plan={plan} zone={c.aside} zoneKey="aside" />
      ) : (
        <TopicsList plan={plan} zone={c.aside} zoneKey="aside" />
      )}
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
                  size: 2.8,
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
                  size: 1.3,
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

      <EditableZone
        zoneKey="aside"
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
      </EditableZone>
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
        borderLeft: `0.24em solid ${chrome.accent}`,
        paddingLeft: '1.15em',
        marginTop: 'calc(0.8 * var(--rhythm))',
      }}
    >
      <SlideText
        block={block}
        ariaLabel="Destaque"
        spec={{ prose: true, size: 1.4, weight: 600, lineHeight: 1.45, color: chrome.ink, wrap: 'balance', clamp: 3 }}
      />
    </div>
  );
}

/** Faixa de fecho: a frase que fica, sobre vidro. */
function Banner({ block, zone }: { block: TextBlock; zone: PlacedZone }) {
  const chrome = useChrome();
  return (
    <EditableZone
      zoneKey="banner"
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
    </EditableZone>
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
