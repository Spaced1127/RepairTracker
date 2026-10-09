import { addPartToTicket, addCustomPart, removeTicketPart } from "@/app/actions";
import { Card, Field, field, btnGhost, btnPrimary } from "./ui";
import { usd } from "@/lib/util";
import type { Part, TicketPart } from "@/lib/types";

export function TicketParts({ ticketId, lines, parts, laborCents }: { ticketId: string; lines: TicketPart[]; parts: Part[]; laborCents: number | null }) {
  const partsPrice = lines.reduce((n, l) => n + l.qty * l.unit_price_cents, 0);
  const partsCost = lines.reduce((n, l) => n + l.qty * l.unit_cost_cents, 0);
  const labor = laborCents ?? 0;
  const charged = partsPrice + labor;
  const profit = charged - partsCost;
  const margin = charged > 0 ? Math.round((profit / charged) * 100) : null;

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Parts and costs</h2>

      {lines.length === 0 ? (
        <p className="mb-4 text-sm text-mute">No parts used yet.</p>
      ) : (
        <ul className="mb-4 divide-y divide-line">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{l.qty} x {l.name}</span>
                <span className="block text-xs text-mute">{usd(l.unit_price_cents)} each, cost {usd(l.unit_cost_cents)} each{l.part_id ? "" : ", not from inventory"}</span>
              </span>
              <span className="font-mono">{usd(l.qty * l.unit_price_cents)}</span>
              <form action={removeTicketPart}>
                <input type="hidden" name="ticket_id" value={ticketId} />
                <input type="hidden" name="line_id" value={l.id} />
                <button className="min-h-9 rounded px-2 text-xs text-mute hover:text-danger" aria-label={`Remove ${l.name}`}>Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <dl className="mb-5 space-y-1.5 rounded-lg bg-bench/60 p-3 text-sm">
        <div className="flex justify-between"><dt className="text-mute">Parts charged</dt><dd className="font-mono">{usd(partsPrice)}</dd></div>
        <div className="flex justify-between"><dt className="text-mute">Labor charged</dt><dd className="font-mono">{laborCents == null ? "Not set" : usd(labor)}</dd></div>
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><dt>Total charged</dt><dd className="font-mono">{usd(charged)}</dd></div>
        <div className="flex justify-between"><dt className="text-mute">Your parts cost</dt><dd className="font-mono">{usd(partsCost)}</dd></div>
        <div className="flex justify-between font-semibold">
          <dt>Profit</dt>
          <dd className={`font-mono ${profit < 0 ? "text-danger" : "text-[#4cc24a]"}`}>{usd(profit)}{margin !== null && ` (${margin}%)`}</dd>
        </div>
      </dl>

      <form action={addPartToTicket} className="grid gap-3 sm:grid-cols-[1fr_5rem_8rem_auto] sm:items-end">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <Field label="Add a part">
          <select name="part_id" required defaultValue="" className={field}>
            <option value="" disabled>{parts.length ? "Choose from inventory" : "No parts in inventory yet"}</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock === 0}>
                {p.name} ({p.stock === 0 ? "out of stock" : `${p.stock} in stock`})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Qty"><input name="qty" type="number" min="1" defaultValue={1} required className={field} /></Field>
        <Field label="Price each"><input name="unit_price" type="number" step="0.01" min="0" inputMode="decimal" placeholder="Usual" className={field} /></Field>
        <button className={`${btnPrimary} sm:mb-5`}>Add</button>
      </form>

      <details className="rounded-lg border border-line px-3 py-2">
        <summary className="cursor-pointer text-sm text-mute hover:text-ink">Add a part that is not in inventory</summary>
        <form action={addCustomPart} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="ticket_id" value={ticketId} />
          <div className="sm:col-span-2"><Field label="Part name"><input name="name" required className={field} /></Field></div>
          <Field label="Qty"><input name="qty" type="number" min="1" defaultValue={1} required className={field} /></Field>
          <Field label="Your cost each"><input name="cost" type="number" step="0.01" min="0" inputMode="decimal" className={field} /></Field>
          <Field label="Price each"><input name="price" type="number" step="0.01" min="0" inputMode="decimal" className={field} /></Field>
          <div className="flex items-end"><button className={`${btnGhost} mb-5`}>Add part</button></div>
        </form>
      </details>
    </Card>
  );
}
