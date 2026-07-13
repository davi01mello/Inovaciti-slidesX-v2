import type { NavItemConfig } from '@/types/nav';

// Só entra no sidebar o que funciona de verdade. Templates, Marca e Lixeira são
// páginas completas; Biblioteca e Anexos continuam fora do MVP (ver docs/POSTPONED.md).
export const NAV_ITEMS: NavItemConfig[] = [
  { key: 'home', label: 'Início', icon: 'home', path: '/' },
  { key: 'presentations', label: 'Apresentações', icon: 'presentations', path: '/apresentacoes' },
  { key: 'templates', label: 'Templates', icon: 'templates', path: '/templates' },
  { key: 'brand', label: 'Marca CITi', icon: 'brand', path: '/marca' },
  { key: 'trash', label: 'Lixeira', icon: 'trash', path: '/lixeira', tone: 'danger' },
];
