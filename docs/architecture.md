# SYLQEN Architecture

Phase 1 established the scalable foundation. Phase 2 adds identity, verification, sessions, and multi-tenant workspace core.

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
  features/          Domain UI modules (customers, products, projects, invoices, …)
  lib/
    auth.ts          Better Auth server instance
    auth-client.ts   Better Auth React client
  server/
    auth/            Session, permissions, demo, actions
    customers/       Customer repository + service + actions
    products/        Product repository + service + actions
    projects/        Project repository + service + actions
    invoices/        Invoice repository + service + actions
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
- Email verification required before application access
- Password hashing/session crypto remain inside Better Auth

## Workspaces

After verified registration (or verified social sign-in):

1. Create default workspace
2. Attach owner membership
3. Derive future resource tenancy from that workspace

Collections:

- `workspaces` — `name`, `slug`, `ownerId`, timestamps
- `memberships` — `workspaceId`, `userId`, `role`, timestamps

## RBAC

Roles: `owner`, `admin`, `member`, `viewer`

Permissions:

- `workspace.read` / `workspace.update`
- `members.read` / `members.invite` / `members.update` / `members.remove`
- `customers.read` / `customers.create` / `customers.update`
- `products.read` / `products.create` / `products.update`
- `projects.read` / `projects.create` / `projects.update`
- `invoices.read` / `invoices.create` / `invoices.update`

Demo accounts are force-capped to viewer permissions in `effectivePermissions`.

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

Delete, payments, PDF, email, tax, and discounts are intentionally omitted.

Demo: read/search/detail allowed; create/update forbidden via `invoices.create` / `invoices.update`.

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
- Customer/product/project/invoice `createIndexes` is guarded process-wide; it is not re-run on every list/detail call after the first successful ensure in a warm runtime.

## Email

`src/server/email` provides:

- `dev` provider for local/test capture
- `resend` provider for deployed email delivery

## Adding future modules

1. Create `src/features/<module>/`
2. Keep route entry points thin
3. Scope every query by session workspace id
4. Call `requirePermission(...)` before mutations
