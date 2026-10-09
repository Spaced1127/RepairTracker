import { sendCustomerMessage } from "@/app/actions";
import { Card, Field, field, btnGhost, btnPrimary } from "./ui";
import { CopyButton } from "./copy-button";
import { fmtDateTime } from "@/lib/util";
import type { Customer, NotificationRow } from "@/lib/types";

const COLOR = { sent: "#4CC24A", failed: "#FF6B6B", skipped: "#8D95AA" } as const;

export function TicketNotifications({ ticketId, customer, statusUrl, history }: { ticketId: string; customer: Customer; statusUrl: string; history: NotificationRow[] }) {
  return (
    <Card className="space-y-5">
      <h2 className="text-lg font-semibold">Customer updates</h2>

      <div>
        <p className="mb-1.5 text-sm text-mute">Status page for this customer (no login needed)</p>
        <p className="mb-2 break-all font-mono text-xs">{statusUrl}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={statusUrl} />
          <a href={statusUrl} target="_blank" rel="noreferrer" className={btnGhost}>Open</a>
        </div>
      </div>

      <form action={sendCustomerMessage} className="space-y-3 border-t border-line pt-4">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <h3 className="text-sm font-semibold">Send a message</h3>
        <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
          <Field label="Send by">
            <select name="channel" defaultValue="email" className={field}>
              <option value="email">Email</option>
              <option value="sms">Text message</option>
            </select>
          </Field>
          <Field label="Email subject"><input name="subject" className={field} placeholder="Only used for email" /></Field>
        </div>
        <Field label="Message"><textarea name="message" required rows={3} className={field} /></Field>
        <p className="text-xs text-mute">
          Email: {customer.email ? (customer.notify_email ? customer.email : `${customer.email} (updates turned off)`) : "no address on file"}.
          Text: {customer.phone ? (customer.sms_opt_in ? customer.phone : `${customer.phone} (not opted in)`) : "no number on file"}.
        </p>
        <button className={btnPrimary}>Send message</button>
      </form>

      <div className="border-t border-line pt-4">
        <h3 className="mb-2 text-sm font-semibold">Message history</h3>
        {history.length === 0 ? (
          <p className="text-sm text-mute">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((n) => (
              <li key={n.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded border px-1.5 py-0.5 text-xs font-medium" style={{ color: COLOR[n.status], borderColor: `${COLOR[n.status]}66` }}>{n.status}</span>
                  <span className="text-mute">{n.channel === "email" ? "Email" : "Text"}</span>
                  <span className="font-mono text-xs text-mute">{fmtDateTime(n.created_at)}</span>
                </p>
                <p className="mt-0.5 truncate">{n.subject ?? n.body}</p>
                {n.error && <p className="text-xs text-mute">{n.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
