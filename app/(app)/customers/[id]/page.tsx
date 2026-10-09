import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customer-form";
import { StatusPill } from "@/components/status";
import { PageHeader, Card, btnPrimary } from "@/components/ui";
import { deviceName, fmtDate } from "@/lib/util";
import type { Customer, TicketFull } from "@/lib/types";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: c }, { data: tk }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const tickets = (tk ?? []) as TicketFull[];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={(c as Customer).name}>
        <Link href={`/tickets/new?customer=${id}`} className={btnPrimary}>New ticket for this customer</Link>
      </PageHeader>
      <CustomerForm customer={c as Customer} />
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Repair history</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-mute">No tickets yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-solder">
                  <span>
                    <span className="font-mono text-sm text-mute">#{t.ticket_number}</span>{" "}
                    {deviceName(t.device)}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-mute">{fmtDate(t.created_at)} <StatusPill status={t.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
