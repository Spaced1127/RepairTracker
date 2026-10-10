import { describe, expect, it } from "vitest";
import { invoiceState, totals } from "@/lib/invoice";

describe("invoice totals", () => {
  it("adds tax, payments and balance in cents", () => {
    const t = totals([{ qty: 1, unit_price_cents: 6000 }, { qty: 2, unit_price_cents: 1599 }], 7.25, [{ amount_cents: 5000 }]);
    expect(t).toEqual({ subtotal: 9198, tax: 667, total: 9865, paid: 5000, balance: 4865 });
  });
  it("treats a negative line as a discount", () => {
    expect(totals([{ qty: 1, unit_price_cents: 10000 }, { qty: 1, unit_price_cents: -1000 }], 0, []).total).toBe(9000);
  });
  it("derives paid, partial, unpaid and void", () => {
    const open = { status: "open" as const };
    expect(invoiceState(open, totals([{ qty: 1, unit_price_cents: 1000 }], 0, []))).toBe("unpaid");
    expect(invoiceState(open, totals([{ qty: 1, unit_price_cents: 1000 }], 0, [{ amount_cents: 400 }]))).toBe("partial");
    expect(invoiceState(open, totals([{ qty: 1, unit_price_cents: 1000 }], 0, [{ amount_cents: 1000 }]))).toBe("paid");
    expect(invoiceState({ status: "void" }, totals([{ qty: 1, unit_price_cents: 1000 }], 0, []))).toBe("void");
  });
  it("counts overpayment as paid", () => {
    const t = totals([{ qty: 1, unit_price_cents: 1000 }], 0, [{ amount_cents: 1500 }]);
    expect(t.balance).toBe(-500);
    expect(invoiceState({ status: "open" }, t)).toBe("paid");
  });
});
