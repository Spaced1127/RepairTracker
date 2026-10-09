import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { accentFor, addDays, dayKey, deviceName, fmtDate, fmtDayKey, weekStartKey } from "@/lib/util";
import { invoiceState, totals } from "@/lib/invoice";
import { usd } from "@/lib/util";
import type { Invoice, InvoiceItem, Part, Payment, Status, TicketFull } from "@/lib/types";

const AGING_DAYS = 7;
const DAY_MS = 86_400_000;

function Tile({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-mute">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-xs text-mute">{note}</p>
    </Card>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: st }, { data: tk }, { data: pr }, { data: iv }] = await Promise.all([
    supabase.from("statuses").select("*").order("position"),
    supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)")
      .order("created_at", { ascending: false }).limit(2000),
    supabase.from("parts").select("*").eq("archived", false).order("name"),
    supabase.from("invoices").select("*, customer:customers(name), items:invoice_items(*), payments(*)").order("issued_at").limit(1000),
  ]);
  type InvRow = Invoice & { customer: { name: string } | null; items: InvoiceItem[]; payments: Payment[] };
  const unpaid = ((iv ?? []) as unknown as InvRow[])
    .map((r) => ({ r, t: totals(r.items, r.tax_percent, r.payments) }))
    .filter(({ r, t }) => ["unpaid", "partial"].includes(invoiceState(r, t)) && t.balance > 0);
  const owed = unpaid.reduce((n, x) => n + x.t.balance, 0);
  const allParts = (pr ?? []) as Part[];
  const lowParts = allParts.filter((p) => p.stock <= p.low_stock_at).sort((a, b) => a.stock - b.stock);
  const statuses = (st ?? []) as Status[];
  const tickets = (tk ?? []) as TicketFull[];

  const now = new Date();
  const today = dayKey(now);
  const weekStart = weekStartKey(today);

  const open = tickets.filter((t) => !t.status.is_closed);
  const receivedToday = tickets.filter((t) => dayKey(t.created_at) === today).length;
  const receivedWeek = tickets.filter((t) => dayKey(t.created_at) >= weekStart).length;
  const finishedToday = tickets.filter((t) => t.completed_at && dayKey(t.completed_at) === today).length;
  const finishedWeek = tickets.filter((t) => t.completed_at && dayKey(t.completed_at) >= weekStart).length;

  const ageDays = (iso: string) => Math.floor((+now - +new Date(iso)) / DAY_MS);
  const aging = open.filter((t) => ageDays(t.created_at) >= AGING_DAYS)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

  // Pipeline: open tickets per stage
  const stages = statuses.filter((s) => !s.is_closed).map((s) => ({ s, n: open.filter((t) => t.status_id === s.id).length }));

  // 14-day activity
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const activity = days.map((d) => ({
    d,
    received: tickets.filter((t) => dayKey(t.created_at) === d).length,
    finished: tickets.filter((t) => t.completed_at && dayKey(t.completed_at) === d).length,
  }));
  const peak = Math.max(1, ...activity.map((a) => Math.max(a.received, a.finished)));

  return (
    <>
      <PageHeader title="Dashboard">
        <p className="text-sm text-mute">{fmtDate(now.toISOString())}</p>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Open tickets" value={open.length} note={`${tickets.length} tickets all time`} />
        <Tile label="Received today" value={receivedToday} note={`${receivedWeek} since Monday`} />
        <Tile label="Finished today" value={finishedToday} note={`${finishedWeek} since Monday`} />
        <Tile
          label={`Open ${AGING_DAYS}+ days`}
          value={aging.length}
          note={aging.length ? `Oldest is ${ageDays(aging[0].created_at)} days` : "Nothing is aging"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Open tickets by stage</h2>
          {open.length === 0 ? (
            <p className="text-sm text-mute">No open tickets. New ones appear here as they come in.</p>
          ) : (
            <>
              <div className="mb-4 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Open tickets by stage">
                {stages.filter((x) => x.n > 0).map(({ s, n }) => (
                  <span key={s.id} style={{ flex: n, background: s.color }} title={`${s.name}: ${n}`} />
                ))}
              </div>
              <ul className="divide-y divide-line">
                {stages.map(({ s, n }) => (
                  <li key={s.id}>
                    <Link href={`/tickets?status=${s.id}`} className="flex min-h-11 items-center gap-3 py-2 hover:text-solder">
                      <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1">{s.name}</span>
                      <span className={`font-mono text-sm ${n ? "" : "text-mute"}`}>{n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-semibold">Last 14 days</h2>
          <p className="mb-4 flex gap-4 text-xs text-mute">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-mute/60" />Received</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-solder" />Finished</span>
          </p>
          <div className="flex h-36 items-end gap-1" role="img" aria-label="Tickets received and finished per day over the last 14 days">
            {activity.map((a) => (
              <div key={a.d} className="flex h-full flex-1 flex-col justify-end" title={`${fmtDayKey(a.d)}: ${a.received} received, ${a.finished} finished`}>
                <div className="flex flex-1 items-end justify-center gap-0.5">
                  <span className="w-1/2 rounded-t-sm bg-mute/60" style={{ height: `${(a.received / peak) * 100}%`, minHeight: a.received ? 3 : 0 }} />
                  <span className="w-1/2 rounded-t-sm bg-solder" style={{ height: `${(a.finished / peak) * 100}%`, minHeight: a.finished ? 3 : 0 }} />
                </div>
                <span className="mt-1.5 text-center font-mono text-[10px] text-mute">{Number(a.d.slice(8))}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 text-lg font-semibold">Longest open</h2>
        {aging.length === 0 ? (
          <p className="text-sm text-mute">No open ticket is older than {AGING_DAYS} days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {aging.slice(0, 8).map((t) => {
              const age = ageDays(t.created_at);
              return (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-solder">
                    <span className="h-8 w-1.5 rounded-full" style={{ background: accentFor(t.device.console_type) }} aria-hidden />
                    <span className="font-mono text-sm text-mute">#{t.ticket_number}</span>
                    <span className="min-w-0 flex-1 truncate">{deviceName(t.device)} for {t.customer.name}</span>
                    <span className="text-xs" style={{ color: t.status.color }}>{t.status.name}</span>
                    <span className={`font-mono text-sm ${age >= 14 ? "text-danger" : "text-solder"}`}>{age} days</span>
                    <span className="w-full text-xs text-mute sm:w-auto">Last update {ageDays(t.updated_at)} days ago</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {allParts.length > 0 && (
        <Card className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Low stock</h2>
            <Link href="/parts?show=low" className="text-sm text-mute hover:text-ink">See all parts</Link>
          </div>
          {lowParts.length === 0 ? (
            <p className="text-sm text-mute">Every part is above its low-stock level.</p>
          ) : (
            <ul className="divide-y divide-line">
              {lowParts.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link href={`/parts/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-solder">
                    <span className="truncate">{p.name}</span>
                    <span className={`font-mono text-sm ${p.stock === 0 ? "text-danger" : "text-solder"}`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {unpaid.length > 0 && (
        <Card className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Unpaid invoices</h2>
            <Link href="/invoices" className="text-sm text-mute hover:text-ink">{usd(owed)} owed, see all</Link>
          </div>
          <ul className="divide-y divide-line">
            {unpaid.slice(0, 5).map(({ r, t }) => (
              <li key={r.id}>
                <Link href={`/tickets/${r.ticket_id}/invoice`} className="flex items-center justify-between gap-3 py-2.5 hover:text-solder">
                  <span className="truncate"><span className="font-mono text-sm text-mute">#{r.invoice_number}</span> {r.customer?.name}</span>
                  <span className="font-mono text-sm text-solder">{usd(t.balance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
