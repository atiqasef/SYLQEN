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
