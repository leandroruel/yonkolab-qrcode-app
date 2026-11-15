import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Mesmo base_path configurado em apps/worker/wrangler.jsonc (assets.base_path).
  base: '/qrcode/',
  plugins: [react(), tailwindcss()],
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
