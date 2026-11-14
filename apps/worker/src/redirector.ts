import { Hono } from 'hono';
import type { AppEnv } from './types';

/**
 * Hot path de redirect: GET /q/:code
 *
 * M0: apenas healthcheck. A lógica completa (lookup D1 → 302, páginas de estado,
 * ScanSink sem escrita em D1) chega em M3 — ver plano, seção 7/M3.
 */
export const redirectorApp = new Hono<AppEnv>();

redirectorApp.get('/healthcheck', (c) =>
  c.json({ ok: true, service: 'redirector', ts: Date.now() }),
);
