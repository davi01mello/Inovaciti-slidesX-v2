import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { NavItemConfig } from '@/types/nav';

interface NavItemProps {
  item: NavItemConfig;
  /** Modo trilho: só o ícone, quadrado e centralizado, com o nome no tooltip nativo. */
  collapsed?: boolean;
}

export function NavItem({ item, collapsed = false }: NavItemProps) {
  const danger = item.tone === 'danger';

  if (collapsed) {
    return (
      <NavLink
        to={item.path}
        end={item.path === '/'}
        title={item.label}
        className={({ isActive }) =>
          cn(
            'mx-auto flex h-10 w-10 items-center justify-center rounded-xl',
            'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
            danger ? 'focus-visible:ring-danger/40' : 'focus-visible:ring-brand/40',
            isActive
              ? danger
                ? 'bg-danger/[0.14] text-danger ring-1 ring-inset ring-danger/30'
                : 'bg-brand/[0.14] text-brand ring-1 ring-inset ring-brand/30'
              : danger
                ? 'text-ink-muted hover:bg-danger/[0.08] hover:text-danger'
                : 'text-ink-muted hover:bg-white/[0.06] hover:text-ink',
          )
        }
      >
        <Icon name={item.icon} size={19} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium tracking-[-0.005em]',
          'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
          danger ? 'focus-visible:ring-danger/40' : 'focus-visible:ring-brand/40',
          isActive
            ? danger
              ? 'bg-danger/[0.12] text-danger'
              : 'bg-brand/[0.12] text-brand'
            : danger
              ? 'text-ink-secondary hover:bg-danger/[0.07] hover:text-danger'
              : 'text-ink-secondary hover:bg-white/[0.05] hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full',
                danger ? 'bg-danger' : 'bg-brand',
              )}
            />
          )}
          <Icon name={item.icon} size={18} className="flex-none" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
