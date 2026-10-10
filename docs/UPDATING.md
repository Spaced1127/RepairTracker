# Updating to a new version

Each release is listed in [CHANGELOG.md](../CHANGELOG.md), including any database changes.

## Before you update

1. Run `npm run backup`. The free Supabase plan has no automatic backups, and database changes are forward-only.
2. Read the changelog entry. Note whether it lists new migration files.

## Route A: you used `npm run setup`

1. Copy the new project files over your folder. **Keep your `.env.local`.**
2. Run `npm install` (in case dependencies changed).
3. Run `npm run migrate`. It applies only the new database changes, each one all-or-nothing.
4. Run `npm run dev` and look around, then push to GitHub. Vercel redeploys automatically.
5. Check **Settings > System**: "Database version" should say Up to date.

## Route B: you pasted SQL by hand

1. Copy the new project files over your folder and push to GitHub so Vercel redeploys.
2. For each migration file the changelog lists (in `supabase/migrations/`), paste it into the Supabase SQL Editor and
   run it, **in number order**. Skip any you have already run.

Do not mix routes. If you later want to use `npm run migrate` on a database you set up by hand, first make sure
it has every migration, then run `npm run migrate -- --baseline` once. That records them without running them.

## If a migration fails

`npm run migrate` rolls the failing file back, names it, and stops, so the database is left as it was. Send the
message to whoever supports you. Do not edit migration files that have already been applied.

## Making your own changes safely

See [ARCHITECTURE.md](ARCHITECTURE.md). In short: make the change, run `npm run check`, and add a database change
only as a new numbered migration file.
