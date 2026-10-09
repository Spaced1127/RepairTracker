export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const TZ = process.env.NEXT_PUBLIC_TIMEZONE || "America/New_York";
export const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || "Repair Bench";

export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

export const usd = (cents: number) => `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;
export const money = (cents: number | null) => (cents == null ? "None" : `$${(cents / 100).toFixed(2)}`);

const CONSOLE_COLORS: Record<string, string> = {
  Sony: "#2E8BFF", Microsoft: "#4CC24A", Nintendo: "#FF3B4E", Valve: "#35C2D6", Asus: "#A78BFA", Other: "#8D95AA",
  // older tickets created before the brand dropdown
  PlayStation: "#2E8BFF", Xbox: "#4CC24A", Sega: "#35C2D6", Atari: "#E8873A", "Handheld PC": "#A78BFA",
};
export const accentFor = (consoleType: string) => CONSOLE_COLORS[consoleType] ?? CONSOLE_COLORS.Other;

/** "Sony PS5", "Microsoft Xbox Series X", or the typed name for other devices. */
export const deviceName = (d: { console_type: string; model: string | null }) =>
  d.console_type === "Other" ? d.model || "Other device" : [d.console_type, d.model].filter(Boolean).join(" ");

/* Day helpers in the shop's time zone. Day keys are "YYYY-MM-DD" strings, which sort correctly. */
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const dayKey = (d: Date | string) => dayFmt.format(new Date(d));
export const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Monday of the current week, as a day key. */
export const weekStartKey = (todayKey: string) => {
  const dow = new Date(`${todayKey}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(todayKey, -((dow + 6) % 7));
};
export const fmtDayKey = (key: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${key}T12:00:00Z`));
