/**
 * Secrets não aparecem no `wrangler types` (vivem em .dev.vars / `wrangler secret put`).
 * Declarados aqui para que `Cloudflare.Env` seja completo no typecheck.
 */
declare namespace Cloudflare {
  interface Env {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ADMIN_EMAILS: string;
  }
}
