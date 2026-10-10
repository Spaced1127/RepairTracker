import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { readEnvFile } from "./lib/env.mjs";
import { listMigrations } from "./lib/sql.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(root, "supabase", "migrations");

const isLocal = (cs) => /localhost|127\.0\.0\.1|host=%2F|host=\//.test(cs);

/**
 * Applies any migration files that have not been applied yet, each in its own transaction.
 * `baseline` marks every file as applied without running it, for databases set up by hand.
 */
export async function runMigrations({ connectionString, baseline = false, log = console.log, dir = MIGRATIONS }) {
  const client = new pg.Client({ connectionString, ssl: isLocal(connectionString) ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(`
      create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now());
      alter table public.schema_migrations enable row level security;`);

    const files = listMigrations(dir);
    const done = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));

    if (done.size === 0) {
      const existing = (await client.query("select to_regclass('public.tickets') as t")).rows[0].t;
      if (existing && !baseline) {
        throw new Error(
          "This database already contains the app's tables but has no migration record.\n" +
          "If it was set up by pasting the SQL by hand and is fully up to date, run:  npm run migrate -- --baseline"
        );
      }
    }

    if (baseline) {
      for (const f of files) await client.query("insert into public.schema_migrations (name) values ($1) on conflict do nothing", [f]);
      log(`Marked ${files.length} migrations as applied.`);
      return { applied: [], baselined: files.length };
    }

    const pending = files.filter((f) => !done.has(f));
    if (!pending.length) {
      log("Database is up to date.");
      return { applied: [] };
    }
    for (const f of pending) {
      log(`Applying ${f} ...`);
      try {
        await client.query("begin");
        await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
        await client.query("insert into public.schema_migrations (name) values ($1)", [f]);
        await client.query("commit");
      } catch (e) {
        await client.query("rollback").catch(() => {});
        throw new Error(`Migration ${f} failed and was rolled back: ${e.message}`);
      }
    }
    log(`Applied ${pending.length} migration${pending.length > 1 ? "s" : ""}.`);
    return { applied: pending };
  } finally {
    await client.end();
  }
}

// `npm run migrate [-- --baseline]` reads DATABASE_URL from .env.local (or the environment).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run `npm run setup`, or add DATABASE_URL to .env.local.");
    process.exit(1);
  }
  runMigrations({ connectionString: env.DATABASE_URL, baseline: process.argv.includes("--baseline") }).catch((e) => {
    console.error("\n" + e.message);
    process.exit(1);
  });
}
