# Optional integrations

Everything here is optional. The app works without it, and **Settings > System** shows what is connected.
Add values in `.env.local` for local use and in Vercel's environment variables for the live site, then redeploy.

## Card payments (Stripe)

Invoices work without Stripe: record cash and in-person card payments by hand. To let customers pay online:

1. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set. Customer pay pages need it.
2. Create a Stripe account and copy the **test** secret key (Developers > API keys) into `STRIPE_SECRET_KEY`.
3. After the app is online, add a webhook (Developers > Webhooks) pointing at
   `https://YOUR-DOMAIN/api/stripe/webhook` for the `checkout.session.completed` event. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`. Even without the webhook, a payment is recorded when the customer returns to the
   thank-you page, so test mode works on localhost.
4. Try the test card `4242 4242 4242 4242`. Switch to the live key when ready.

Stripe charges its normal card fees. Refunds happen in the Stripe dashboard; then remove or adjust the payment
record in the app. Each shop uses its own Stripe account. Set `DEFAULT_TAX_PERCENT` and each invoice's rate to
what applies to the business.

## Customer email (Resend)

Create an account at resend.com, verify your sending domain, and create an API key. Set `RESEND_API_KEY` and
`EMAIL_FROM` (for example `"Your Shop <repairs@your-domain.com>"`). Until a domain is verified, Resend only delivers to
your own account email, which is fine for testing. Then choose stages under **Settings > Notifications**.

Messages are sent when a ticket moves forward to an enabled stage, only to customers with an email address who have
not been opted out. Nothing sends until a stage is switched on.

## Customer texts (Twilio)

Create a Twilio account and phone number, then set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and either
`TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`. In the US, carriers require business texting numbers to be
registered (A2P 10DLC) before delivery is reliable. Registration is done in the Twilio console and can take days.
Only text customers who agreed to it; the app requires that tick per customer.

## Keep-alive for the free Supabase plan

Supabase pauses free projects with little activity over a week. Once on Vercel, `vercel.json` schedules a daily call
to `/api/keepalive`, which runs a few small queries. It is protected by `CRON_SECRET`, which Vercel sends
automatically.

1. Set `CRON_SECRET` in Vercel to a long random string and redeploy.
2. Check Vercel > Settings > Cron Jobs to see it listed, and the logs after the first day.

Vercel's free plan runs cron jobs once a day within the scheduled hour and only on production deployments. As a
backup that does not depend on Vercel, `.github/workflows/keepalive.yml` pings the database from GitHub. Add
`SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository secrets to switch it on, and keep the repository private.

A paused project can be resumed from the Supabase dashboard and your data is kept. The free plan has no automatic
backups, so run `npm run backup` now and then.
