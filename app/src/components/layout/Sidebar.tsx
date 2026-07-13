/**
 * Sidebar líquida: um painel de vidro preto flutuante que o usuário dimensiona no arrasto.
 * Sem botões: arraste a borda direita pra ajustar a largura; puxe até o fim e ela vira um
 * trilho de ícones; puxe o trilho de volta pra fora e ela reabre. Duplo clique na borda
 * alterna. Largura e modo ficam salvos no navegador.
 *
 * O arrasto atualiza a largura direto no DOM (via ref), sem re-render por frame. Ao
 * soltar, a largura-alvo é reescrita explicitamente no DOM: o React não reescreve
 * style.width quando o modo não mudou (o diff vê o mesmo valor), e era isso que deixava
 * a sidebar "parada no meio do caminho" depois de um arrasto solto fora do snap.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '@/data/nav';
import { NavItem } from '@/components/layout/NavItem';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { OnboardingSlot } from '@/components/layout/OnboardingSlot';
import { loadJson, saveJson } from '@/lib/storage';
import { cn } from '@/lib/cn';
import logo from '@/assets/citi-slides-logo.png';

const STORAGE_KEY = 'citi-slides:sidebar:v3';
const RAIL_WIDTH = 80;
/** Largura expandida ÚNICA: painel interno = 200px, tamanho exato que o card espera. */
const EXPANDED_WIDTH = 236;
/** Soltando abaixo disso, a sidebar assume o trilho de ícones. */
const SNAP_TO_RAIL_AT = 150;
/** Zona magnética nas duas pontas: o arrasto "trava" nos pontos de descanso. */
const SNAP_ZONE = 44;
/** Só vira arrasto de verdade depois desse deslocamento — clique parado não conta. */
const DRAG_THRESHOLD = 3;

type SidebarMode = 'expanded' | 'rail';

function loadMode(): SidebarMode {
  const saved = loadJson<{ mode?: SidebarMode }>(STORAGE_KEY);
  return saved?.mode === 'rail' ? 'rail' : 'expanded';
}

/** Largura visual com as travas magnéticas aplicadas. */
function magnetize(raw: number): number {
  const clamped = Math.min(EXPANDED_WIDTH, Math.max(RAIL_WIDTH, raw));
  if (clamped > EXPANDED_WIDTH - SNAP_ZONE) return EXPANDED_WIDTH;
  if (clamped < RAIL_WIDTH + SNAP_ZONE) return RAIL_WIDTH;
  return clamped;
}

export function Sidebar() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SidebarMode>(loadMode);
  const [dragging, setDragging] = useState(false);
  // Durante o arrasto, o layout (ícones × ícones+rótulos) segue a largura VISUAL:
  // só troca quando a barra cruza o limiar, nunca todo de uma vez no início.
  const [dragNarrow, setDragNarrow] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const pressedRef = useRef(false);
  const startXRef = useRef(0);
  const rawRef = useRef(0);

  useEffect(() => {
    saveJson(STORAGE_KEY, { mode });
  }, [mode]);

  const isRail = mode === 'rail';
  const width = isRail ? RAIL_WIDTH : EXPANDED_WIDTH;
  const showRail = dragging ? dragNarrow : isRail;
  // O card de onboarding vive só na sidebar expandida e parada; a entrada e a
  // saída suaves são responsabilidade do OnboardingSlot (motion), não daqui.
  // Antes só aparecia com presentations.length === 0 (só na primeira vez); agora fica sempre visível.
  const showOnboarding = mode === 'expanded' && !dragging;

  /** Escreve a largura-alvo direto no DOM depois que o React commitou a classe de
   * transição de volta — a barra desliza suave do ponto do arrasto até o descanso. */
  function settleTo(target: number) {
    requestAnimationFrame(() => {
      if (asideRef.current) asideRef.current.style.width = `${target}px`;
    });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressedRef.current = true;
    startXRef.current = event.clientX;
    rawRef.current = width;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pressedRef.current || !asideRef.current) return;
    if (!dragging) {
      if (Math.abs(event.clientX - startXRef.current) < DRAG_THRESHOLD) return;
      setDragging(true);
      setDragNarrow(width < SNAP_TO_RAIL_AT);
    }
    const left = asideRef.current.getBoundingClientRect().left;
    const raw = event.clientX - left;
    rawRef.current = raw;
    const visual = magnetize(raw);
    asideRef.current.style.width = `${visual}px`;
    // React ignora sets com o mesmo valor, então isso só re-renderiza no cruzamento.
    setDragNarrow(visual < SNAP_TO_RAIL_AT);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!dragging) return; // clique parado na alça: nada muda, nada pisca
    setDragging(false);
    const nextMode: SidebarMode = rawRef.current < SNAP_TO_RAIL_AT ? 'rail' : 'expanded';
    setMode(nextMode);
    settleTo(nextMode === 'rail' ? RAIL_WIDTH : EXPANDED_WIDTH);
  }

  function toggleMode() {
    const next: SidebarMode = mode === 'rail' ? 'expanded' : 'rail';
    setMode(next);
    settleTo(next === 'rail' ? RAIL_WIDTH : EXPANDED_WIDTH);
  }

  return (
    <aside
      ref={asideRef}
      style={{ width }}
      className={cn(
        'sticky top-0 z-30 h-screen flex-none py-3 pl-3',
        !dragging && 'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
      )}
    >
      <div className="glass-deep relative flex h-full flex-col rounded-3xl px-3 pb-3 pt-5">
        {/* Fio de luz no topo e aura da marca: o toque de vidro vivo do painel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-3xl"
          style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(45,219,96,0.06) 0%, transparent 70%)' }}
        />

        <button
          type="button"
          onClick={() => navigate('/')}
          title="Início"
          aria-label="Ir para a tela inicial"
          className={cn(
            'group relative mx-auto flex items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
            showRail ? 'h-11 w-11' : 'h-[72px] w-full',
          )}
        >
          <img
            src={logo}
            alt="CITi Slides"
            className="object-contain transition-all duration-300 group-hover:opacity-90"
            style={showRail ? { width: 44, height: 28 } : { width: 112, height: 72 }}
          />
        </button>

        <nav className="relative mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pb-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.key} item={item} collapsed={showRail} />
          ))}
        </nav>

        <OnboardingSlot active={showOnboarding} />

        <ProfileMenu collapsed={showRail} />

        {/* Alça de redimensionamento: arraste pra ajustar, duplo clique alterna. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Arraste para redimensionar ou recolher a barra lateral"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={toggleMode}
          className="group absolute -right-2 top-0 flex h-full w-4 cursor-col-resize touch-none items-center justify-center"
        >
          <div
            className={cn(
              'h-14 w-[3px] rounded-full transition-all duration-150',
              dragging ? 'bg-brand/70' : 'bg-white/[0.06] group-hover:bg-brand/40',
            )}
          />
        </div>
      </div>
    </aside>
  );
}
