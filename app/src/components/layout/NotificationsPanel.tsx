import { useRef } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

/**
 * Ainda não existe um sistema real de notificações (não há backend de colaboração),
 * então o painel é honesto: estado vazio com orientação, sem feed inventado.
 */
export function NotificationsPanel() {
  const { isOpen, toggle, close } = useDisclosure();
  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside([containerRef], close, isOpen);

  return (
    <div className="relative" ref={containerRef}>
      <IconButton aria-label="Notificações" aria-haspopup="menu" aria-expanded={isOpen} onClick={toggle}>
        <Icon name="bell" size={18} />
      </IconButton>

      {isOpen && (
        <div
          role="menu"
          className="glass-deep absolute right-0 top-[52px] z-[60] w-[340px] animate-menu-in rounded-[20px] p-2"
        >
          <div className="px-3 py-2.5">
            <span className="text-[13px] font-semibold text-ink">Notificações</span>
          </div>
          <EmptyState
            compact
            title="Nada por aqui"
            hint="Quando algo precisar da sua atenção, aparece aqui."
          />
        </div>
      )}
    </div>
  );
}
