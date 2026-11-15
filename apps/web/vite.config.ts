import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PluginOption } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// No dev, o `base` é '/qrcode/'. Quem abrir http://localhost:5173/ (raiz) recebe
// um aviso do Vite ("did you mean to visit /qrcode/ instead?"). Este plugin faz
// redirect automático da raiz para /qrcode/ para melhorar a UX de desenvolvimento.
const rootRedirectPlugin = (): PluginOption => ({
  name: 'yonkolab:root-redirect',
  configureServer(server) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/' || req.url === '') {
        res.writeHead(302, { Location: '/qrcode/' });
        res.end();
        return;
      }
      next();
    });
  },
});

export default defineConfig({
  // Mesmo base_path configurado em apps/worker/wrangler.jsonc (assets.base_path).
  base: '/qrcode/',
  plugins: [react(), tailwindcss(), rootRedirectPlugin()],
  resolve: {
    alias: { '@': path.resolve(r('./src')) },
  },
  server: {
    port: 5173,
    proxy: {
      // No dev, API e redirector rodam no wrangler dev (:8787).
      '/qrcode/api': 'http://localhost:8787',
      // Apenas /q/<codigo>: o prefixo solto "/q" casaria com "/qrcode" e
      // mandaria a SPA para o Worker (servindo dist antigo em vez do fonte).
      '^/q/': 'http://localhost:8787',
    },
  },
});
