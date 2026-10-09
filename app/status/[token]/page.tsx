import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusTrack } from "@/components/status-track";
import { StatusPill } from "@/components/status";
import { totals } from "@/lib/invoice";
import { SHOP_NAME, deviceName, fmtDate, usd } from "@/lib/util";
import { btnPrimary } from "@/components/ui";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tickets")
    .select("id, ticket_number, updated_at, status_id, status:statuses(*), device:devices(console_type, model)")
    .eq("track_token", token)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: st }, { data: inv }] = await Promise.all([
    admin.from("statuses").select("id, name, color, position, is_closed").order("position"),
    admin.from("invoices").select("pay_token, tax_percent, status, items:invoice_items(qty, unit_price_cents), payments(amount_cents)").eq("ticket_id", t.id).maybeSingle(),
  ]);
  // Closed stages like "Closed" add little for a customer; keep the track to the repair journey.
  const statuses = ((st ?? []) as (Status & { is_closed: boolean })[]).filter((s) => !s.is_closed || s.id === t.status_id);
  const status = t.status as unknown as Status;
  const device = t.device as unknown as { console_type: string; model: string | null };
  const bal = inv ? totals(inv.items, inv.tax_percent, inv.payments).balance : 0;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="font-display text-xl font-bold">{SHOP_NAME}</p>
      <h1 className="mt-1 text-3xl font-bold">Repair status</h1>
      <p className="mt-1 text-mute">{deviceName(device)}, ticket #{t.ticket_number}</p>

      <section className="mt-6 space-y-5 rounded-2xl border border-line bg-panel/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusPill status={status} />
          <span className="text-sm text-mute">Last updated {fmtDate(t.updated_at)}</span>
        </div>
        <StatusTrack statuses={statuses} currentId={t.status_id} />
      </section>

      {inv && inv.status === "open" && bal > 0 && (
        <section className="mt-5 rounded-2xl border border-line bg-panel/90 p-5">
          <p className="text-sm text-mute">Balance due</p>
          <p className="mb-3 font-display text-3xl font-bold">{usd(bal)}</p>
          <Link href={`/pay/${inv.pay_token}`} className={btnPrimary}>View invoice</Link>
        </section>
      )}
    </main>
  );
}
