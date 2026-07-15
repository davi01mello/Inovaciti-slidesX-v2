import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * O AJUSTE DE TEXTO, EM TRÊS CAMADAS.
 *
 * As invariantes não são metas, são leis:
 *   1. NADA VAZA. Nenhum texto ultrapassa o seu container. Nunca.
 *   2. Cards de um slide têm ALTURA IDÊNTICA e alinhamento interno perfeito.
 *   3. Ritmo vertical: um espaçamento base e todos os respiros são múltiplos dele.
 *   4. Sem órfãs: título nunca termina com uma palavra sozinha na última linha.
 *   5. Uma linha quando couber.
 *   6. Justificado só com coluna larga.
 *
 * As três camadas que garantem a primeira (e mais importante):
 *
 *   CAMADA 1  o texto NASCE do tamanho certo (o prompt impõe limites por peça).
 *             Se ela funciona, as outras duas quase nunca precisam agir.
 *   CAMADA 2  ajuste MEDIDO (este arquivo): o conteúdo é medido de verdade e a
 *             fonte encolhe até caber, com piso pra não virar formiga.
 *   CAMADA 3  clamp duro: `overflow: hidden`. Feio truncar, MUITO pior vazar.
 */

/* -------------------------------------------------------------------------- */
/* FitBox                                                                      */
/* -------------------------------------------------------------------------- */

interface FitBoxProps {
  /** Piso da escala. Abaixo disso o texto vira formiga e a camada 3 assume. */
  minScale?: number;
  anchor?: 'top' | 'center' | 'bottom';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Mede o conteúdo natural e encolhe a fonte até ele caber na zona.
 *
 * COMO, e por que não do jeito óbvio:
 *
 * A tentação é `transform: scale()`. É O(1) e sempre "cabe". Mas escalar a caixa
 * encolhe a LARGURA junto, então o texto deixa de reflowar: em vez de reaproveitar
 * a coluna, ele fica menor E com um vão à direita. Parece encolhido, não ajustado.
 *
 * Aqui a caixa tem `font-size: calc(1cqw * var(--fit))` e TODOS os filhos medem em
 * `em`. Mexer em `--fit` reescala a tipografia inteira e o texto RE-QUEBRA nas
 * mesmas margens, preenchendo a coluna como um texto que sempre foi daquele tamanho.
 * É a diferença entre um parágrafo diagramado e um parágrafo espremido.
 *
 * Como os `em` são os mesmos números que os `cqw`, ler o código continua honesto:
 * `2.4em` num FitBox é 2.4cqw de verdade.
 *
 * Bônus não óbvio: o export mede `getComputedStyle().fontSize` pra emitir caixas
 * de texto reais no PPTX. Sem transform, o tamanho computado JÁ é o tamanho final,
 * e o export não precisa desfazer escala nenhuma.
 */
export function FitBox({ minScale = 0.82, anchor = 'top', className, style, children }: FitBoxProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const setFit = (value: number) => outer.style.setProperty('--fit', String(value));
    const fits = () => inner.offsetHeight <= outer.clientHeight + 1;

    const measure = () => {
      if (outer.clientHeight <= 0) return;

      // O caso comum é caber: o texto nasceu do tamanho certo (camada 1). Uma
      // medição, zero busca. Só quem estoura paga a busca binária.
      setFit(1);
      if (fits()) return;

      let lo = minScale;
      let hi = 1;
      let best = minScale;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        setFit(mid);
        if (fits()) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      setFit(best);
    };

    measure();

    // Observa só o EXTERNO. O tamanho dele vem da zona (a arte decide), não do
    // conteúdo, então mexer em --fit não o redimensiona e o observer não se
    // realimenta. Observar o interno seria um laço infinito: --fit muda a altura
    // do interno, que dispara o observer, que muda --fit...
    const observer = new ResizeObserver(measure);
    observer.observe(outer);

    // Digitação no editor não passa por re-render do React a cada tecla: sem isto,
    // o texto só se reajustaria ao sair do campo.
    outer.addEventListener('input', measure);
    return () => {
      observer.disconnect();
      outer.removeEventListener('input', measure);
    };
  }, [minScale, children]);

  const justify = anchor === 'center' ? 'center' : anchor === 'bottom' ? 'flex-end' : 'flex-start';

  return (
    <div
      ref={outerRef}
      className={cn('flex h-full w-full flex-col overflow-hidden', className)}
      style={{
        // Os `em` dos filhos SÃO os cqw do design. Ver o comentário acima.
        fontSize: 'calc(1cqw * var(--fit, 1))',
        // O ritmo encolhe junto com o texto: um bloco espremido não pode manter
        // respiros de bloco folgado, senão sobra ar onde falta letra.
        '--rhythm': 'calc(var(--rhythm-base) * var(--fit, 1))',
        justifyContent: justify,
        ...style,
      } as CSSProperties}
    >
      <div ref={innerRef} className="w-full flex-none">
        {children}
      </div>
    </div>
  );
}
