import type { IconName } from '@/components/ui/Icon';

export type NavKey = 'home' | 'presentations' | 'templates' | 'library' | 'assets' | 'brand' | 'trash';

export interface NavItemConfig {
  key: NavKey;
  label: string;
  icon: IconName;
  path: string;
  /** 'danger' pinta o item de vermelho quando ativo (caso da Lixeira). */
  tone?: 'default' | 'danger';
}
