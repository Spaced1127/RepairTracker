"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { totals } from "@/lib/invoice";
import { absoluteUrl } from "@/lib/qr";
import { SHOP_NAME } from "@/lib/util";

/** Creates a fresh Stripe Checkout session for the invoice's current balance, then sends the customer there. */
export async function startCheckout(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("invoices")
    .select("*, customer:customers(email), items:invoice_items(*), payments(*)")
    .eq("pay_token", token)
    .maybeSingle();
  if (!inv) redirect("/login");

  const t = totals(inv.items, inv.tax_percent, inv.payments);
  if (inv.status === "void" || t.balance <= 0) redirect(`/pay/${token}`);

  const stripe = getStripe();
  if (!stripe) redirect(`/pay/${token}?error=` + encodeURIComponent("Online payment is not set up. Please pay the shop directly."));

  const origin = await absoluteUrl("");
  const description = (inv.items as { description: string }[]).map((i) => i.description).join(", ").slice(0, 500);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd", unit_amount: t.balance,
        product_data: { name: `${SHOP_NAME} invoice #${inv.invoice_number}`, ...(description ? { description } : {}) },
      },
    }],
    customer_email: inv.customer?.email || undefined,
    metadata: { invoice_id: inv.id },
    success_url: `${origin}/pay/${token}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pay/${token}`,
  });

  redirect(session.url!);
}
