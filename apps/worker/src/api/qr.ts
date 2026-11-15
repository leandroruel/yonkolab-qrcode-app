import {
  MAX_DESTINATION_LENGTH,
  MAX_QRS_PER_USER,
  QR_CODE_ALPHABET,
  QR_CODE_LENGTH,
} from '@yonkolab/shared';
import { and, desc, eq } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { createDb } from '../db/client';
import type { Db } from '../db/client';
import { qrCodes, users } from '../db/schema';
import { getSessionUser, SESSION_COOKIE } from '../lib/session';
import { validateDestination } from '../lib/validate-destination';
import type { AppEnv, User } from '../types';

/**
 * CRUD de QR dinâmico — /qrcode/api/v1/qr
 *
 * Usuário logado (sessão) usa a própria conta; sem sessão, o QR é criado na
 * conta anônima compartilhada (o produto permite gerar sem cadastro).
 * Toda a escrita passa por Drizzle com parâmetros vinculados (sem SQL concatenado).
 */

const ANONYMOUS_USER_ID = 'anonymous';

export const qrApp = new Hono<AppEnv>();

/** Gera um código curto único (7 chars do alfabeto sem ambíguos). */
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(QR_CODE_LENGTH));
  let out = '';
  for (let i = 0; i < QR_CODE_LENGTH; i++) {
    out += QR_CODE_ALPHABET[(bytes[i] ?? 0) % QR_CODE_ALPHABET.length];
  }
  return out;
}

/** Resolve o dono do QR: sessão válida ou a conta anônima compartilhada. */
async function resolveOwner(
  c: Context<AppEnv>,
): Promise<{ db: Db; user: User; anonymous: boolean }> {
  const db = createDb(c.env.DB);
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const user = await getSessionUser(db, token);
    if (user) return { db, user, anonymous: false };
  }

  await db
    .insert(users)
    .values({
      id: ANONYMOUS_USER_ID,
      email: 'anonimo@qr.yonkolab.xyz',
      name: 'Anônimo',
      googleSub: 'anonymous',
      isAdmin: false,
      createdAt: Date.now(),
    })
    .onConflictDoNothing();

  const [user] = await db.select().from(users).where(eq(users.id, ANONYMOUS_USER_ID)).limit(1);
  if (!user) {
    throw new Error('Não foi possível resolver o usuário anônimo.');
  }
  return { db, user, anonymous: true };
}

function shortUrlFor(c: Context<AppEnv>, code: string): string {
  return `${new URL(c.req.url).origin}/q/${code}`;
}

/** GET /qrcode/api/v1/qr — lista os QR codes do usuário atual. */
qrApp.get('/', async (c) => {
  const { db, user } = await resolveOwner(c);
  const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(c.req.query('limit') ?? '20', 10) || 20));

  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.userId, user.id))
    .orderBy(desc(qrCodes.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const all = await db.select({ id: qrCodes.id }).from(qrCodes).where(eq(qrCodes.userId, user.id));
  const total = all.length;

  return c.json({
    data: rows.map((row) => ({ ...row, shortUrl: shortUrlFor(c, row.code) })),
    total,
    page,
    lastPage: Math.max(1, Math.ceil(total / limit)),
  });
});

