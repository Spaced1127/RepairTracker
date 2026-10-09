import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createInvoice, saveInvoiceMeta, addInvoiceItem, updateInvoiceItem, removeInvoiceItem,
  recordPayment, removePayment, setInvoiceVoid,
} from "@/app/actions";
import { Card, Field, field, btnGhost, btnPrimary, btnDanger } from "@/components/ui";
import { InvoiceBadge } from "@/components/invoice-badge";
import { CopyButton } from "@/components/copy-button";
import { invoiceState, totals } from "@/lib/invoice";
import { absoluteUrl, qrSvg } from "@/lib/qr";
import { deviceName, fmtDateTime, usd } from "@/lib/util";
import type { Invoice, InvoiceItem, Payment, TicketFull } from "@/lib/types";

const dollars = (c: number) => (c / 100).toFixed(2);

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: tk } = await supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", id).maybeSingle();
  if (!tk) notFound();
  const t = tk as TicketFull;

  const { data: invRow } = await supabase.from("invoices").select("*").eq("ticket_id", id).maybeSingle();
  const header = (
    <div>
      <Link href={`/tickets/${id}`} className="text-sm text-mute hover:text-ink">Back to ticket #{t.ticket_number}</Link>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Invoice for {deviceName(t.device)}</h1>
      <p className="text-mute">{t.customer.name}</p>
    </div>
  );

  if (!invRow) {
    return (
      <div className="max-w-2xl space-y-5">
        {header}
        <Card className="space-y-3">
          <p className="text-sm">
            This creates an invoice from the ticket: the labor charge ({t.labor_cents != null ? usd(t.labor_cents) : "not set yet"}) and each part used.
            You can edit every line afterwards.
          </p>
          <form action={createInvoice}>
            <input type="hidden" name="ticket_id" value={id} />
            <button className={btnPrimary}>Create invoice</button>
          </form>
        </Card>
      </div>
    );
  }

  const inv = invRow as Invoice;
  const [{ data: it }, { data: pm }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("position"),
    supabase.from("payments").select("*").eq("invoice_id", inv.id).order("paid_at"),
  ]);
  const items = (it ?? []) as InvoiceItem[];
  const payments = (pm ?? []) as Payment[];
  const tot = totals(items, inv.tax_percent, payments);
  const state = invoiceState(inv, tot);

  const payUrl = await absoluteUrl(`/pay/${inv.pay_token}`);
  const qr = await qrSvg(payUrl);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="max-w-3xl space-y-5">
      {header}
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-mute">Invoice #{inv.invoice_number}</p>
          <p className="mt-1 flex items-center gap-3">
            <span className="font-display text-3xl font-bold">{usd(Math.max(0, tot.balance))}</span>
            <span className="text-sm text-mute">balance due</span>
            <InvoiceBadge state={state} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/tickets/${id}/invoice/print`} className={btnGhost}>Print invoice</Link>
          <form action={setInvoiceVoid}>
            <input type="hidden" name="ticket_id" value={id} />
            <input type="hidden" name="invoice_id" value={inv.id} />
            <input type="hidden" name="void" value={String(inv.status !== "void")} />
            <button className={inv.status === "void" ? btnGhost : btnDanger}>{inv.status === "void" ? "Reopen invoice" : "Void invoice"}</button>
          </form>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Line items</h2>
        <div className="space-y-2">
          {items.map((i) => (
            <form key={i.id} action={updateInvoiceItem} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="ticket_id" value={id} />
              <input type="hidden" name="item_id" value={i.id} />
              <input name="description" required defaultValue={i.description} aria-label="Description" className={`${field} min-w-40 flex-1`} />
              <input name="qty" type="number" min="1" defaultValue={i.qty} aria-label="Quantity" className={`${field} w-20`} />
              <input name="price" type="number" step="0.01" defaultValue={dollars(i.unit_price_cents)} aria-label="Price each" className={`${field} w-28`} />
              <button className={btnGhost}>Save</button>
              <button formAction={removeInvoiceItem} formNoValidate className={btnDanger} aria-label={`Remove ${i.description}`}>Remove</button>
            </form>
          ))}
          {items.length === 0 && <p className="text-sm text-mute">No lines yet. Add labor or parts below.</p>}
        </div>

        <form action={addInvoiceItem} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <input type="hidden" name="ticket_id" value={id} />
          <input type="hidden" name="invoice_id" value={inv.id} />
          <div className="min-w-40 flex-1"><Field label="Add a line"><input name="description" required placeholder="Description (use a negative price for a discount)" className={field} /></Field></div>
          <div className="w-20"><Field label="Qty"><input name="qty" type="number" min="1" defaultValue={1} className={field} /></Field></div>
          <div className="w-28"><Field label="Price each"><input name="price" type="number" step="0.01" required className={field} /></Field></div>
          <button className={`${btnPrimary} mb-5`}>Add</button>
        </form>

        <form action={saveInvoiceMeta} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
          <input type="hidden" name="ticket_id" value={id} />
          <input type="hidden" name="invoice_id" value={inv.id} />
          <Field label="Sales tax %" hint="Check the rate that applies to you">
            <input name="tax_percent" type="number" step="0.001" min="0" defaultValue={Number(inv.tax_percent)} className={field} />
          </Field>
          <Field label="Note shown on the invoice"><input name="notes" defaultValue={inv.notes ?? ""} className={field} /></Field>
          <button className={`${btnGhost} sm:mb-5`}>Save</button>
        </form>

        <dl className="mt-2 space-y-1.5 rounded-lg bg-bench/60 p-3 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="font-mono">{usd(tot.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-mute">Tax ({Number(inv.tax_percent)}%)</dt><dd className="font-mono">{usd(tot.tax)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="font-mono">{usd(tot.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-mute">Paid</dt><dd className="font-mono">{usd(tot.paid)}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <p className="mb-4 text-sm text-mute">No payments yet.</p>
        ) : (
          <ul className="mb-4 divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block capitalize">{p.method === "stripe" ? "Paid online" : p.method}{p.note && p.method !== "stripe" ? `, ${p.note}` : ""}</span>
                  <span className="block font-mono text-xs text-mute">{fmtDateTime(p.paid_at)}</span>
                </span>
                <span className="font-mono">{usd(p.amount_cents)}</span>
                <form action={removePayment}>
                  <input type="hidden" name="ticket_id" value={id} />
                  <input type="hidden" name="payment_id" value={p.id} />
                  <button className="min-h-9 rounded px-2 text-xs text-mute hover:text-danger" aria-label="Remove payment">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={recordPayment} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="ticket_id" value={id} />
          <input type="hidden" name="invoice_id" value={inv.id} />
          <div className="w-32"><Field label="Amount"><input name="amount" type="number" step="0.01" min="0.01" required defaultValue={tot.balance > 0 ? dollars(tot.balance) : ""} className={field} /></Field></div>
          <div className="w-36">
            <Field label="Method">
              <select name="method" defaultValue="cash" className={field}>
                <option value="cash">Cash</option>
                <option value="card">Card (in person)</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div className="min-w-32 flex-1"><Field label="Note"><input name="note" className={field} /></Field></div>
          <button className={`${btnPrimary} mb-5`}>Record payment</button>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Customer payment link</h2>
        <div className="flex flex-wrap items-start gap-4">
          <div className="size-28 shrink-0 rounded-md bg-white p-2 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code for the payment link" />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="break-all font-mono text-xs text-mute">{payUrl}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={payUrl} />
              <a href={payUrl} target="_blank" rel="noreferrer" className={btnGhost}>Open customer page</a>
            </div>
            <p className="text-sm text-mute">
              {stripeReady
                ? "Customers see the invoice and can pay by card through Stripe. Paid invoices update here automatically."
                : "Stripe is not set up yet, so customers can view the invoice but not pay online. See the README to turn on card payments."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
