import { Hono } from 'hono';
import type { AppEnv } from '../types';

/** API do painel: /qrcode/api/*. Sub-rotas por domínio chegam nos próximos milestones. */
export const apiApp = new Hono<AppEnv>();

apiApp.get('/health', (c) =>
  c.json({ ok: true, service: 'yonkolab-qrcode-api', ts: Date.now() }),
);
