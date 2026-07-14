/**
 * O portão: nada do CITi Slides monta antes de passar por aqui.
 *
 *   checking   a sessão está sendo verificada. A tela JÁ mostra o fundo (o plano B
 *              do backdrop, mesmos pixels que o palco vai desenhar em seguida), em
 *              vez do vazio preto que existia antes. Como é a mesma imagem, montar
 *              o palco depois não pisca: o que estava na tela continua lá.
 *   auth       a tela de login está no ar e o app NÃO existe ainda (nenhuma rota,
 *              nenhum store de apresentação carregado).
 *   launching  login aceito: o app monta ATRÁS da cortina, que ainda cobre tudo e
 *              está rodando a transição. Quando ela dissolve, o que aparece já
 *              está pronto. É isso que faz a entrada não ter tela de carregando.
 *   ready      a cortina saiu; o app fica sozinho.
 *
 * A pergunta do nome não é um modal: é o último passo do mesmo campo único. Por
 * isso ela também aparece pra quem tem sessão válida mas ainda não tem perfil neste
 * navegador. Nesse caso o fluxo é só ['name'], e a transição roda igual.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { checkAuthStatus } from '@/services/authClient';
import { hasSavedProfile } from '@/stores/userStore';
import { AuthStage } from './AuthStage';
import { StaticBackdrop } from './BackdropBase';
import type { AuthStepId } from './authSteps';

type Phase = 'checking' | 'auth' | 'launching' | 'ready';

interface LoginGateProps {
  children: ReactNode;
}

export function LoginGate({ children }: LoginGateProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [steps, setSteps] = useState<AuthStepId[]>([]);

  useEffect(() => {
    let cancelled = false;

    void checkAuthStatus().then((authenticated) => {
      if (cancelled) return;

      const needsName = !hasSavedProfile();

      // Sessão válida e perfil salvo: não há nada a perguntar. Entra direto, sem
      // cortina, porque a transição é pra quem acabou de entrar, não pra quem deu F5.
      if (authenticated && !needsName) {
        setPhase('ready');
        return;
      }

      if (authenticated) setSteps(['name']);
      else setSteps(needsName ? ['username', 'password', 'name'] : ['username', 'password']);
      setPhase('auth');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // A checagem é uma ida rápida ao servidor, mas "rápida" não é "instantânea": sem
  // isto a primeira coisa que a pessoa via ao recarregar era um retângulo preto.
  if (phase === 'checking') {
    return (
      <div className="fixed inset-0 z-[200] overflow-hidden bg-[#050607]">
        <StaticBackdrop />
      </div>
    );
  }

  return (
    <>
      {phase !== 'auth' && children}

      {phase !== 'ready' && (
        <AuthStage
          steps={steps}
          onAuthenticated={() => setPhase('launching')}
          onRevealed={() => setPhase('ready')}
        />
      )}
    </>
  );
}
