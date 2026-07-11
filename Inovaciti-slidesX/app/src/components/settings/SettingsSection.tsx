import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface SettingsSectionProps {
  icon: IconName;
  title: string;
  caption: string;
  tone?: 'default' | 'danger';
  className?: string;
  children: ReactNode;
}

/** Bloco de configurações: cabeçalho com orbe de ícone + linhas de ajuste. */
export function SettingsSection({ icon, title, caption, tone = 'default', className, children }: SettingsSectionProps) {
  const danger = tone === 'danger';
  return (
    <Card className={cn('px-7 pb-2 pt-6', danger && 'border-danger/20', className)}>
      <div className="flex items-center gap-3 border-b border-white/[0.05] pb-5">
        <div
          className={cn(
            'flex h-10 w-10 flex-none items-center justify-center rounded-xl border',
            danger ? 'border-danger/25 bg-danger-soft text-danger' : 'border-brand/20 bg-brand/[0.06] text-brand',
          )}
        >
          <Icon name={icon} size={18} />
        </div>
        <div>
          <h2 className="m-0 text-[15.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <p className="mb-0 mt-0.5 text-[12px] text-ink-muted">{caption}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  /** 'inline' põe o controle à direita do texto; 'stacked' embaixo — use
   * stacked pra controles largos (grupos de chips), que espremeriam o texto. */
  layout?: 'inline' | 'stacked';
  children: ReactNode;
}

/** Uma preferência: título + explicação, com o controle ao lado ou abaixo. */
export function SettingRow({ title, description, layout = 'inline', children }: SettingRowProps) {
  return (
    <div
      className={cn(
        'border-b border-white/[0.05] py-5 last:border-b-0',
        layout === 'inline' && 'flex items-center justify-between gap-6',
      )}
    >
      <div className="min-w-0">
        <div className="text-[14px] font-semibold tracking-[-0.005em] text-ink">{title}</div>
        <p className="mb-0 mt-1 max-w-[440px] text-[12.5px] leading-[1.5] text-ink-muted">{description}</p>
      </div>
      {layout === 'stacked' ? <div className="mt-3.5">{children}</div> : children}
    </div>
  );
}
