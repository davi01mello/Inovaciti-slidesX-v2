import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { initialsOf, useUserProfile } from '@/stores/userStore';
import { cn } from '@/lib/cn';

interface ProfileMenuProps {
  /** Modo trilho da sidebar: o gatilho vira só o avatar. */
  collapsed?: boolean;
}

interface MenuEntry {
  icon: IconName;
  label: string;
  path: string;
  tone?: 'danger';
}

const MENU_ENTRIES: MenuEntry[] = [
  { icon: 'user', label: 'Perfil', path: '/perfil' },
  { icon: 'settings', label: 'Configurações', path: '/configuracoes' },
];

export function ProfileMenu({ collapsed = false }: ProfileMenuProps) {
  const { isOpen, toggle, close } = useDisclosure();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useUserProfile();
  useOnClickOutside([containerRef], close, isOpen);

  function goTo(path: string) {
    close();
    navigate(path);
  }

  return (
    <div className="relative" ref={containerRef}>
      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title={user.name}
          className="mx-auto flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105"
        >
          <Avatar initials={initialsOf(user.name)} size={40} />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="glass flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 transition-all duration-200 hover:border-brand/25"
        >
          <Avatar initials={initialsOf(user.name)} size={34} />
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-semibold text-ink">{user.name}</div>
            <div className="truncate text-[11px] text-ink-muted">{user.department}</div>
          </div>
          <Icon
            name="chevron-down"
            size={12}
            className={cn('text-ink-muted transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          className="glass-deep absolute bottom-[calc(100%+10px)] left-0 z-50 w-[268px] animate-menu-in rounded-[20px] p-2"
        >
          {/* Cabeçalho: quem está assinando a plataforma agora. */}
          <div className="relative mb-1.5 overflow-hidden rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(45,219,96,0.10) 0%, transparent 60%)' }}
            />
            <div className="relative flex items-center gap-3">
              <Avatar initials={initialsOf(user.name)} size={40} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[11px] text-ink-muted">{user.email}</div>
              </div>
            </div>
          </div>

          {MENU_ENTRIES.map((entry) => (
            <button
              key={entry.path}
              type="button"
              role="menuitem"
              onClick={() => goTo(entry.path)}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-white/[0.05] hover:text-ink"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-ink-muted transition-colors duration-150 group-hover:border-brand/25 group-hover:text-brand">
                <Icon name={entry.icon} size={14} />
              </span>
              <span className="flex-1">{entry.label}</span>
              <Icon
                name="chevron-right"
                size={11}
                className="text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </button>
          ))}

          <div className="mx-2 my-1.5 h-px bg-border-subtle" />

          <button
            type="button"
            role="menuitem"
            onClick={() => goTo('/sair')}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-danger/[0.08] hover:text-danger"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-ink-muted transition-colors duration-150 group-hover:border-danger/25 group-hover:text-danger">
              <Icon name="logout" size={14} />
            </span>
            <span className="flex-1">Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}
