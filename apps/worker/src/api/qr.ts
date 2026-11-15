import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { API_BASE_PATH, SHORT_PATH_PREFIX, QR_CODE_ALPHABET, QR_CODE_LENGTH, MAX_QRS_PER_USER, MAX_DESTINATION_LENGTH } from '@yonkolab/shared';
import { validateDestination } from '../lib/validate-destination';

const router = new Hono<AppEnv>();

/** GET /qrcode/api/v1/qr - List user's QR codes (paginated) */
router.get('/', async (c) => {
  const user = c.get('user') as unknown as { id: string };

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const db: any = c.env.DB;

  const [rows] = await db.exec(`SELECT id, code, name, destination, status, starts_at, expires_at, created_at FROM qr_codes WHERE user_id = ${user.id} ORDER BY created_at LIMIT ${limit} OFFSET ${offset}`) as any[];

  const [[{ count = 0 }]] = await db.exec(`SELECT COUNT(*) as count FROM qr_codes WHERE user_id = ${user.id}`) as any;

  return c.json({
    data: rows,
    total: count,
    page,
    lastPage: Math.ceil(count / limit),
  });
});

/** POST /qrcode/api/v1/qr - Create new QR code */
router.post('/', async (c) => {
  const user = c.get('user') as unknown as { id: string };
  const body = await c.req.json<{ name: string; destination: string; status?: string; starts_at?: number; expires_at?: number }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: 'Name is required' }, 400);
  }

  const destValidation = await validateDestination(c.env.DB, body.destination, 'yonkolab.xyz');
  if (!destValidation.valid) {
    return c.json({ error: destValidation.reason }, 422);
  }

  const row: any = await c.env.DB.exec(`SELECT COUNT(*) as count FROM qr_codes WHERE user_id = ${user.id}`) as any;
  const count: number = row[0] != null ? Number(row[0].count) : 0;

  if (count >= MAX_QRS_PER_USER) {
    return c.json({ error: `Maximum of ${MAX_QRS_PER_USER} dynamic QR codes per user` }, 403);
  }

  const alphabet = QR_CODE_ALPHABET;
  const length = QR_CODE_LENGTH;
  let code: string = '';
  let codeExists = true;

  while (codeExists) {
    code = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % alphabet.length;
      code += alphabet[randomIndex];
    }
    const [[{ id = undefined }]] = await c.env.DB.exec(`SELECT id FROM qr_codes WHERE code = ${code}`) as any;
    codeExists = id !== undefined;
  }

  const now = Date.now();
  const startsAt = body.starts_at ?? null;
  const expires_at = body.expires_at ?? null;
  const status = body.status ?? 'active';

  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => c === 'x' ? (Math.random() * 16 | 0).toString(16) : (c & 0x3 | 0x8).toString(16));

  await c.env.DB.exec(`INSERT INTO qr_codes (id, user_id, code, name, destination, status, starts_at, expires_at, style, created_at, updated_at) VALUES ('${uuid}', ${user.id}, ${code}, '${body.name.trim()}', ${body.destination}, ${status}, ${startsAt}, ${expires_at}, '{}', ${now}, ${now}`);

  const [[created]] = await c.env.DB.exec(`SELECT id, code, name, destination, status, starts_at, expires_at FROM qr_codes WHERE code = ${code}`) as any;

  return c.json({ data: created }, 201);
});

/** GET /qrcode/api/v1/qr/:id - Get single QR code */
router.get('/:id', async (c) => {
  const user = c.get('user') as unknown as { id: string };

  const [[qr]] = await c.env.DB.exec(`SELECT id, code, name, destination, status, starts_at, expires_at, style, created_at, updated_at FROM qr_codes WHERE id = ${c.req.param('id')} AND user_id = ${user.id}`) as any;

  if (!qr) {
    return c.json({ error: 'QR code not found' }, 404);
  }

  return c.json({ data: qr });
});

/** PATCH /qrcode/api/v1/qr/:id - Update QR code */
router.patch('/:id', async (c) => {
  const user = c.get('user') as unknown as { id: string };
  const body = await c.req.json<{ name?: string; destination?: string; status?: string; starts_at?: number; expires_at?: number }>();

  const [[existing]] = await c.env.DB.exec(`SELECT id, destination FROM qr_codes WHERE id = ${c.req.param('id')} AND user_id = ${user.id}`) as any;

  if (!existing) {
    return c.json({ error: 'QR code not found' }, 404);
  }

  if (body.destination && body.destination !== existing.destination) {
    const destValidation = await validateDestination(c.env.DB, body.destination, 'yonkolab.xyz');
    if (!destValidation.valid) {
      return c.json({ error: destValidation.reason }, 422);
    }
  }

  await c.env.DB.exec(`UPDATE qr_codes SET name = '${body.name?.trim() ?? existing.name}', destination = ${body.destination ?? JSON.stringify(existing.destination)}, status = ${body.status ?? existing.status}, starts_at = ${body.starts_at ?? existing.starts_at}, expires_at = ${body.expires_at ?? existing.expires_at}, updated_at = ${Date.now()} WHERE id = ${c.req.param('id')} AND user_id = ${user.id}`);

  const [[updated]] = await c.env.DB.exec(`SELECT id, code, name, destination, status, starts_at, expires_at FROM qr_codes WHERE id = ${c.req.param('id')} AND user_id = ${user.id}`) as any;

  return c.json({ data: updated });
});

/** DELETE /qrcode/api/v1/qr/:id - Delete QR code */
router.delete('/:id', async (c) => {
  const user = c.get('user') as unknown as { id: string };

  const [[existing]] = await c.env.DB.exec(`SELECT id FROM qr_codes WHERE id = ${c.req.param('id')} AND user_id = ${user.id}`) as any;

  if (!existing) {
    return c.json({ error: 'QR code not found' }, 404);
  }

  await c.env.DB.exec(`DELETE FROM qr_codes WHERE id = ${c.req.param('id')} AND user_id = ${user.id}`);

  return c.json({ success: true });
});

export const qrApp = router;