/**
 * Bindings do Worker (wrangler.jsonc).
 * Secrets e vars são adicionados aqui conforme os milestones (M1+).
 */
export interface Env {
  /** D1 (SQLite) — dados do app. */
  DB: D1Database;
  /** Workers Analytics Engine — eventos de scan (M5). */
  SCANS: AnalyticsEngineDataset;
  /** Static assets do SPA. */
  ASSETS: Fetcher;
}

/** Tipo de env do Hono. */
export type AppEnv = { Bindings: Env };
