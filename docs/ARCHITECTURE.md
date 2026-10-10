# Architecture and how to change things

## The shape of the app

One Next.js app (App Router) talking to one Supabase project. There is no separate backend.

- **Pages** are server components that read from Supabase and render HTML.
- **Changes** go through **server actions** in `app/actions.ts` (staff) and `app/pay/actions.ts` (customers).
  Forms post straight to these functions.
- **Security** is enforced by the database. Every table has row-level security, and staff access is "any signed-in
  user". Staff pages use the signed-in user's own session, so the database decides what they may see.
- **Three things run without a login** and therefore use the service-role key through `lib/supabase/admin.ts`:
  the customer pay page (`app/pay`), the customer status page (`app/status`), and the Stripe webhook
  (`app/api/stripe`). Each is addressed by an unguessable token, never by a database id. `app/api/keepalive` is
  protected by `CRON_SECRET`. Never import the admin client anywhere else.
- **Photos** are uploaded straight from the browser to a private Supabase Storage bucket, then linked by a server action.

## Folder map

| Path | What lives there |
|---|---|
| `app/(app)/` | Staff pages behind login: dashboard, tickets, customers, parts, invoices, settings |
| `app/pay/`, `app/status/` | Public customer pages (token addressed) |
| `app/api/` | Stripe webhook and keep-alive endpoints |
| `app/actions.ts` | All staff write operations, grouped by area (tickets, parts, invoices, notifications...) |
| `components/` | Shared UI. `ui.tsx` has the buttons, fields and cards |
| `lib/` | Logic without UI: `invoice.ts` (totals), `notify.ts` (email/SMS), `util.ts` (money, dates), `consoles.ts` |
| `lib/supabase/` | `server.ts` (staff session), `client.ts` (browser), `admin.ts` (service role) |
| `supabase/migrations/` | The database, as numbered SQL files. `setup.sql` is generated from them |
| `scripts/` | `setup`, `migrate`, `backup`, `build-sql` commands |
| `tests/` | Unit tests for the logic in `lib/` and for the migration files |
| `middleware.ts` | Redirects logged-out visitors to `/login`. Lists the public paths |

## Conventions

- **Money is whole cents** (integers) everywhere in code and database. Convert only at the edges (`usd()`, form parsing).
- **Dates are shown in the shop's time zone** (`NEXT_PUBLIC_TIMEZONE`) using the helpers in `lib/util.ts`.
  Never compare dates with the server's local time.
- **Database changes are new numbered files** in `supabase/migrations/`. Never edit a migration that has been released.
- **Every new table needs row-level security.** A test fails if one is missing.
- **Notifications must never block the action that triggered them.** Wrap them in try/catch (see `applyStatus`).
- Keep customer-visible pages free of internal data (notes, costs, photos).

## Making a database change

1. Add `supabase/migrations/000N_short_name.sql`. Include `enable row level security` and a policy for any new table.
2. Update `LATEST_MIGRATION` in `lib/version.ts`.
3. Run `npm run build:sql` to refresh `supabase/setup.sql`.
4. Update the types in `lib/types.ts` and the code that uses the change.
5. Run `npm run check`. Add a line to `CHANGELOG.md` and bump `version` in `package.json`.
6. Existing shops apply it with `npm run migrate`. See [UPDATING.md](UPDATING.md).

## Common changes

| I want to... | Change this |
|---|---|
| Rename the shop, set the time zone | `NEXT_PUBLIC_SHOP_NAME`, `NEXT_PUBLIC_TIMEZONE` (then redeploy) |
| Change the colors | The `@theme` block in `app/globals.css`. `--color-solder` is the main accent |
| Change fonts | The `<link>` in `app/layout.tsx` and `--font-*` in `globals.css` |
| Add or edit consoles in the dropdown | `lib/consoles.ts` (and `CONSOLE_COLORS` in `lib/util.ts` for a new brand) |
| Change repair stages or email wording | In the app: Settings > Statuses and Notifications. No code needed |
| Add a field to tickets or customers | Migration, `lib/types.ts`, the form component, the matching action in `app/actions.ts`, then show it on the page |
| Add a new page | Folder with `page.tsx` under `app/(app)/`, a link in `components/nav.tsx` |
| Change label sizes | The `SIZES` table in `app/(app)/tickets/[id]/label/page.tsx` |
| Change what the work order or invoice prints | `.../print/page.tsx` for each |
| Change the currency or language | Not yet configurable. Dollars and English are assumed in `lib/util.ts`, Stripe calls and the pages |

## Known limits (worth knowing before selling it)

- **One shop per deployment.** No multi-tenancy. See [DISTRIBUTION.md](DISTRIBUTION.md).
- **Every signed-in user has full access.** There are no roles. Safety depends on sign-ups being closed (the app warns
  when they are open). A staff allow-list in the database policies would remove that dependency.
- **USD and English only.**
- Ticket and customer search runs in the app over the 1,000 most recently updated tickets, which suits a single shop.
- Backups cover database tables, not photo files.
