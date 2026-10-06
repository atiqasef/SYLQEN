# SYLQEN

**AI-powered Business Operating System** — portfolio-grade multi-tenant foundation for operations, CRM, finance, teams, analytics, automation, and AI assistance.

> Current status: **Phase 2 — Identity, authentication, email verification, and workspace core.**

Production: [https://sylqen.vercel.app](https://sylqen.vercel.app)

## Product vision

SYLQEN brings together operations, customers, projects, tasks, finance, invoices, payments, team management, analytics, automation, AI assistance, integrations, notifications, client portals, and API access in one calm, enterprise-grade product experience.

## What works today

### Phase 1

- Next.js App Router foundation
- Design system + app shell
- Theme system
- Server boundaries, logging, AI abstraction
- Testing/docs baseline

### Phase 2

- Better Auth email/password authentication
- Email verification gate before app access
- Google OAuth integration boundary
- Secure sessions + logout
- MongoDB-backed users/sessions (Better Auth) + workspaces/memberships
- Default workspace creation for verified users
- RBAC (`owner`, `admin`, `member`, `viewer`)
- Tenant isolation principles enforced in server auth helpers
- Read-only demo account support via environment configuration
- Premium login/register/verify/reset experiences

## Not implemented yet

- CRM/customers/projects/finance modules
- Stripe billing
- Full organization administration UI
- Real AI assistance product surfaces
- Client portal

## Technology stack

- Next.js 16 (App Router, React Server Components)
- React 19 + React Compiler
- TypeScript (strict)
- Tailwind CSS 4
- Better Auth
- MongoDB Node.js driver
- Resend (optional email provider)
- Zod, Vitest, Testing Library

## Getting started

```bash
npm install
cp .env.example .env.local
# set MONGODB_URI + BETTER_AUTH_SECRET + BETTER_AUTH_URL
npm run dev
```

See [docs/development.md](docs/development.md) for full environment setup, Google OAuth, Resend, and demo account configuration.

## Testing

```bash
npm run test:run
npm run typecheck
npm run lint
npm run build
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [AI architecture](docs/ai-architecture.md)
- [Development](docs/development.md)

## License

Private / unpublished unless otherwise specified.
