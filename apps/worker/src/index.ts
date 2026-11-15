import { APP_BASE_PATH } from '@yonkolab/shared';
import { Hono } from 'hono';
import { apiApp } from './api';
import { redirectorApp } from './redirector';
import type { AppEnv } from './types';

/**
 * Entry do Worker.
 *
 * Em produção, o roteamento do zone (yonkolab.xyz) manda para cá apenas:
 *   - /qrcode*  → SPA (servido por assets, sem invocar este código) + /qrcode/api/* (aqui)
 *   - /q/*      → redirector (aqui)
 *   - /favicon.ico na raiz do host → ícone do app
 *
 * `run_worker_first` garante que API e redirector chegam ao Worker antes do asset matching;
 * todo o resto casa com assets ou cai no fallback abaixo.
 */
const app = new Hono<AppEnv>();

// Browsers pedem /favicon.ico na raiz do host por padrão; aponta para o ícone do app.
app.get('/favicon.ico', (c) => c.redirect(`${APP_BASE_PATH}/favicon.svg`, 301));

app.route('/q', redirectorApp);
app.route('/qrcode/api', apiApp);

// Fallback: requests não-navegação (fetch/XHR) que não casaram com asset algum.
// Navegações já são servidas pelo fallback SPA dos assets (compat date ≥ 2025-04-01).
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
