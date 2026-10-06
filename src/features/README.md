# Features

Feature modules belong here as the product grows.

Recommended shape for a future module (for example `customers`):

```text
features/customers/
  components/
  hooks/
  schemas/
  server/
  types.ts
  index.ts
```

Rules:

- Keep UI specific to a domain inside the feature folder.
- Put shared UI primitives in `src/components/ui`.
- Put trusted server operations in `src/server` or `features/<name>/server`.
- Do not fetch tenant identity from the browser for authorization decisions.
