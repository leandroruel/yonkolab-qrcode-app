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
| M1 — Auth com Google (Arctic, sessão própria) | ✅ |
| M2 — CRUD de QR dinâmico | — |
| M3 — Redirector `/q/:code` | — |
| M4 — Geração/estilo no navegador + gerador público | — |
| M5 — Analytics (Analytics Engine) | — |
| M6 — Anti-abuso (report, admin, headers) | — |
| M7 — Deploy (CI/CD, secrets, backup) | — |

## Status dos verificáveis M0

- ✅ Monorepo pnpm com 3 workspaces (shared, worker, web)
- ✅ Worker Hono com bindings D1 (DB), Analytics Engine (SCANS) e ASSETS
- ✅ Static assets com `base_path: /qrcode` + `run_worker_first: ["/qrcode/api/*", "/q/*"]`
- ✅ Drizzle + migration inicial (5 tabelas no D1 local)
- ✅ SPA React/Vite/Tailwind v4 com base /qrcode/ e health no painel
- ✅ Health: `/qrcode/api/health` e `/q/healthcheck` (testes vitest-plugin)
- ✅ ESLint flat config + Prettier; docs/decisions.md
- ✅ `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`: todos passam

## Status dos verificáveis M1

- ✅ Login com Google via Arctic (Arctic 3.7.0): `/qrcode/api/auth/google` retorna 302 para o Google
- ✅ state + PKCE em cookie curto (`oauth_flow`, Max-Age 600 seg, HttpOnly, SameSite=Lax)
- ✅ Callback valida state (400 se divergente — proteção CSRF)
- ✅ Sessão própria: token aleatório de 32 bytes; só o SHA-256 do token persiste no D1
- ✅ Cookie `session` httpOnly; Secure; SameSite=Lax; Path=/; expiração 30 dias
- ✅ Middleware `requireUser`: 401 se sessão inexistente/expidada
- ✅ `POST /qrcode/api/auth/logout`: remove sessão do banco e limpa o cookie
- ✅ Flag `is_admin` definida por env `ADMIN_EMAILS` no primeiro login (Google `googleSub`)
- ✅ Nenhum hash de senha no código — auth 100% via Google
- ✅ Tipos compartilhados via `@yonkolab/shared`

## Rotas em produção (planejadas M7)

- `yonkolab.xyz/qrcode*` → SPA (servido por assets, sem invocar o Worker) + `/qrcode/api/*` (aqui)
- `yonkolab.xyz/q/*` → redirector (hot path, busca D1 → 302)

## Como rodar (desenvolvimento)

```bash
pnpm install
pnpm dev          # sobe wrangler dev (:8787) + vite (:5173) em paralelo
```

- **SPA com HMR:** http://localhost:5173/qrcode/ (a API é proxied para o wrangler)
- **API direta:** http://localhost:8787/qrcode/api/health
- **Redirector healthcheck:** http://localhost:8787/q/healthcheck

O wrangler dev usa D1 local persistente (`.wrangler/state`). Para recriar o schema:

```bash
cd apps/worker
pnpm db:generate          # drizzle-kit generate (nova migration)
pnpm db:migrate:local     # aplica migrations no D1 local
```

> O diretório `apps/web/dist` precisa existir antes de `wrangler dev`; rode `pnpm build` para o SPA real.

## Como verificar tudo

```bash
pnpm typecheck   # tsc em shared, worker e web
pnpm lint        # eslint (flat config) — 0 erros, 2 avisos em arquivos gerados
pnpm test        # vitest + @cloudflare/vitest-plugin (workerd real, D1/AE bindings)
pnpm build       # build do SPA (tsc do worker valida os tipos)
```

## Decisões de arquitetura

Registradas em [`docs/decisions.md`](docs/decisions.md) — incluindo o uso de
`assets.base_path` (SPA sem consumir cota do Workers Free), ausência de `nodejs_compat`,
Tailwind v4 e a migração para `@cloudflare/vitest-plugin`.