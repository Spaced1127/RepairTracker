# Repair Bench (phase 1)

Work-order tracking for a console repair shop. Next.js 15, Tailwind 4, Supabase.

Phase 1: login, customers, devices, tickets, a customizable status workflow, a timestamped work log, and search/filter/sort.

Phase 2: intake/before/after photos with captions, a before-and-after compare view, a printable work order
(use the print dialog's Save as PDF to export), and QR ticket labels in three sizes.

Phase 3: dashboard with open tickets, received and finished counts, open tickets by stage, a 14-day chart, and aging tickets.

Phase 4: parts inventory with low-stock flags, parts used per ticket (stock updates automatically), labor charge, and profit per repair.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema**: open SQL Editor, paste `supabase/migrations/0001_init.sql`, run it. Then do the same
   with `supabase/migrations/0002_ticket_photos.sql` (photo storage) `0003_dashboard.sql` (dashboard), and `0004_parts.sql` (parts inventory), `0005_invoices.sql` (invoices and payments), and `0006_notifications.sql` (customer notifications).
3. **Lock down sign-ups**: Authentication > Sign In / Providers > turn off "Allow new users to sign up".
4. **Create your login**: Authentication > Users > Add user (email and password, tick "Auto confirm").
5. **Configure env**: copy `.env.example` to `.env.local` and fill in the project URL and anon key
   (Project Settings > API). Set `NEXT_PUBLIC_TIMEZONE` to your IANA time zone.
6. **Run locally**: `npm install && npm run dev`, then open http://localhost:3000.

## Deploy

Push to GitHub, import the repo in Vercel, and add the same env vars in the Vercel project settings.

## Notes

- Every table has row-level security: only signed-in users can read or write. Step 3 matters, because
  an open sign-up would let anyone create an account and see your data.
- Search and sorting run in the app over the 1,000 most recently updated tickets. Move this
  into SQL if the shop grows far past that.
- Adding staff later: create more users in Supabase Auth. All signed-in users currently have full access.

## Invoices and online payments (phase 5)

Invoices work without Stripe: create one from a ticket, edit the lines, and record cash or in-person card
payments by hand. Customers can also view the invoice at its pay link.

To let customers pay by card online:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Supabase > Project Settings > API > service_role). This key bypasses
   row-level security, so keep it server-side only. Add it to Vercel's environment variables too.
2. Create a Stripe account and copy your **test** secret key (Developers > API keys) into `STRIPE_SECRET_KEY`.
3. After deploying, add a webhook in Stripe (Developers > Webhooks) pointing at
   `https://YOUR-DOMAIN/api/stripe/webhook` for the `checkout.session.completed` event, and put its signing secret
   in `STRIPE_WEBHOOK_SECRET`. (Even without the webhook, a payment is recorded when the customer lands back on the
   thank-you page, so test mode works on localhost.)
4. Use the test card 4242 4242 4242 4242 to try it. Switch to your live key when you are ready.

Stripe charges its normal card fees on each online payment. Refunds are done in the Stripe dashboard; remove or
adjust the payment record in the app afterwards. Sales tax rules vary, so set `DEFAULT_TAX_PERCENT` and each
invoice's rate based on what applies to your business.

## Customer notifications (phase 6)

Every ticket gets a public status page (no login) that you can send to the customer, and each stage can message
the customer automatically. Nothing is sent until you switch a stage on under **Settings > Notifications**.

- Messages go out when a ticket moves **forward** to a stage that has messaging enabled. Moving a ticket backwards
  never sends anything. The note form on a ticket has a checkbox to skip the message for one change.
- Customers can be opted out of email, and texting only happens for customers marked as having agreed to texts.
- Every message, including skipped and failed ones, shows in the ticket's message history.
- You can also send one-off emails or texts from a ticket.

**Email (Resend).** Create an account at resend.com, add and verify your sending domain, create an API key, then set
`RESEND_API_KEY` and `EMAIL_FROM` (for example `"Your Shop <repairs@your-domain.com>"`) in `.env.local` and in Vercel.
Until a domain is verified, Resend only delivers to your own account email, which is fine for testing.

**Texts (Twilio).** Create a Twilio account and a phone number, then set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
and `TWILIO_FROM_NUMBER` (or `TWILIO_MESSAGING_SERVICE_SID`). In the US, carriers require business texting numbers
to be registered (A2P 10DLC) before messages are reliably delivered. Registration is done in the Twilio console and
can take days to be approved, so expect failures or blocks until then. Only text customers who agreed to it.
