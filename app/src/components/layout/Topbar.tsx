import { SearchField } from '@/components/layout/SearchField';
import { NotificationsPanel } from '@/components/layout/NotificationsPanel';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { openOnboarding } from '@/stores/onboardingStore';

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] flex-none items-center gap-6 border-b border-white/[0.04] bg-app-bg/85 px-8 backdrop-blur-md">
      <SearchField />
      <div className="flex items-center gap-2">
        <NotificationsPanel />
        <IconButton aria-label="Ajuda: ver guia rápido" title="Ver guia rápido" onClick={() => openOnboarding()}>
          <Icon name="help" size={18} />
        </IconButton>
      </div>
    </header>
  );
}
