"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseConsole } from "@/lib/consoles";
import { notifyStatusChange, loadContext, deliverEmail, deliverSms } from "@/lib/notify";
import type { Status } from "@/lib/types";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => s(fd, k) || null;
const cents = (v: string) => (v && !Number.isNaN(parseFloat(v)) ? Math.round(parseFloat(v) * 100) : null);

/* ---------- auth ---------- */
export async function signIn(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: s(fd, "email"), password: s(fd, "password") });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* ---------- tickets ---------- */
export async function createTicket(fd: FormData) {
  const supabase = await createClient();

  let customerId = s(fd, "customer_id");
  if (!customerId) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: s(fd, "name"), phone: opt(fd, "phone"), email: opt(fd, "email"), notes: opt(fd, "customer_notes"),
        notify_email: fd.get("notify_email") === "on", sms_opt_in: fd.get("sms_opt_in") === "on",
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    customerId = data.id;
  }

  const { data: device, error: devErr } = await supabase
    .from("devices")
    .insert({
      customer_id: customerId, ...parseConsole(s(fd, "console_choice"), s(fd, "console_other")),
      serial_number: opt(fd, "serial_number"), condition_notes: opt(fd, "condition_notes"), accessories: opt(fd, "accessories"),
    })
    .select("id").single();
  if (devErr) throw new Error(devErr.message);

  const { data: first, error: stErr } = await supabase.from("statuses").select("id").order("position").limit(1).single();
  if (stErr) throw new Error("No statuses found. Add one under Settings.");

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ customer_id: customerId, device_id: device.id, status_id: first.id, issue: s(fd, "issue"), estimate_cents: cents(s(fd, "estimate")) })
    .select("id").single();
  if (error) throw new Error(error.message);

  // Photos were already uploaded from the browser; link them to the new ticket.
  let paths: string[] = [];
  try { paths = JSON.parse(s(fd, "photo_paths") || "[]"); } catch { /* ignore malformed input */ }
  const valid = paths.filter((p) => typeof p === "string" && p.startsWith("intake/"));
  if (valid.length) {
    const { error: photoErr } = await supabase.from("ticket_photos")
      .insert(valid.map((storage_path) => ({ ticket_id: ticket.id, storage_path, kind: "intake" })));
    if (photoErr) throw new Error(photoErr.message);
  }

  try { await notifyStatusChange(supabase, ticket.id); } catch { /* never block ticket creation */ }

  revalidatePath("/tickets");
  redirect(`/tickets/${ticket.id}`);
}

