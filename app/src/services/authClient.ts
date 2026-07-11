export async function checkAuthStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) return false;
    const data = (await res.json()) as { authenticated?: boolean };
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) return;
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new Error(data?.error ?? 'Não consegui entrar. Tenta de novo em instantes.');
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}
