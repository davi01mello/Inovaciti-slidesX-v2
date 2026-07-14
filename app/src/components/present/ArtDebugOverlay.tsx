import type { CSSProperties } from 'react';
import { GRID_COLS, GRID_ROWS, type TemplateArt } from '@/services/templateArt.generated';
import type { Composition, PlacedZone } from '@/services/artZones';

/**
 * O OVERLAY DE DEPURAÇÃO: a prova de que a medição está certa.
 *
 * Desenha, por cima do slide:
 *   · a GRADE DE OCUPAÇÃO como heatmap (o que a build mediu na arte);
 *   · os RETÂNGULOS do arranjo escolhido, com o custo e o véu de cada zona.
 *
 * Se o texto está caindo em cima da escultura, isto mostra na hora se a culpa é
 * da medição (o heatmap não bate com a arte) ou do arranjo (o retângulo está no
 * lugar errado). Sem isso, "o slide ficou feio" é um palpite; com isso, é um número.
 *
 * Nunca entra no render de produção: só o harness liga `debug`.
 */

/** Do vazio (transparente) ao cheio (vermelho). Verde no meio = zona de risco. */
function heat(occ: number): string {
  const t = Math.min(1, occ / 99);
  if (t < 0.02) return 'transparent';
  const hue = 210 - t * 210; // azul (vazio) -> vermelho (escultura)
  return `hsla(${hue}, 92%, 52%, ${(0.16 + t * 0.5).toFixed(2)})`;
}

function ZoneRect({ zone, label, color }: { zone: PlacedZone; label: string; color: string }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${zone.x * 100}%`,
        top: `${zone.y * 100}%`,
        width: `${zone.width * 100}%`,
        height: `${zone.height * 100}%`,
        border: `0.18cqw dashed ${color}`,
        boxShadow: `inset 0 0 0 0.06cqw rgba(0,0,0,0.5)`,
      }}
    >
      <span
        className="absolute left-0 top-0 whitespace-nowrap font-bold"
        style={{
          transform: 'translateY(-115%)',
          fontSize: '0.95cqw',
          color,
          background: 'rgba(0,0,0,0.72)',
          padding: '0.1cqw 0.4cqw',
          borderRadius: '0.3cqw',
        }}
      >
        {label} · custo {zone.cost.toFixed(2)} · véu {zone.veil.toFixed(2)} · {zone.surface}
      </span>
    </div>
  );
}

export function ArtDebugOverlay({ art, composition }: { art: TemplateArt; composition: Composition }) {
  const cellStyle: CSSProperties = { display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-50">
      <div className="absolute inset-0" style={cellStyle}>
        {art.grid.map((occ, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ background: heat(occ), outline: '0.03cqw solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ fontSize: '0.7cqw', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
              {occ > 4 ? occ : ''}
            </span>
          </div>
        ))}
      </div>

      {composition.header && <ZoneRect zone={composition.header} label="header" color="#ffd23f" />}
      <ZoneRect zone={composition.content} label="content" color="#00ff9d" />
      {composition.aside && <ZoneRect zone={composition.aside} label="aside" color="#ff7ad9" />}
      {composition.banner && <ZoneRect zone={composition.banner} label="banner" color="#7ab8ff" />}

      <div
        className="absolute left-0 top-0 font-mono font-bold"
        style={{
          fontSize: '0.95cqw',
          background: 'rgba(0,0,0,0.82)',
          color: '#fff',
          padding: '0.5cqw 0.8cqw',
          lineHeight: 1.5,
        }}
      >
        {art.id} · {art.family} · tone {art.tone.toFixed(2)} · lum {art.luminance.toFixed(2)}
        {art.light ? ' · CLARA' : ''}
        <br />
        {composition.archetype} → {composition.arrangementId} · custo {composition.cost.toFixed(3)} · logo:
        {composition.logoSide}
      </div>
    </div>
  );
}
