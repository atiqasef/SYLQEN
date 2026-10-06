# Development Guide

## Prerequisites

- Node.js 20+ (Node 22/26 supported in this environment)
- npm 10+

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript project check |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest single run |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

## Environment

See `.env.example`. Public variables use `NEXT_PUBLIC_`. Server secrets never do.

Typed access lives in `src/config/env.ts`.

## Architecture docs

- [Architecture](./architecture.md)
- [Security](./security.md)
- [AI architecture](./ai-architecture.md)

## Testing approach

Phase 1 keeps a small, meaningful suite:

- Utility / validation behavior
- Theme provider smoke coverage
- UI primitive rendering
- AI mock provider behavior
- Environment parsing

Prefer focused unit tests over brittle full-app snapshots. Async Server Components are better covered later with end-to-end tests.

## Coding conventions

- Server Components by default; `"use client"` only when needed
- Shared visuals through design tokens / UI primitives
- Feature code grows under `src/features`
- Trusted logic stays under `src/server`
- No `any` unless a documented boundary requires it
