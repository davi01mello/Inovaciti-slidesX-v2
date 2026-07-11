import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isEmpty, renderRich, type RichText } from '@/lib/richText';
import { cn } from '@/lib/cn';
import { composeSlide, type ComposedSlide, type TemplateArchetype } from '@/services/templateComposition';
import type { Slide, TextBlock } from '@/types/slide';
import logoCiti30 from '@/assets/logo-citi30-branco.png';
import bgCover from '@/assets/templates/bg-cover.webp';
import bgStatement from '@/assets/templates/bg-statement.webp';
import bgRows from '@/assets/templates/bg-rows.webp';
import bgProcess from '@/assets/templates/bg-process.webp';

/**
 * Composição de slide sobre os templates oficiais do CITi.
 *
 * O fundo de cada arquétipo é a arte real do template (limpa, sem texto) e os
 * textos são compostos por cima nas zonas que o design original reservou pra
 * eles — mesma lógica de um designer preenchendo placeholders no Figma. O
 * template nunca muda; só a tipografia se adapta ao conteúdo (AutoShrinkText).
 *
 * Todas as medidas usam unidades de container (cqw/cqh), então o mesmo
 * componente renderiza fiel em qualquer tamanho: apresentação, palco do
 * workspace, miniaturas e a rasterização de export (1920x1080).
 */

const BG_BY_ARCHETYPE: Record<TemplateArchetype, string> = {
  cover: bgCover,
  statement: bgStatement,
  cards: bgProcess,
  rows: bgRows,
  bignumber: bgStatement,
};

const GREEN = '#2ddb60';
const GREEN_GLOW = '0 0 1.1cqw rgba(45,219,96,0.4)';
const CARD_BG = 'linear-gradient(180deg, rgba(17,25,20,0.78), rgba(6,9,7,0.72))';
const CARD_BORDER = '1px solid rgba(45,219,96,0.16)';

interface SlideCompositionProps {
  slide: Slide;
  className?: string;
}