/** POST /qrcode/api/v1/qr — cria um QR code dinâmico. */
qrApp.post('/', async (c) => {
  const { db, user, anonymous } = await resolveOwner(c);

  const body = await c.req.json<{ name?: string; destination?: string }>().catch(() => null);
  const name = body?.name?.trim();
  const destination = body?.destination?.trim();

  if (!name) return c.json({ error: 'Informe um nome para o QR code.' }, 400);
  if (name.length > 80) return c.json({ error: 'O nome deve ter no máximo 80 caracteres.' }, 400);
  if (!destination) return c.json({ error: 'Informe o destino (URL).' }, 400);
  if (destination.length > MAX_DESTINATION_LENGTH) {
    return c.json(
      { error: `O destino deve ter no máximo ${MAX_DESTINATION_LENGTH} caracteres.` },
      422,
    );
  }

  const validation = await validateDestination(c.env.DB, destination, 'qr.yonkolab.xyz');
  if (!validation.valid) {
    return c.json({ error: validation.reason ?? 'Destino inválido.' }, 422);
  }

  if (!anonymous) {
    const own = await db
      .select({ id: qrCodes.id })
      .from(qrCodes)
      .where(eq(qrCodes.userId, user.id));
    if (own.length >= MAX_QRS_PER_USER) {
      return c.json({ error: `Limite de ${MAX_QRS_PER_USER} QR codes dinâmicos por conta.` }, 403);
    }
  }

  let code = '';
  for (let attempt = 0; attempt < 10 && !code; attempt++) {
    const candidate = randomCode();
    const [existing] = await db
      .select({ id: qrCodes.id })
      .from(qrCodes)
      .where(eq(qrCodes.code, candidate))
      .limit(1);
    if (!existing) code = candidate;
  }
  if (!code) {
    return c.json({ error: 'Não foi possível gerar um código único. Tente novamente.' }, 500);
  }

  const now = Date.now();
  const [created] = await db
    .insert(qrCodes)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      code,
      name,
      destination,
      status: 'active',
      startsAt: null,
      expiresAt: null,
      style: '{}',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) return c.json({ error: 'Não foi possível criar o QR code.' }, 500);

  return c.json({ data: { ...created, shortUrl: shortUrlFor(c, created.code) } }, 201);
});

/** GET /qrcode/api/v1/qr/:id — detalhe de um QR code. */
qrApp.get('/:id', async (c) => {
  const { db, user } = await resolveOwner(c);
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, c.req.param('id')), eq(qrCodes.userId, user.id)))
    .limit(1);

  if (!qr) return c.json({ error: 'QR code não encontrado.' }, 404);
  return c.json({ data: { ...qr, shortUrl: shortUrlFor(c, qr.code) } });
});

/** PATCH /qrcode/api/v1/qr/:id — atualiza nome/destino/status. */
qrApp.patch('/:id', async (c) => {
  const { db, user } = await resolveOwner(c);
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, user.id)))
    .limit(1);
  if (!existing) return c.json({ error: 'QR code não encontrado.' }, 404);

  const body = await c.req
    .json<{ name?: string; destination?: string; status?: 'active' | 'paused' | 'expired' }>()
    .catch(() => null);

  const name = body?.name?.trim() ?? existing.name;
  const destination = body?.destination?.trim() ?? existing.destination;
  const status = body?.status ?? existing.status;

  if (!name) return c.json({ error: 'Informe um nome para o QR code.' }, 400);
  if (name.length > 80) return c.json({ error: 'O nome deve ter no máximo 80 caracteres.' }, 400);

  if (destination !== existing.destination) {
    if (destination.length > MAX_DESTINATION_LENGTH) {
      return c.json(
        { error: `O destino deve ter no máximo ${MAX_DESTINATION_LENGTH} caracteres.` },
        422,
      );
    }
    const validation = await validateDestination(c.env.DB, destination, 'qr.yonkolab.xyz');
    if (!validation.valid) {
      return c.json({ error: validation.reason ?? 'Destino inválido.' }, 422);
    }
  }

  if (!['active', 'paused', 'expired'].includes(status)) {
    return c.json({ error: 'Status inválido.' }, 400);
  }

  const [updated] = await db
    .update(qrCodes)
    .set({ name, destination, status, updatedAt: Date.now() })
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, user.id)))
    .returning();

  return c.json({ data: updated ? { ...updated, shortUrl: shortUrlFor(c, updated.code) } : null });
});

/** DELETE /qrcode/api/v1/qr/:id — remove um QR code. */
qrApp.delete('/:id', async (c) => {
  const { db, user } = await resolveOwner(c);
  const [deleted] = await db
    .delete(qrCodes)
    .where(and(eq(qrCodes.id, c.req.param('id')), eq(qrCodes.userId, user.id)))
    .returning({ id: qrCodes.id });

  if (!deleted) return c.json({ error: 'QR code não encontrado.' }, 404);
  return c.json({ success: true });
});
