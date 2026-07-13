import { useEffect, useRef } from 'react';
import { useSettings } from '@/stores/settingsStore';

/**
 * CitiOrb — a presença viva do CITi Slides. Uma esfera de ~540 pontos distribuídos
 * por Fibonacci (golden angle) girando no eixo Y com uma respiração sutil, os pontos
 * da frente em verde da marca e os de trás em cinza translúcido, ordenados por
 * profundidade (algoritmo do pintor). Canvas 2D puro, sem libs.
 *
 * Ela é REATIVA: com `active` a rotação acelera (pensando/gerando) com easing suave
 * entre os dois estados. Com movimento reduzido, desenha um único frame estático.
 */

interface CitiOrbProps {
  /** Lado do canvas em px CSS (o padrão da spec é 220). */
  size?: number;
  /** Acelera a rotação — usar enquanto a IA pensa ou gera. */
  active?: boolean;
  /** Desenha o glow radial verde atrás da esfera. */
  glow?: boolean;
  /** Um único frame parado — pra avatares repetidos (ex.: cada mensagem do chat),
   * onde N loops de canvas animando seriam desperdício. */
  still?: boolean;
  className?: string;
}

const POINT_COUNT = 540;
const BASE_SPEED = 0.0045;
const ACTIVE_SPEED = 0.016;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

interface OrbPoint {
  x: number;
  y: number;
  z: number;
}

/** Pontos uniformes na esfera via espiral de Fibonacci. */
function buildPoints(count: number): OrbPoint[] {
  const points: OrbPoint[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = GOLDEN * i;
    points.push({ x: Math.cos(th) * rad, y, z: Math.sin(th) * rad });
  }
  return points;
}

const POINTS: OrbPoint[] = buildPoints(POINT_COUNT);

/** Miniaturas (avatar do chat): menos pontos e pontos menores, senão os 540
 * se sobrepõem e a esfera vira um círculo chapado. Cache por contagem. */
const SMALL_POINTS_CACHE = new Map<number, OrbPoint[]>();
function pointsForSize(size: number): { points: OrbPoint[]; dotScale: number } {
  if (size >= 100) return { points: POINTS, dotScale: 1 };
  const count = Math.max(90, Math.round(size * 5.5));
  let points = SMALL_POINTS_CACHE.get(count);
  if (!points) {
    points = buildPoints(count);
    SMALL_POINTS_CACHE.set(count, points);
  }
  return { points, dotScale: Math.max(0.42, size / 170) };
}

/** oklch no canvas chegou no Chrome 111 / Safari 16.4; fora disso caímos pra rgba. */
const SUPPORTS_OKLCH = (() => {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return false;
  try {
    probe.fillStyle = 'oklch(0.82 0.15 158)';
    return probe.fillStyle.includes('oklch') || probe.fillStyle.startsWith('color(');
  } catch {
    return false;
  }
})();

function frontColor(alpha: number): string {
  return SUPPORTS_OKLCH ? `oklch(0.82 0.15 158 / ${alpha})` : `rgba(62, 229, 133, ${alpha})`;
}

function backColor(alpha: number): string {
  return SUPPORTS_OKLCH ? `oklch(0.92 0.01 240 / ${alpha})` : `rgba(232, 235, 240, ${alpha})`;
}

export function CitiOrb({ size = 220, active = false, glow = true, still = false, className }: CitiOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const { reduceMotion } = useSettings();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.42;
    const { points, dotScale } = pointsForSize(size);
    let rot = 0;
    let t = 0;
    let speed = BASE_SPEED;
    let raf = 0;

    function drawFrame() {
      if (!ctx) return;
      t += 0.016;
      // Easing entre parado e pensando: a esfera acelera e desacelera com suavidade.
      const target = activeRef.current ? ACTIVE_SPEED : BASE_SPEED;
      speed += (target - speed) * 0.06;
      rot += speed;

      ctx.clearRect(0, 0, size, size);
      const breathe = 1 + Math.sin(t * 0.9) * 0.015;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      const proj = points.map((p) => {
        const x = p.x * cosR - p.z * sinR;
        const z = p.x * sinR + p.z * cosR;
        const depth = (z + 1.6) / 2.6;
        return { sx: cx + x * r * breathe, sy: cy + p.y * r * breathe, depth };
      });

      proj.sort((a, b) => a.depth - b.depth);

      for (const pt of proj) {
        const alpha = 0.18 + pt.depth * 0.62;
        const dotR = (0.5 + pt.depth * 1.9) * dotScale;
        const green = pt.depth > 0.62;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = green ? frontColor(alpha) : backColor(alpha * 0.7);
        ctx.fill();
      }
    }

    if (reduceMotion || still) {
      // Sem animação: um único frame parado já apresenta a esfera.
      drawFrame();
      return;
    }

    function loop() {
      drawFrame();
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => cancelAnimationFrame(raf);
  }, [size, reduceMotion, still]);

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}
      aria-hidden="true"
    >
      {glow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 9999,
            opacity: active ? 0.7 : 0.5,
            filter: `blur(${Math.max(12, size * 0.18)}px)`,
            background: 'radial-gradient(circle, rgba(62,229,133,0.28), transparent 65%)',
            pointerEvents: 'none',
            transition: 'opacity 400ms ease',
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, position: 'relative', zIndex: 1 }}
      />
    </div>
  );
}
