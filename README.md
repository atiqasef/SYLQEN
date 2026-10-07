# SYLQEN

**AI-ready Business Operating System for modern businesses.**

SYLQEN is a production-oriented, multi-tenant SaaS platform designed to centralize business operations, financial workflows, analytics, team management, integrations, and automation.

It is built as a portfolio case study in server-first SaaS engineering: trusted sessions, workspace isolation, RBAC, cents-safe money handling, validated mutations, and automated tests — not as a marketing shell around unfinished screens.

| | |
| --- | --- |
| **Live demo** | [https://sylqen.vercel.app](https://sylqen.vercel.app) |
| **Repository** | [github.com/atiqasef/SYLQEN](https://github.com/atiqasef/SYLQEN) |
| **Case study** | [docs/case-study.md](docs/case-study.md) |
| **Architecture** | [docs/architecture.md](docs/architecture.md) |

Use **Explore Demo** on the login page for a read-only walkthrough. Demo credentials are environment-configured and are not published here.

---

## Why I built SYLQEN

Small teams often run customers, projects, and money across spreadsheets and disconnected tools. The harder engineering problem is not drawing a dashboard — it is designing a system that keeps tenant data isolated, authorization trustworthy, and financial records consistent under real product pressure.

SYLQEN was built to practice and demonstrate that work:

- **Multi-tenant SaaS architecture** — every business record is workspace-scoped from a trusted server session
- **Server-side authorization** — UI gating is never the security boundary; permissions are enforced in services
- **Domain modeling** — customers, products, projects, invoices, and payments as coherent, validated modules
- **Financial integrity** — cents-safe arithmetic, product snapshots on invoice lines, currency-aware reporting without invented FX
- **RBAC** — owner / member / viewer roles with fail-closed demos and last-owner protections
- **Server-first design** — sensitive logic, secrets, and tenancy stay on the server
- **Validation** — Zod at mutation boundaries with safe user-facing errors
- **Production deployment** — Vercel + MongoDB Atlas with region-aligned compute where configured
- **Performance discipline** — request-scoped session caching, bounded lists, server pagination/search, parallel dashboard reads
- **Testing strategy** — Vitest for domain/isolation rules; Playwright for real browser workflows
- **Extensibility** — AI provider abstraction and a declarative automation engine without coupling to vendors or workers prematurely

The goal is to show engineering judgment: ship a coherent product, keep claims honest, and leave clear seams for future Stripe, AI, and background work.

---

## Business modules

### Core Business

Customers, Products, Projects, Invoices, and Payments — the operational records and money flows a business runs day to day.

### Intelligence

Finance and Analytics — currency-aware visibility, receivables priority, trends, rankings, and rule-based signals composed from the same trusted workspace data.

### Operations

Team, Settings, Integrations, and Automations — access control, workspace configuration, integration status, and declarative Trigger → Conditions → Action rules.

| Module | What it does |
| --- | --- |
| **Customers** | Workspace-scoped CRM records with search, pagination, detail, and edit |
| **Products** | Catalog with SKU uniqueness, pricing, and currency |
| **Projects** | Status lifecycle with client context and date validation |
| **Invoices** | Line items with product snapshots, server-calculated totals, atomic invoice numbers |
| **Payments** | Internal payment recording against invoices (not Stripe Checkout) |
| **Finance** | Command center for KPIs, payment trend, and prioritized receivables |
| **Analytics** | Invoiced vs paid trends, rankings, project mix, business signals |
| **Team** | Membership list with owner-managed roles and last-owner protections |
| **Settings** | Workspace rename, account display name, theme, access summary |
| **Integrations** | Read-only hub: Stripe reserved, Resend/AI status, planned providers |
| **Automations** | Declarative rules with execution history and internal notifications |

**Explicitly not shipped:** live OpenAI/Claude product surfaces, live Stripe Checkout/subscription billing, email invitations, client portals, background job workers/cron, full notification inbox UI, Slack/email/webhook automation actions.

---

## Architecture highlights

```text
UI (RSC / client islands)
  → Server Actions / thin app layer
  → Domain services
  → Workspace-scoped repositories
  → MongoDB (native driver)
```

| Choice | Why it matters |
| --- | --- |
| **Next.js App Router + React 19** | Server Components keep data fetching and auth close to the request |
| **TypeScript (strict)** | Catch tenancy and money-shape mistakes at compile time |
| **Tailwind CSS 4** | Consistent, maintainable UI without a heavy design-system dependency |
| **MongoDB Atlas + native driver** | Explicit workspace filters and indexes — no ORM tenancy surprises |
| **Better Auth** | Session crypto, password hashing, and OAuth stay in a dedicated auth layer |
| **Zod** | Predictable validation at server boundaries |
| **Feature + service/repository layout** | UI in `src/features`, trusted logic in `src/server/<domain>` |
| **RBAC** | Centralized `effectivePermissions` with demo viewer caps |
| **AI provider abstraction** | Future models without rewriting business modules |
| **Automation engine** | Sync, bounded rules with idempotent execution records |
| **Vitest + Playwright** | Fast domain confidence + real browser flows |
| **Vercel** | Production Next.js hosting aligned with Atlas region in this deployment |

Deep dive: [docs/architecture.md](docs/architecture.md) · Case study: [docs/case-study.md](docs/case-study.md)

---

## Security & multi-tenancy

- Workspace identity comes from the **trusted server session** — browser-supplied `workspaceId` / `userId` values are never authoritative
- Every tenant-scoped query includes session-derived `workspaceId`
- Role permissions are evaluated with `requirePermission` / `canPerform` on the server
- Cross-workspace access fails closed (`NOT_FOUND` / `FORBIDDEN` — no existence leaks)
- Mutations are validated with Zod; money totals and remaining balances are re-checked server-side
- Demo identities are force-capped to read-only permissions regardless of stored role
- Secrets stay in environment configuration; integration DTOs never serialize API keys
- User-facing errors use safe messages; internals go to structured, redacted logs

Full principles: [docs/security.md](docs/security.md)

---

## Key engineering decisions

### Native MongoDB driver instead of Mongoose

Repositories own query shape, compound indexes, and workspace filters explicitly. That keeps multi-tenant access patterns visible in code review instead of hidden behind ORM defaults.

### Server-first architecture

Authorization, money math, invoice numbering, and automation emission run on the server. The client submits intent; the server decides truth.

### Workspace-scoped repositories and services

List/get/create/update paths ignore client-supplied tenant IDs. Accidental cross-workspace reads fail closed rather than “almost working” with a wrong filter.

### AI provider abstraction

`src/server/ai` defines `AIProvider` with a mock implementation. AI is disabled by default. Anthropic/OpenAI are not wired. Enabling AI without a real provider still returns clearly labeled mock output — never presented as live model inference.

### Idempotent automation execution

Executions use a unique `(workspaceId, automationId, eventKey)` key so duplicate domain events do not double-apply the same rule. Failures are recorded safely and do not break the primary business mutation.

### Server-side pagination and search

Lists never load full collections into the browser. Search uses bounded, escaped regex with page size caps.

### UTC financial calculations

Dashboard, Finance, and Analytics period bounds use UTC calendar midnights so reporting is consistent across client timezones. Currencies are never mixed; there is no FX conversion.

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

---

## Engineering quality

Verified locally at the Phase 18 polish milestone (and unchanged by this documentation phase):

| Signal | Status |
| --- | --- |
| Vitest | **58** files / **220** tests |
| Playwright | **38** tests |
| TypeScript | `npm run typecheck` |
| ESLint | `npm run lint` |
| Production build | `npm run build` |

Also practiced in product UX: responsive shell/list patterns, accessible labels/focus where audited, loading / empty / error / not-found states, and production QA without inventing metrics.

```bash
npm run test:run
npm run typecheck
npm run lint
npm run build
npx playwright install chromium   # once
npm run test:e2e
```

Playwright runs against an ephemeral local server + in-memory Mongo — never against production.

---

## Production deployment

| Piece | Detail |
| --- | --- |
| App | Next.js on **Vercel** |
| Database | **MongoDB Atlas** |
| Region practice | Function region aligned with Atlas cluster region (portfolio deployment: Vercel `bom1`, Atlas `ap-south-1`) |
| Config | Environment variables only — see [docs/development.md](docs/development.md#vercel-configuration) |

Required production variables include Mongo connection, Better Auth secret/URL, and public app URL. Optional: Google OAuth, Resend, demo account. **No secrets are published in this repository.**

---

## Demo

1. Open [https://sylqen.vercel.app](https://sylqen.vercel.app)
2. Choose **Explore Demo** on the login screen
3. Browse Overview, Customers, Products, Projects, Invoices, Payments, Finance, Analytics, Team, Settings, Integrations, and Automations

The demo workspace is intentionally **read-only** for protected mutations. Create/edit/record actions are blocked on the server for demo identities. Credentials and secrets are not documented here.

---

## Screenshots

Screenshot assets are not checked into the repository yet. Capture targets and naming conventions live in [docs/screenshots.md](docs/screenshots.md).

Recommended portfolio set: Dashboard, Customers, Invoices, Payments, Finance, Analytics, Team, Automations, Integrations, Settings.

---

## AI-ready (not AI-product)

`src/server/ai` defines a provider abstraction with a mock implementation. AI is **disabled by default**. Live OpenAI/Claude integration is **not** shipped. The Integrations hub surfaces AI Assistant as architecture status, not as a connected vendor product.

Details: [docs/ai-architecture.md](docs/ai-architecture.md)

---

## Automations (accurate scope)

Shipped:

- Triggers: `invoice.overdue`, `payment.received`, `customer.created`, `project.status_changed`
- Flat AND conditions
- Action: `notification.create` (internal records — not a full notification inbox product)
- Idempotent execution + execution history
- Safe failure handling that does not break primary mutations

Not shipped: cron/background overdue scanner, queues/workers, Slack/email/webhook/task actions.

`invoice.overdue` is evaluated when invoices are created/updated; overnight scanning is deferred.

---

## Integrations (accurate scope)

| Entry | State |
| --- | --- |
| **Stripe** | Reserved / planned payments infrastructure — no live Checkout or subscription billing |
| **Resend** | Transactional email via existing provider abstraction when configured |
| **AI Assistant** | Provider abstraction / mock — no workspace API keys |
| **Slack, Google Calendar, QuickBooks** | Planned visibility only |

The **Payments** module is the internal business payment domain (cash, bank transfer, card, other). It is not Stripe Checkout.

---

## Local setup

Prerequisites: Node.js 20+, npm 10+, MongoDB (local or Atlas).

```bash
git clone https://github.com/atiqasef/SYLQEN.git
cd SYLQEN
npm install
cp .env.example .env.local
# configure Mongo + Better Auth URL/secret + public app URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Full env and module walkthroughs: [docs/development.md](docs/development.md).

In the current portfolio stage, **email verification is optional** and does not block app access.

---

## Project structure

```text
src/app/          Routes (auth + authenticated app)
src/features/     Domain UI (forms, tables, loading shells)
src/server/       Trusted services, repositories, auth, AI, automations
src/components/   Shared UI, layout, feedback
src/lib/          Auth client/server helpers, utilities
src/config/       Site + env configuration
e2e/              Playwright specs + ephemeral server harness
docs/             Architecture, security, development, AI, case study
```

---

## Future scope

Clearly deferred — **not implemented**:

- Live Stripe Checkout / subscription billing
- Real AI provider integration and product surfaces
- Background workers / cron (including overdue scanning)
- Richer notification product UI
- External automation actions (email, Slack, webhooks, tasks)
- Per-workspace OAuth installs
- Email invitations & richer org admin
- API key / developer platform
- PDF invoices, tax/discounts, deletes/bulk actions, client portal

---

## Documentation

- [Case study](docs/case-study.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [AI architecture](docs/ai-architecture.md)
- [Development](docs/development.md)
- [Screenshot plan](docs/screenshots.md)

---

## License

Private / unpublished unless otherwise specified.
