import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from './db/schema';
import { sessions, users } from './db/schema';
import type { User } from './types';
import { randomToken, sha256Hex } from './lib/hash';
import { applySetup } from '../test/setup';

const db = drizzle(env.DB, { schema });

beforeEach(async () => {
  await applySetup();
  await db.delete(sessions);
  await db.delete(users);
});

describe('Auth flow (M1)', () => {
  describe('GET /qrcode/api/auth/google (início do fluxo)', () => {
    it('302 para o Google com state + PKCE e cookie de fluxo curto', async () => {
      const res = await SELF.fetch(`${API}/auth/google`, { redirect: 'manual' });
      expect(res.status).toBe(302);

      const url = new URL(res.headers.get('location')!);
      expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')!).toContain('openid');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('state')!.length).toBeGreaterThanOrEqual(43);

      const cookie = res.headers.get('set-cookie')!;
      expect(cookie).toContain('oauth_flow=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/qrcode/api/auth');
      expect(cookie).toContain('Max-Age=600');
    });
  });

  describe('GET /qrcode/api/auth/google/callback', () => {
    // O fluxo completo Google → token → userinfo requer integração real com a conta Google.
    // Aqui testamos apenas o validade do state e o encaminhamento.

    it('state divergente → 400 (CSRF)', async () => {
      const cb = await SELF.fetch(`${API}/auth/google/callback?code=abc&state=tampered`, {
        headers: { cookie: 'oauth_flow=AAAA' },
        redirect: 'manual',
      });
      expect(cb.status).toBe(400);
    });

    it('callback sem cookie de fluxo → 400', async () => {
      const cb = await SELF.fetch(`${API}/auth/google/callback?code=abc&state=x`, { redirect: 'manual' });
      expect(cb.status).toBe(400);
    });
  });

  describe('rotas protegidas', () => {
    it('GET /me sem sessão → 401', async () => {
      const res = await SELF.fetch(`${API}/auth/me`);
      expect(res.status).toBe(401);
    });

    it('POST /logout sem sessão → 401', async () => {
      const res = await SELF.fetch(`${API}/auth/logout`, { method: 'POST' });
      expect(res.status).toBe(401);
    });

    it('sessão expirada → 401 e removida do banco', async () => {
      const user = await seedUser();
      const token = randomToken();
      await insertSession(token, user.id, Date.now() - 1000);

      const res = await SELF.fetch(`${API}/auth/me`, { headers: { cookie: `session=${token}` } });
      expect(res.status).toBe(401);
      expect(await db.select().from(sessions)).toHaveLength(0);
    });
  });

  describe('POST /qrcode/api/auth/logout', () => {
    it('encerra a sessão, remove do banco e limpa o cookie', async () => {
      const user = await seedUser();
      const token = randomToken();
      await insertSession(token, user.id, Date.now() + 3_600_000);

      const res = await SELF.fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { cookie: `session=${token}` },
      });
      expect(res.status).toBe(200);
      expect(await db.select().from(sessions)).toHaveLength(0);
      expect(res.headers.get('set-cookie')).toContain('session=');
    });
  });
});

/* utilitários inline */
const ORIGIN = 'https://example.com';
const API = `${ORIGIN}/qrcode/api`;

async function seedUser(partial?: Partial<User>): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: 'seed@example.com',
      name: 'Seed',
      googleSub: `sub-${crypto.randomUUID()}`,
      isAdmin: false,
      createdAt: Date.now(),
      ...partial,
    })
    .returning();
  return user!;
}

async function insertSession(token: string, userId: string, expiresAt: number) {
  await db.insert(sessions).values({ id: await sha256Hex(token), userId, expiresAt });
}