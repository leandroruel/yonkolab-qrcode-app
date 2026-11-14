// Utils de teste: aplicar migrations D1 antes de cada arquivo de teste.
// Importado via setupFiles do vitest.config.ts.

import { applyD1Migrations, env } from 'cloudflare:test';

export const applySetup = async () => {
  if (!env.TEST_MIGRATIONS) {
    throw new Error('TEST_MIGRATIONS not configured');
  }
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
};