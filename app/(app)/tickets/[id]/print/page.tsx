import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { absoluteUrl, qrSvg } from "@/lib/qr";
import { SHOP_NAME, deviceName, fmtDateTime, money } from "@/lib/util";
import type { LogEntry, TicketFull, TicketPhoto } from "@/lib/types";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-neutral-300 py-3">
      <h2 className="mb-1.5 text-sm font-bold">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default async function PrintTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: tk }, { data: lg }, { data: ph }] = await Promise.all([
    supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", id).maybeSingle(),
    supabase.from("work_log").select("*").eq("ticket_id", id).eq("kind", "note").order("created_at"),
    supabase.from("ticket_photos").select("*").eq("ticket_id", id).eq("kind", "intake").order("created_at").limit(8),
  ]);
  if (!tk) notFound();
  const t = tk as TicketFull;
  const notes = (lg ?? []) as LogEntry[];
  const photos = (ph ?? []) as TicketPhoto[];

  const signed = photos.length ? (await supabase.storage.from("ticket-photos").createSignedUrls(photos.map((p) => p.storage_path), 3600)).data ?? [] : [];
  const qr = await qrSvg(await absoluteUrl(`/tickets/${t.id}`));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href={`/tickets/${t.id}`} className="text-sm text-mute hover:text-ink">Back to ticket</Link>
        <PrintButton />
        <span className="text-sm text-mute">In the print window, choose Save as PDF to export.</span>
      </div>

      <article className="mx-auto max-w-[8.5in] rounded-lg bg-white p-8 text-black print:max-w-none print:rounded-none print:p-0">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{SHOP_NAME}</p>
            <h1 className="text-3xl font-bold">Work order #{t.ticket_number}</h1>
            <p className="mt-1 text-sm">Received {fmtDateTime(t.created_at)}</p>
            <p className="text-sm">Status: {t.status.name}</p>
          </div>
          <div className="size-24 shrink-0 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code for this ticket" />
        </header>

        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Block title="Customer">
            <p className="font-semibold">{t.customer.name}</p>
            {t.customer.phone && <p>{t.customer.phone}</p>}
            {t.customer.email && <p>{t.customer.email}</p>}
          </Block>
          <Block title="Device">
            <p className="font-semibold">{deviceName(t.device)}</p>
            <p>Serial: <span className="font-mono">{t.device.serial_number || "Not recorded"}</span></p>
          </Block>
        </div>

        <Block title="Reported issue"><p className="whitespace-pre-wrap">{t.issue}</p></Block>
        <Block title="Estimate"><p>{money(t.estimate_cents)}</p></Block>

        <Block title="Condition when received">
          <p className="whitespace-pre-wrap">{t.device.condition_notes || "No existing damage recorded."}</p>
          <p className="mt-1"><span className="font-semibold">Accessories received:</span> {t.device.accessories || "None"}</p>
          {signed.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {signed.map((s, i) => s.signedUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <li key={i}><img src={s.signedUrl} alt={`Intake photo ${i + 1}`} className="size-24 rounded border border-neutral-300 object-cover" /></li>
              ))}
            </ul>
          )}
        </Block>

        {notes.length > 0 && (
          <Block title="Work performed">
            <ul className="space-y-1.5">
              {notes.map((n) => (
                <li key={n.id}><span className="font-mono text-xs">{fmtDateTime(n.created_at)}</span> {n.body}</li>
              ))}
            </ul>
          </Block>
        )}

        <Block title="Customer acknowledgment">
          <p>I confirm the condition and accessories listed above are accurate at drop-off.</p>
          <div className="mt-8 grid grid-cols-[1fr_9rem] gap-8">
            <div className="border-t border-black pt-1 text-xs">Customer signature</div>
            <div className="border-t border-black pt-1 text-xs">Date</div>
          </div>
        </Block>
      </article>
    </div>
  );
}
