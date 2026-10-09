import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usd } from "./util";

/** Records a completed Stripe Checkout payment. Safe to call more than once for the same session. */
export async function recordStripePayment(admin: SupabaseClient, session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId || session.payment_status !== "paid") return false;

  const amount = session.amount_total ?? 0;
  const { error } = await admin.from("payments").insert({
    invoice_id: invoiceId, amount_cents: amount, method: "stripe", stripe_session_id: session.id, note: "Paid online",
  });
  if (error) {
    if (error.code === "23505") return true; // already recorded
    throw new Error(error.message);
  }

  const { data: inv } = await admin.from("invoices").select("ticket_id, invoice_number").eq("id", invoiceId).single();
  if (inv) {
    await admin.from("work_log").insert({
      ticket_id: inv.ticket_id, kind: "note", body: `Online payment of ${usd(amount)} received for invoice #${inv.invoice_number}`,
    });
  }
  return true;
}
