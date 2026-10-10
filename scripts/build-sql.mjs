import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSetupSql } from "./lib/sql.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "supabase", "setup.sql");
fs.writeFileSync(out, buildSetupSql(path.join(root, "supabase", "migrations")));
console.log("Wrote supabase/setup.sql");
