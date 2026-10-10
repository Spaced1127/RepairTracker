import fs from "node:fs";

/** Reads KEY=VALUE lines from a file. Missing file gives an empty object. */
export function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const needsQuotes = (v) => /[\s#"]/.test(v);

/** Writes grouped, commented env content. Keys not in `groups` are kept at the end. */
export function writeEnvFile(file, values, groups) {
  const known = new Set(groups.flatMap((g) => g.keys));
  const lines = [];
  for (const g of groups) {
    lines.push(`# ${g.title}`);
    for (const k of g.keys) lines.push(`${k}=${needsQuotes(values[k] ?? "") ? `"${values[k]}"` : (values[k] ?? "")}`);
    lines.push("");
  }
  const extras = Object.keys(values).filter((k) => !known.has(k));
  if (extras.length) {
    lines.push("# Other");
    for (const k of extras) lines.push(`${k}=${values[k]}`);
    lines.push("");
  }
  fs.writeFileSync(file, lines.join("\n"));
}
