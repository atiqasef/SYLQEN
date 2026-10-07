# SYLQEN Architecture

SYLQEN uses a server-first, multi-tenant architecture: UI routes stay thin, domain services own business rules, and repositories enforce workspace scoping against MongoDB.

For a product-level overview, see the [README](../README.md).

## Directory structure

```text
src/
  app/
    (auth)/          Login, register, verify, password reset
    (app)/           Authenticated application shell
    api/auth/        Better Auth handler
  components/
    auth/            Auth experience UI
    ui/ layout/ feedback/ providers/
  features/          Domain UI modules (customers, products, projects, invoices, payments, finance, analytics, …)
  lib/
    auth.ts          Better Auth server instance
    auth-client.ts   Better Auth React client
  server/
    auth/            Session, permissions, demo, actions
    customers/       Customer repository + service + actions
    products/        Product repository + service + actions
    projects/        Project repository + service + actions
    invoices/        Invoice repository + service + actions
    payments/        Payment repository + service + actions
    dashboard/       Financial overview read queries + service
    members/         Workspace team membership service + actions
    db/              MongoDB connection + health
    email/           Email provider boundary (dev/resend)
    workspaces/      Workspace + membership persistence
    ai/ logging/
  proxy.ts           Optimistic auth redirects (cookie presence)
```

## Identity model

```text
User
  → Verified Identity
  → Session
  → Workspace / Organization
  → Membership
  → Role
  → Permissions
```

## Authentication

- Provider: **Better Auth**
- Methods: email/password + Google OAuth (when configured)
- Email verification is **optional** in the current portfolio stage (does not block app access); a policy flag exists to re-enable mandatory verification later
- Password hashing/session crypto remain inside Better Auth

## Workspaces

After registration (or verified social sign-in):

1. Create default workspace
2. Attach owner membership
3. Derive future resource tenancy from that workspace

Collections:

- `workspaces` — `name`, `slug`, `ownerId`, timestamps
- `memberships` — `workspaceId`, `userId`, `role`, timestamps

Settings (`/settings`) can rename the workspace when the session has `workspace.update`. Slug remains stable. Account display name updates go through Better Auth / the `user` collection for the signed-in user only; email stays read-only in Settings.

## RBAC

Roles: `owner`, `admin`, `member`, `viewer`

Team management (Phase 10A) assigns `owner` | `member` | `viewer`. The stored `admin` role remains in the permission map (full access) for compatibility but is not offered in the Team UI.

Permissions:

- `workspace.read` / `workspace.update`
- `members.read` / `members.invite` / `members.update` / `members.remove`
- `customers.read` / `customers.create` / `customers.update`
- `products.read` / `products.create` / `products.update`
- `projects.read` / `projects.create` / `projects.update`
- `invoices.read` / `invoices.create` / `invoices.update`
- `payments.read` / `payments.create`

Role → permission mapping (centralized in `effectivePermissions`):

- **owner / admin** — all permissions, including member management
- **member** — business create/update + `members.read` (no invite/update/remove)
- **viewer** — read permissions only (`workspace.read`, `members.read`, domain `.read`)

Demo accounts are force-capped to viewer permissions in `effectivePermissions`.

## Workspace team members

Route:

- `/team` — authenticated workspace member list + owner management controls

Model (existing `memberships` collection):

- Fields: `workspaceId`, `userId`, `role`, timestamps
- Identity (name/email) is resolved from Better Auth `user` records — never duplicated into memberships
- Indexes: unique `{ workspaceId, userId }`, `{ workspaceId, createdAt }`, `{ userId }`

Operations (server-enforced):

- List / get members (`members.read`)
- Update role (`members.update`) among `owner` | `member` | `viewer`
- Remove member (`members.remove`)

Invariants:

- Workspace stays scoped to `session.workspace.id` (never client-supplied)
- At least one `owner` must remain (final-owner demote/remove blocked)
- Removed memberships lose workspace access on the next session resolution
- Email invitations are deferred; architecture leaves `members.invite` for a later phase

## Customers module

Routes:

- `/customers` — workspace-scoped list with server search + pagination
- `/customers/new` — create
- `/customers/[id]` — detail
- `/customers/[id]/edit` — update

Collection `customers` (MongoDB native driver):

