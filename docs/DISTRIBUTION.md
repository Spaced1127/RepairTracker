# Offering Repair Bench to other shops

How you offer it changes how much work it is for you. This is a practical comparison, not legal advice. Check prices
and terms with each provider, since they change.

## What the code is today

One copy of the app per shop, each with its own Supabase project, Vercel project and Stripe account. This keeps
shops' data fully separate and means a problem in one shop cannot touch another. It is also why there is a
guided installer, a migration command and a backup command.

## Three ways to offer it

### 1. You install it for each shop (white glove)
You, or a call with the owner, run through [DEPLOY.md](DEPLOY.md) in about an hour. Best for the first handful of
shops: you learn what they need, they never touch code, and the source stays with you.
- The shop creates its own Supabase and Vercel accounts and gives you access, or you create them in your name and
  hand over later. Billing stays with whoever owns the accounts.
- You are on the hook for updates ([UPDATING.md](UPDATING.md)), so decide whether that is a paid support plan.
- A free Supabase account is limited to two active free projects, so hosting several shops in your own account
  means paying for each project.

### 2. Shops install it themselves
Share the code through a private repository or the zip. Works for shops with a technically comfortable owner.
They can see and change the source, so your license terms matter (see below). Support tends to be heavier.

### 3. One shared service for all shops (multi-tenant)
You run a single deployment and shops sign up. This is the model that scales to many shops and gives you one place to
update, but it is a major rebuild, not a setting. It needs a shops table and memberships, a shop id on every table
with row-level security rules per shop, per-shop settings, Stripe Connect so each shop is paid directly, per-shop
storage paths, a signup and billing flow for your own subscriptions, and a migration for existing data. It also
makes you responsible for every shop's customer data. Worth doing once several shops want it.

## Typical monthly costs per shop (verify before quoting)

| Item | Free | Paid |
|---|---|---|
| Supabase | Pauses when inactive, no automatic backups | About $25 per project |
| Vercel | Intended for non-commercial use | About $20 per user |
| Resend (email) | Free tier for low volume | Per volume |
| Twilio (texts) | None | Per message, plus number and registration |
| Stripe | None | Per card payment |

## Before you sell it: checklist

- **License.** `LICENSE` currently says all rights reserved with a placeholder. Put in your name or business and
  decide what customers may do (use only? modify? resell?). Have a lawyer write a real license or terms of service.
- **Dependencies.** The main libraries (Next.js, React, Supabase, Stripe, Tailwind and others) are commonly under
  permissive licenses, but confirm each one in `package.json` before commercial distribution.
- **Privacy and data.** If you host shops' data, you are handling their customers' names, phones, emails and photos.
  You will need a privacy policy and a data-processing agreement, and a plan for deleting a shop's data on request.
- **Texting.** Customers must agree to receive texts, and US carriers require registered business numbers. Texts are
  off until a shop sets them up. Keep it that way.
- **Payments.** Card details never touch the app (Stripe's page handles them). Each shop should use its own Stripe account.
- **Support and updates.** Decide who applies updates, how quickly security fixes go out, and what you promise.
- **Backups.** The free database has none. Offer `npm run backup` on a schedule, or put shops on a paid database.
- **Security.** Closing sign-ups is the main safeguard today. Before selling widely, move to a database allow-list of
  staff (see the limits in [ARCHITECTURE.md](ARCHITECTURE.md)), and consider a security review.
