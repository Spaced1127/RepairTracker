import Link from "next/link";
import { StatusPill, MiniRail } from "./status";
import { accentFor, deviceName, fmtDateTime } from "@/lib/util";
import type { Status, TicketFull } from "@/lib/types";

export function TicketCard({ t, statuses }: { t: TicketFull; statuses: Status[] }) {
  const accent = accentFor(t.device.console_type);
  return (
    <Link
      href={`/tickets/${t.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-panel/90 p-4 pl-6 transition-colors hover:border-mute"
    >
      <span className="absolute inset-y-0 left-0 w-2" style={{ background: accent }} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-mute">#{t.ticket_number}</p>
          <h3 className="truncate text-lg font-semibold leading-snug">
            {deviceName(t.device)}
          </h3>
          <p className="truncate text-sm text-mute">{t.customer.name}</p>
        </div>
        <StatusPill status={t.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-ink/90">{t.issue}</p>
      <div className="mt-4 space-y-2">
        <MiniRail statuses={statuses} currentId={t.status_id} />
        <p className="text-xs text-mute">Updated {fmtDateTime(t.updated_at)}</p>
      </div>
    </Link>
  );
}
