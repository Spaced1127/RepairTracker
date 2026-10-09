import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { totals } from "@/lib/invoice";
import { absoluteUrl, qrSvg } from "@/lib/qr";
import { SHOP_NAME, deviceName, fmtDate, usd } from "@/lib/util";
import type { Invoice, InvoiceItem, Payment, TicketFull } from "@/lib/types";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tk } = await supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", id).maybeSingle();
  const { data: invRow } = await supabase.from("invoices").select("*").eq("ticket_id", id).maybeSingle();
  if (!tk || !invRow) notFound();
  const t = tk as TicketFull;
  const inv = invRow as Invoice;

  const [{ data: it }, { data: pm }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("position"),
    supabase.from("payments").select("*").eq("invoice_id", inv.id),
  ]);
  const items = (it ?? []) as InvoiceItem[];
  const tot = totals(items, inv.tax_percent, (pm ?? []) as Payment[]);
  const payUrl = await absoluteUrl(`/pay/${inv.pay_token}`);
  const showPay = tot.balance > 0 && inv.status === "open" && Boolean(process.env.STRIPE_SECRET_KEY);
  const qr = showPay ? await qrSvg(payUrl) : null;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href={`/tickets/${id}/invoice`} className="text-sm text-mute hover:text-ink">Back to invoice</Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[8.5in] rounded-lg bg-white p-8 text-black print:max-w-none print:rounded-none print:p-0">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{SHOP_NAME}</p>
            <h1 className="text-3xl font-bold">{inv.status === "void" ? "Invoice (void)" : "Invoice"} #{inv.invoice_number}</h1>
            <p className="mt-1 text-sm">Issued {fmtDate(inv.issued_at)}</p>
          </div>
          {qr && (
            <div className="text-center">
              <div className="size-24 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code to pay online" />
              <p className="mt-1 text-xs">Scan to pay online</p>
            </div>
          )}
        </header>

        <div className="mb-5 grid gap-6 text-sm sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="mb-1 font-bold">Bill to</h2>
            <p>{t.customer.name}</p>
            {t.customer.phone && <p>{t.customer.phone}</p>}
            {t.customer.email && <p>{t.customer.email}</p>}
          </div>
          <div>
            <h2 className="mb-1 font-bold">Repair</h2>
            <p>{deviceName(t.device)}</p>
            <p>Ticket #{t.ticket_number}</p>
            {t.device.serial_number && <p>Serial: <span className="font-mono">{t.device.serial_number}</span></p>}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1.5">Description</th>
              <th className="py-1.5 text-right">Qty</th>
              <th className="py-1.5 text-right">Price</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-neutral-300">
                <td className="py-1.5">{i.description}</td>
                <td className="py-1.5 text-right">{i.qty}</td>
                <td className="py-1.5 text-right">{usd(i.unit_price_cents)}</td>
                <td className="py-1.5 text-right">{usd(i.qty * i.unit_price_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{usd(tot.subtotal)}</dd></div>
          {tot.tax > 0 && <div className="flex justify-between"><dt>Tax ({Number(inv.tax_percent)}%)</dt><dd>{usd(tot.tax)}</dd></div>}
          <div className="flex justify-between border-t border-black pt-1 font-bold"><dt>Total</dt><dd>{usd(tot.total)}</dd></div>
          {tot.paid > 0 && <div className="flex justify-between"><dt>Paid</dt><dd>{usd(tot.paid)}</dd></div>}
          <div className="flex justify-between text-base font-bold"><dt>Balance due</dt><dd>{usd(Math.max(0, tot.balance))}</dd></div>
        </dl>

        {inv.notes && <p className="mt-6 whitespace-pre-wrap text-sm">{inv.notes}</p>}
      </article>
    </div>
  );
}
