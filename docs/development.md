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

1. Register with any email provider address
2. Open verification email:
   - `EMAIL_PROVIDER=dev` captures messages in memory
   - set `EMAIL_CAPTURE_TO_DISK=true` to write `.local/emails/*.json` for manual link copying
3. Verify email and confirm default workspace creation
4. Sign out / sign in
5. Optional: Explore Demo when demo env vars are set
6. Optional: Google sign-in when Google credentials are set

## Customers module (local)

1. Sign in as a normal user
2. Open **Customers** from the primary nav
3. Create / search / paginate / edit / open detail
4. Sign in via **Explore Demo** and confirm create/edit are blocked while list/detail remain readable

Tenant isolation and demo write rejection are covered by Vitest (`src/server/customers/service.test.ts`) and Playwright (`e2e/customers.spec.ts`).

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