- Tenant boundary: `workspaceId` from trusted session (never browser-supplied)
- Fields: `name`, `email`, `phone?`, `company?`, `address?`, `notes?`, `createdByUserId`, timestamps
- Indexes: `{ workspaceId, createdAt }`, unique `{ workspaceId, email }`, `{ workspaceId, name }`

Search strategy: bounded case-insensitive regex (`q` max 100 chars, escaped) across name, email, company, phone. No external search engine.

Pagination: server-side `page` + `pageSize` (default 20, max 50).

Delete is intentionally omitted — no established product delete pattern/permission yet.

Demo: read/search/detail allowed; create/update forbidden via `customers.create` / `customers.update`.

## Products module

Routes:

- `/products` — workspace-scoped list with server search + pagination
- `/products/new` — create
- `/products/[id]` — detail
- `/products/[id]/edit` — update

Collection `products` (MongoDB native driver):

- Tenant boundary: `workspaceId` from trusted session (never browser-supplied)
- Fields: `name`, `sku` (normalized uppercase), `description?`, `price`, `currency` (ISO 4217), `unit?`, `createdByUserId`, timestamps
- Indexes: `{ workspaceId, createdAt }`, unique `{ workspaceId, sku }`, `{ workspaceId, name }`
- Index ensure uses the same process-level shared promise pattern as Customers

Search strategy: bounded case-insensitive regex across name, SKU, description.

SKU uniqueness is enforced by application conflict checks and the unique compound index.

Delete is intentionally omitted — no established delete permission pattern.

Demo: read/search/detail allowed; create/update forbidden via `products.create` / `products.update`.

## Projects module

Routes:

- `/projects` — workspace-scoped list with server search + pagination
- `/projects/new` — create
- `/projects/[id]` — detail
- `/projects/[id]/edit` — update

Collection `projects` (MongoDB native driver):

- Tenant boundary: `workspaceId` from trusted session (never browser-supplied)
- Fields: `name`, `description?`, `status` (`planning` | `active` | `on_hold` | `completed`), `clientName?`, `startDate?` / `dueDate?` (UTC date-only), `createdByUserId`, timestamps
- Indexes: `{ workspaceId, createdAt }`, `{ workspaceId, name }`, `{ workspaceId, status }`
- Index ensure uses the same process-level shared promise pattern as Customers/Products

Search strategy: bounded case-insensitive regex across name, clientName, description.

Delete is intentionally omitted — no established delete permission pattern.

Demo: read/search/detail allowed; create/update forbidden via `projects.create` / `projects.update`.

## Invoices module

Routes:

- `/invoices` — workspace-scoped list with server search + pagination
- `/invoices/new` — create
- `/invoices/[id]` — detail
- `/invoices/[id]/edit` — update

Collection `invoices` (MongoDB native driver):

- Tenant boundary: `workspaceId` from trusted session (never browser-supplied)
- Fields: `invoiceNumber`, `customerId`, `customerNameSnapshot`, `status` (`draft` | `sent` | `paid` | `overdue`), dates, `currency`, `notes?`, `lineItems[]` (product snapshots + qty/price/lineTotal), `subtotal`, `total`, `createdByUserId`, timestamps
- Line items store product name/SKU/unitPrice snapshots so later product edits do not rewrite history
- Totals are calculated server-side from resolved products (browser totals are ignored)
- Invoice numbers (`INV-000001`) come from an atomic workspace counter in `counters` (`invoiceNumber:{workspaceId}`)
- Indexes: unique `{ workspaceId, invoiceNumber }`, `{ workspaceId, createdAt }`, `{ workspaceId, customerId }`, `{ workspaceId, status }`, `{ workspaceId, customerNameSnapshot }`

Search strategy: bounded case-insensitive regex across invoiceNumber and customerNameSnapshot.

Delete, PDF, email, tax, and discounts are intentionally omitted. Manual payments are handled by the Payments module.

Demo: read/search/detail allowed; create/update forbidden via `invoices.create` / `invoices.update`.

## Payments module

Routes:

- `/payments` — workspace-scoped list with server search + pagination
- `/payments/new` — record a payment against an invoice
- `/payments/[id]` — payment detail

Collection `payments` (MongoDB native driver):

