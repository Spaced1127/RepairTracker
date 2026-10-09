import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { absoluteUrl, qrSvg } from "@/lib/qr";
import { deviceName, fmtDate } from "@/lib/util";
import type { TicketFull } from "@/lib/types";

const SIZES = {
  small: { name: "Small, 2.25 x 1.25 in", w: "2.25in", h: "1.25in", qr: "0.95in", big: "16pt", text: "8pt", extra: false },
  address: { name: "Address, 3.5 x 1.125 in", w: "3.5in", h: "1.125in", qr: "0.9in", big: "18pt", text: "9pt", extra: false },
  large: { name: "Large, 4 x 6 in", w: "4in", h: "6in", qr: "2.4in", big: "36pt", text: "13pt", extra: true },
} as const;
type SizeKey = keyof typeof SIZES;

export default async function LabelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string }> }) {
  const { id } = await params;
  const { size } = await searchParams;
  const key: SizeKey = size && size in SIZES ? (size as SizeKey) : "small";
  const cfg = SIZES[key];

  const supabase = await createClient();
  const { data } = await supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const t = data as TicketFull;
  const qr = await qrSvg(await absoluteUrl(`/tickets/${t.id}`));

  return (
    <div className="space-y-5">
      {/* Sets the paper size in the print dialog. Only present on this page. */}
      <style>{`@page { size: ${cfg.w} ${cfg.h}; margin: 0; }`}</style>

      <div className="no-print space-y-3">
        <Link href={`/tickets/${t.id}`} className="text-sm text-mute hover:text-ink">Back to ticket</Link>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SIZES) as SizeKey[]).map((k) => (
            <Link
              key={k}
              href={`/tickets/${t.id}/label?size=${k}`}
              className={`min-h-10 rounded-md border px-3 py-2 text-sm ${k === key ? "border-solder text-solder" : "border-line text-mute hover:text-ink"}`}
            >
              {SIZES[k].name}
            </Link>
          ))}
          <PrintButton label="Print label" />
        </div>
        <p className="text-sm text-mute">
          In the print dialog, pick your label printer and set margins to None and scale to 100%. The QR code opens this ticket after you sign in.
        </p>
      </div>

      <div
        className="flex items-center gap-[0.08in] overflow-hidden border border-line bg-white p-[0.08in] text-black print:border-0"
        style={{ width: cfg.w, height: cfg.h, flexDirection: cfg.extra ? "column" : "row", justifyContent: cfg.extra ? "center" : "flex-start" }}
      >
        <div className="shrink-0 [&>svg]:size-full" style={{ width: cfg.qr, height: cfg.qr }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code" />
        <div className="min-w-0 leading-tight" style={{ fontSize: cfg.text, textAlign: cfg.extra ? "center" : "left" }}>
          <p className="font-bold" style={{ fontSize: cfg.big }}>#{t.ticket_number}</p>
          <p className="truncate font-semibold">{deviceName(t.device)}</p>
          <p className="truncate">{t.customer.name}</p>
          {cfg.extra && t.device.serial_number && <p className="font-mono">SN {t.device.serial_number}</p>}
          <p>{fmtDate(t.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
