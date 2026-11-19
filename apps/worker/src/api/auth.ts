import { API_BASE_PATH, APP_BASE_PATH } from '@yonkolab/shared';
import { Google } from 'arctic';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { Hono } from 'hono';
import { createDb } from '../db/client';
import { users } from '../db/schema';
import { fromBase64Url, randomToken, toBase64Url } from '../lib/hash';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  requireUser,
  setSessionCookie,
  SESSION_COOKIE,
} from '../lib/session';
import type { AppEnv } from '../types';

/**
 * Auth sem senha via Google (plano M1): Arctic + PKCE + state em cookie curto.
 *
 *   GET  /qrcode/api/auth/google           → 302 para o Google (state + PKCE)
 *   GET  /qrcode/api/auth/google/callback  → troca o code, cria/atualiza usuário e sessão
 *   POST /qrcode/api/auth/logout           → encerra a sessão
 *   GET  /qrcode/api/auth/me               → usuário atual
 */

const OAUTH_COOKIE = 'oauth_flow';
const OAUTH_COOKIE_MAX_AGE = 600; // 10 min
const OAUTH_COOKIE_PATH = '/qrcode/api/auth';

const GOOGLE_SCOPES = ['openid', 'profile', 'email'];

interface OAuthFlow {
  state: string;
  verifier: string;
  next?: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encodeFlow(flow: OAuthFlow): string {
  return toBase64Url(textEncoder.encode(JSON.stringify(flow)));
}

function decodeFlow(raw: string): OAuthFlow | null {
  try {
    const parsed = JSON.parse(textDecoder.decode(fromBase64Url(raw))) as Partial<OAuthFlow>;
    if (typeof parsed.state !== 'string' || typeof parsed.verifier !== 'string') return null;
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      next: typeof parsed.next === 'string' ? parsed.next : undefined,
    };
  } catch {
    return null;
  }
}

function requestOrigin(c: { req: { url: string } }): string {
  return new URL(c.req.url).origin;
}

function adminEmailSet(env: AppEnv['Bindings']): Set<string> {
  return new Set(
    env.ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function newGoogleClient(env: AppEnv['Bindings'], redirectUri: string): Google {
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);
}

export const authApp = new Hono<AppEnv>();

/** Inicia o fluxo OAuth: state + PKCE em cookie curto, 302 para o Google. */
authApp.get('/google', (c) => {
  const redirectUri = `${requestOrigin(c)}${API_BASE_PATH}/auth/google/callback`;
  const google = newGoogleClient(c.env, redirectUri);

  const state = randomToken(32);
  const verifier = randomToken(32); // ~43 chars, dentro do intervalo 43–128 do PKCE

  // Destino pós-login: só caminhos internos sob /qrcode (evita open redirect).
  const nextParam = c.req.query('next');
  const next =
    nextParam === APP_BASE_PATH || nextParam?.startsWith(`${APP_BASE_PATH}/`)
      ? nextParam
      : undefined;

  setCookie(c, OAUTH_COOKIE, encodeFlow({ state, verifier, next }), {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });

  const url = google.createAuthorizationURL(state, verifier, GOOGLE_SCOPES);
  url.searchParams.set('access_type', 'online'); // sem refresh token
  url.searchParams.set('prompt', 'select_account');
  return c.redirect(url.toString());
});

/** Callback do Google: valida state, troca code (PKCE), faz upsert do usuário, cria sessão. */
authApp.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const raw = getCookie(c, OAUTH_COOKIE);
  if (raw) {
    // Consome o cookie de fluxo em qualquer desfecho.
    deleteCookie(c, OAUTH_COOKIE, { path: OAUTH_COOKIE_PATH });
  }

  if (!code || !state || !raw) {
    return c.text('Fluxo de login inválido ou expirado. Tente novamente.', 400);
  }
  const flow = decodeFlow(raw);
  if (!flow || flow.state !== state) {
    return c.text('Estado de login inválido (possível CSRF). Tente novamente.', 400);
  }

  const redirectUri = `${requestOrigin(c)}${API_BASE_PATH}/auth/google/callback`;
  const google = newGoogleClient(c.env, redirectUri);

  let accessToken: string;
  try {
    const tokens = await google.validateAuthorizationCode(code, flow.verifier);
    accessToken = tokens.accessToken();
  } catch {
    return c.text('Não foi possível validar o login com o Google. Tente novamente.', 502);
  }

  let profile: { sub?: string; email?: string; name?: string };
  try {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return c.text('Não foi possível obter o perfil do Google.', 502);
    profile = (await res.json()) as typeof profile;
  } catch {
    return c.text('Não foi possível obter o perfil do Google.', 502);
  }

  const email = profile.email?.trim().toLowerCase();
  if (!profile.sub || !email) {
    return c.text('Sua conta Google não expõe um e-mail verificado.', 400);
  }

  const db = createDb(c.env.DB);
  const isAdmin = adminEmailSet(c.env).has(email);
  const now = Date.now();

  // Upsert por google_sub; is_admin é recalculado a cada login (env ADMIN_EMAILS é a fonte).
  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email,
      name: profile.name?.trim() || email,
      googleSub: profile.sub,
      isAdmin,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: { email, name: profile.name?.trim() || email, isAdmin },
    })
    .returning();
  if (!user) {
    return c.text('Não foi possível criar a conta.', 500);
  }

  const { token, expiresAt } = await createSession(db, user.id);
  setSessionCookie(c, token, expiresAt);

  const dest = flow.next ?? `${APP_BASE_PATH}/`;
  return c.redirect(`${requestOrigin(c)}${dest}`);
});

/** Encerra a sessão (remove do D1 e apaga o cookie). */
authApp.post('/logout', requireUser, async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await deleteSession(createDb(c.env.DB), token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

/** Usuário atual (para o SPA decidir entre login e painel). */
authApp.get('/me', requireUser, (c) => {
  const u = c.get('user');
  return c.json({ id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin });
});
