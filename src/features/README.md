# Features

Domain UI modules live here. Trusted mutations and queries stay in `src/server/<domain>`.

Current modules:

```text
features/
  customers/
  products/
  projects/
  invoices/
  payments/
  dashboard/
  members/
  settings/
  finance/
  analytics/
  integrations/
```

Typical shape:

```text
features/<domain>/
  components/
  schemas/
  *-loading-state.tsx
  index.ts
```

Rules:

- Keep domain-specific UI inside the feature folder.
- Put shared primitives in `src/components/ui`.
- Put trusted server operations in `src/server/<domain>`.
- Never authorize from browser-supplied workspace or user identity.
