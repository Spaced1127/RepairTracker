import { STATE_STYLE, type InvoiceState } from "@/lib/invoice";

export function InvoiceBadge({ state }: { state: InvoiceState }) {
  const { label, color } = STATE_STYLE[state];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium" style={{ borderColor: `${color}66`, color, background: `${color}14` }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
