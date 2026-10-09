import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { startCheckout } from "@/app/pay/actions";
import { totals } from "@/lib/invoice";
import { SHOP_NAME, fmtDate, usd } from "@/lib/util";
import { btnPrimary } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*, customer:customers(name), items:invoice_items(*), payments(*)")
    .eq("pay_token", token)
    .order("position", { referencedTable: "invoice_items" })
    .maybeSingle();
  if (!inv) notFound();

  const t = totals(inv.items, inv.tax_percent, inv.payments);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="font-display text-xl font-bold">{SHOP_NAME}</p>
      <h1 className="mt-1 text-3xl font-bold">Invoice #{inv.invoice_number}</h1>
      <p className="mt-1 text-mute">For {inv.customer?.name}, issued {fmtDate(inv.issued_at)}</p>

      <section className="mt-6 rounded-2xl border border-line bg-panel/90 p-5">
        <ul className="divide-y divide-line">
          {(inv.items as { id: string; description: string; qty: number; unit_price_cents: number }[]).map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-2.5 text-sm">
              <span>{i.qty > 1 ? `${i.qty} x ` : ""}{i.description}</span>
              <span className="font-mono">{usd(i.qty * i.unit_price_cents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="font-mono">{usd(t.subtotal)}</dd></div>
          {t.tax > 0 && <div className="flex justify-between"><dt className="text-mute">Tax ({Number(inv.tax_percent)}%)</dt><dd className="font-mono">{usd(t.tax)}</dd></div>}
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="font-mono">{usd(t.total)}</dd></div>
          {t.paid > 0 && <div className="flex justify-between"><dt className="text-mute">Paid</dt><dd className="font-mono">{usd(t.paid)}</dd></div>}
          <div className="flex justify-between text-lg font-bold"><dt>Balance due</dt><dd className="font-mono">{usd(Math.max(0, t.balance))}</dd></div>
        </dl>
      </section>

      {error && <p role="alert" className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mt-6">
        {inv.status === "void" ? (
          <p className="text-mute">This invoice has been cancelled. Please contact the shop if you have questions.</p>
        ) : t.balance <= 0 ? (
          <p className="rounded-md border border-[#4cc24a]/40 bg-[#4cc24a]/10 px-3 py-3 font-medium text-[#4cc24a]">This invoice is paid in full. Thank you.</p>
        ) : stripeReady ? (
          <form action={startCheckout}>
            <input type="hidden" name="token" value={token} />
            <button className={`${btnPrimary} w-full text-base`}>Pay {usd(t.balance)} by card</button>
            <p className="mt-2 text-center text-xs text-mute">Card details are entered on Stripe&apos;s secure payment page.</p>
          </form>
        ) : (
          <p className="text-mute">Please pay the shop directly.</p>
        )}
      </div>
    </main>
  );
}
