import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-border-subtle bg-white/5 px-1.5 py-0.5 font-sans text-[10.5px] text-ink-muted">
      {children}
    </kbd>
  );
}
