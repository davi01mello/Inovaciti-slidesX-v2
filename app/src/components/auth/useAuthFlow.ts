/**
 * Máquina de estados do campo único. "Avançar" significa uma coisa diferente em
 * cada passo, e é só aqui que essa diferença existe:
 *
 * - usuário: validação local, não toca a rede;
 * - senha:   é AQUI que o login de verdade acontece (authClient.login → cookie de sessão);
 * - nome:    grava o perfil local (userStore), também sem rede.
 *
 * Erro nunca derruba o passo nem limpa o campo: a pessoa continua onde estava, com
 * a mensagem ao lado. `errorNonce` incrementa a cada erro pro campo poder dar o
 * tranco de novo mesmo quando o erro é idêntico ao anterior.
 */
import { useCallback, useState } from 'react';
import { login } from '@/services/authClient';
import { DEFAULT_PROFILE, userStore } from '@/stores/userStore';
import { AUTH_STEPS, type AuthStep, type AuthStepId } from './authSteps';

const GENERIC_ERROR = 'Não consegui entrar. Tenta de novo em instantes.';

type Values = Record<AuthStepId, string>;

const EMPTY_VALUES: Values = { username: '', password: '', name: '' };

export interface AuthFlow {
  step: AuthStep;
  /** Posição do passo atual e total: alimenta os pontinhos de progresso. */
  index: number;
  total: number;
  value: string;
  setValue: (value: string) => void;
  submit: () => void;
  submitting: boolean;
  error: string | null;
  errorNonce: number;
  /** Voltar só existe onde faz sentido: da senha pro usuário. Autenticado, não dá mais. */
  canGoBack: boolean;
  back: () => void;
}

/**
 * Senha não se apara (espaço pode ser caractere válido); usuário e nome, sim.
 * O que sai daqui é o valor que de fato vai ser usado.
 */
function normalize(stepId: AuthStepId, value: string): string {
  return stepId === 'password' ? value : value.trim();
}

/**
 * O nome que a saudação da transição vai usar: o que a pessoa acabou de digitar
 * ou, pra quem já tinha perfil, o nome salvo. Perfil genérico ("Equipe CITi") não
 * vira saudação pessoal — nesse caso devolve vazio e a transição diz só "Bem-vindo
 * de volta".
 */
function resolveDisplayName(values: Values, steps: AuthStepId[]): string {
  if (steps.includes('name')) return values.name.trim();
  const saved = userStore.getState().name;
  return saved === DEFAULT_PROFILE.name ? '' : saved;
}

export function useAuthFlow(steps: AuthStepId[], onComplete: (displayName: string) => void): AuthFlow {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // `steps` nunca é vazio (o LoginGate só monta a tela quando há o que perguntar),
  // mas o fallback mantém o tipo honesto sob noUncheckedIndexedAccess.
  const stepId: AuthStepId = steps[index] ?? 'username';
  const step = AUTH_STEPS[stepId];

  const setValue = useCallback(
    (next: string) => {
      setValues((current) => ({ ...current, [stepId]: next }));
      // O erro some assim que a pessoa reage — deixar a mensagem velha na tela
      // enquanto o campo já mudou é ruído.
      setError(null);
    },
    [stepId],
  );

  const fail = useCallback((message: string) => {
    setError(message);
    setErrorNonce((nonce) => nonce + 1);
  }, []);

  const submit = useCallback(async () => {
    if (submitting) return;

    const value = normalize(stepId, values[stepId]);
    if (!value) return;

    if (stepId === 'password') {
      setSubmitting(true);
      try {
        await login(values.username.trim(), value);
      } catch (err) {
        fail(err instanceof Error ? err.message : GENERIC_ERROR);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    if (stepId === 'name') {
      userStore.update({ name: value });
    }

    const isLast = index === steps.length - 1;
    if (isLast) {
      onComplete(resolveDisplayName({ ...values, [stepId]: value }, steps));
      return;
    }
    setError(null);
    setIndex(index + 1);
  }, [fail, index, onComplete, stepId, steps, submitting, values]);

  const canGoBack = index > 0 && stepId === 'password';

  const back = useCallback(() => {
    if (!canGoBack || submitting) return;
    setError(null);
    setIndex((current) => current - 1);
  }, [canGoBack, submitting]);

  return {
    step,
    index,
    total: steps.length,
    value: values[stepId],
    setValue,
    submit: () => void submit(),
    submitting,
    error,
    errorNonce,
    canGoBack,
    back,
  };
}
