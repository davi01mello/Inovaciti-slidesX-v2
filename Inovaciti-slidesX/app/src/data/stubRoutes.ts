import type { IconName } from '@/components/ui/Icon';

export interface StubRouteConfig {
  path: string;
  title: string;
  description: string;
  icon: IconName;
}

// Única rota "honesta sem feature" que restou: sair. Não existe backend de contas,
// então a página explica isso em vez de fingir logout. Templates, Marca, Perfil,
// Configurações e Lixeira viraram páginas reais.
export const SIGN_OUT_ROUTE: StubRouteConfig = {
  path: '/sair',
  title: 'Sessão local',
  description:
    'O CITi Slides roda todo neste navegador, sem conta e sem servidor de identidade, então não há sessão pra encerrar. Seus dados ficam no armazenamento local desta máquina.',
  icon: 'logout',
};
