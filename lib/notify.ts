import type { SupabaseClient } from "@supabase/supabase-js";
import { absoluteUrl } from "./qr";
import { SHOP_NAME, deviceName } from "./util";
import type { Customer, Device, Status, Ticket } from "./types";

type Ctx = Ticket & { status: Status; customer: Customer; device: Device };
export type Outcome = { status: "sent" | "failed" | "skipped"; detail: string; providerId?: string };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const smsConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID));

/** Replaces {{placeholders}}. Unknown placeholders become empty. */
export const render = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (text: string) =>
  `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">${esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, "<br>")}</div>`;

/** US-style numbers become +1XXXXXXXXXX. Returns null when the number can't be texted. */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  const cc = (process.env.SMS_DEFAULT_COUNTRY_CODE || "1").replace(/\D/g, "");
  if (cc === "1") {
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return null;
  }
  return digits.length >= 7 && digits.length <= 12 ? `+${cc}${digits}` : null;
}

async function sendEmail(to: string, subject: string, text: string): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html: toHtml(text), reply_to: process.env.EMAIL_REPLY_TO || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { id: json.id } : { error: json.message ?? `Email service returned ${res.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reach the email service" };
  }
}

async function sendSms(to: string, body: string): Promise<{ id?: string; error?: string }> {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const params = new URLSearchParams({ To: to, Body: body });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    else params.set("From", process.env.TWILIO_FROM_NUMBER!);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    return res.ok ? { id: json.sid } : { error: json.message ?? `Text service returned ${res.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reach the text service" };
  }
}

export async function loadContext(supabase: SupabaseClient, ticketId: string): Promise<Ctx | null> {
  const { data } = await supabase.from("tickets").select("*, status:statuses(*), customer:customers(*), device:devices(*)").eq("id", ticketId).maybeSingle();
  return (data as Ctx | null) ?? null;
}

async function varsFor(t: Ctx) {
  return {
    customer_name: t.customer.name,
    first_name: t.customer.name.trim().split(/\s+/)[0] ?? "",
    ticket_number: String(t.ticket_number),
    device: deviceName(t.device),
    status: t.status.name,
    shop_name: SHOP_NAME,
    status_link: await absoluteUrl(`/status/${t.track_token}`),
  };
}

async function finish(supabase: SupabaseClient, t: Ctx, channel: "email" | "sms", to: string, subject: string | null, body: string, o: Outcome): Promise<Outcome> {
  await supabase.from("notifications").insert({
    ticket_id: t.id, customer_id: t.customer_id, channel, to_address: to, subject, body,
    status: o.status, error: o.status === "sent" ? null : o.detail, provider_id: o.providerId ?? null,
  });
  if (o.status !== "skipped") {
    const what = channel === "email" ? "Emailed customer" : "Texted customer";
    await supabase.from("work_log").insert({
      ticket_id: t.id, kind: "note",
      body: o.status === "sent" ? `${what}${subject ? `: ${subject}` : ""}` : `${channel === "email" ? "Email" : "Text"} to customer failed: ${o.detail}`,
    });
  }
  return o;
}

export async function deliverEmail(supabase: SupabaseClient, t: Ctx, subject: string, text: string): Promise<Outcome> {
  const to = t.customer.email ?? "";
  let o: Outcome;
  if (!to) o = { status: "skipped", detail: "No email address on file" };
  else if (!t.customer.notify_email) o = { status: "skipped", detail: "Customer has email updates turned off" };
  else if (!emailConfigured()) o = { status: "skipped", detail: "Email sending is not set up yet" };
  else {
    const r = await sendEmail(to, subject, text);
    o = r.error ? { status: "failed", detail: r.error } : { status: "sent", detail: "Sent", providerId: r.id };
  }
  return finish(supabase, t, "email", to, subject, text, o);
}

export async function deliverSms(supabase: SupabaseClient, t: Ctx, text: string): Promise<Outcome> {
  const raw = t.customer.phone ?? "";
  const to = raw ? toE164(raw) : null;
  let o: Outcome;
  if (!raw) o = { status: "skipped", detail: "No phone number on file" };
  else if (!t.customer.sms_opt_in) o = { status: "skipped", detail: "Customer has not agreed to text messages" };
  else if (!smsConfigured()) o = { status: "skipped", detail: "Text sending is not set up yet" };
  else if (!to) o = { status: "failed", detail: "That phone number can't be texted. Check its format." };
  else {
    const r = await sendSms(to, text);
    o = r.error ? { status: "failed", detail: r.error } : { status: "sent", detail: "Sent", providerId: r.id };
  }
  return finish(supabase, t, "sms", to ?? raw, null, text, o);
}

/** Sends whichever customer updates the ticket's current status has switched on. */
export async function notifyStatusChange(supabase: SupabaseClient, ticketId: string) {
  const t = await loadContext(supabase, ticketId);
  if (!t) return;
  const vars = await varsFor(t);
  if (t.status.notify_email && t.status.email_body.trim()) {
    await deliverEmail(supabase, t, render(t.status.email_subject || "An update on your {{device}}", vars), render(t.status.email_body, vars));
  }
  if (t.status.notify_sms && t.status.sms_body.trim()) {
    await deliverSms(supabase, t, render(t.status.sms_body, vars));
  }
}
