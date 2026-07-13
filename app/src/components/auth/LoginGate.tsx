/**
 * O portão: nada do CITi Slides monta antes de passar por aqui.
 *
 *   checking   silêncio — a sessão está sendo verificada. Não pisca tela de login
 *              pra quem já está logado.
 *   auth       a tela de login está no ar e o app NÃO existe ainda (nenhuma rota,
 *              nenhum store de apresentação carregado).
 *   launching  login aceito: o app monta ATRÁS da cortina, que ainda cobre tudo e
 *              está rodando a transição. Quando ela dissolve, o que aparece já
 *              está pronto — é isso que faz a entrada não ter tela de carregando.
 *   ready      a cortina saiu; o app fica sozinho.
 *
 * A pergunta do nome não é um modal: é o último passo do mesmo campo único. Por
 * isso ela também aparece pra quem tem sessão válida mas ainda não tem perfil neste
 * navegador — nesse caso o fluxo é só ['name'], e a transição roda igual.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { checkAuthStatus } from '@/services/authClient';
import { hasSavedProfile } from '@/stores/userStore';
import { AuthStage } from './AuthStage';
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
      // cortina — a transição é pra quem acabou de entrar, não pra quem só deu F5.
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

  if (phase === 'checking') return null;

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