export async function updateTicket(fd: FormData) {
  const supabase = await createClient();
  const id = s(fd, "ticket_id");

  const { error: devErr } = await supabase.from("devices").update({
    ...parseConsole(s(fd, "console_choice"), s(fd, "console_other")), serial_number: opt(fd, "serial_number"),
    condition_notes: opt(fd, "condition_notes"), accessories: opt(fd, "accessories"),
  }).eq("id", s(fd, "device_id"));
  if (devErr) throw new Error(devErr.message);

  const { error } = await supabase.from("tickets")
    .update({ issue: s(fd, "issue"), estimate_cents: cents(s(fd, "estimate")), labor_cents: cents(s(fd, "labor")), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/tickets");
  redirect(`/tickets/${id}`);
}

/** Moves a ticket to a new status and records it in the work log. Returns true if the status changed. */
async function applyStatus(supabase: SupabaseClient, ticketId: string, statusId: string, notify = true): Promise<boolean> {
  const [{ data: ticket }, { data: next }] = await Promise.all([
    supabase.from("tickets").select("status_id, completed_at, status:statuses(name, position)").eq("id", ticketId).single(),
    supabase.from("statuses").select("*").eq("id", statusId).single(),
  ]);
  if (!ticket || !next || ticket.status_id === statusId) return false;

  const prev = ticket.status as unknown as { name: string; position: number } | null;
  const nextStatus = next as Status;
  const now = new Date().toISOString();

  const { error } = await supabase.from("tickets")
    .update({
      status_id: statusId, updated_at: now,
      closed_at: nextStatus.is_closed ? now : null,
      completed_at: nextStatus.is_done ? (ticket.completed_at ?? now) : null,
    })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);

  await supabase.from("work_log").insert({
    ticket_id: ticketId, kind: "status", body: `Status changed from ${prev?.name ?? "unknown"} to ${nextStatus.name}`,
  });

  // Customer updates only go out when a ticket moves forward, so correcting a mis-tap doesn't email anyone.
  if (notify && nextStatus.position > (prev?.position ?? -1)) {
    try { await notifyStatusChange(supabase, ticketId); } catch { /* a failed notification must never block the status change */ }
  }
  return true;
}

export async function setTicketStatus(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  await applyStatus(supabase, ticketId, s(fd, "status_id"));
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

/** Adds a work-log note and, optionally, changes the status in the same save. */
export async function addLogEntry(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const body = s(fd, "body");
  const statusId = s(fd, "status_id");

  if (statusId) await applyStatus(supabase, ticketId, statusId, fd.get("no_notify") !== "on");

  if (body) {
    const { error } = await supabase.from("work_log").insert({ ticket_id: ticketId, body, kind: "note" });
    if (error) throw new Error(error.message);
  }
  await supabase.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

/** Called from the browser after photos were uploaded straight to storage. */
export async function addTicketPhotos(ticketId: string, kind: string, photos: { path: string; caption: string }[]) {
  if (!["intake", "before", "after"].includes(kind)) return;
  const rows = photos
    .filter((p) => typeof p.path === "string" && p.path.startsWith(`tickets/${ticketId}/`))
    .map((p) => ({ ticket_id: ticketId, storage_path: p.path, kind, caption: (p.caption ?? "").trim().slice(0, 200) || null }));
  if (!rows.length) return;

  const supabase = await createClient();
  const { error } = await supabase.from("ticket_photos").insert(rows);
  if (error) throw new Error(error.message);

  await supabase.from("work_log").insert({
    ticket_id: ticketId, kind: "note", body: `Added ${rows.length} ${kind} photo${rows.length > 1 ? "s" : ""}`,
  });
  await supabase.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
  revalidatePath(`/tickets/${ticketId}`);
}

/* ---------- customers ---------- */
export async function saveCustomer(fd: FormData) {
  const supabase = await createClient();
  const id = s(fd, "id");
  const values = {
    name: s(fd, "name"), phone: opt(fd, "phone"), email: opt(fd, "email"), notes: opt(fd, "notes"),
    notify_email: fd.get("notify_email") === "on", sms_opt_in: fd.get("sms_opt_in") === "on",
  };

  if (id) {
    const { error } = await supabase.from("customers").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(`/customers/${id}`);
    redirect(`/customers/${id}`);
  }
  const { data, error } = await supabase.from("customers").insert(values).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

/* ---------- statuses (settings) ---------- */
export async function addStatus(fd: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.from("statuses").select("position").order("position", { ascending: false }).limit(1);
  const position = (data?.[0]?.position ?? 0) + 1;
  const { error } = await supabase.from("statuses").insert({
    name: s(fd, "name"), color: s(fd, "color") || "#8D95AA", is_closed: fd.get("is_closed") === "on",
    is_done: fd.get("is_done") === "on" || fd.get("is_closed") === "on", position,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/statuses");
  redirect("/settings/statuses");
}

export async function updateStatus(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("statuses")
    .update({
      name: s(fd, "name"), color: s(fd, "color"), is_closed: fd.get("is_closed") === "on",
      is_done: fd.get("is_done") === "on" || fd.get("is_closed") === "on",
    })
    .eq("id", s(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/settings/statuses");
  redirect("/settings/statuses");
}

async function move(fd: FormData, dir: -1 | 1) {
  const supabase = await createClient();
  const id = s(fd, "id");
  const { data } = await supabase.from("statuses").select("id, position").order("position");
  const list = data ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  await supabase.from("statuses").update({ position: list[j].position }).eq("id", list[i].id);
  await supabase.from("statuses").update({ position: list[i].position }).eq("id", list[j].id);
  revalidatePath("/settings/statuses");
}
export async function moveStatusUp(fd: FormData) { await move(fd, -1); }
export async function moveStatusDown(fd: FormData) { await move(fd, 1); }

export async function deleteStatus(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("statuses").delete().eq("id", s(fd, "id"));
  if (error) redirect("/settings/statuses?error=" + encodeURIComponent("That status is used by tickets. Move those tickets to another status first."));
  revalidatePath("/settings/statuses");
  redirect("/settings/statuses");
}

/* ---------- parts inventory ---------- */
const int = (v: string, fallback = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : fallback);

export async function savePart(fd: FormData) {
  const supabase = await createClient();
  const id = s(fd, "id");
  const values = {
    name: s(fd, "name"), sku: opt(fd, "sku"), supplier: opt(fd, "supplier"),
    cost_cents: cents(s(fd, "cost")) ?? 0, price_cents: cents(s(fd, "price")) ?? 0,
    low_stock_at: Math.max(0, int(s(fd, "low_stock_at"), 2)), notes: opt(fd, "notes"),
  };
  if (id) {
    const { error } = await supabase.from("parts").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/parts");
    redirect(`/parts/${id}`);
  }
  const { data, error } = await supabase.from("parts").insert({ ...values, stock: Math.max(0, int(s(fd, "stock"))) }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/parts");
  redirect(`/parts/${data.id}`);
}

export async function adjustStock(fd: FormData) {
  const supabase = await createClient();
  const id = s(fd, "id");
  const delta = int(s(fd, "delta"));
  const { data: part } = await supabase.from("parts").select("stock").eq("id", id).single();
  if (!part) redirect("/parts");
  if (part.stock + delta < 0) redirect(`/parts/${id}?error=` + encodeURIComponent(`Stock can't go below zero. You have ${part.stock}.`));
  const { error } = await supabase.from("parts").update({ stock: part.stock + delta }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/parts");
  revalidatePath("/");
  redirect(`/parts/${id}`);
}

export async function setPartArchived(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("parts").update({ archived: fd.get("archived") === "true" }).eq("id", s(fd, "id"));
  revalidatePath("/parts");
  redirect("/parts");
}

/* ---------- parts used on a ticket ---------- */
async function logNote(supabase: SupabaseClient, ticketId: string, body: string) {
  await supabase.from("work_log").insert({ ticket_id: ticketId, kind: "note", body });
}
function refreshTicketPages(ticketId: string) {
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/parts");
  revalidatePath("/");
}

export async function addPartToTicket(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const partId = s(fd, "part_id");
  const qty = int(s(fd, "qty"), 1);
  const price = s(fd, "unit_price");

  const { error } = await supabase.rpc("add_ticket_part", {
    p_ticket: ticketId, p_part: partId, p_qty: qty, p_price: price ? cents(price) : null,
  });
  if (error) redirect(`/tickets/${ticketId}?error=` + encodeURIComponent(error.message));

  const { data: part } = await supabase.from("parts").select("name").eq("id", partId).single();
  await logNote(supabase, ticketId, `Used ${qty} x ${part?.name ?? "part"}`);
  refreshTicketPages(ticketId);
  redirect(`/tickets/${ticketId}`);
}

export async function addCustomPart(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const qty = Math.max(1, int(s(fd, "qty"), 1));
  const name = s(fd, "name");
  const { error } = await supabase.from("ticket_parts").insert({
    ticket_id: ticketId, part_id: null, name, qty,
    unit_cost_cents: cents(s(fd, "cost")) ?? 0, unit_price_cents: cents(s(fd, "price")) ?? 0,
  });
  if (error) redirect(`/tickets/${ticketId}?error=` + encodeURIComponent(error.message));
  await logNote(supabase, ticketId, `Added ${qty} x ${name} (not from inventory)`);
  await supabase.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
  refreshTicketPages(ticketId);
  redirect(`/tickets/${ticketId}`);
}

export async function removeTicketPart(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const lineId = s(fd, "line_id");
  const { data: line } = await supabase.from("ticket_parts").select("name, qty, part_id").eq("id", lineId).single();
  const { error } = await supabase.rpc("remove_ticket_part", { p_line: lineId });
  if (error) redirect(`/tickets/${ticketId}?error=` + encodeURIComponent(error.message));
  if (line) await logNote(supabase, ticketId, `Removed ${line.qty} x ${line.name}${line.part_id ? " (returned to stock)" : ""}`);
  refreshTicketPages(ticketId);
  redirect(`/tickets/${ticketId}`);
}

/* ---------- invoices ---------- */
export async function createInvoice(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");

  const { data: existing } = await supabase.from("invoices").select("id").eq("ticket_id", ticketId).maybeSingle();
  if (existing) redirect(`/tickets/${ticketId}/invoice`);

  const [{ data: ticket }, { data: lines }] = await Promise.all([
    supabase.from("tickets").select("customer_id, labor_cents, device:devices(console_type, model)").eq("id", ticketId).single(),
    supabase.from("ticket_parts").select("name, qty, unit_price_cents").eq("ticket_id", ticketId).order("created_at"),
  ]);
  if (!ticket) throw new Error("Ticket not found");

  const taxDefault = Number.parseFloat(process.env.DEFAULT_TAX_PERCENT ?? "0");
  const { data: inv, error } = await supabase.from("invoices")
    .insert({ ticket_id: ticketId, customer_id: ticket.customer_id, tax_percent: Number.isFinite(taxDefault) ? taxDefault : 0 })
    .select("id").single();
  if (error) throw new Error(error.message);

  const items: { invoice_id: string; description: string; qty: number; unit_price_cents: number; position: number }[] = [];
  if ((ticket.labor_cents ?? 0) > 0) {
    items.push({ invoice_id: inv.id, description: "Repair labor", qty: 1, unit_price_cents: ticket.labor_cents!, position: 0 });
  }
  (lines ?? []).forEach((l) => items.push({ invoice_id: inv.id, description: l.name, qty: l.qty, unit_price_cents: l.unit_price_cents, position: items.length }));
  if (items.length) await supabase.from("invoice_items").insert(items);

  revalidatePath("/invoices");
  redirect(`/tickets/${ticketId}/invoice`);
}

function refreshInvoice(ticketId: string) {
  revalidatePath(`/tickets/${ticketId}/invoice`);
  revalidatePath("/invoices");
  revalidatePath("/");
}

export async function saveInvoiceMeta(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const tax = Number.parseFloat(s(fd, "tax_percent"));
  const { error } = await supabase.from("invoices")
    .update({ tax_percent: Number.isFinite(tax) && tax >= 0 ? tax : 0, notes: opt(fd, "notes") })
    .eq("id", s(fd, "invoice_id"));
  if (error) throw new Error(error.message);
  refreshInvoice(ticketId);
}

export async function addInvoiceItem(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const invoiceId = s(fd, "invoice_id");
  const { data: last } = await supabase.from("invoice_items").select("position").eq("invoice_id", invoiceId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("invoice_items").insert({
    invoice_id: invoiceId, description: s(fd, "description"), qty: Math.max(1, int(s(fd, "qty"), 1)),
    unit_price_cents: cents(s(fd, "price")) ?? 0, position: (last?.[0]?.position ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  refreshInvoice(ticketId);
}

export async function updateInvoiceItem(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoice_items").update({
    description: s(fd, "description"), qty: Math.max(1, int(s(fd, "qty"), 1)), unit_price_cents: cents(s(fd, "price")) ?? 0,
  }).eq("id", s(fd, "item_id"));
  if (error) throw new Error(error.message);
  refreshInvoice(s(fd, "ticket_id"));
}

export async function removeInvoiceItem(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("invoice_items").delete().eq("id", s(fd, "item_id"));
  refreshInvoice(s(fd, "ticket_id"));
}

export async function recordPayment(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const amount = cents(s(fd, "amount"));
  const method = s(fd, "method");
  if (!amount || amount <= 0 || !["cash", "card", "other"].includes(method)) {
    redirect(`/tickets/${ticketId}/invoice?error=` + encodeURIComponent("Enter an amount greater than zero and choose how it was paid."));
  }
  const { error } = await supabase.from("payments").insert({ invoice_id: s(fd, "invoice_id"), amount_cents: amount, method, note: opt(fd, "note") });
  if (error) throw new Error(error.message);
  await supabase.from("work_log").insert({ ticket_id: ticketId, kind: "note", body: `Payment of $${(amount / 100).toFixed(2)} recorded (${method})` });
  refreshInvoice(ticketId);
  redirect(`/tickets/${ticketId}/invoice`);
}

export async function removePayment(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  await supabase.from("payments").delete().eq("id", s(fd, "payment_id"));
  await supabase.from("work_log").insert({ ticket_id: ticketId, kind: "note", body: "A payment record was removed from the invoice" });
  refreshInvoice(ticketId);
}

export async function setInvoiceVoid(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("invoices").update({ status: fd.get("void") === "true" ? "void" : "open" }).eq("id", s(fd, "invoice_id"));
  refreshInvoice(s(fd, "ticket_id"));
}

/* ---------- customer notifications ---------- */
export async function saveStatusTemplate(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("statuses").update({
    notify_email: fd.get("notify_email") === "on", email_subject: s(fd, "email_subject"), email_body: String(fd.get("email_body") ?? "").trim(),
    notify_sms: fd.get("notify_sms") === "on", sms_body: String(fd.get("sms_body") ?? "").trim(),
  }).eq("id", s(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/settings/notifications");
  redirect("/settings/notifications");
}

/** A one-off message from the ticket page, not tied to a status template. */
export async function sendCustomerMessage(fd: FormData) {
  const supabase = await createClient();
  const ticketId = s(fd, "ticket_id");
  const message = String(fd.get("message") ?? "").trim();
  const t = await loadContext(supabase, ticketId);
  if (!t || !message) redirect(`/tickets/${ticketId}`);

  const outcome = s(fd, "channel") === "sms"
    ? await deliverSms(supabase, t, message)
    : await deliverEmail(supabase, t, s(fd, "subject") || `An update on your ${t.device.model ?? "repair"}`, message);

  revalidatePath(`/tickets/${ticketId}`);
  if (outcome.status !== "sent") redirect(`/tickets/${ticketId}?error=` + encodeURIComponent(`Message not sent: ${outcome.detail}`));
  redirect(`/tickets/${ticketId}`);
}
