import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { readEnvFile, writeEnvFile } from "./lib/env.mjs";
import { runMigrations } from "./migrate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const flags = new Set(process.argv.slice(2));
const nonInteractive = flags.has("--yes");

const GROUPS = [
  { title: "Supabase (required)", keys: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
  { title: "Used only by the setup and migrate commands. Not needed on Vercel.", keys: ["DATABASE_URL"] },
  { title: "Shop", keys: ["NEXT_PUBLIC_SHOP_NAME", "NEXT_PUBLIC_TIMEZONE", "DEFAULT_TAX_PERCENT"] },
  { title: "Keep-alive job protection", keys: ["CRON_SECRET"] },
  { title: "Card payments (optional)", keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { title: "Customer email (optional)", keys: ["RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO"] },
  { title: "Customer texts (optional)", keys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "TWILIO_MESSAGING_SERVICE_SID", "SMS_DEFAULT_COUNTRY_CODE"] },
];

/**
 * Reads one line from the user. On a real terminal it reads keys directly, so secret input is never shown.
 * When input is piped (scripts, tests) it reads lines in order instead.
 */
function createPrompter() {
  let rl = null;
  let lines = null;
  return {
    line(label, { secret = false } = {}) {
      if (!process.stdin.isTTY) {
        rl ??= readline.createInterface({ input: process.stdin });
        lines ??= rl[Symbol.asyncIterator]();
        process.stdout.write(label);
        return lines.next().then(({ value, done }) => {
          if (done) throw new Error("Ran out of input.");
          process.stdout.write("\n");
          return value;
        });
      }
      return new Promise((resolve) => {
        const stdin = process.stdin;
        process.stdout.write(label);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        let buf = "";
        const finish = () => { stdin.off("data", onData); stdin.setRawMode(false); stdin.pause(); };
        const onData = (chunk) => {
          for (let i = 0; i < chunk.length; i++) {
            const ch = chunk[i];
            if (ch === "\u0003") { finish(); process.stdout.write("\n"); process.exit(130); } // Ctrl+C
            if (ch === "\r" || ch === "\n") {
              finish();
              process.stdout.write(secret ? `[${buf.length} characters, hidden]\n` : "\n");
              return resolve(buf);
            }
            if (ch === "\u007f" || ch === "\b") {
              if (buf.length) { buf = buf.slice(0, -1); if (!secret) process.stdout.write("\b \b"); }
              continue;
            }
            if (ch === "\u001b") { // skip arrow keys and other escape sequences
              const m = chunk.slice(i).match(/^\u001b(\[[0-9;]*[A-Za-z~]|O[A-Za-z])?/);
              i += (m ? m[0].length : 1) - 1;
              continue;
            }
            if (ch < " ") continue;
            buf += ch;
            if (!secret) process.stdout.write(ch);
          }
        };
        stdin.on("data", onData);
      });
    },
    close() { rl?.close(); },
  };
}

const prompter = createPrompter();
const existing = readEnvFile(envPath);
const get = (k) => process.env[k] ?? existing[k] ?? "";

async function ask(label, { key, fallback = "", secret = false, required = true, validate } = {}) {
  const current = (key && get(key)) || fallback;
  if (nonInteractive) {
    if (required && !current) throw new Error(`Missing ${key ?? label}. Set it in .env.local or the environment.`);
    return current;
  }
  for (;;) {
    const hint = current ? (secret ? " [keep existing]" : ` [${current}]`) : "";
    const answer = (await prompter.line(`${label}${hint}: `, { secret })).trim();
    const value = answer || current;
    if (!value && required) { console.log("  This one is required."); continue; }
    const problem = value && validate ? validate(value) : null;
    if (problem) { console.log(`  ${problem}`); continue; }
    return value;
  }
}

const step = (n, text) => console.log(`\n[${n}/5] ${text}`);

async function main() {
  console.log("\nRepair Bench setup\n==================");
  console.log("This connects the app to your Supabase project, creates the database, and adds your login.");
  console.log("You will need your Supabase project open: Project Settings > API, and the Connect button for the database address.\n");

  step(1, "Your Supabase project");
  const url = await ask("Project URL (https://xxxx.supabase.co)", {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    validate: (v) => (/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(v) ? null : "That doesn't look like a Supabase project URL."),
  });
  const anon = await ask("anon / public key", { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", secret: true });
  const service = await ask("service_role / secret key (stays on the server, never shared)", { key: "SUPABASE_SERVICE_ROLE_KEY", secret: true });
  console.log("\nFor the database address, click Connect in Supabase and copy the 'Session pooler' connection string.");
  console.log("Use the pooler one: the direct address often fails on home internet. Put your database password in place of [YOUR-PASSWORD].");
  const dbUrl = await ask("Database connection string", {
    key: "DATABASE_URL", secret: true,
    validate: (v) => (/^postgres(ql)?:\/\//i.test(v) && !v.includes("[YOUR-PASSWORD]") ? null : "That should start with postgresql:// and include your real password."),
  });

  step(2, "Your shop");
  const shop = await ask("Shop name", { key: "NEXT_PUBLIC_SHOP_NAME", fallback: "Repair Bench" });
  const tz = await ask("Time zone", { key: "NEXT_PUBLIC_TIMEZONE", fallback: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const tax = await ask("Default sales tax % for invoices (0 if none)", { key: "DEFAULT_TAX_PERCENT", fallback: "0", required: false });

  step(3, "Creating the database");
  if (flags.has("--skip-db")) console.log("  Skipped (--skip-db).");
  else await runMigrations({ connectionString: dbUrl, baseline: flags.has("--baseline"), log: (m) => console.log("  " + m) });

  step(4, "Your login");
  const email = await ask("Your email (this is your login)", { key: "OWNER_EMAIL", validate: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : "Enter a valid email.") });
  const password = await ask("Choose a password (10+ characters)", { key: "OWNER_PASSWORD", secret: true, validate: (v) => (v.length >= 10 ? null : "Use at least 10 characters.") });
  if (flags.has("--skip-user")) console.log("  Skipped (--skip-user).");
  else {
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error && /already|registered|exists/i.test(error.message)) console.log("  That email already has a login. Leaving it as is.");
    else if (error) throw new Error(`Could not create your login: ${error.message}`);
    else console.log("  Login created.");
  }

  step(5, "Saving settings");
  const values = {
    ...existing,
    NEXT_PUBLIC_SUPABASE_URL: url.replace(/\/$/, ""), NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service,
    DATABASE_URL: dbUrl, NEXT_PUBLIC_SHOP_NAME: shop, NEXT_PUBLIC_TIMEZONE: tz, DEFAULT_TAX_PERCENT: tax || "0",
    CRON_SECRET: get("CRON_SECRET") || crypto.randomBytes(24).toString("hex"),
  };
  delete values.OWNER_EMAIL; delete values.OWNER_PASSWORD;
  writeEnvFile(envPath, values, GROUPS);
  console.log("  Wrote .env.local");

  let signups = null;
  if (!flags.has("--skip-checks")) {
    try {
      const res = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: anon } });
      if (res.ok) signups = !(await res.json()).disable_signup;
    } catch { /* offline checks are best effort */ }
  }

  console.log("\nAll set.\n");
  if (signups) {
    console.log("!! ONE MORE STEP, IMPORTANT !!");
    console.log("Sign-ups are still open on your Supabase project. Until you close them, anyone could create an account and see your data.");
    console.log("In Supabase: Authentication > Sign In / Providers > turn OFF 'Allow new users to sign up'.\n");
  }
  console.log("Start the app:   npm run dev     then open http://localhost:3000");
  console.log("Put it online:   see docs/DEPLOY.md");
  console.log(`Your Vercel values: copy the contents of .env.local (skip DATABASE_URL).\n`);
}

main().then(() => prompter.close()).catch((e) => { console.error("\nSetup stopped: " + e.message); prompter.close(); process.exit(1); });