- Tenant boundary: `workspaceId` from trusted session (never browser-supplied)
- Fields: `invoiceId`, `invoiceNumberSnapshot`, `customerId`, `customerNameSnapshot`, `amount`, `currency`, `paymentDate`, `method` (`cash` | `bank_transfer` | `card` | `other`), `reference?`, `notes?`, `createdByUserId`, timestamps
- Invoice ownership, currency, and remaining balance are resolved server-side
- Amounts use the same cents-safe helpers as invoices; browser amounts are validated then re-checked against remaining balance
- Overpayment and fully-paid follow-ups are rejected; settling remaining balance marks the invoice `paid`
- Indexes: `{ workspaceId, createdAt }`, `{ workspaceId, invoiceId }`, `{ workspaceId, customerId }`, `{ workspaceId, paymentDate }`
- Domain is provider-agnostic (manual methods now; Stripe/checkout can extend later without replacing the payment model)

Search strategy: bounded case-insensitive regex across invoiceNumberSnapshot, customerNameSnapshot, and reference.

No payment update/delete, gateways, webhooks, refunds, or subscriptions in this phase.

Demo: read/search/detail allowed; create forbidden via `payments.create`.

## Finance module

Route:

- `/finance` — financial command center composing the same workspace-scoped snapshot as Overview

Sections: KPI overview, revenue/invoicing summary, payment trend + recent payments, prioritized receivables (overdue → due soon → outstanding), recent activity timeline.

No separate finance collection. Permissions reuse `invoices.read` + `payments.read`. Invoice/payment CRUD stays under `/invoices` and `/payments`.

## Analytics module

Route:

- `/analytics` — decision-support workspace composing dashboard financial aggregations plus bounded customer/product/project insights

Sections: executive overview (period activity + entity counts), invoiced vs paid trend (daily for 7/30, weekly for 90), rule-based business signals, customer rankings (invoiced + outstanding), product rankings from invoice line-item snapshots, project status mix and due-soon/overdue list.

No analytics collection or BI warehouse. Monetary series stay on the primary currency (highest invoiced total); other currencies are listed separately without FX. Permissions compose `invoices.read`, `payments.read`, `customers.read`, `products.read`, and `projects.read`.

## Dashboard financial intelligence

Route:

- `/` — authenticated overview with workspace-scoped financial KPIs

Read path:

```text
Overview page
  → getDashboardFinancialSnapshotForSession(session, range)
  → Mongo aggregations on invoices + payments
```

Metrics (server-side, cents-safe, never mixed across currencies):

- **Total invoiced** — sum of non-draft invoice totals with `issueDate` in the selected UTC period
- **Total paid** — sum of payment amounts with `paymentDate` in the period
- **Outstanding** — remaining balance (`total − paid`) for non-draft invoices issued in the period
- **Overdue** — outstanding amount on invoices that are `status: overdue` or whose `dueDate` is before today UTC

Date range presets: last 7 / 30 / 90 days (default 30). Bounds are UTC calendar midnights.

UI panels: KPI cards, payment revenue trend (SVG bars, no chart library), outstanding invoices (prioritize overdue), recent payments, recent invoices. Lists are bounded; KPIs use aggregation pipelines with `$lookup` for payment sums.

Currency strategy: metrics grouped by invoice/payment currency; primary KPI currency is the one with the highest invoiced total. No FX conversion.

Demo: same read path; mutations remain blocked by viewer-capped permissions.

## Tenant isolation

Authorization path:

```text
Authenticated session
  → Authenticated user
  → Workspace membership lookup
  → Role
  → Permission
  → Resource access
```

Never authorize from browser-supplied tenant IDs alone.

## Request performance (auth hot path)

- `getSession` is wrapped in React `cache()` so multiple callers in one request share one Better Auth + workspace resolution.
- Anonymous requests without a Better Auth session cookie short-circuit before Mongo/`getSession` work. Cookie presence still requires Better Auth verification.
- Primary workspace resolution loads the earliest membership and its workspace in a single Mongo aggregation (not two serial queries).
- Customer/product/project/invoice/payment `createIndexes` is guarded process-wide; it is not re-run on every list/detail call after the first successful ensure in a warm runtime.
- Invoices include `{ workspaceId, issueDate }` for dashboard period aggregations.
- Dashboard financial snapshot loads invoice/payment aggregates and recent lists in parallel; trend series runs only for the primary currency.

## Email

`src/server/email` provides:

- `dev` provider for local/test capture
- `resend` provider for deployed email delivery

## Adding future modules

1. Create `src/features/<module>/`
2. Keep route entry points thin
3. Scope every query by session workspace id
4. Call `requirePermission(...)` before mutations
