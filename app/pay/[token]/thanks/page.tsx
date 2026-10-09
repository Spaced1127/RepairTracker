import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { recordStripePayment } from "@/lib/payments";
import { SHOP_NAME } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function ThanksPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { token } = await params;
  const { session_id } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const admin = createAdminClient();
  const { data: inv } = await admin.from("invoices").select("id, invoice_number").eq("pay_token", token).maybeSingle();
  if (!inv) notFound();

  // Confirm with Stripe directly, so the payment shows up even if the webhook is slow or not set up.
  let paid = false;
  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.metadata?.invoice_id === inv.id) paid = await recordStripePayment(admin, session);
    } catch {
      // Fall through to the generic message; the webhook will still record the payment.
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-display text-xl font-bold">{SHOP_NAME}</p>
      <h1 className="mt-4 text-3xl font-bold">{paid ? "Payment received" : "Thank you"}</h1>
      <p className="mt-3 text-mute">
        {paid
          ? `Invoice #${inv.invoice_number} has been paid. Stripe will email you a receipt.`
          : `If you completed the payment, invoice #${inv.invoice_number} will show as paid shortly.`}
      </p>
      <Link href={`/pay/${token}`} className="mt-6 inline-block text-solder hover:underline">View invoice</Link>
    </main>
  );
}
