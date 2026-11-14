# YonkoLab QR — QR codes dinâmicos (custo zero)

QR codes **dinâmicos**: uma URL curta (`yonkolab.xyz/q/{code}`) que redireciona para um destino
editável, com pausa, expiração e analytics. Rodando 100% na Cloudflare, **plano Free**.

- **API + redirector:** Workers (Hono, TypeScript) — `yonkolab.xyz/qrcode/api/*` e `yonkolab.xyz/q/*`
- **Painel (SPA):** React + Vite + TanStack Query + Tailwind — `yonkolab.xyz/qrcode`
- **Banco:** D1 (SQLite) + Drizzle ORM
- **Eventos de scan:** Workers Analytics Engine (sem escritas em D1 no hot path)

## Status dos milestones

| Milestone | Status |
|---|---|
| M0 — Fundação (monorepo, Worker+SPA+D1, health) | ✅ |
| M1 — Auth com Google (Arctic, sessão própria) | — |
| M2 — CRUD de QR dinâmico | — |
| M3 — Redirector `/q/:code` | — |
| M4 — Geração/estilo no navegador + gerador público | — |
| M5 — Analytics (Analytics Engine) | — |
| M6 — Anti-abuso (report, admin, headers) | — |
| M7 — Deploy (CI/CD, secrets, backup) | — |

## Requisitos

- Node ≥ 22, pnpm ≥ 12 (`corepack enable` funciona)
- Wrangler ≥ 4.148 (fixado no lockfile) — exigido por `assets.base_path`

## Como rodar (desenvolvimento)

```bash
pnpm install
pnpm dev          # sobe wrangler dev (:8787) + vite (:5173) em paralelo
```

- **SPA com HMR:** http://localhost:5173/qrcode/ (a API é proxied para o wrangler)
- **API direto:** http://localhost:8787/qrcode/api/health
- **Redirector healthcheck:** http://localhost:8787/q/healthcheck

O wrangler dev usa D1 local persistente (`.wrangler/state`). Para recriar o schema:

```bash
cd apps/worker
pnpm db:generate          # drizzle-kit generate (nova migration)
pnpm db:migrate:local     # aplica migrations no D1 local
```

> O diretório `apps/web/dist` precisa existir antes de `wrangler dev` (o script de dev
> do worker cria um vazio; rode `pnpm build` para o SPA real).

## Como verificar tudo

```bash
pnpm typecheck   # tsc em shared, worker e web
pnpm lint        # eslint (flat config)
pnpm test        # vitest + @cloudflare/vitest-plugin (workerd real, D1/AE bindings)
pnpm build       # build do SPA (tsc do worker valida os tipos)
```

## Testes

`apps/worker` usa `@cloudflare/vitest-plugin` (successor do `vitest-pool-workers`,
para Vitest 4): os testes rodam no workerd real com os bindings do `wrangler.jsonc`.

```bash
cd apps/worker && pnpm test
```

## Configuração

- `apps/worker/wrangler.jsonc` — bindings (`DB`, `SCANS`, `ASSETS`), `assets.base_path: /qrcode`,
  `run_worker_first: ["/qrcode/api/*", "/q/*"]`. As rotas de produção ficam comentadas até o M7.
- `.env.example` — lista de segredos. Em dev local: `apps/worker/.dev.vars` (gitignored).
  Em produção: `wrangler secret put <NOME>` (M7).

## Decisões de arquitetura

Registradas em [`docs/decisions.md`](docs/decisions.md) — incluindo o uso de
`assets.base_path` (SPA sem consumir cota do Workers Free), ausência de `nodejs_compat`,
Tailwind v4 e a migração para `@cloudflare/vitest-plugin`.
