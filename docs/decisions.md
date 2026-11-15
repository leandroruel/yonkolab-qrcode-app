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

## D7 — Landing carrega primeiro; demos de QR e rotas internas sob demanda (fatia 0)

**Contexto:** a landing precisa de LCP < 2,5 s em 4G e JS inicial enxuto. `qr-code-styling`
(46 KB) e canvas atrás de quatro QRs competiam com o primeiro paint; o `QueryClientProvider`
puxava TanStack Query para o bundle inicial mesmo sem uso na landing.
**Decisão:** landing é o chunk inicial (é a rota de entrada) e as páginas internas usam
`React.lazy`. As demos de QR carregam depois de `requestIdleCallback` (hero) ou quando a seção
chega a 700 px do viewport (vitrine). Removemos `@tanstack/react-query` do app: o diagnóstico
de `/status` usa `fetch` + estado local. O menu mobile foi movido para fora do `<header>` —
`backdrop-filter` no header cria containing block e quebrava o `position: fixed` do sheet.
**Consequências:** o JS inicial não inclui a lib de QR; o custo aparece só quando o visitante
vê as demos. Se surgir estado de servidor compartilhado (ex.: "Meus QR codes"), reavaliamos
uma lib de cache em vez de reativar a dependência sem necessidade.

## D8 — Sem shadcn/Radix nesta fatia; accordion nativo acessível

**Contexto:** o pedido sugere accordion do shadcn para o FAQ. Adicionar Radix só para isso
custaria dependência e JS sem ganho real num FAQ de cinco itens.
**Decisão:** `<details>/<summary>` estilizados, com foco visível, `aria` nativo do elemento,
ícone que gira e funcionamento sem JS.
**Consequências:** zero dependência nova; se o produto evoluir para componentes complexos
(dialog, combobox), aí sim avaliamos Radix/shadcn por componente.

## D9 — Proxy de dev ancorado em `/q/`, não em `/q` (fatia 0)

**Contexto:** o proxy do Vite usava a chave `/q`, que também casa com `/qrcode/...`. Em
desenvolvimento, a SPA era encaminhada ao Wrangler e recebia o `dist` antigo; ao reconstruir,
o HTML em cache apontava para chunks removidos (`Failed to fetch dynamically imported module`).
**Decisão:** proxy `'^/q/'` (regex, conforme o Vite) para o redirector e `/qrcode/api` para a API.
**Consequências:** `vite dev` serve o fonte da SPA. Como defesa extra, chunks usam
`lazyWithRetry` (recarrega uma vez por 10 s) e o roteador tem `errorElement` com botão de recarga.


