import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PresentationCard } from '@/components/home/PresentationCard';
import { SectionLink } from '@/components/home/SectionLink';
import { usePresentations } from '@/stores/presentationsStore';

const MAX_CARDS = 5;

export function RecentPresentations() {
  const navigate = useNavigate();
  const presentations = usePresentations();
  const recent = presentations.slice(0, MAX_CARDS);

  return (
    <Card className="p-6 px-7 pb-[26px]">
      <div className="mb-[18px] flex items-baseline justify-between">
        <h2 className="m-0 text-[17px] font-semibold tracking-[-0.015em] text-ink">Apresentações Recentes</h2>
        <SectionLink to="/apresentacoes">Ver todas</SectionLink>
      </div>
      {recent.length === 0 ? (
        <EmptyState
          title="Sua primeira apresentação começa aqui"
          hint="Descreva a ideia e a IA monta o storyboard pra você revisar."
          action={
            <button
              type="button"
              onClick={() => navigate('/nova')}
              className="inline-flex items-center gap-2 rounded-control border border-brand/30 bg-brand/[0.08] px-4 py-2 text-[13px] font-medium text-brand transition-colors duration-150 hover:bg-brand/[0.12]"
            >
              <Icon name="plus" size={13} />
              Começar uma apresentação
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-5 gap-3.5">
          {recent.map((p) => (
            <PresentationCard key={p.id} presentation={p} />
          ))}
        </div>
      )}
    </Card>
  );
}
