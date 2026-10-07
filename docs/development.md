# Development Guide

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or Atlas)

## Setup

```bash
npm install
cp .env.example .env.local
```

Required local values:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/sylqen
BETTER_AUTH_SECRET=replace-with-a-long-random-secret-at-least-32-chars
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
DEMO_EMAIL=demo@sylqen.app
DEMO_PASSWORD=...
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated visitors are redirected to `/login`.

## Auth flows to verify locally

1. Register with any email address (verification is optional and does not block access in the portfolio stage)
2. Confirm default workspace creation after sign-up / first verified session path
3. Sign out / sign in
4. Optional: Explore Demo when `DEMO_EMAIL` / `DEMO_PASSWORD` are set
5. Optional: Google sign-in when Google credentials are set
6. Optional email tooling:
   - `EMAIL_PROVIDER=dev` captures messages in memory
   - `EMAIL_CAPTURE_TO_DISK=true` writes `.local/emails/*.json` for manual link copying

## Finance module (local)

1. Sign in as a normal user with at least one invoice (preferably overdue for receivables)
2. Open **Finance** from the primary nav
3. Confirm KPIs, revenue summary, receivables priority, recent activity, and date range links (`/finance?range=7`)
4. Sign in via **Explore Demo** and confirm Finance is readable with demo restrictions intact

Coverage: Vitest (`src/features/finance/`, `src/app/(app)/finance/page.test.tsx`) and Playwright (`e2e/finance.spec.ts`). Reuses `getDashboardFinancialSnapshotForSession`.

## Analytics module (local)

1. Sign in with customers, products, projects, invoices, and (optionally) payments
2. Open **Analytics** from the primary nav
3. Confirm executive overview, invoiced vs paid chart, signals, customer/product/project sections, and date range links (`/analytics?range=7`)
4. Sign in via **Explore Demo** and confirm Analytics is readable with demo restrictions intact

Coverage: Vitest (`src/features/analytics/`, `src/server/analytics/service.test.ts`, `src/app/(app)/analytics/page.test.tsx`) and Playwright (`e2e/analytics.spec.ts`). Reuses dashboard financial aggregations; adds bounded ranking/trend queries.

## Automations module (local)

1. Sign in and open **Automations**
2. Create a rule (e.g. Customer created → notification)
3. Create a customer and confirm an execution / notification appears
4. Edit/disable the automation; confirm demo cannot create/update

Coverage: Vitest (`src/features/automations/`, `src/server/automations/`) and Playwright (`e2e/automations.spec.ts`).

Notes: engine is synchronous/lightweight; no cron for overdue scanning; external integration actions are deferred.

## Integrations module (local)

1. Sign in and open **Integrations** from the System nav
2. Confirm Stripe, Resend, and AI Assistant cards plus Planned section
3. Open a detail page (`/integrations/resend`) and confirm capabilities, configuration summary, and security note (no secrets)
4. Sign in via **Explore Demo** and confirm Integrations is readable with demo restrictions intact

Coverage: Vitest (`src/server/integrations/`, `src/app/(app)/integrations/page.test.tsx`) and Playwright (`e2e/integrations.spec.ts`). No Mongo collection — static catalog + env-derived status.

## Settings module (local)

1. Sign in as a workspace owner
2. Open **Settings** from the System nav (or Account menu → Settings)
3. Rename the workspace; confirm the shell shows the new name and the slug stays unchanged
4. Update display name; confirm email remains read-only
5. Change theme preference (device-local via next-themes)
6. Sign in via **Explore Demo** and confirm workspace/account saves are blocked while theme still works

Coverage: Vitest (`src/server/workspaces/workspace-settings.test.ts`, `src/server/settings/account-service.test.ts`, `src/features/settings/schemas.test.ts`) and Playwright (`e2e/settings.spec.ts`).

## Dashboard (local)

1. Sign in and open **Overview**
2. Confirm KPI cards, date range presets (7 / 30 / 90 days), payment trend, outstanding and recent lists
3. Sign in via **Explore Demo** and confirm the same read path with mutations still blocked

Coverage: Vitest (`src/server/dashboard/`) and Playwright (`e2e/dashboard.spec.ts`).

## Team module (local)

1. Sign in as a workspace owner
2. Open **Team** from the primary nav
3. List members; update roles among owner / member / viewer; remove a non-final owner
4. Confirm the last owner cannot be demoted or removed
5. Sign in via **Explore Demo** and confirm management controls are unavailable / blocked

Coverage: Vitest (`src/server/members/`) and Playwright (`e2e/team.spec.ts`).

## Customers module (local)

