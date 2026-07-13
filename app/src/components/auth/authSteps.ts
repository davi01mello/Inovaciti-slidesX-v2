/**
 * O login inteiro acontece num campo só, que se transforma: usuário → senha → nome.
 *
 * Cada passo declara apenas o que muda (rótulo, placeholder, tipo do input, texto
 * de apoio). A moldura — a frase da casa, a pílula de vidro, o botão redondo — é
 * sempre a mesma. É isso que faz a pergunta do nome parecer o próximo gesto do
 * mesmo fluxo, e não um modal colado depois do login.
 */

export type AuthStepId = 'username' | 'password' | 'name';

export interface AuthStep {
  id: AuthStepId;
  /** Rótulo acessível: a tela é limpa, não tem label visível. */
  label: string;
  placeholder: string;
  type: 'text' | 'password';
  autoComplete: string;
  /** Rótulo acessível do botão que avança — muda porque a ação muda. */
  action: string;
  /** Texto sob o campo. Uma entrada por linha. */
  support: string[];
}

export const AUTH_STEPS: Record<AuthStepId, AuthStep> = {
  username: {
    id: 'username',
    label: 'Usuário CITi',
    placeholder: 'Digite seu usuário CITi',
    type: 'text',
    autoComplete: 'username',
    action: 'Continuar',
    support: [
      'Entre no CITi Slides com as suas credenciais de membro.',
      'Suas apresentações, do jeito CITi, em um só lugar.',
    ],
  },
  password: {
    id: 'password',
    label: 'Senha',
    placeholder: 'Digite sua senha',
    type: 'password',
    autoComplete: 'current-password',
    action: 'Entrar',
    support: [
      'Agora a sua senha de membro do CITi.',
      'É a mesma que você já usa no acesso da equipe.',
    ],
  },
  name: {
    id: 'name',
    label: 'Seu nome',
    placeholder: 'Como podemos te chamar?',
    type: 'text',
    autoComplete: 'given-name',
    action: 'Começar',
    support: [
      'Essa é a sua primeira vez por aqui neste navegador.',
      'Seu nome assina a sidebar, o seu perfil e tudo que você criar.',
    ],
  },
};
