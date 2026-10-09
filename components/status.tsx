import { setTicketStatus } from "@/app/actions";
import type { Status } from "@/lib/types";

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: `${status.color}66`, color: status.color, background: `${status.color}14` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: status.color }} />
      {status.name}
    </span>
  );
}

/** Read-only segmented bar for ticket cards. */
export function MiniRail({ statuses, currentId }: { statuses: Status[]; currentId: string }) {
  const idx = statuses.findIndex((s) => s.id === currentId);
  return (
    <div className="flex gap-1" aria-hidden>
      {statuses.map((s, i) => (
        <span key={s.id} className="h-1 flex-1 rounded-full bg-line" style={i <= idx ? { background: s.color } : undefined} />
      ))}
    </div>
  );
}

/** The ticket's signature control: each stage is a tappable button. */
export function StatusRail({ ticketId, statuses, currentId }: { ticketId: string; statuses: Status[]; currentId: string }) {
  const idx = statuses.findIndex((s) => s.id === currentId);
  return (
    <form action={setTicketStatus} className="overflow-x-auto pb-1">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div className="grid gap-1.5" style={{ gridAutoFlow: "column", gridAutoColumns: "minmax(5.75rem, 1fr)" }}>
        {statuses.map((s, i) => {
          const current = s.id === currentId;
          return (
            <button
              key={s.id}
              name="status_id"
              value={s.id}
              aria-current={current ? "step" : undefined}
              className="group rounded-md px-1 pb-1 pt-2 text-left transition-colors hover:bg-panel2"
            >
              <span
                className="block h-2 rounded-full bg-line transition-colors"
                style={i <= idx ? { background: s.color, boxShadow: current ? `0 0 14px ${s.color}88` : undefined } : undefined}
              />
              <span className={`mt-2 block text-xs leading-tight ${current ? "font-semibold text-ink" : "text-mute group-hover:text-ink"}`}>
                {s.name}
              </span>
            </button>
          );
        })}
      </div>
    </form>
  );
}
