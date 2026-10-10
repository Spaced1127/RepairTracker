# Repair Bench

Work-order tracking for video game console repair shops. Tickets, customers, devices, photos, parts, invoices,
card payments, and customer updates, in one dark, phone-friendly app that each shop runs as its own copy.

**Features:** customizable status workflow, intake and before/after photos with a compare view, timestamped work
log, parts inventory with low-stock flags and profit per repair, invoices with Stripe card payments, customer
email/text updates and a public status page, printable work orders, QR ticket labels, dashboard.

**Built with:** Next.js 15, React 19, Tailwind 4, Supabase (Postgres, Auth, Storage), Stripe, Resend, Twilio.

## Install it (about 15 minutes)

You need [Node.js 20+](https://nodejs.org) and a free [Supabase](https://supabase.com) project.

```
npm install
npm run setup      # asks a few questions, builds the database, creates your login
npm run dev        # then open http://localhost:3000
```

No terminal? There is a paste-the-SQL route. Both are walked through step by step in **[docs/DEPLOY.md](docs/DEPLOY.md)**,
including putting it online with Vercel.

## Commands

| Command | What it does |
|---|---|
| `npm run setup` | Guided first-time setup (settings, database, login) |
| `npm run migrate` | Applies new database changes after an update |
| `npm run backup` | Saves all your data to JSON files in `backups/` |
| `npm run dev` | Runs the app locally |
| `npm run check` | Typecheck and tests. Run this before shipping any change |
| `npm run build:sql` | Regenerates `supabase/setup.sql` after adding a migration |

## Documentation

- [docs/DEPLOY.md](docs/DEPLOY.md): install and go live, for shop owners
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md): Stripe, email, texts, and the keep-alive job
- [docs/UPDATING.md](docs/UPDATING.md): installing a new version safely
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the code is organized, and how to change things
- [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md): ways to offer this to other shops, costs, and legal checklist
- [CLAUDE.md](CLAUDE.md): rules for AI assistants (and a good checklist for people) working on the code
- [CHANGELOG.md](CHANGELOG.md): what changed in each version

After it is running, open **Settings > System** in the app. It checks your connection, flags unsafe settings, and
shows what is not set up yet.
