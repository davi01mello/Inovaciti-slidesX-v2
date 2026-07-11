import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/pages/HomePage';
import { PresentationsPage } from '@/pages/PresentationsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { MarcaPage } from '@/pages/MarcaPage';
import { PerfilPage } from '@/pages/PerfilPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { LixeiraPage } from '@/pages/LixeiraPage';
import { NovaPresentacaoPage } from '@/pages/NovaPresentacaoPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { PresentPage } from '@/pages/PresentPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ToastHost } from '@/components/workspace/ToastHost';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

/** Rotas que vivem dentro do shell (sidebar + topbar). */
const SHELL_ROUTES: { path: string; element: React.ReactNode }[] = [
  { path: '/', element: <HomePage /> },
  { path: '/apresentacoes', element: <PresentationsPage /> },
  { path: '/templates', element: <TemplatesPage /> },
  { path: '/marca', element: <MarcaPage /> },
  { path: '/perfil', element: <PerfilPage /> },
  { path: '/configuracoes', element: <ConfiguracoesPage /> },
  { path: '/lixeira', element: <LixeiraPage /> },
];

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          {SHELL_ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={<AppShell>{route.element}</AppShell>} />
          ))}

          <Route path="/nova" element={<NovaPresentacaoPage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
          <Route path="/apresentar/:id" element={<PresentPage />} />

          <Route
            path="*"
            element={
              <AppShell>
                <NotFoundPage />
              </AppShell>
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      {/* Overlays globais: o tour de onboarding cobre tudo, os toasts ficam por cima. */}
      <OnboardingTour />
      <ToastHost />
    </BrowserRouter>
  );
}
