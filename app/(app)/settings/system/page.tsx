import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { appliedSchema, signupsOpen } from "@/lib/health";
import { emailConfigured, smsConfigured } from "@/lib/notify";
import { APP_VERSION, LATEST_MIGRATION } from "@/lib/version";

type Row = { title: string; state: "ok" | "warn" | "off"; detail: string };

const COLOR = { ok: "#4CC24A", warn: "#FF8A5B", off: "#8D95AA" } as const;
const LABEL = { ok: "Good", warn: "Needs attention", off: "Not set up" } as const;

export default async function SystemPage() {
  const supabase = await createClient();
  const [{ error: dbError }, signups, schema] = await Promise.all([
    supabase.from("statuses").select("id", { head: true, count: "exact" }),
    signupsOpen(),
    appliedSchema(),
  ]);

  const rows: Row[] = [
    dbError
      ? { title: "Database", state: "warn", detail: `Could not read the database: ${dbError.message}` }
      : { title: "Database", state: "ok", detail: "Connected." },
    signups === true
      ? { title: "New sign-ups", state: "warn", detail: "Sign-ups are OPEN, so anyone could create an account and see your data. In Supabase go to Authentication > Sign In / Providers and turn off \"Allow new users to sign up\"." }
      : signups === false
        ? { title: "New sign-ups", state: "ok", detail: "Closed. Only accounts you create can log in." }
        : { title: "New sign-ups", state: "warn", detail: "Could not check. Confirm in Supabase (Authentication > Sign In / Providers) that \"Allow new users to sign up\" is off." },
    schema.upToDate === true
      ? { title: "Database version", state: "ok", detail: `Up to date (${schema.latest}).` }
      : schema.upToDate === false
        ? { title: "Database version", state: "warn", detail: `The database is at ${schema.latest} but this app expects ${LATEST_MIGRATION}. Run \`npm run migrate\`. See docs/UPDATING.md.` }
        : { title: "Database version", state: "off", detail: "Not tracked. Expected if you set up by pasting SQL by hand, or if the service key isn't set." },
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { title: "Customer pages", state: "ok", detail: "Payment and status pages for customers can load." }
      : { title: "Customer pages", state: "warn", detail: "SUPABASE_SERVICE_ROLE_KEY is missing, so customer payment and status links will not work." },
    process.env.CRON_SECRET
      ? { title: "Keep-alive job", state: "ok", detail: "Secret is set. Check Vercel > Settings > Cron Jobs to confirm it runs daily." }
      : { title: "Keep-alive job", state: "off", detail: "CRON_SECRET is not set. Free Supabase projects pause after a week of inactivity without it." },
    process.env.STRIPE_SECRET_KEY
      ? { title: "Card payments", state: process.env.STRIPE_WEBHOOK_SECRET ? "ok" : "warn", detail: process.env.STRIPE_WEBHOOK_SECRET ? "Stripe is connected." : "Stripe key is set, but no webhook secret. Payments are still recorded when customers return to the thank-you page." }
      : { title: "Card payments", state: "off", detail: "Optional. Customers can view invoices but not pay online." },
    emailConfigured()
      ? { title: "Customer email", state: "ok", detail: "Connected." }
      : { title: "Customer email", state: "off", detail: "Optional. Set RESEND_API_KEY and EMAIL_FROM to send status emails." },
    smsConfigured()
      ? { title: "Customer texts", state: "ok", detail: "Connected." }
      : { title: "Customer texts", state: "off", detail: "Optional. Set the Twilio values to send texts." },
    process.env.NEXT_PUBLIC_TIMEZONE
      ? { title: "Time zone", state: "ok", detail: process.env.NEXT_PUBLIC_TIMEZONE }
      : { title: "Time zone", state: "warn", detail: "NEXT_PUBLIC_TIMEZONE is not set, so dates default to America/New_York." },
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" />
      <SettingsTabs active="system" />
      <p className="text-mute">Repair Bench version {APP_VERSION}. This page checks that everything is connected correctly.</p>
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.title} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3.5">
              <span className="w-40 shrink-0 font-medium">{r.title}</span>
              <span className="min-w-0 flex-1 text-sm text-mute">{r.detail}</span>
              <span className="rounded border px-1.5 py-0.5 text-xs font-medium" style={{ color: COLOR[r.state], borderColor: `${COLOR[r.state]}66` }}>{LABEL[r.state]}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
