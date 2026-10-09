import { createClient } from "@/lib/supabase/server";
import { saveStatusTemplate } from "@/app/actions";
import { Card, Check, Field, PageHeader, field, btnPrimary } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { StatusPill } from "@/components/status";
import { emailConfigured, smsConfigured } from "@/lib/notify";
import type { Status } from "@/lib/types";

const PLACEHOLDERS = ["first_name", "customer_name", "ticket_number", "device", "status", "status_link", "shop_name"];

function Banner({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${ok ? "border-[#4cc24a]/40 bg-[#4cc24a]/10 text-[#4cc24a]" : "border-line text-mute"}`}>{children}</p>
  );
}

export default async function NotificationSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("statuses").select("*").order("position");
  const statuses = (data ?? []) as Status[];

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" />
      <SettingsTabs active="notifications" />

      <p className="text-mute">
        Choose which stages message the customer. Nothing is sent until you tick a stage. Messages go out when a ticket moves forward to that stage,
        and only to customers who have an email address and haven&apos;t opted out (texts also need the customer to have agreed to them).
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Banner ok={emailConfigured()}>{emailConfigured() ? "Email sending is connected." : "Email is not set up yet. Messages will be logged as skipped."}</Banner>
        <Banner ok={smsConfigured()}>{smsConfigured() ? "Text sending is connected." : "Texting is not set up yet. Messages will be logged as skipped."}</Banner>
      </div>

      <Card className="text-sm">
        <p className="mb-2 font-medium">Placeholders you can use</p>
        <p className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => <code key={p} className="rounded bg-bench px-1.5 py-0.5 font-mono text-xs text-solder">{`{{${p}}}`}</code>)}
        </p>
        <p className="mt-2 text-xs text-mute">{"{{status_link}}"} is a page where the customer can follow their repair, without logging in.</p>
      </Card>

      {statuses.map((s) => (
        <form key={s.id} action={saveStatusTemplate}>
          <Card className="space-y-4">
            <input type="hidden" name="id" value={s.id} />
            <h2 className="flex items-center gap-3 text-lg font-semibold"><StatusPill status={s} /></h2>

            <div className="space-y-3">
              <Check name="notify_email" label="Email the customer at this stage" defaultChecked={s.notify_email} />
              <Field label="Email subject"><input name="email_subject" defaultValue={s.email_subject} className={field} /></Field>
              <Field label="Email message"><textarea name="email_body" rows={6} defaultValue={s.email_body} className={field} /></Field>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <Check name="notify_sms" label="Text the customer at this stage" defaultChecked={s.notify_sms} />
              <Field label="Text message" hint="Shorter is better. Long texts are split into several messages.">
                <textarea name="sms_body" rows={3} defaultValue={s.sms_body} className={field} />
              </Field>
            </div>

            <button className={btnPrimary}>Save {s.name}</button>
          </Card>
        </form>
      ))}
    </div>
  );
}
