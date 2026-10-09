import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adjustStock, setPartArchived } from "@/app/actions";
import { PartForm } from "@/components/part-form";
import { Card, Field, PageHeader, field, btnPrimary, btnGhost } from "@/components/ui";
import { fmtDate, usd } from "@/lib/util";
import type { Part } from "@/lib/types";

type Use = { id: string; qty: number; created_at: string; ticket: { id: string; ticket_number: number } | null };

export default async function PartPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: uses }] = await Promise.all([
    supabase.from("parts").select("*").eq("id", id).maybeSingle(),
    supabase.from("ticket_parts").select("id, qty, created_at, ticket:tickets(id, ticket_number)").eq("part_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  if (!data) notFound();
  const part = data as Part;
  const used = (uses ?? []) as unknown as Use[];
  const margin = part.price_cents > 0 ? Math.round(((part.price_cents - part.cost_cents) / part.price_cents) * 100) : null;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={part.name}>
        <Link href="/parts" className={btnGhost}>Back to parts</Link>
      </PageHeader>
      {part.archived && <p className="rounded-md border border-line px-3 py-2 text-sm text-mute">This part is archived and hidden from the parts list and ticket picker.</p>}
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Stock</h2>
          <p className="font-display text-3xl font-bold">{part.stock}</p>
        </div>
        <p className="text-sm text-mute">
          Cost {usd(part.cost_cents)}, price {usd(part.price_cents)}
          {margin !== null && `, margin ${margin}%`}. Using a part on a ticket takes it out of stock automatically.
        </p>
        <form action={adjustStock} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={part.id} />
          <div className="w-44">
            <Field label="Change stock by" hint="Negative removes">
              <input name="delta" type="number" required placeholder="+5 or -1" className={field} />
            </Field>
          </div>
          <button className={`${btnPrimary} mb-5`}>Update stock</button>
        </form>
      </Card>

      <PartForm part={part} />

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Recent use</h2>
        {used.length === 0 ? (
          <p className="text-sm text-mute">Not used on any ticket yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {used.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                {u.ticket ? <Link href={`/tickets/${u.ticket.id}`} className="font-mono hover:text-solder">Ticket #{u.ticket.ticket_number}</Link> : <span>Ticket</span>}
                <span className="text-mute">{u.qty} used, {fmtDate(u.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <form action={setPartArchived}>
        <input type="hidden" name="id" value={part.id} />
        <input type="hidden" name="archived" value={String(!part.archived)} />
        <button className={btnGhost}>{part.archived ? "Restore part" : "Archive part"}</button>
      </form>
    </div>
  );
}
