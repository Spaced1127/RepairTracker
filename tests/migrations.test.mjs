import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSetupSql, listMigrations } from "../scripts/lib/sql.mjs";

const dir = path.resolve(import.meta.dirname, "../supabase/migrations");
const files = listMigrations(dir);

describe("database migrations", () => {
  it("are numbered 0001, 0002, ... with no gaps or duplicates", () => {
    expect(files.map((f) => Number(f.slice(0, 4)))).toEqual(files.map((_, i) => i + 1));
  });

  it("are all valid migration file names", () => {
    const all = fs.readdirSync(dir);
    expect(all.filter((f) => !files.includes(f))).toEqual([]);
  });

  it("have a setup.sql that is up to date (run `npm run build:sql` if this fails)", () => {
    const bundled = fs.readFileSync(path.resolve(dir, "../setup.sql"), "utf8");
    expect(bundled).toBe(buildSetupSql(dir));
  });

  it("match the version the code expects (update LATEST_MIGRATION in lib/version.ts)", () => {
    const version = fs.readFileSync(path.resolve(dir, "../../lib/version.ts"), "utf8");
    expect(version).toContain(`"${files[files.length - 1]}"`);
  });

  it("never expose a table without row-level security", () => {
    const tables = new Set();
    const secured = new Set();
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      for (const m of sql.matchAll(/create table public\.(\w+)/g)) tables.add(m[1]);
      for (const m of sql.matchAll(/alter table public\.(\w+)\s+enable row level security/g)) secured.add(m[1]);
    }
    expect([...tables].filter((t) => !secured.has(t))).toEqual([]);
  });
});
