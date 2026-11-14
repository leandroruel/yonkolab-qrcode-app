import { SESSION_TTL_DAYS } from '@yonkolab/shared';
import { and, eq, gt } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { createDb } from '../db/client';
import { sessions, users } from '../db/schema';
import type { AppEnv, User } from '../types';
import { randomToken, sha256Hex } from './hash';

/**
 * Sessão própria (plano M1.2): token aleatório de 32 bytes no cookie;
 * só o SHA-256 do token é persistido. Cookie httpOnly; Secure; SameSite=Lax; Path=/.
 */

export const SESSION_COOKIE = 'session';

const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export type { User };

export interface CreatedSession {
  token: string;
  expiresAt: number;
}

export async function createSession(db: ReturnType<typeof createDb>, userId: string): Promise<CreatedSession> {
  const token = randomToken(32);
  const id = await sha256Hex(token);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { token, expiresAt };
}

/** Resolve o usuário a partir do token do cookie. Sessão expirada é removida (lazy cleanup). */
export async function getSessionUser(db: ReturnType<typeof createDb>, token: string): Promise<User | null> {
  const id = await sha256Hex(token);
  const now = Date.now();
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    // Expirada ou inexistente: remove (se existir) e nega.
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return row.user;
}

export async function deleteSession(db: ReturnType<typeof createDb>, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
}

export function setSessionCookie(c: Parameters<typeof setCookie>[0], token: string, expiresAt: number): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(c: Parameters<typeof deleteCookie>[0]): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

/** Middleware de proteção: popula c.var.user ou responde 401. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const user = await getSessionUser(createDb(c.env.DB), token);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
});
