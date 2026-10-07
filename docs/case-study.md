# SYLQEN — SaaS Architecture Case Study

A portfolio case study in designing and building a production-oriented, multi-tenant Business Operating System.

Live product: [https://sylqen.vercel.app](https://sylqen.vercel.app)  
Repository overview: [README](../README.md)

---

## 1. Project Overview

SYLQEN is an AI-ready Business Operating System for small teams and agencies that need customers, projects, invoices, payments, financial visibility, team access, integrations status, and lightweight automation in one workspace.

It is intentionally scoped as a coherent SaaS product rather than a feature checklist. The engineering focus is tenancy, authorization, financial integrity, and extensibility — with honest boundaries around what is deferred (live Stripe, live AI providers, workers/cron).

**Primary audience for this case study:** hiring managers, technical founders, and agencies evaluating fullstack SaaS engineering judgment.

---

## 2. Problem

Operational work fragments quickly:

- Customer and project context lives in spreadsheets or chat
- Invoices and payments drift from catalog prices and each other
- Dashboards invent FX rates or mix currencies
- “Admin UI” often hides buttons but still trusts the browser for tenant identity
- Automation and AI get bolted on as vendor SDKs without clear domain seams

The product problem is a single workspace for operations and money. The engineering problem is making that workspace trustworthy under multi-tenant load and future feature growth.

---

## 3. Goals

1. Ship a usable multi-tenant SaaS with real business modules
2. Enforce workspace isolation and RBAC on the server
3. Keep invoice/payment math cents-safe and historically stable
4. Prefer server-first Next.js patterns over client-owned business truth
5. Leave clear extension points for AI and payments providers without fake “connected” states
6. Prove quality with Vitest + Playwright + typecheck + lint + production build
7. Deploy a portfolio demo that remains read-only for protected mutations

Non-goals for this milestone: ERP depth, payroll, inventory, banking, marketplace billing, visual workflow builders, and unsupported scale claims.

---

## 4. Architecture

```text
Browser
  → Next.js App Router (RSC + client islands)
  → Server Actions / thin route handlers
  → Domain services (`src/server/<domain>`)
  → Workspace-scoped repositories
  → MongoDB Atlas (native Node.js driver)
```

Supporting layers:

- **Auth** — Better Auth (sessions, password hashing, optional Google OAuth)
- **Validation** — Zod at mutation boundaries
- **UI modules** — `src/features/*` forms, tables, and presentation
- **Integrations catalog** — static server catalog + deployment-derived status (no secrets in DTOs)
- **Automations** — declarative rules processed synchronously after trusted domain events
- **AI** — `AIProvider` abstraction with mock support; disabled by default

Feature folders stay thin at the route layer. Business rules live in services so Playwright and Vitest can exercise the same trust boundaries the product uses.

Details: [architecture.md](./architecture.md)

---

## 5. Multi-Tenancy

Every tenant-scoped record carries `workspaceId` resolved from the authenticated session membership — never from a browser-supplied tenant ID as authority.

```text
Session → user → membership → role → permissions → resource access
```

Repositories scope list/get/update by session workspace. Cross-workspace IDs fail closed (`NOT_FOUND` where appropriate) to avoid existence leaks. Compound unique indexes (for example email/SKU/invoice number per workspace) keep uniqueness tenant-local.

Demo accounts are marked and force-capped to viewer permissions in `effectivePermissions`, so read-only behavior cannot be bypassed by UI tricks.

---

## 6. Authentication & Authorization

- **Better Auth** owns credential and session cryptography
- App layouts re-validate sessions; proxy cookie checks are optimistic only
- Email verification is optional in the current portfolio stage (policy can tighten later)
- Roles: `owner`, `member`, `viewer` in the Team UI (`admin` remains in the permission map for compatibility)
- Permissions such as `customers.create`, `payments.create`, `automations.update` are checked in services via `requirePermission`
- Last-owner invariants prevent demoting or removing the final workspace owner

UI permission awareness improves UX; **server authorization is the source of truth**.

---

## 7. Financial Domain

| Concern | Approach |
| --- | --- |
| Money | Integer cents-safe helpers — avoid floating-point drift |
| Invoice lines | Snapshot product name/SKU/unit price at write time |
| Totals | Calculated server-side from resolved products; browser totals ignored |
| Invoice numbers | Atomic per-workspace counters (`INV-000001`, …) |
| Payments | Validate invoice ownership, currency match, remaining balance; reject overpayment |
| Reporting | Currency-aware aggregations; no FX conversion |
| Periods | UTC calendar bounds for 7 / 30 / 90 day ranges |

The **Payments** module is an internal business domain (cash, bank transfer, card, other). It is **not** Stripe Checkout. Stripe appears in Integrations as reserved infrastructure only.

Finance and Analytics compose dashboard snapshot aggregations rather than inventing separate warehouses.

---

## 8. Automation Engine

Model: Trigger → flat AND Conditions → Action, stored per workspace.

| Area | Current scope |
| --- | --- |
| Triggers | `invoice.overdue`, `payment.received`, `customer.created`, `project.status_changed` |
| Conditions | Flat AND list (bounded) |
| Actions | `notification.create` → internal `automation_notifications` |
| Execution | Synchronous after trusted domain mutations |
| Idempotency | Unique `(workspaceId, automationId, eventKey)` |
| Failure | Recorded on executions; does not break the primary mutation |

Deferred on purpose: cron/background overdue scanners, queues/workers, Slack/email/webhook/task actions, and a full notification inbox product.

`invoice.overdue` is evaluated when invoices are created or updated (due date / status). Overnight scanning is not implemented.

---

## 9. Analytics & Finance

Both modules are read models over existing invoice, payment, customer, product, and project data.

- **Finance** — KPIs, revenue/invoicing summary, payment trend, prioritized receivables, recent activity
- **Analytics** — executive overview, invoiced vs paid trend, customer/product rankings from snapshots, project status mix, rule-based signals

Permissions compose existing domain `.read` capabilities. No separate analytics collection. Primary currency is chosen by highest invoiced total; other currencies remain visible without mixing.

---

## 10. Performance

Optimizations that exist in the codebase (no invented benchmarks):

- React `cache()` around session resolution so layout + page share one auth/workspace lookup per request
- Anonymous requests without a session cookie short-circuit before full session work
- Primary workspace resolution via a single aggregation where applicable
- Process-level index ensure guards (safety net; Atlas indexes remain the production source of truth)
- Dashboard aggregates and recent lists loaded in parallel
- Server-side pagination/search with page size caps — no full-collection browser loads

Regional alignment for the live portfolio deployment: Vercel Functions in `bom1` with MongoDB Atlas in `ap-south-1`. Region pins are configuration, not application code.

---

## 11. Security

Practices emphasized in this project:

- Trusted session identity; no authoritative browser tenant IDs
- Workspace-scoped repositories and fail-closed cross-tenant access
- Zod validation + server re-checks for money and ownership
- Demo write rejection on the server
- Safe `AppError.userMessage` responses; redacted structured logging
- Secrets via environment only; integration status never returns API keys
- Automation failure messages sanitized for UI history

Not claimed: SOC 2, GDPR certification, penetration testing, or absolute security guarantees.

Details: [security.md](./security.md)

---

## 12. Testing Strategy

| Layer | Tooling | Intent |
| --- | --- | --- |
| Unit / integration | Vitest + mongodb-memory-server | Domain rules, isolation, permissions, money |
| E2E | Playwright | Auth, CRUD modules, demo read-only, responsive smoke |
| Static | TypeScript + ESLint | Shape and lint regressions |
| Build | `next build` | Route compile + production bundle |

Verified counts at the Phase 18 polish milestone: **220** Vitest tests across **58** files; **38** Playwright tests. Playwright never targets production Atlas/Vercel.

---

## 13. Production Deployment

| Component | Choice |
| --- | --- |
| Application | Next.js on Vercel |
| Database | MongoDB Atlas |
| Auth | Better Auth with Mongo adapter |
| Email | Optional Resend; `dev` capture locally |
| Demo | Environment-configured Explore Demo entry |

Configuration checklist: [development.md](./development.md#vercel-configuration). Secrets are not published in documentation.

---

## 14. Engineering Trade-offs

| Decision | Trade-off |
| --- | --- |
| Native Mongo driver | More explicit tenancy control; more repository boilerplate than an ORM |
| Sync automations | Simple and testable; not a substitute for durable workers |
| No FX | Honest multi-currency reporting; no single “world total” |
| Optional email verification | Faster portfolio onboarding; stronger verification can be re-enabled |
| Stripe reserved, not live | Avoids fake billing claims; Payments domain stays provider-agnostic |
| Mock AI | Architecture readiness without pretending live model output |
| No delete/bulk yet | Reduces accidental data-loss surface until product patterns exist |
| Internal automation notifications | Useful execution proof without shipping a full inbox product |

These are deliberate scope boundaries, not unfinished TODOs presented as features.

---

## 15. Future Scope

Labeled as future work — **not implemented**:

- Live Stripe Checkout / subscription billing product flows
- Real AI provider integration (OpenAI, Claude, etc.) and AI product surfaces
- Background workers / cron (including scheduled overdue scanning)
- Richer notification product UI
- External automation actions (email, Slack, webhooks, tasks)
- Per-workspace OAuth installs (Slack, Google Calendar, QuickBooks, …)
- Email invitations and richer organization admin
- API key / developer platform
- PDF invoices, tax/discounts, deletes/bulk actions, client portal

---

## Related documentation

- [Architecture](./architecture.md)
- [Security](./security.md)
- [AI architecture](./ai-architecture.md)
- [Development](./development.md)
- [Screenshot plan](./screenshots.md)
