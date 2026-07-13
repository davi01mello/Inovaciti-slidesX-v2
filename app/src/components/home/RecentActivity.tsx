import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SectionLink } from '@/components/home/SectionLink';
import { usePresentations } from '@/stores/presentationsStore';
import { formatRelative } from '@/lib/time';

const MAX_ENTRIES = 5;

/** Atividade real derivada do que existe no store, nada de feed inventado. */
export function RecentActivity() {
  const presentations = usePresentations();

  const entries = [...presentations]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ENTRIES)
    .map((p) => ({
      id: p.id,
      action: p.status === 'ready' ? 'Pronta pra apresentar:' : p.updatedAt === p.createdAt ? 'Você criou' : 'Você editou',
      target: p.title,
      time: formatRelative(p.updatedAt),
    }));

  return (
    <Card className="flex flex-col p-6 px-7">
      <h3 className="m-0 mb-[18px] text-[15px] font-semibold tracking-[-0.01em] text-ink">Atividade Recente</h3>
      {entries.length === 0 ? (
        <EmptyState
          compact
          title="Tudo tranquilo por aqui"
          hint="Assim que você criar ou editar algo, o histórico aparece aqui."
        />
      ) : (
        <div className="flex flex-1 flex-col gap-3.5">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-brand/20 bg-brand/[0.06] text-brand">
                <Icon name="presentations" size={13} />
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] leading-[1.4] text-ink-secondary">
                  {entry.action} <b className="font-semibold text-ink">{entry.target}</b>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">{entry.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <SectionLink to="/apresentacoes" size="sm" className="mt-[18px]">
        Ver todas as apresentações
      </SectionLink>
    </Card>
  );
}
