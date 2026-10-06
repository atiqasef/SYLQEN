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
  features/          Domain UI modules (customers, …)
  lib/
    auth.ts          Better Auth server instance
    auth-client.ts   Better Auth React client
  server/
    auth/            Session, permissions, demo, actions
    customers/       Customer repository + service + actions
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

## Email

`src/server/email` provides:

- `dev` provider for local/test capture
- `resend` provider for deployed email delivery

## Adding future modules

1. Create `src/features/<module>/`
2. Keep route entry points thin
3. Scope every query by session workspace id
4. Call `requirePermission(...)` before mutations
