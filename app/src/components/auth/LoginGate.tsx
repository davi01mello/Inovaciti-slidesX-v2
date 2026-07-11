/**
 * Gate de login compartilhado: cobre o app inteiro. Enquanto checa o status
 * (`checking`), não mostra nada pra evitar flash da tela de login. Autenticado,
 * renderiza os filhos normalmente -- exceto se ainda não há perfil salvo neste
 * navegador, caso em que mostra o NamePromptModal por cima antes de liberar.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { checkAuthStatus, login } from '@/services/authClient';
import { hasSavedProfile } from '@/stores/userStore';
import { Icon } from '@/components/ui/Icon';
import { NamePromptModal } from './NamePromptModal';

type Status = 'checking' | 'unauthenticated' | 'authenticated';

interface LoginGateProps {
  children: ReactNode;
}

export function LoginGate({ children }: LoginGateProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsName, setNeedsName] = useState(false);

  useEffect(() => {
    checkAuthStatus().then((ok) => {
      if (ok) {
        setNeedsName(!hasSavedProfile());
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      setNeedsName(!hasSavedProfile());
      setStatus('authenticated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui entrar. Tenta de novo em instantes.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'checking') return null;

  if (status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <form
          onSubmit={handleSubmit}
          className="glass-deep w-full max-w-[360px] animate-dialog-in rounded-2xl p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Icon name="lock" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-ink">CITi Slides</h1>
              <p className="m-0 text-[12.5px] text-ink-muted">Acesso restrito à equipe</p>
            </div>
          </div>

          <label className="mb-1 block text-[12.5px] text-ink-secondary" htmlFor="login-username">
            Usuário
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mb-3 w-full rounded-control border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-brand/40"
          />

          <label className="mb-1 block text-[12.5px] text-ink-secondary" htmlFor="login-password">
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mb-4 w-full rounded-control border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-brand/40"
          />

          {error && <p className="mb-3 text-[12.5px] text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password.trim()}
            className="w-full rounded-control bg-gradient-to-b from-[#36E66A] to-brand px-4 py-2.5 text-[13.5px] font-semibold text-[#0A1210] shadow-[0_8px_20px_-8px_rgba(45,219,96,0.5)] transition-all duration-150 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {children}
      {needsName && <NamePromptModal onDone={() => setNeedsName(false)} />}
    </>
  );
}
