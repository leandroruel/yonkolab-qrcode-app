import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

/** Cria o client Drizzle sobre o binding D1. Custo zero fora do request path. */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export { schema };
