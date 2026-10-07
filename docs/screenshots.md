# Screenshot plan

SYLQEN does not currently check screenshot image assets into the repository (aside from `src/app/icon.svg`). Use this plan when capturing portfolio visuals from the live demo or a local seed workspace.

## Capture guidelines

- Prefer the **Explore Demo** workspace so visuals are realistic and read-only
- Desktop width ~1280–1440px; optionally add one mobile capture (390px) of Overview or Customers
- Light theme by default for consistency; one dark-theme optional shot of Overview is fine
- Avoid including personal emails, secrets, or non-demo credentials in the frame
- Store future assets under `docs/assets/screenshots/` (create when adding files)
- Prefer PNG or WebP; keep each file under ~500KB when practical

## Recommended set

| # | Screen | Route | Suggested filename | Notes |
| --- | --- | --- | --- | --- |
| 1 | Dashboard / Overview | `/` | `01-dashboard.png` | KPIs + recent activity visible |
| 2 | Customers | `/customers` | `02-customers.png` | List with search; avoid empty-only if demo has data |
| 3 | Invoices | `/invoices` | `03-invoices.png` | Status badges readable |
| 4 | Payments | `/payments` | `04-payments.png` | List or detail with invoice linkage |
| 5 | Finance | `/finance` | `05-finance.png` | Receivables priority visible |
| 6 | Analytics | `/analytics` | `06-analytics.png` | Trend + signals section |
| 7 | Team | `/team` | `07-team.png` | Membership list |
| 8 | Automations | `/automations` | `08-automations.png` | Rules list; no fake “connected” banners |
| 9 | Integrations | `/integrations` | `09-integrations.png` | Stripe reserved / Resend / AI statuses accurate |
| 10 | Settings | `/settings` | `10-settings.png` | Workspace + account sections |

## README integration (when assets exist)

Once files are added under `docs/assets/screenshots/`, link them from the README Screenshots section, for example:

```markdown
![Dashboard](docs/assets/screenshots/01-dashboard.png)
```

Do not invent image paths in the README before the files exist.

## Optional detail shots

- Invoice detail with line-item snapshots
- Automation detail with execution history
- Integration detail (`/integrations/stripe` or `/integrations/resend`) showing reserved vs configured copy
