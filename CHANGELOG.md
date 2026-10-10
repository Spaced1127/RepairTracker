# Changelog

## 1.0.0

First packaged release.

**Features:** tickets with customizable statuses and a timestamped work log; customers and devices with a console
dropdown; intake and before/after photos with a compare view; dashboard; printable work orders; QR ticket labels;
parts inventory with low-stock flags and profit per repair; invoices, manual payments and Stripe card payments;
customer email and text updates with per-stage templates; public customer status page; daily keep-alive for free
Supabase projects.

**Tooling:** `npm run setup`, `migrate`, `backup`, `build:sql`, `check`; Settings > System health page; unit tests and
CI; documentation in `docs/`.

**Database migrations:** `0001_init` through `0006_notifications`. New installs get all of them from `npm run setup`
or `supabase/setup.sql`.

**Upgrading from the pre-release build:** if you set up the database by pasting SQL, run
`npm run migrate -- --baseline` once to record the existing migrations. `0001_init` no longer asks for the unused
`pgcrypto` extension; databases that already ran it are unaffected.
