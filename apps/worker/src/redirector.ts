import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from './db/client';
import { qrCodes } from './db/schema';
import type { AppEnv } from './types';

/**
 * Hot path de redirect: GET /q/:code
 *
 * Lookup no D1 → 302 para o destino gravado. Estados não ativos respondem com
 * uma página curta (410). O evento de scan é enviado ao Analytics Engine em
 * try/catch e nunca afeta o redirect.
 */
export const redirectorApp = new Hono<AppEnv>();

redirectorApp.get('/healthcheck', (c) =>
  c.json({ ok: true, service: 'redirector', ts: Date.now() }),
);

function statusPage(title: string, message: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" /><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fafafa;color:#171717}main{max-width:24rem;padding:2rem;text-align:center}h1{font-size:1.25rem;margin:0 0 .5rem}p{margin:0;color:#525252}</style>
</head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`;
}

redirectorApp.get('/:code', async (c) => {
  const code = c.req.param('code');

  const db = createDb(c.env.DB);
  const [qr] = await db
    .select({
      id: qrCodes.id,
      destination: qrCodes.destination,
      status: qrCodes.status,
      startsAt: qrCodes.startsAt,
      expiresAt: qrCodes.expiresAt,
    })
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (!qr) {
    return c.notFound();
  }

  const now = Date.now();
  const expired =
    qr.status === 'expired' || (qr.expiresAt !== null && qr.expiresAt > 0 && qr.expiresAt < now);
  const notStarted = qr.startsAt !== null && qr.startsAt > now;

  if (expired) {
    return c.html(statusPage('QR code expirado', 'Este QR code não está mais ativo.'), 410);
  }
  if (qr.status === 'paused') {
    return c.html(
      statusPage('QR code pausado', 'Este QR code está temporariamente indisponível.'),
      410,
    );
  }
  if (notStarted) {
    return c.html(statusPage('QR code indisponível', 'Este QR code ainda não está ativo.'), 404);
  }

  // Evento de scan (fire and forget — nunca quebra o redirect).
  try {
    if (c.env.SCANS) {
      const ua = (c.req.header('user-agent') ?? '').toLowerCase();
      let device = 'desktop';
      if (/mobile|iphone|android/.test(ua)) device = 'mobile';
      else if (/tablet|ipad/.test(ua)) device = 'tablet';

      let os = 'unknown';
      if (/windows/.test(ua)) os = 'windows';
      else if (/macintosh|mac os/.test(ua)) os = 'macos';
      else if (/android/.test(ua)) os = 'android';
      else if (/iphone|ipad|ios/.test(ua)) os = 'ios';
      else if (/linux/.test(ua)) os = 'linux';

      let browser = 'unknown';
      if (/edg\//.test(ua)) browser = 'edge';
      else if (/chrome|crios/.test(ua)) browser = 'chrome';
      else if (/firefox|fxios/.test(ua)) browser = 'firefox';
      else if (/safari/.test(ua)) browser = 'safari';

      c.env.SCANS.writeDataPoint({
        indexes: [code],
        blobs: [qr.id, c.req.header('cf-ipcountry') ?? 'unknown', device, os, browser],
        doubles: [1],
      });
    }
  } catch {
    // Ignorado de propósito: telemetria não pode afetar o redirect.
  }

  c.header('Cache-Control', 'no-store');
  return c.redirect(qr.destination, 302);
});
