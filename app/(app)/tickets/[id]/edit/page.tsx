import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateTicket } from "@/app/actions";
import { Card, Field, PageHeader, field, btnPrimary, btnGhost } from "@/components/ui";
import { ConsoleSelect } from "@/components/console-select";
import type { TicketFull } from "@/lib/types";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const t = data as TicketFull;

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ticket #${t.ticket_number}`} />
      <form action={updateTicket} className="space-y-5">
        <input type="hidden" name="ticket_id" value={t.id} />
        <input type="hidden" name="device_id" value={t.device_id} />
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ConsoleSelect consoleType={t.device.console_type} model={t.device.model} />
            <Field label="Serial number"><input name="serial_number" defaultValue={t.device.serial_number ?? ""} className={`${field} font-mono`} /></Field>
            <Field label="Accessories received"><input name="accessories" defaultValue={t.device.accessories ?? ""} className={field} /></Field>
          </div>
          <Field label="Condition notes"><textarea name="condition_notes" rows={3} defaultValue={t.device.condition_notes ?? ""} className={field} /></Field>
          <Field label="Reported issue"><textarea name="issue" required rows={4} defaultValue={t.issue} className={field} /></Field>
          <div className="grid max-w-lg gap-4 sm:grid-cols-2">
            <Field label="Estimate (USD)">
              <input name="estimate" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={t.estimate_cents != null ? (t.estimate_cents / 100).toFixed(2) : ""} className={field} />
            </Field>
            <Field label="Labor charge (USD)" hint="Used for profit on the ticket">
              <input name="labor" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={t.labor_cents != null ? (t.labor_cents / 100).toFixed(2) : ""} className={field} />
            </Field>
          </div>
        </Card>
        <div className="flex gap-2">
          <button className={btnPrimary}>Save changes</button>
          <Link href={`/tickets/${t.id}`} className={btnGhost}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
