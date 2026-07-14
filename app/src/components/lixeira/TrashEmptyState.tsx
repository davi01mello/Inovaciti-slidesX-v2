import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { TRASH_RETENTION_DAYS } from '@/stores/presentationsStore';

/** Lixeira vazia é boa notícia: composição centrada e sem moldura — estado
 * "tudo limpo", não uma caixa de erro. */
export function TrashEmptyState() {
  return (
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.04] blur-[100px]" />
      </div>

      <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-brand/25 bg-brand/[0.06] text-brand shadow-[0_0_32px_-8px_rgba(45,219,96,0.4)]">
        <Icon name="check" size={26} />
      </div>

      <h2 className="relative m-0 mt-6 text-[20px] font-bold tracking-[-0.02em] text-ink">Tudo limpo por aqui</h2>
      <p className="relative mx-auto mt-2 max-w-[400px] text-[13.5px] leading-[1.6] text-ink-muted">
        Apresentações movidas pra Lixeira aparecem nesta lista, com {TRASH_RETENTION_DAYS} dias pra restaurar antes
        de sumirem de vez.
      </p>

      <Link
        to="/apresentacoes"
        className="relative mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:text-ink"
      >
        Ver minhas apresentações
        <Icon name="chevron-right" size={13} />
      </Link>
    </section>
  );
}
