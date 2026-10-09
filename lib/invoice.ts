import type { Invoice, InvoiceItem, Payment } from "./types";

export function totals(items: Pick<InvoiceItem, "qty" | "unit_price_cents">[], taxPercent: number, payments: Pick<Payment, "amount_cents">[]) {
  const subtotal = items.reduce((n, i) => n + i.qty * i.unit_price_cents, 0);
  const tax = Math.round((subtotal * Number(taxPercent)) / 100);
  const total = subtotal + tax;
  const paid = payments.reduce((n, p) => n + p.amount_cents, 0);
  return { subtotal, tax, total, paid, balance: total - paid };
}

export type InvoiceState = "void" | "paid" | "partial" | "unpaid";

export function invoiceState(inv: Pick<Invoice, "status">, t: ReturnType<typeof totals>): InvoiceState {
  if (inv.status === "void") return "void";
  if (t.total > 0 && t.balance <= 0) return "paid";
  if (t.total === 0 && t.paid === 0) return "unpaid";
  return t.paid > 0 ? "partial" : "unpaid";
}

export const STATE_STYLE: Record<InvoiceState, { label: string; color: string }> = {
  paid: { label: "Paid", color: "#4CC24A" },
  partial: { label: "Part paid", color: "#F5B83D" },
  unpaid: { label: "Unpaid", color: "#FF8A5B" },
  void: { label: "Void", color: "#8D95AA" },
};
