import { StrictMode, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App';
import AppShell from './components/AppShell';
import LandingPage from './pages/Landing';
import './index.css';

// Rotas internas em chunk próprio: a landing não paga o custo do gerador nem do QR lib.
const GeneratorPage = lazy(() => import('./pages/GeneratorPage'));
const CreatePage = lazy(() => import('./pages/CreatePage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const MeusQrsPage = lazy(() => import('./pages/MeusQrsPage'));

// Mesmo base do Vite (vite.config.ts) e do assets.base_path do Worker.
const APP_BASE_PATH = '/qrcode';

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-sm subtle" role="status">
      Carregando…
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </AppShell>
  );
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: 'criar', element: <Shell><GeneratorPage /></Shell> },
        { path: 'meus-qrs', element: <Shell><MeusQrsPage /></Shell> },
        { path: 'status', element: <Shell><StatusPage /></Shell> },
        // Rotas legadas mantidas por compatibilidade.
        { path: 'generator', element: <Navigate to="/criar" replace /> },
        { path: 'create', element: <Shell><CreatePage /></Shell> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: APP_BASE_PATH },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
