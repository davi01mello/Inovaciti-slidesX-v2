import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

// Grain SVG (feTurbulence) a 4%: dá textura de material ao fundo, atrás de tudo.
const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-app-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{ backgroundImage: GRAIN_DATA_URI }}
      />
      <Sidebar />
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="flex max-w-[1600px] flex-col gap-6 p-8">{children}</div>
      </main>
    </div>
  );
}
