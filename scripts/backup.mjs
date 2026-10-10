import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { readEnvFile } from "./lib/env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isLocal = (cs) => /localhost|127\.0\.0\.1|host=%2F|host=\//.test(cs);

/** Writes every table in the public schema to JSON files in a new timestamped folder. */
export async function backup({ connectionString, outDir, log = console.log }) {
  const client = new pg.Client({ connectionString, ssl: isLocal(connectionString) ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows: tables } = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name"
    );
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(outDir, stamp);
    fs.mkdirSync(dir, { recursive: true });
    const counts = {};
    for (const { table_name } of tables) {
      const { rows } = await client.query(`select * from public."${table_name.replace(/"/g, '""')}"`);
      fs.writeFileSync(path.join(dir, `${table_name}.json`), JSON.stringify(rows, null, 2));
      counts[table_name] = rows.length;
      log(`  ${table_name}: ${rows.length} rows`);
    }
    return { dir, counts };
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = { ...readEnvFile(path.join(root, ".env.local")), ...process.env };
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run `npm run setup`, or add DATABASE_URL to .env.local.");
    process.exit(1);
  }
  console.log("Backing up your database...");
  backup({ connectionString: env.DATABASE_URL, outDir: path.join(root, "backups") })
    .then(({ dir }) => {
      console.log(`\nSaved to ${path.relative(root, dir)}`);
      console.log("This covers your data (customers, tickets, invoices, and so on). Photos are not included.");
      console.log("In Supabase, Storage > ticket-photos lets you download those. Keep backups somewhere private.");
    })
    .catch((e) => { console.error("\n" + e.message); process.exit(1); });
}
