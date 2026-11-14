import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Modelo de dados (plano, seção 6). Timestamps em epoch ms.
 * Eventos de scan NÃO ficam no D1 — vão para o Analytics Engine (M5).
 */

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  googleSub: text('google_sub').notNull().unique(),
  /** 0/1 — promovido via env ADMIN_EMAILS no primeiro login (M1). */
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

/** id = SHA-256 do token; o token em claro só existe no cookie do usuário. */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('sessions_expires_at_idx').on(t.expiresAt)],
);

export const qrCodes = sqliteTable(
  'qr_codes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Código curto (7 chars, QR_CODE_ALPHABET) — único. */
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    destination: text('destination').notNull(),
    /** 'expired' também é derivado de expires_at no redirect; ver M3. */
    status: text('status', { enum: ['active', 'paused', 'expired'] })
      .notNull()
      .default('active'),
    startsAt: integer('starts_at'),
    expiresAt: integer('expires_at'),
    /** JSON com estilo do QR (cores, cantos, logo como data URL ≤ 100 KB). */
    style: text('style'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('qr_codes_user_created_idx').on(t.userId, t.createdAt)],
);

export const abuseReports = sqliteTable(
  'abuse_reports',
  {
    id: text('id').primaryKey(),
    qrId: text('qr_id')
      .notNull()
      .references(() => qrCodes.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    contact: text('contact'),
    status: text('status', { enum: ['open', 'reviewed', 'actioned'] })
      .notNull()
      .default('open'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('abuse_reports_status_idx').on(t.status)],
);

export const blockedHosts = sqliteTable('blocked_hosts', {
  host: text('host').primaryKey(),
  reason: text('reason').notNull(),
  createdAt: integer('created_at').notNull(),
});
