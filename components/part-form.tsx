import { savePart } from "@/app/actions";
import { Card, Field, field, btnPrimary } from "./ui";
import type { Part } from "@/lib/types";

const dollars = (c?: number) => (c == null ? "" : (c / 100).toFixed(2));

export function PartForm({ part }: { part?: Part }) {
  return (
    <form action={savePart}>
      <Card className="space-y-4">
        {part && <input type="hidden" name="id" value={part.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Part name"><input name="name" required defaultValue={part?.name} className={field} placeholder="PS5 HDMI port" /></Field>
          <Field label="SKU or part number"><input name="sku" defaultValue={part?.sku ?? ""} className={`${field} font-mono`} /></Field>
          <Field label="Supplier"><input name="supplier" defaultValue={part?.supplier ?? ""} className={field} /></Field>
          <Field label="Low stock at" hint="Flagged when the count falls to this number or below">
            <input name="low_stock_at" type="number" min="0" defaultValue={part?.low_stock_at ?? 2} className={field} />
          </Field>
          <Field label="Your cost each (USD)">
            <input name="cost" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={dollars(part?.cost_cents)} className={field} />
          </Field>
          <Field label="Usual price each (USD)" hint="What you charge the customer. You can override it on a ticket.">
            <input name="price" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={dollars(part?.price_cents)} className={field} />
          </Field>
          {!part && (
            <Field label="Starting stock"><input name="stock" type="number" min="0" defaultValue={0} className={field} /></Field>
          )}
        </div>
        <Field label="Notes"><textarea name="notes" rows={2} defaultValue={part?.notes ?? ""} className={field} /></Field>
        <button className={btnPrimary}>{part ? "Save changes" : "Add part"}</button>
      </Card>
    </form>
  );
}
