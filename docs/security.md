# SYLQEN Security Principles

These principles apply from Phase 1 onward, even before authentication and persistence are implemented.

## Never trust browser-supplied tenant identity

Future server operations must derive the authenticated user and workspace from a **trusted server session**.

Do **not**:

- Accept `userId`, `workspaceId`, or `organizationId` from request bodies/query params as the sole authorization source
- Authorize using client-provided role claims
- Filter multi-tenant data using unverified IDs from the browser

Do:

- Read session context on the server (`src/server/auth`)
- Scope every repository query by the session workspace
- Treat client IDs as hints at most, never as authority

## Environment secrets

- Commit `.env.example` only
- Never commit `.env` or real credentials
- Prefix only public values with `NEXT_PUBLIC_`
- Keep MongoDB, auth, Stripe, email, and AI keys server-only

## Error disclosure

- Return safe user-facing messages via `AppError.userMessage`
- Log internal details with the structured logger
- Never expose stack traces, secrets, tokens, or raw database errors to clients

## Logging hygiene

The logger redacts keys that look like passwords, secrets, tokens, API keys, cookies, or credentials. Prefer structured context over free-form dumps of request objects.

## Multi-tenancy

Every tenant-scoped record must carry workspace/organization identity. Isolation is enforced in server data access, not in the UI.

## Authentication boundary

Phase 1 provides types and session helpers without fake login behavior. When auth is added:

- Sessions are server-validated
- Roles/permissions are evaluated server-side
- Client portals and API access receive separate authz paths
