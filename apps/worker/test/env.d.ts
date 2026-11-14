/** Binding adicional disponível apenas nos testes (vitest.config.ts → miniflare.bindings). */
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('@cloudflare/vitest-plugin').D1Migration[];
  }
}
