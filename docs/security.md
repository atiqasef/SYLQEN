# SYLQEN Security Principles

These principles apply from Phase 1 onward and are enforced in Phase 2 identity/workspace code.

## Never trust browser-supplied tenant identity

Server operations must derive the authenticated user and workspace from a **trusted server session**.

Do **not**:

- Accept `userId`, `workspaceId`, or `organizationId` from request bodies/query params as the sole authorization source
- Authorize using client-provided role claims
- Filter multi-tenant data using unverified IDs from the browser

Do:

- Read session context on the server (`src/server/auth/session.ts`)
- Resolve membership with `userId` from the session + target workspace
- Evaluate permissions with `canPerform` / `requirePermission`
- Treat client IDs as hints at most, never as authority

Cross-workspace access must fail closed with a safe `FORBIDDEN` response.

## Authentication

- Better Auth handles password hashing, sessions, verification tokens, and OAuth
- Email/password accounts require email verification before app access
- Google OAuth uses server-side client secrets only
- Auth cookies are managed by Better Auth (`nextCookies` for server actions)
- Proxy/middleware cookie checks are optimistic only; layouts re-validate sessions

## Email verification

- Ownership is proven by clicking a verification link, not by email-format checks
- Any legitimate provider (Gmail, Outlook, Yahoo, custom domains) is acceptable
- Verification and reset tokens are never written to application logs

## Demo account

- Demo credentials are environment-configured (`DEMO_EMAIL`, `DEMO_PASSWORD`)
- Demo users are marked `isDemo: true`
- Authorization caps demo identities to viewer/read-only permissions on the server
- UI hiding is not sufficient authorization

## Environment secrets

- Commit `.env.example` only
- Never commit `.env`, `.env.local`, or real credentials
- Prefix only public values with `NEXT_PUBLIC_`
- Keep MongoDB, Better Auth, Google, Resend, and demo passwords server-only

## Error disclosure

- Return safe user-facing messages via `AppError.userMessage`
- Log internal details with the structured logger
- Never expose stack traces, secrets, tokens, or raw database errors to clients

## Logging hygiene

The logger redacts keys that look like passwords, secrets, tokens, API keys, cookies, or credentials. Prefer structured context over free-form dumps of request objects.

## Multi-tenancy

Every tenant-scoped record must carry workspace identity. Isolation is enforced in server data access, not in the UI.

Customer and product records are scoped by `workspaceId` from the trusted session. List/get/create/update ignore any browser-supplied workspace/owner identifiers. Cross-workspace access returns `NOT_FOUND` (no existence leak across tenants for foreign IDs). Product SKUs are unique per workspace via compound unique index.
