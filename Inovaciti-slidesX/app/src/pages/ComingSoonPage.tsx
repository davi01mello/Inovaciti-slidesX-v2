import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { StubRouteConfig } from '@/data/stubRoutes';

export function ComingSoonPage({ title, description, icon }: StubRouteConfig) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/6 text-brand">
        <Icon name={icon} size={26} />
      </div>
      <div className="max-w-md">
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.015em] text-ink">{title}</h1>
        <p className="mt-2.5 text-sm leading-[1.5] text-ink-muted">{description}</p>
      </div>
      <span className="rounded-full border border-border-subtle bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-ink-muted">
        Em construção
      </span>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-2 rounded-control border border-border-subtle bg-surface-2 px-5 py-2.5 text-sm font-medium text-ink-secondary transition-colors duration-200 hover:bg-surface-3"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
