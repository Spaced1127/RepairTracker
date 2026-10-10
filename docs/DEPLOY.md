# Installing Repair Bench

Each shop runs its own copy, with its own database and its own logins. Pick one route for the database setup, then
put the app online.

You need: a free Supabase account, a free GitHub account, and a Vercel account. Screens change now and then, so
button labels here may differ a little.

## Step 1. Create the database project

1. In Supabase, click **New project**. Name it, pick the region nearest you, and set a database password. **Save the
   password somewhere safe.**
2. Wait a minute or two for it to finish starting.

## Step 2. Set up the database and your login (choose A or B)

### Route A: guided (recommended)

Needs Node.js 20 or newer installed on your computer.

1. Unzip the project, open a terminal in that folder (on Windows, type `powershell` in the folder's address bar).
2. Run `npm install`, then `npm run setup`.
3. Answer the questions. You will paste values from Supabase:
   - **Project URL, anon key, service_role key:** Project Settings > API.
   - **Database connection string:** click **Connect** at the top and copy the **Session pooler** string. Replace
     `[YOUR-PASSWORD]` with your database password. Use the pooler string, because the direct address often fails
     on home internet connections.
4. The command creates every table, creates your login, and writes a `.env.local` file with your settings.

### Route B: no terminal

1. In Supabase, open **SQL Editor > New query**. Open `supabase/setup.sql` from this project in Notepad, copy
   everything, paste it in, and press **Run**. Do this on a brand-new project only.
2. Go to **Authentication > Users > Add user**, enter your email and a password, and tick **Auto Confirm User**.
3. You will enter your settings in Vercel in step 4 instead of a file.

## Step 3. Close sign-ups (important)

In Supabase, go to **Authentication > Sign In / Providers** and turn **off** "Allow new users to sign up".

If you skip this, anyone who finds your site could create an account and see your customers. The app shows a red
warning on the dashboard until it is closed.

## Step 4. Put it online with Vercel

1. Create a **private** repository on GitHub and upload the project to it. The `.gitignore` already keeps
   `.env.local` out.
2. In Vercel: **Add New > Project**, import that repository. Leave the framework as Next.js.
3. Open **Environment Variables** before deploying and add these:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
| `NEXT_PUBLIC_SHOP_NAME` | Your shop's name |
| `NEXT_PUBLIC_TIMEZONE` | For example `America/Chicago` |
| `CRON_SECRET` | Any long random string (keeps the free database awake, see [INTEGRATIONS](INTEGRATIONS.md)) |

   If you used Route A, the same values are in your `.env.local`. Do not add `DATABASE_URL` to Vercel.
4. Click **Deploy**. When it finishes, open your new address and log in.
5. Open **Settings > System**. Everything you need should say **Good**. Items marked Not set up are optional.

Variables starting with `NEXT_PUBLIC_` are baked in when the app is built, so after changing one in Vercel you
must **Redeploy**.

## Step 5. First things to do in the app

- **Settings > Statuses:** rename or reorder the repair stages to match how you work.
- **Settings > Notifications:** choose which stages message the customer.
- Add your parts under **Parts**, and create a test ticket to look around.
- Optional extras: [card payments, email, texts](INTEGRATIONS.md).

## Costs to expect

Free plans work to start, with limits: Supabase pauses an inactive free project (the keep-alive job prevents this),
and Vercel's free plan is intended for non-commercial use, so a business should expect to need its paid plan.
Check both providers' current pricing and terms. Stripe, Resend and Twilio charge per payment or message.

## If something goes wrong

- **Settings > System** shows what is misconfigured.
- Cannot log in: confirm the user exists under Authentication > Users and the email is confirmed.
- Setup cannot connect to the database: use the Session pooler string, and check the password has no stray spaces.
- Pages show errors after deploying: a Vercel environment variable is usually missing. Add it and redeploy.
