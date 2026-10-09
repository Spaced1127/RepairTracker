import type { Status } from "@/lib/types";

/** Read-only version of the status rail, for the customer-facing page. */
export function StatusTrack({ statuses, currentId }: { statuses: Pick<Status, "id" | "name" | "color">[]; currentId: string }) {
  const idx = statuses.findIndex((s) => s.id === currentId);
  return (
    <ol className="grid gap-1.5 overflow-x-auto pb-1" style={{ gridAutoFlow: "column", gridAutoColumns: "minmax(5.5rem, 1fr)" }}>
      {statuses.map((s, i) => (
        <li key={s.id} aria-current={i === idx ? "step" : undefined}>
          <span className="block h-2 rounded-full bg-line" style={i <= idx ? { background: s.color, boxShadow: i === idx ? `0 0 14px ${s.color}88` : undefined } : undefined} />
          <span className={`mt-2 block text-xs leading-tight ${i === idx ? "font-semibold text-ink" : "text-mute"}`}>{s.name}</span>
        </li>
      ))}
    </ol>
  );
}
