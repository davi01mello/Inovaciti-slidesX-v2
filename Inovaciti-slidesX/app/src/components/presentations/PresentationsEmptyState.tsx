import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Mini slide fake do leque decorativo. */
function DeckSlide({ className, accent = false }: { className?: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        'absolute flex h-[124px] w-[210px] flex-col justify-center rounded-xl border px-6 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.8)]',
        accent
          ? 'border-brand/25 bg-gradient-to-br from-[#0b140d] to-[#040705]'
          : 'border-white/[0.08] bg-gradient-to-br from-[#0b0d10] to-[#040506]',
        className,
      )}
    >
      <span className={cn('h-1.5 w-9 rounded-full', accent ? 'bg-brand' : 'bg-white/20')} />
      <span className={cn('mt-3 h-2.5 rounded-full', accent ? 'w-[75%] bg-slide-fg/95' : 'w-[65%] bg-white/50')} />
      <span className="mt-1.5 h-1.5 w-[45%] rounded-full bg-white/25" />
    </div>
  );
}

/**
 * Primeira visita à biblioteca. Sem caixa em volta: a composição flutua
 * centrada na própria página — leque de slides, glow da marca e o convite.
 */
export function PresentationsEmptyState() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[56vh] flex-col items-center justify-center text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[380px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.05] blur-[110px]" />
      </div>

      <div aria-hidden="true" className="relative h-[168px] w-[340px]">
        <DeckSlide className="left-0 top-9 -rotate-[9deg] opacity-55" />
        <DeckSlide className="right-0 top-9 rotate-[9deg] opacity-55" />
        <DeckSlide
          accent
          className="left-1/2 top-2 -translate-x-1/2 shadow-[0_28px_56px_-20px_rgba(0,0,0,0.9),0_0_40px_-12px_rgba(45,219,96,0.25)]"
        />
      </div>

      <h2 className="relative m-0 mt-9 text-[24px] font-bold tracking-[-0.025em] text-ink">
        Sua biblioteca está esperando a primeira história
      </h2>
      <p className="relative mx-auto mt-2 max-w-[440px] text-[14px] leading-[1.6] text-ink-muted">
        Descreva a ideia em um parágrafo e a IA monta o storyboard inteiro pra você revisar. Tudo que você criar
        vive aqui.
      </p>

      <div className="relative mt-8 flex items-center justify-center gap-3">
        <Button onClick={() => navigate('/nova')}>
          <Icon name="plus" size={15} />
          Criar minha primeira apresentação
        </Button>
        <Button variant="ghost" onClick={() => navigate('/templates')}>
          Explorar templates
          <Icon name="chevron-right" size={13} />
        </Button>
      </div>
    </section>
  );
}

/** Busca/filtro sem resultado: bloco leve e centrado, sem moldura. */
export function PresentationsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <section className="flex flex-col items-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-ink-muted">
        <Icon name="search" size={20} />
      </div>
      <p className="m-0 mt-4 text-[15px] font-semibold text-ink">Nada bate com esse filtro</p>
      <p className="m-0 mt-1 text-[13px] text-ink-muted">Tenta outro nome ou limpa os filtros pra ver tudo de novo.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex items-center gap-2 rounded-control border border-brand/30 bg-brand/[0.08] px-4 py-2 text-[13px] font-medium text-brand transition-colors duration-150 hover:bg-brand/[0.12]"
      >
        Limpar filtros
      </button>
    </section>
  );
}