export function SlideComposition({ slide, className }: SlideCompositionProps) {
  const plan = useMemo(() => composeSlide(slide), [slide]);

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-[#040605]', className)}
      style={{ containerType: 'size', color: 'var(--color-slide-fg)' }}
    >
      <img
        src={BG_BY_ARCHETYPE[plan.archetype]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {plan.archetype === 'cover' && <CoverLayout plan={plan} />}
      {plan.archetype === 'statement' && <StatementLayout plan={plan} />}
      {plan.archetype === 'cards' && <CardsLayout plan={plan} />}
      {plan.archetype === 'rows' && <RowsLayout plan={plan} />}
      {plan.archetype === 'bignumber' && <BigNumberLayout plan={plan} />}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Arquétipos                                                                */
/* ------------------------------------------------------------------------ */

function CoverLayout({ plan }: { plan: ComposedSlide }) {
  const label = plan.label && !isEmpty(plan.label.content) ? plan.label : null;
  return (
    <>
      {label && (
        <>
          <span
            aria-hidden="true"
            className="absolute rounded-full"
            style={{ left: '4.4cqw', top: '6.4cqh', width: '4cqw', height: '0.45cqh', background: GREEN }}
          />
          <div
            className="absolute font-medium"
            style={{ left: '4.4cqw', top: '9.6cqh', maxWidth: '38cqw', fontSize: '1.35cqw', lineHeight: 1.4, color: 'rgba(247,247,247,0.9)' }}
          >
            {renderRich(label.content)}
          </div>
        </>
      )}

      {/* Palco central: onde o template original recebia os logos e o subtítulo. */}
      <Zone left="15cqw" right="15cqw" top="26cqh" bottom="26cqh">
        <div className="flex h-full flex-col items-center justify-center text-center" style={{ gap: '3.2cqh' }}>
          {plan.headline && (
            <div
              className="font-bold"
              style={{
                fontSize: plan.headline.kind === 'title-1' ? '5.2cqw' : '4.1cqw',
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
              }}
            >
              {renderRich(plan.headline.content)}
            </div>
          )}
          {plan.support.map((block) => (
            <div
              key={block.id}
              style={{ fontSize: '1.6cqw', lineHeight: 1.6, maxWidth: '54cqw', color: 'rgba(247,247,247,0.72)' }}
            >
              {renderRich(block.content)}
            </div>
          ))}
        </div>
      </Zone>
      {plan.highlight && <BannerStrip block={plan.highlight} />}
    </>
  );
}

function StatementLayout({ plan }: { plan: ComposedSlide }) {
  return (
    <>
      <BrandChrome />
      <Zone left="13cqw" right="13cqw" top="13cqh" bottom={plan.highlight ? '34cqh' : '40cqh'}>
        <div className="flex h-full flex-col items-center justify-center text-center" style={{ gap: '2.6cqh' }}>
          {plan.label && !isEmpty(plan.label.content) && <EyebrowLabel block={plan.label} />}
          {plan.headline && (
            <div className="font-bold" style={{ fontSize: '4.1cqw', lineHeight: 1.14, letterSpacing: '-0.025em' }}>
              {renderRich(plan.headline.content)}
            </div>
          )}
          <TitleDash />
          {plan.support.map((block) => (
            <div
              key={block.id}
              style={{ fontSize: '1.55cqw', lineHeight: 1.65, maxWidth: '58cqw', color: 'rgba(247,247,247,0.68)' }}
            >
              {renderRich(block.content)}
            </div>
          ))}
        </div>
      </Zone>
      {plan.highlight && <BannerStrip block={plan.highlight} />}
    </>
  );
}

function CardsLayout({ plan }: { plan: ComposedSlide }) {
  const items = plan.items;
  return (
    <>
      <BrandChrome />
      <TemplateHeader plan={plan} />
      <Zone left="11cqw" right="11cqw" top="27cqh" bottom={plan.highlight ? '23cqh' : '12cqh'} fit={false}>
        <div
          className="grid h-full"
          style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`, gap: '2.4cqw' }}
        >
          {items.map((item, i) => (
            <TemplateCard key={i} index={i} item={item} />
          ))}
        </div>
      </Zone>
      {plan.highlight && <BannerStrip block={plan.highlight} />}
    </>
  );
}

function RowsLayout({ plan }: { plan: ComposedSlide }) {
  const items = plan.items;
  return (
    <>
      <BrandChrome />
      <TemplateHeader plan={plan} />
      <Zone left="4.8cqw" right="24cqw" top="26cqh" bottom={plan.highlight ? '21cqh' : '8cqh'} fit={false}>
        <div className="flex h-full flex-col" style={{ gap: '1.6cqh' }}>
          {items.map((item, i) => (
            <TemplateRow key={i} index={i} item={item} />
          ))}
        </div>
      </Zone>
      {plan.highlight && <BannerStrip block={plan.highlight} />}
    </>
  );
}

function BigNumberLayout({ plan }: { plan: ComposedSlide }) {
  return (
    <>
      <BrandChrome />
      <Zone left="15cqw" right="15cqw" top="12cqh" bottom={plan.highlight ? '30cqh' : '34cqh'}>
        <div className="flex h-full flex-col items-center justify-center text-center" style={{ gap: '2.6cqh' }}>
          {plan.label && !isEmpty(plan.label.content) && <EyebrowLabel block={plan.label} />}
          {plan.headline && (
            <div className="font-semibold" style={{ fontSize: '2.9cqw', lineHeight: 1.2, letterSpacing: '-0.015em' }}>
              {renderRich(plan.headline.content)}
            </div>
          )}
          <TitleDash />
          {plan.metric && (
            <div
              className="rounded-[1.6cqw]"
              style={{
                border: CARD_BORDER,
                background: CARD_BG,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '2.4cqh 6cqw',
              }}
            >
              <span className="font-bold" style={{ fontSize: '6cqw', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {renderRich(plan.metric.content)}
              </span>
            </div>
          )}
          {plan.support.map((block) => (
            <div
              key={block.id}
              style={{ fontSize: '1.5cqw', lineHeight: 1.6, maxWidth: '56cqw', color: 'rgba(247,247,247,0.68)' }}
            >
              {renderRich(block.content)}
            </div>
          ))}
        </div>
      </Zone>
      {plan.highlight && <BannerStrip block={plan.highlight} />}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Peças do template                                                         */
/* ------------------------------------------------------------------------ */

/**
 * Guarda de overflow das zonas do template (mesma ideia do AutoShrinkText do
 * editor, com uma diferença essencial: âncora configurável). O conteúdo é
 * medido no tamanho natural e escalado pra caber na zona — 'top' ancora no
 * topo (pilhas de texto), 'center' centraliza na vertical (linhas e faixas).
 */
function FitText({ anchor = 'top', children }: { anchor?: 'top' | 'center'; children: React.ReactNode }) {
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

/** Área absoluta do template. Com fit, o conteúdo é escalado pra nunca vazar. */
function Zone({
  left,
  right,
  top,
  bottom,
  fit = true,
  children,
}: {
  left: string;
  right: string;
  top: string;
  bottom: string;
  /** false: o filho ocupa a zona inteira com altura real (grids de cards/linhas). */
  fit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute" style={{ left, right, top, bottom }}>
      {fit ? <FitText>{children}</FitText> : children}
    </div>
  );
}

/** Logo CITi no canto superior esquerdo, como em todos os slides internos do template. */
function BrandChrome() {
  return (
    <img
      src={logoCiti30}
      alt=""
      className="absolute w-auto object-contain"
      style={{ left: '4.3cqw', top: '5cqh', height: '5.2cqh' }}
      draggable={false}
    />
  );
}

function EyebrowLabel({ block }: { block: TextBlock }) {
  return (
    <div
      className="font-semibold uppercase"
      style={{ fontSize: '1.15cqw', letterSpacing: '0.28em', color: GREEN, textShadow: GREEN_GLOW }}
    >
      {renderRich(block.content)}
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

/** Título + traço centralizados no topo (arquétipos cards e rows). */
function TemplateHeader({ plan }: { plan: ComposedSlide }) {
  return (
    <Zone left="14cqw" right="14cqw" top="6.5cqh" bottom="76cqh">
      <div className="flex h-full flex-col items-center justify-center text-center" style={{ gap: '1.6cqh' }}>
        {plan.label && !isEmpty(plan.label.content) && <EyebrowLabel block={plan.label} />}
        {plan.headline && (
          <div className="font-bold" style={{ fontSize: '3.3cqw', lineHeight: 1.12, letterSpacing: '-0.025em' }}>
            {renderRich(plan.headline.content)}
          </div>
        )}
        <TitleDash />
        {plan.support.map((block) => (
          <div
            key={block.id}
            style={{ fontSize: '1.3cqw', lineHeight: 1.5, maxWidth: '58cqw', color: 'rgba(247,247,247,0.62)' }}
          >
            {renderRich(block.content)}
          </div>
        ))}
      </div>
    </Zone>
  );
}

function TemplateCard({ index, item }: { index: number; item: RichText }) {
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
        style={{ fontSize: '3.4cqw', lineHeight: 1, letterSpacing: '-0.02em', color: GREEN, textShadow: GREEN_GLOW }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        aria-hidden="true"
        className="rounded-full"
        style={{ marginTop: '2cqh', width: '2.4cqw', height: '0.35cqh', background: 'rgba(45,219,96,0.65)' }}
      />
      <div className="min-h-0 flex-1" style={{ marginTop: '2cqh' }}>
        <FitText>
          <div style={{ fontSize: '1.55cqw', lineHeight: 1.5, color: 'rgba(247,247,247,0.9)' }}>{renderRich(item)}</div>
        </FitText>
      </div>
      <div className="flex flex-none items-center" style={{ marginTop: '1.8cqh', gap: '1.3cqw' }}>
        <IconBadge index={index} size="3.3cqw" />
        <span aria-hidden="true" style={{ width: '1px', height: '2.4cqw', background: 'rgba(45,219,96,0.3)' }} />
      </div>
    </div>
  );
}

function TemplateRow({ index, item }: { index: number; item: RichText }) {
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
        style={{ width: '5.4cqw', fontSize: '2.7cqw', lineHeight: 1, color: GREEN, textShadow: GREEN_GLOW }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span aria-hidden="true" className="self-stretch" style={{ width: '1px', margin: '0.8cqh 0', background: 'rgba(45,219,96,0.25)' }} />
      <IconBadge index={index} size="3.1cqw" />
      <div className="min-h-0 flex-1 self-stretch">
        <FitText anchor="center">
          <div style={{ fontSize: '1.5cqw', lineHeight: 1.45, color: 'rgba(247,247,247,0.9)' }}>{renderRich(item)}</div>
        </FitText>
      </div>
    </div>
  );
}

/** Faixa de fecho (bloco de destaque): vidro + ícone, como no template original. */
function BannerStrip({ block }: { block: TextBlock }) {
  return (
    <div
      className="absolute flex items-center rounded-[1.6cqw]"
      style={{
        left: '11cqw',
        right: '11cqw',
        bottom: '6.5cqh',
        height: '13cqh',
        border: CARD_BORDER,
        background: CARD_BG,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '0 2.4cqw',
        gap: '1.8cqw',
      }}
    >
      <IconBadge index={2} size="3.4cqw" />
      <span aria-hidden="true" className="self-stretch" style={{ width: '1px', margin: '2.4cqh 0', background: 'rgba(45,219,96,0.3)' }} />
      <div className="min-h-0 flex-1 self-stretch" style={{ padding: '1cqh 0' }}>
        <FitText anchor="center">
          <div className="font-medium" style={{ fontSize: '1.6cqw', lineHeight: 1.5, color: 'rgba(247,247,247,0.92)' }}>
            {renderRich(block.content)}
          </div>
        </FitText>
      </div>
    </div>
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
