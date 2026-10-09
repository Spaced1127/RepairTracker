import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps a free Supabase project from being paused for inactivity. Vercel calls this once a day (see vercel.json)
 * and sends `Authorization: Bearer <CRON_SECRET>` automatically when CRON_SECRET is set in the project.
 * It runs a few cheap queries, which is the kind of database activity Supabase counts.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });

  const tables = ["statuses", "customers", "tickets"];
  const results = await Promise.all(
    tables.map(async (table) => {
      const { error } = await db.from(table).select("id", { count: "exact", head: true });
      return { table, error: error?.message };
    })
  );

  const failed = results.filter((r) => r.error);
  if (failed.length) return NextResponse.json({ ok: false, errors: failed.map((f) => `${f.table}: ${f.error}`) }, { status: 500 });
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
