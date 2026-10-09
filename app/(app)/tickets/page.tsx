import { createClient } from "@/lib/supabase/server";
import { TicketCard } from "@/components/ticket-card";
import { PageHeader, field, btnGhost } from "@/components/ui";
import type { Status, TicketFull } from "@/lib/types";

type SP = { q?: string; status?: string; sort?: string };

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = sp.status ?? "open";
  const sort = sp.sort ?? "updated";

  const supabase = await createClient();
  const [{ data: st }, { data: tk }] = await Promise.all([
    supabase.from("statuses").select("*").order("position"),
    supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)")
      .order("updated_at", { ascending: false }).limit(1000),
  ]);
  const statuses = (st ?? []) as Status[];
  let tickets = (tk ?? []) as TicketFull[];

  if (statusFilter === "open") tickets = tickets.filter((t) => !t.status.is_closed);
  else if (statusFilter !== "all") tickets = tickets.filter((t) => t.status_id === statusFilter);

  if (q) {
    tickets = tickets.filter((t) =>
      [String(t.ticket_number), t.customer.name, t.customer.phone, t.customer.email, t.device.console_type, t.device.model, t.device.serial_number, t.issue]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }

  const order = new Map(statuses.map((s) => [s.id, s.position]));
  tickets.sort((a, b) => {
    switch (sort) {
      case "newest": return +new Date(b.created_at) - +new Date(a.created_at);
      case "oldest": return +new Date(a.created_at) - +new Date(b.created_at);
      case "customer": return a.customer.name.localeCompare(b.customer.name);
      case "status": return (order.get(a.status_id) ?? 0) - (order.get(b.status_id) ?? 0);
      default: return +new Date(b.updated_at) - +new Date(a.updated_at);
    }
  });

  return (
    <>
      <PageHeader title="Tickets" />
      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_11rem_10rem_auto]">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, phone, serial, ticket number" aria-label="Search tickets" className={field} />
        <select name="status" defaultValue={statusFilter} aria-label="Filter by status" className={field}>
          <option value="open">All open</option>
          <option value="all">Everything</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort tickets" className={field}>
          <option value="updated">Recently updated</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="status">By stage</option>
          <option value="customer">By customer</option>
        </select>
        <button className={btnGhost}>Apply</button>
      </form>

      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-mute">
          No tickets match. Create one with New ticket, or widen the filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => <TicketCard key={t.id} t={t} statuses={statuses} />)}
        </div>
      )}
    </>
  );
}
