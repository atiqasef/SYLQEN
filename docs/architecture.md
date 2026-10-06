# SYLQEN Architecture

Phase 1 establishes a scalable foundation for a multi-tenant SaaS Business Operating System. It intentionally stops short of business modules.

## Directory structure

```text
src/
  app/           Next.js App Router routes, layouts, loading/error boundaries
  components/    Shared UI and shell composition
    ui/          Design-system primitives
    layout/      Application shell (sidebar, header, theme, account menu)
    feedback/    Empty, error, and loading presentations
    providers/   Client providers (theme)
  features/      Domain modules (empty in Phase 1; grow here later)
  lib/           Shared, environment-agnostic utilities
    utils/       Helpers such as `cn`
    validation/  Zod parsing helpers and Result types
    errors/      Safe application error model
    motion/      Motion principles and reusable class tokens
  server/        Server-only boundaries (`import "server-only"`)
    ai/          AI provider abstraction + mock
    auth/        Session/identity boundary (not implemented yet)
    db/          Database client boundary (not connected yet)
    logging/     Structured logger with secret redaction
  types/         Shared domain types safe for client + server
  config/        Site config and typed environment access
```

## Why this structure exists

- **Clear ownership**: UI, domain features, and trusted server logic do not collapse into one folder.
- **Server-first**: Data access, auth, AI, and logging stay behind `src/server` so secrets and trust boundaries are hard to violate accidentally.
- **Feature growth**: Future CRM/finance/project modules land in `src/features/<module>` without rewriting the shell.
- **Design consistency**: Shared primitives live in `components/ui`; product chrome lives in `components/layout`.

## Where code belongs

| Concern | Location |
| --- | --- |
| Buttons, inputs, dialogs | `src/components/ui` |
| Sidebar / header / shell | `src/components/layout` |
| Customer-specific screens (future) | `src/features/customers` |
| Mongo repositories (future) | `src/server/db` or `src/features/<module>/server` |
| Shared helpers | `src/lib` |
| Env / product constants | `src/config` |
| Cross-cutting TS types | `src/types` |

## Adding a future module

1. Create `src/features/<module>/`.
2. Keep route entry points thin in `src/app`.
3. Put schemas next to the feature.
4. Put privileged mutations in server modules and derive identity from session context.
5. Reuse design-system primitives; avoid one-off visual systems.

## Rendering model

- Prefer React Server Components by default.
- Use Client Components only for interactivity (theme, menus, dialogs, mobile nav).
- Avoid global client state until a concrete cross-page need appears.
