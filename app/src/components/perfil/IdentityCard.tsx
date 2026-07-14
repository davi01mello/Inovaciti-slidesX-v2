import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { initialsOf } from '@/stores/userStore';
import { usePresentations } from '@/stores/presentationsStore';

interface IdentityCardProps {
  /** Valores ao vivo do formulário — o cartão reage enquanto você digita. */
  name: string;
  department: string;
  email: string;
}

/**
 * Cartão de identidade: preview ao vivo de como a plataforma te mostra
 * (sidebar, menu, saudação) + a sua produção real em números.
 */
export function IdentityCard({ name, department, email }: IdentityCardProps) {
  const presentations = usePresentations();
  const totalSlides = presentations.reduce((sum, p) => sum + p.slides.length, 0);
  const readyCount = presentations.filter((p) => p.status === 'ready').length;

  const stats = [
    { value: presentations.length, label: presentations.length === 1 ? 'apresentação' : 'apresentações' },
    { value: totalSlides, label: 'slides' },
    { value: readyCount, label: readyCount === 1 ? 'pronta' : 'prontas' },
  ];

  return (
    <Card className="relative isolate overflow-hidden text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(45,219,96,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center gap-3 px-6 pt-8">
        <div
          className="rounded-full p-1"
          style={{ background: 'linear-gradient(140deg, rgba(45,219,96,0.5), rgba(45,219,96,0.05))' }}
        >
          <Avatar initials={initialsOf(name)} size={72} />
        </div>
        <div>
          <div className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{name.trim() || 'Seu nome'}</div>
          <div className="mt-1 text-[12.5px] text-ink-muted">{department.trim() || 'Sua área'}</div>
        </div>
        {email.trim() && (
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-ink-secondary">
            <Icon name="mail" size={12} className="flex-none text-ink-muted" />
            <span className="truncate">{email.trim()}</span>
          </div>
        )}
        <p className="mb-0 mt-1 text-[11.5px] leading-[1.5] text-ink-muted">
          Assim você aparece na sidebar, no menu e na saudação da tela inicial.
        </p>
      </div>

      <div className="relative mt-6 grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-4">
            <div className="text-[18px] font-bold tabular-nums tracking-[-0.02em] text-ink">{stat.value}</div>
            <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
