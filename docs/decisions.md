# Registro de decisões (ADR-lite)

Decisões de arquitetura e desvios do plano original. Uma entrada por decisão; as mais
recentes no fim. Convenção: **Contexto → Decisão → Consequências**.

---

## D1 — Monorepo pnpm com 3 workspaces (M0)

**Contexto:** o plano define `apps/worker`, `apps/web` e `packages/shared`.
**Decisão:** pnpm workspaces + TypeScript project references implícito via configs por pacote.
**Consequências:** `pnpm -r <script>` orquestra tudo; sem Turborepo/Nx (desnecessário nesta escala).

## D2 — `assets.base_path` em vez de hack de build para `/qrcode` (M0)

**Contexto:** o Worker precisa servir o SPA sob `yonkolab.xyz/qrcode` sem que cada asset
estático consuma a cota de requests do Workers Free (100K/dia).
**Decisão:** usar o suporte nativo `assets.base_path: "/qrcode"` (Wrangler ≥ 4.148.0,
confirmado na documentação de nov/2026), com `vite base: '/qrcode/'` e
`not_found_handling: "single-page-application"` + `run_worker_first: ["/qrcode/api/*", "/q/*"]`.
Navegações do SPA são servidas pelos assets sem invocar o Worker (compat date ≥ 2025-04-01).
**Consequências:** nenhuma cópia/redirect de arquivos no build; rotas do SPA não gastam cota.
Risco: exigência de versão mínima do Wrangler — fixada no CI.

## D3 — `nodejs_compat` desligado por padrão (M0)

**Contexto:** o runtime é workerd. Hono, Drizzle (driver D1), Zod e Arctic não exigem polyfills
Node; o plano pede economizar CPU.
**Decisão:** não habilitar `nodejs_compat`; revisar caso alguma dependência exija (e registrar aqui).
**Consequências:** código deve usar APIs Web padrão (`crypto.subtle`, `URL`, `fetch`).

## D4 — Tailwind CSS v4 como fundação do shadcn/ui (M0)

**Contexto:** a stack do plano inclui shadcn/ui, que pressupõe Tailwind. O Tailwind v4
integra-se ao Vite via plugin oficial (`@tailwindcss/vite`), sem PostCSS config.
**Decisão:** Tailwind v4 + plugin Vite; componentes shadcn serão adicionados como código-fonte
(quando o UI real começar, em M1/M2), não como dependência npm.
**Consequências:** dependências Radix serão adicionadas por componente, sob demanda.

## D5 — React Router v7 (`react-router-dom`) (M0)

**Contexto:** o plano pede "React Router".
**Decisão:** `react-router-dom` v7 em modo data router (`createBrowserRouter` com
`basename: '/qrcode'`).
**Consequências:** loaders/actions podem substituir parte do TanStack Query depois, se útil;
por ora Query cuida do estado de servidor.

## D6 — Testes com `@cloudflare/vitest-pool-workers` (M0)

**Contexto:** o plano pede Vitest + pool oficial. Os testes do Worker precisam de bindings
(D1, Analytics Engine) simulados em workerd real.
**Decisão:** `@cloudflare/vitest-pool-workers` lendo `wrangler.jsonc`; migrations D1 aplicadas
em fixture de teste via `readD1Migrations`.
**Consequências:** testes rodam no mesmo runtime de produção (fideldade alta), porém mais
lentos que Vitest puro — aceitável no escopo do MVP.