1. Sign in as a normal user
2. Open **Customers** from the primary nav
3. Create / search / paginate / edit / open detail
4. Sign in via **Explore Demo** and confirm create/edit are blocked while list/detail remain readable

Tenant isolation and demo write rejection are covered by Vitest (`src/server/customers/service.test.ts`) and Playwright (`e2e/customers.spec.ts`).

## Products module (local)

1. Sign in as a normal user
2. Open **Products** from the primary nav
3. Create / search / paginate / edit / open detail
4. Confirm duplicate SKUs are rejected within the same workspace
5. Sign in via **Explore Demo** and confirm create/edit are blocked while list/detail remain readable

Coverage: Vitest (`src/server/products/service.test.ts`, `src/features/products/schemas.test.ts`) and Playwright (`e2e/products.spec.ts`).

## Projects module (local)

1. Sign in as a normal user
2. Open **Projects** from the primary nav
3. Create / search / paginate / edit / open detail
4. Confirm due date cannot precede start date
5. Sign in via **Explore Demo** and confirm create/edit are blocked while list/detail remain readable

Coverage: Vitest (`src/server/projects/service.test.ts`, `src/features/projects/schemas.test.ts`) and Playwright (`e2e/projects.spec.ts`).

## Invoices module (local)

1. Sign in as a normal user
2. Ensure at least one Customer and Product exist
3. Open **Invoices** and create / search / paginate / edit / open detail
4. Confirm invoice numbers increment (`INV-000001`, …) and totals match qty × product price
5. Change a product price and confirm existing invoice line snapshots stay unchanged
6. Sign in via **Explore Demo** and confirm create/edit are blocked while list/detail remain readable

Coverage: Vitest (`src/server/invoices/service.test.ts`, `src/features/invoices/schemas.test.ts`) and Playwright (`e2e/invoices.spec.ts`).

## Payments module (local)

1. Sign in as a normal user with an existing invoice
2. Open **Payments** and record / search / paginate / open detail
3. Confirm remaining balance, overpayment rejection, and the invoice payment summary
4. Sign in via **Explore Demo** and confirm record is blocked while list/detail remain readable

Coverage: Vitest (`src/server/payments/service.test.ts`, `src/features/payments/schemas.test.ts`) and Playwright (`e2e/payments.spec.ts`).

### Performance notes (hot path)

- Session/workspace resolution uses React `cache()` for **request-scoped** deduplication (layout + page share one lookup). Not a cross-request cache.
- Customer/product/project/invoice/payment Mongo indexes are ensured with a **process-level** shared promise. Prefer confirming indexes in Atlas for production; the runtime ensure is a safety net, not a migration framework.
- Align Vercel function region with the Atlas cluster region in the Vercel/Atlas dashboards (no region pin is committed in-repo).
  - Verify Atlas: Cluster → Configuration → Region.
  - Verify Vercel: Project → Settings → Functions → Function Region (or deployment `X-Vercel-Id` middle segment, e.g. `sin1::iad1::…` means edge `sin1` / compute `iad1`).
  - Pin Vercel Functions to the same region as Atlas; do not move Atlas blindly.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest watch |
| `npm run test:run` | Vitest CI run |
| `npm run test:e2e` | Build + Playwright Chromium E2E |
| `npm run test:e2e:ui` | Build + Playwright UI mode |

## Testing

### Vitest (unit / integration)

```bash
npm run test:run
```

Covers `src/**` logic, components, and server helpers. Does not drive a real browser.

### Playwright (browser E2E)

```bash
npx playwright install chromium   # once per machine
npm run test:e2e
```

Playwright boots an **ephemeral** stack:

1. `mongodb-memory-server` (isolated DB, destroyed when the run ends)
2. `next start` on `http://127.0.0.1:3100` with deterministic fixture env
3. Chromium against that local server only

Isolation guarantees:

- Does **not** use production Atlas / Vercel MongoDB
- Does **not** use production Better Auth secrets
- Does **not** send real email (`EMAIL_PROVIDER=dev`)
- Demo credentials are local fixtures only (see `e2e/fixtures/env.mjs`)
- Intentionally **not** run against `https://sylqen.vercel.app`

Optional: set `E2E_PORT` (default `3100`) to change the local port.

## Vercel configuration

Set at least:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=https://sylqen.vercel.app`
- `NEXT_PUBLIC_APP_URL=https://sylqen.vercel.app`

For Google login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Authorized redirect URI: `https://sylqen.vercel.app/api/auth/callback/google`

For email verification in production:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`

For portfolio demo:

- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `DEMO_NAME` (optional)

Never commit real secrets.

## Architecture docs

- [Architecture](./architecture.md)
- [Security](./security.md)
- [AI architecture](./ai-architecture.md)
