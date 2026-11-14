/** Bindings + secrets: gerados por `wrangler types` (worker-configuration.d.ts),
 *  completados com os secrets em src/env.d.ts. */
export type Env = Cloudflare.Env;

import type { users } from './db/schema';

export type User = typeof users.$inferSelect;

/** Tipo de env do Hono: bindings + user resolvido pelo requireUser. */
export type AppEnv = {
  Bindings: Env;
  Variables: { user: User };
};
