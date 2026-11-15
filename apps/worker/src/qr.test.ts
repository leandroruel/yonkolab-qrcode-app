import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from './db/schema';
import { qrCodes, users } from './db/schema';
import { applySetup } from '../test/setup';

const db = drizzle(env.DB, { schema });
const API = 'https://example.com/qrcode/api';

beforeEach(async () => {
  await applySetup();
  await db.delete(qrCodes);
  await db.delete(users);
});

describe('QR API + redirect (M2/M3)', () => {
  it('cria um QR e o redirect aponta para o destino gravado', async () => {
    const res = await SELF.fetch(`${API}/v1/qr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Teste', destination: 'https://example.com/destino' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; code: string; shortUrl: string } };
    expect(body.data.code).toHaveLength(7);
    expect(body.data.shortUrl).toContain(`/q/${body.data.code}`);

    const redirect = await SELF.fetch(`https://example.com/q/${body.data.code}`, {
      redirect: 'manual',
    });
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get('location')).toBe('https://example.com/destino');
  });

  it('rejeita destino para localhost/IP privado', async () => {
    const res = await SELF.fetch(`${API}/v1/qr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Inválido', destination: 'http://localhost:3000' }),
    });
    expect(res.status).toBe(422);
  });

  it('exige nome e destino', async () => {
    const res = await SELF.fetch(`${API}/v1/qr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', destination: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('código inexistente responde 404', async () => {
    const res = await SELF.fetch('https://example.com/q/zzzzzzz', { redirect: 'manual' });
    expect(res.status).toBe(404);
  });
});
