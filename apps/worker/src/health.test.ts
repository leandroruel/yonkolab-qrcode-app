import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('health (M0)', () => {
  it('GET /qrcode/api/health responde 200', async () => {
    const res = await SELF.fetch('https://example.com/qrcode/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('yonkolab-qrcode-api');
  });

  it('GET /q/healthcheck responde 200', async () => {
    const res = await SELF.fetch('https://example.com/q/healthcheck');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('redirector');
  });
});
