import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import CreatePage from './pages/CreatePage';
import GeneratorPage from './pages/GeneratorPage';
import HomePage from './pages/HomePage';
import './index.css';

// Mesmo base do Vite (vite.config.ts) e do assets.base_path do Worker.
const APP_BASE_PATH = '/qrcode';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'generator', element: <GeneratorPage /> },
        { path: 'create', element: <CreatePage /> },
      ],
    },
  ],
  { basename: APP_BASE_PATH },
);

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
