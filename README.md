# SYLQEN

**AI-ready Business Operating System** — a multi-tenant SaaS workspace for customers, products, projects, invoices, payments, financial visibility, and team access control.

SYLQEN is a production-style portfolio application that shows how modern full-stack engineering can unify day-to-day business operations in one coherent product — with server-side authorization, workspace isolation, cents-safe money handling, and automated tests.

| | |
| --- | --- |
| **Live demo** | [https://sylqen.vercel.app](https://sylqen.vercel.app) |
| **Repository** | [github.com/atiqasef/SYLQEN](https://github.com/atiqasef/SYLQEN) |

Use **Explore Demo** on the login page for a read-only walkthrough. Demo credentials are environment-configured and are not published in this README.

---

## Why SYLQEN

Many small teams run customers, projects, and money across spreadsheets and disconnected tools. SYLQEN demonstrates a single workspace where:

- operational records stay organized and searchable
- invoices and payments stay financially consistent
- dashboards surface currency-aware visibility without inventing FX rates
- team roles control who can read vs mutate
- architecture stays ready for future AI assistance without vendor lock-in

The project emphasizes production-minded engineering: trusted sessions, server-enforced permissions, clear domain boundaries, and a calm enterprise UI.

---

## What is implemented

### Business operations

- **Customers** — create, search, paginate, detail, edit (workspace-scoped)
- **Products** — SKU uniqueness, pricing, currency, catalog search
- **Projects** — status lifecycle, client context, date validation

### Financial operations

- **Invoices** — line items with product snapshots, server-calculated totals, atomic invoice numbers
- **Payments** — record against invoices, remaining balance, overpayment rejection, paid settlement
- **Financial overview** — KPI cards, payment trend, outstanding/overdue, recent activity (7 / 30 / 90 day ranges)
- **Finance** — command center for invoicing, payments, and prioritized receivables (composes the same server snapshot)

Metrics are **currency-aware**. Totals are not mixed across currencies; there is no FX conversion.

### Team & access

- Workspace membership list (`/team`)
- Roles offered in UI: **Owner**, **Member**, **Viewer** (legacy `admin` remains in the permission map for compatibility)
- Permission-aware UI with **server-side authorization as the source of truth**
- Multi-tenant workspace isolation on every domain record
- Demo accounts forced to read-only (viewer-capped) permissions
- **Settings** — workspace rename (`workspace.update`), account display name, device theme preference, session access summary

### Platform

- Better Auth (email/password; Google OAuth when configured)
- Responsive authenticated app shell
- Loading / empty / error / not-found patterns
- Light & dark themes
- Vitest + Playwright + typecheck + ESLint + production build

### Explicitly not claimed as shipped

Nav placeholders may show upcoming modules (Finance, Analytics, Automations, Settings, Integrations). Those surfaces are **not** implemented product features. Real AI product surfaces, Stripe billing, email invitations, client portals, and delete/bulk workflows are out of current scope.

---

## Tech stack

Verified from `package.json`:

| Layer | Technology |
| --- | --- |
| Framework | Next.js **16.3** (App Router, React Server Components) |
| UI | React **19**, Tailwind CSS **4**, Radix primitives |
| Language | TypeScript (strict) |
| Auth | Better Auth + Mongo adapter |
| Database | MongoDB Node.js driver (**native**, not Mongoose) |
| Validation | Zod |
| Email | Resend (optional); local `dev` capture |
| Fonts | Self-hosted IBM Plex Sans / Mono |
| Tests | Vitest, Testing Library, Playwright |
| Deploy | Vercel (`https://sylqen.vercel.app`) |

**Why these choices (short):** App Router + server-first keeps secrets and authorization off the client. The native Mongo driver keeps tenancy queries explicit. Zod validates boundaries. Better Auth owns session crypto. Vitest covers domain/isolation; Playwright covers real browser flows against an ephemeral local stack.

---

## Architecture

```text
UI (RSC / client islands)
  → Server Actions / thin app layer
  → Domain services
  → Workspace-scoped repositories
  → MongoDB
```

- Business logic stays on the server (`src/server`)
- Workspace identity comes from the authenticated session — never trusted from the browser alone
- Validation happens at server boundaries
- Features are organized by domain (`src/features` UI + `src/server/<domain>` logic)

Deep dive: [docs/architecture.md](docs/architecture.md)

---

## Multi-tenancy

Every customer, product, project, invoice, payment, and membership record is scoped by `workspaceId` resolved from the trusted session.

```text
Session → user → membership → role → permissions → resource access
```

Cross-workspace access fails closed (safe `NOT_FOUND` / `FORBIDDEN` — no existence leaks). UI hiding is never the security boundary.

Details: [docs/security.md](docs/security.md)

---

## RBAC

| Role | Intent |
| --- | --- |
| **Owner** | Full workspace access, including member management |
| **Member** | Create/update business records; can read members |
| **Viewer** | Read-only across domains |
| **admin** (legacy) | Same permission set as owner; not offered in Team UI |

Demo users are permanently capped to viewer permissions in `effectivePermissions`, regardless of stored role. Owner invariants prevent removing or demoting the last owner.

---

## Financial correctness

- Invoice line totals and invoice totals are calculated **server-side** from resolved products
- Money uses **cents-safe** integer arithmetic
- Line items snapshot product name/SKU/unit price so later catalog edits do not rewrite history
- Invoice numbers (`INV-000001`, …) come from an atomic per-workspace counter
- Payments check invoice ownership, currency match, and remaining balance
- Overdue/outstanding dashboard logic uses server aggregations; currencies stay separated

No payment gateway, refunds, tax engine, PDF export, or FX conversion in the current product.

---

## AI-ready (not AI-product)

`src/server/ai` defines a provider abstraction (`AIProvider`) with a mock implementation. AI is **disabled by default** (`AI_ENABLED=false`). Anthropic/OpenAI are not wired; enabling AI without a real provider still uses the labeled mock and never pretends mock text is live model output.

This keeps future assistance features from coupling business logic to a vendor SDK. No AI API keys are required to run the app.

See [docs/ai-architecture.md](docs/ai-architecture.md).

---

## Demo experience

1. Open [https://sylqen.vercel.app](https://sylqen.vercel.app)
2. Choose **Explore Demo** on the login screen
3. Browse Overview, Customers, Products, Projects, Invoices, Payments, and Team in **read-only** mode

Create/edit/record actions are blocked server-side for demo identities. Passwords and secrets are not documented here.

---

## Testing & quality

| Check | Command |
| --- | --- |
| Unit / integration | `npm run test:run` |
| E2E (build + Playwright) | `npm run test:e2e` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Production build | `npm run build` |

Coverage focus (high level): domain services, workspace isolation, permissions/demo read-only, money/invoice/payment rules, and major UI flows (auth, dashboard, CRUD modules, team). Playwright runs against an ephemeral local server + in-memory Mongo — never against production.

No coverage percentage is claimed here.

---

## Security (summary)

- Server-derived session + membership for authorization
- Workspace isolation in repositories/services
- Zod validation at mutation boundaries
- Demo write rejection on the server
- Secrets via environment only (`.env.example` committed; `.env*` with values never committed)
- Safe user-facing errors; structured logging with redaction

Not claimed: SOC 2, GDPR certification, penetration testing, or enterprise compliance seals.

Full principles: [docs/security.md](docs/security.md)

---

## Local setup

Prerequisites: Node.js 20+, npm 10+, MongoDB (local or Atlas).

```bash
git clone https://github.com/atiqasef/SYLQEN.git
cd SYLQEN
npm install
cp .env.example .env.local
# set MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: Google OAuth, Resend, and demo account vars — see [docs/development.md](docs/development.md) and [`.env.example`](.env.example).

In the current portfolio stage, **email verification is optional** and does not block app access. Resend remains available when mandatory verification is re-enabled.

```bash
npm run test:run
npm run typecheck
npm run lint
npm run build
npx playwright install chromium   # once
npm run test:e2e
```

---

## Deployment

Deployed on **Vercel** at [https://sylqen.vercel.app](https://sylqen.vercel.app).

Production needs at least: `MONGODB_URI`, `MONGODB_DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. Portfolio demo needs `DEMO_EMAIL` / `DEMO_PASSWORD`. Full checklist: [docs/development.md](docs/development.md#vercel-configuration).

---

## Project structure

```text
src/app/          Routes (auth + authenticated app)
src/features/     Domain UI (forms, tables, loading shells)
src/server/       Trusted services, repositories, auth, AI boundary
src/components/   Shared UI, layout, feedback
src/lib/          Auth client/server helpers, utilities
src/config/       Site + env configuration
e2e/              Playwright specs + ephemeral server harness
docs/             Architecture, security, development, AI
```

---

## Technical decisions

| Decision | Reasoning |
| --- | --- |
| Next.js App Router + RSC | Server-first data and auth close to the request |
| Native MongoDB driver | Explicit workspace filters; no ORM tenancy surprises |
| Session-derived workspace | Browser tenant IDs are never authoritative |
| Zod at boundaries | Predictable validation without leaking internals |
| Cents-safe money | Avoid floating-point invoice/payment drift |
| Product snapshots on invoices | Historical integrity when catalog prices change |
| Currency-aware dashboard | Honest reporting without fake FX |
| Vitest + Playwright | Fast domain tests + real browser confidence |
| Self-hosted fonts | Stable typography without runtime font CDN coupling |
| AI provider interface | Future models without rewriting business modules |

---

## Roadmap

### Implemented

- Auth + workspaces + RBAC
- Customers, products, projects
- Invoices, payments, financial overview
- Team member list / role update / remove (with owner protections)
- Settings (workspace name, account display name, theme preference, access summary)
- Finance command center
- Demo read-only mode
- Global UX consistency polish
- Automated unit, integration, and E2E tests

### Future scope (not built)

- Email invitations & richer org admin
- Integrations product surfaces
- Stripe or other payment providers
- Mandatory email verification in production (policy flag exists)
- Real AI assistance features on top of the existing abstraction
- PDF invoices, tax/discounts, deletes/bulk actions, client portal

---

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [AI architecture](docs/ai-architecture.md)
- [Development](docs/development.md)

---

## License

Private / unpublished unless otherwise specified.
