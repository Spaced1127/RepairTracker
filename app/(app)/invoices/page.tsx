import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, field, btnGhost } from "@/components/ui";
import { InvoiceBadge } from "@/components/invoice-badge";
import { invoiceState, totals } from "@/lib/invoice";
import { dayKey, fmtDate, usd, weekStartKey } from "@/lib/util";
import type { Invoice, InvoiceItem, Payment } from "@/lib/types";

type Row = Invoice & {
  customer: { name: string } | null;
  ticket: { id: string; ticket_number: number } | null;
  items: InvoiceItem[];
  payments: Payment[];
};

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ show?: string; q?: string }> }) {
  const sp = await searchParams;
  const show = sp.show ?? "unpaid";
  const q = (sp.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, customer:customers(name), ticket:tickets(id, ticket_number), items:invoice_items(*), payments(*)")
    .order("issued_at", { ascending: false })
    .limit(1000);

  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const t = totals(r.items, r.tax_percent, r.payments);
    return { r, t, state: invoiceState(r, t) };
  });

  const outstanding = rows.filter((x) => x.state === "unpaid" || x.state === "partial");
  const owed = outstanding.reduce((n, x) => n + x.t.balance, 0);
  const weekStart = weekStartKey(dayKey(new Date()));
  const collectedWeek = rows.flatMap((x) => x.r.payments).filter((p) => dayKey(p.paid_at) >= weekStart).reduce((n, p) => n + p.amount_cents, 0);

  let list = rows;
  if (show === "unpaid") list = outstanding;
  else if (show === "paid") list = rows.filter((x) => x.state === "paid");
  else if (show === "void") list = rows.filter((x) => x.state === "void");
  if (q) list = list.filter((x) => [String(x.r.invoice_number), x.r.customer?.name, String(x.r.ticket?.ticket_number)].some((v) => v?.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader title="Invoices" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-sm text-mute">Owed to you</p><p className={`font-display text-3xl font-bold ${owed > 0 ? "text-solder" : ""}`}>{usd(owed)}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">Unpaid invoices</p><p className="font-display text-3xl font-bold">{outstanding.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">Collected since Monday</p><p className="font-display text-3xl font-bold">{usd(collectedWeek)}</p></Card>
      </div>

      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_11rem_auto]">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search invoice, ticket, or customer" aria-label="Search invoices" className={field} />
        <select name="show" defaultValue={show} aria-label="Filter invoices" className={field}>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
          <option value="all">All</option>
        </select>
        <button className={btnGhost}>Apply</button>
      </form>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-mute">
          No invoices here. Create one from a ticket with the Invoice button.
        </p>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {list.map(({ r, t, state }) => (
              <li key={r.id}>
                <Link href={`/tickets/${r.ticket_id}/invoice`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-panel2">
                  <span className="font-mono text-sm text-mute">#{r.invoice_number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.customer?.name ?? "Customer"}</span>
                    <span className="block text-xs text-mute">Ticket #{r.ticket?.ticket_number}, issued {fmtDate(r.issued_at)}</span>
                  </span>
                  <span className="font-mono text-sm">{usd(t.total)}</span>
                  <span className="w-24 text-right font-mono text-sm text-mute">{state === "paid" || state === "void" ? "" : `${usd(t.balance)} due`}</span>
                  <InvoiceBadge state={state} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
