import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authApp } from './auth';
import { qrApp } from './qr';

/** API do painel: /qrcode/api/*. Todas as rotas de negócio exigem sessão (M2+). */
export const apiApp = new Hono<AppEnv>();

apiApp.get('/health', (c) => c.json({ ok: true, service: 'yonkolab-qrcode-api', ts: Date.now() }));

apiApp.route('/auth', authApp);
apiApp.route('/v1/qr', qrApp);
