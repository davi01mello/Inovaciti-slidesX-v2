/**
 * Resumo real do espaço de trabalho, derivado 100% do store — substitui o antigo
 * painel de anexos (que mostrava arquivos de demonstração e apontava pra rota inexistente).
 */
import { Card } from '@/components/ui/Card';
import { SectionLink } from '@/components/home/SectionLink';
import { usePresentations } from '@/stores/presentationsStore';
import { formatRelative } from '@/lib/time';

interface Stat {
  label: string;
  value: string;
  hint?: string;
}

export function OverviewPanel() {
  const presentations = usePresentations();

  const slideCount = presentations.reduce((acc, p) => acc + p.slides.length, 0);
  const readyCount = presentations.filter((p) => p.status === 'ready').length;
  const lastEdited = presentations.reduce((max, p) => Math.max(max, p.updatedAt), 0);

  const stats: Stat[] = [
    { label: 'Apresentações', value: String(presentations.length) },
    { label: 'Slides no total', value: String(slideCount) },
    {
      label: 'Prontas pra apresentar',
      value: String(readyCount),
    },
    {
      label: 'Última edição',
      value: lastEdited === 0 ? 'Nunca' : formatRelative(lastEdited),
    },
  ];

  return (
    <Card className="flex flex-col p-6 px-7">
      <h3 className="m-0 mb-[18px] text-[15px] font-semibold tracking-[-0.01em] text-ink">Seu Espaço</h3>
      <div className="grid flex-1 grid-cols-2 gap-2.5">
        {stats.map((stat) => (
          <div key={stat.label} className="glass flex flex-col justify-center rounded-2xl px-4 py-3.5">
            <div className="text-[20px] font-bold leading-none tracking-[-0.02em] text-ink">{stat.value}</div>
            <div className="mt-1.5 text-[11px] leading-[1.35] text-ink-muted">{stat.label}</div>
            {stat.hint && <div className="mt-1 text-[10px] leading-[1.35] text-brand/80">{stat.hint}</div>}
          </div>
        ))}
      </div>
      <SectionLink to="/apresentacoes" size="sm" className="mt-[18px]">
        Ver todas as apresentações
      </SectionLink>
    </Card>
  );
}
