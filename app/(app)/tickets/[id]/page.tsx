import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addLogEntry } from "@/app/actions";
import { StatusRail, StatusPill } from "@/components/status";
import { TicketParts } from "@/components/ticket-parts";
import { TicketNotifications } from "@/components/ticket-notifications";
import { absoluteUrl } from "@/lib/qr";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoCompare, type PhotoItem } from "@/components/photo-compare";
import { Card, Field, field, btnGhost, btnPrimary } from "@/components/ui";
import { accentFor, deviceName, fmtDateTime, money } from "@/lib/util";
import type { LogEntry, NotificationRow, Part, Status, TicketFull, TicketPart, TicketPhoto } from "@/lib/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-mute">{label}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-mute">Not recorded</span>}</dd>
    </div>
  );
}

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: tk }, { data: st }, { data: lg }, { data: ph }, { data: tp }, { data: pt }, { data: nt }] = await Promise.all([
    supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", id).maybeSingle(),
    supabase.from("statuses").select("*").order("position"),
    supabase.from("work_log").select("*").eq("ticket_id", id).order("created_at", { ascending: false }),
    supabase.from("ticket_photos").select("*").eq("ticket_id", id).order("created_at"),
    supabase.from("ticket_parts").select("*").eq("ticket_id", id).order("created_at"),
    supabase.from("parts").select("*").eq("archived", false).order("name"),
    supabase.from("notifications").select("*").eq("ticket_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  if (!tk) notFound();
  const t = tk as TicketFull;
  const statuses = (st ?? []) as Status[];
  const log = (lg ?? []) as LogEntry[];
  const accent = accentFor(t.device.console_type);
  const statusUrl = await absoluteUrl(`/status/${t.track_token}`);

  const photos = (ph ?? []) as TicketPhoto[];
  const lines = (tp ?? []) as TicketPart[];
  const history = (nt ?? []) as NotificationRow[];
  const partsList = (pt ?? []) as Part[];
  const signed = photos.length
    ? (await supabase.storage.from("ticket-photos").createSignedUrls(photos.map((p) => p.storage_path), 3600)).data ?? []
    : [];
  const photoUrl = new Map<string, string>();
  signed.forEach((s) => { if (s.path && s.signedUrl) photoUrl.set(s.path, s.signedUrl); });
  const items: PhotoItem[] = photos
    .filter((p) => photoUrl.has(p.storage_path))
    .map((p) => ({ id: p.id, url: photoUrl.get(p.storage_path)!, caption: p.caption, kind: p.kind, time: fmtDateTime(p.created_at) }));
  const groups = [
    { kind: "intake", title: "Intake photos (as received)" },
    { kind: "before", title: "Before repair" },
    { kind: "after", title: "After repair" },
  ] as const;
  const befores = items.filter((p) => p.kind !== "after");
  const afters = items.filter((p) => p.kind === "after");

  return (
    <div className="space-y-5">
      <Link href="/tickets" className="text-sm text-mute hover:text-ink">Back to tickets</Link>
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <header className="relative overflow-hidden rounded-2xl border border-line bg-panel/90 p-5 pl-7">
        <span className="absolute inset-y-0 left-0 w-2.5" style={{ background: accent }} aria-hidden />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-mute">Ticket #{t.ticket_number}</p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {deviceName(t.device)}
            </h1>
            <p className="mt-1 text-mute">Opened {fmtDateTime(t.created_at)}{t.closed_at ? `, closed ${fmtDateTime(t.closed_at)}` : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={t.status} />
            <Link href={`/tickets/${t.id}/edit`} className={btnGhost}>Edit ticket</Link>
            <Link href={`/tickets/${t.id}/print`} className={btnGhost}>Work order</Link>
            <Link href={`/tickets/${t.id}/label`} className={btnGhost}>QR label</Link>
            <Link href={`/tickets/${t.id}/invoice`} className={btnGhost}>Invoice</Link>
          </div>
        </div>
        <div className="mt-5">
          <StatusRail ticketId={t.id} statuses={statuses} currentId={t.status_id} />
        </div>
      </header>

      <Card className="space-y-6">
        <h2 className="text-lg font-semibold">Photos</h2>
        {groups.map((g) => {
          const list = items.filter((p) => p.kind === g.kind);
          if (!list.length) return null;
          return (
            <div key={g.kind}>
              <h3 className="mb-2 text-sm font-semibold text-mute">{g.title}</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {list.map((p) => (
                  <li key={p.id}>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.caption ?? g.title} loading="lazy" className="aspect-square w-full rounded-md border border-line object-cover" />
                    </a>
                    {p.caption && <p className="mt-1 text-sm">{p.caption}</p>}
                    <p className="font-mono text-xs text-mute">{p.time}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-mute">No photos yet. Add intake shots for existing damage, then before and after shots of the repair.</p>}
        <PhotoUploader ticketId={t.id} />
      </Card>

      {befores.length > 0 && afters.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Before and after</h2>
          <PhotoCompare befores={befores} afters={afters} />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Customer</h2>
            <dl className="divide-y divide-line">
              <Row label="Name"><Link href={`/customers/${t.customer.id}`} className="text-solder hover:underline">{t.customer.name}</Link></Row>
              <Row label="Phone">{t.customer.phone && <a href={`tel:${t.customer.phone}`} className="hover:underline">{t.customer.phone}</a>}</Row>
              <Row label="Email">{t.customer.email && <a href={`mailto:${t.customer.email}`} className="hover:underline">{t.customer.email}</a>}</Row>
              <Row label="Notes">{t.customer.notes}</Row>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Device</h2>
            <dl className="divide-y divide-line">
              <Row label="Serial number"><span className="font-mono">{t.device.serial_number}</span></Row>
              <Row label="Accessories">{t.device.accessories}</Row>
              <Row label="Condition">{t.device.condition_notes}</Row>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Repair request</h2>
            <p className="whitespace-pre-wrap text-sm">{t.issue}</p>
            <p className="mt-3 text-sm text-mute">Estimate: <span className="font-mono text-ink">{money(t.estimate_cents)}</span></p>
          </Card>
        </div>

        <div className="space-y-5">
        <TicketParts ticketId={t.id} lines={lines} parts={partsList} laborCents={t.labor_cents} />
        <Card className="h-fit">
          <h2 className="mb-4 text-lg font-semibold">Update and work log</h2>
          <form action={addLogEntry} className="mb-5 space-y-3">
            <input type="hidden" name="ticket_id" value={t.id} />
            <Field label="Status">
              <select name="status_id" defaultValue={t.status_id} className={field}>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Note" hint="Optional if you are only changing the status">
              <textarea name="body" rows={3} className={field} placeholder="What you found or what you did" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-mute">
              <input type="checkbox" name="no_notify" className="size-4 accent-[#f5b83d]" />
              Don&apos;t send the customer an update for this status change
            </label>
            <button className={btnPrimary}>Save update</button>
          </form>

          {log.length === 0 ? (
            <p className="text-sm text-mute">No entries yet. Record the diagnosis and each repair step here.</p>
          ) : (
            <ol className="space-y-4 border-l border-line pl-4">
              {log.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full ${e.kind === "status" ? "bg-line ring-2 ring-mute/40" : "bg-solder"}`} />
                  <p className="font-mono text-xs text-mute">{fmtDateTime(e.created_at)}</p>
                  <p className={`whitespace-pre-wrap text-sm ${e.kind === "status" ? "text-mute" : ""}`}>{e.body}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <TicketNotifications ticketId={t.id} customer={t.customer} statusUrl={statusUrl} history={history} />
        </div>
      </div>
    </div>
  );
}
