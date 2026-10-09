export type Status = { id: string; name: string; color: string; position: number; is_closed: boolean; is_done: boolean;
  notify_email: boolean; email_subject: string; email_body: string; notify_sms: boolean; sms_body: string;
};
export type Customer = {
  id: string; name: string; phone: string | null; email: string | null; notes: string | null; created_at: string;
  notify_email: boolean; sms_opt_in: boolean;
};
export type Device = {
  id: string; customer_id: string; console_type: string; model: string | null;
  serial_number: string | null; condition_notes: string | null; accessories: string | null;
};
export type Ticket = {
  id: string; ticket_number: number; customer_id: string; device_id: string; status_id: string;
  issue: string; estimate_cents: number | null; created_at: string; updated_at: string; closed_at: string | null; completed_at: string | null; labor_cents: number | null; track_token: string;
};
export type TicketFull = Ticket & { status: Status; customer: Customer; device: Device };
export type LogEntry = { id: string; ticket_id: string; body: string; kind: "note" | "status"; created_at: string };
export type TicketPhoto = { id: string; ticket_id: string; storage_path: string; kind: "intake" | "before" | "after"; caption: string | null; created_at: string };
export type Part = {
  id: string; name: string; sku: string | null; supplier: string | null; cost_cents: number; price_cents: number;
  stock: number; low_stock_at: number; notes: string | null; archived: boolean; created_at: string;
};
export type TicketPart = {
  id: string; ticket_id: string; part_id: string | null; name: string; qty: number;
  unit_cost_cents: number; unit_price_cents: number; created_at: string;
};
export type Invoice = {
  id: string; invoice_number: number; ticket_id: string; customer_id: string; tax_percent: number;
  notes: string | null; status: "open" | "void"; pay_token: string; issued_at: string;
};
export type InvoiceItem = { id: string; invoice_id: string; description: string; qty: number; unit_price_cents: number; position: number };
export type Payment = {
  id: string; invoice_id: string; amount_cents: number; method: "card" | "cash" | "stripe" | "other";
  note: string | null; stripe_session_id: string | null; paid_at: string;
};
export type NotificationRow = {
  id: string; ticket_id: string; channel: "email" | "sms"; to_address: string; subject: string | null; body: string;
  status: "sent" | "failed" | "skipped"; error: string | null; created_at: string;
};
