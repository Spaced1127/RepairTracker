# Repair Bench: guide for AI assistants and developers

Work-order tracking app for video game repair shops. Next.js 15 (App Router), React 19, Tailwind 4, Supabase
(Postgres, Auth, Storage), Stripe, Resend, Twilio. One deployment per shop. Read `docs/ARCHITECTURE.md` for the
folder map and how to do common changes.

## Commands

- `npm run check`: typecheck plus tests. **Run before saying a change is done.**
- `npm run build`: production build (needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set to anything).
- `npm run build:sql`: regenerate `supabase/setup.sql` after touching migrations.
- `npm run migrate`, `npm run backup`, `npm run setup`: operate on the database named in `.env.local`. Do not run them
  against a customer's database unless asked.

## Rules that must hold

1. **Money is integer cents.** Never use floats for stored amounts.
2. **Database changes are new numbered migration files.** Never edit a released migration. Update
   `LATEST_MIGRATION` in `lib/version.ts` and run `npm run build:sql`. Tests enforce numbering and bundle freshness.
3. **Every table gets row-level security** and a policy in the same migration. A test enforces it.
4. **The service-role key (`lib/supabase/admin.ts`) is only for** the public pay page, status page, Stripe webhook and
   keep-alive route. Never use it in client components or for staff pages.
5. **Staff writes go through server actions** in `app/actions.ts`. Validate input, then `revalidatePath` what changed.
   Customer-facing actions are in `app/pay/actions.ts` and recompute amounts from the database, never from the form.
6. **Customer-facing pages use unguessable tokens** and must not show internal notes, costs or photos.
7. **Show dates in the shop's time zone** using `lib/util.ts`. Never use the server's local time.
8. **Notifications must never block the main action.** Catch errors and log them to the ticket's history.
9. **Do not add dependencies casually.** The code runs on customers' accounts.
10. **Keep copy plain and sentence case.** No jargon in customer-facing text.

## Making a change

1. Find the code using the table in `docs/ARCHITECTURE.md`.
2. Make the smallest change that works. Match the surrounding style (Tailwind classes from `components/ui.tsx`).
3. Add or update a test in `tests/` when changing logic in `lib/`.
4. Run `npm run check`, and `npm run build` for page or route changes.
5. Add a line to `CHANGELOG.md`. Bump `version` in `package.json` for anything customers will install.
6. If a database change is involved, say plainly that shops must run `npm run migrate`.

## Not done yet (do not assume it exists)

Multiple shops in one deployment, user roles or a staff allow-list, currencies other than USD, languages other than
English, photo files in `npm run backup`.
