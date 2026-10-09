import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, field, btnGhost, btnPrimary } from "@/components/ui";
import { usd } from "@/lib/util";
import type { Part } from "@/lib/types";

type SP = { q?: string; show?: string };

export default async function PartsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const show = sp.show ?? "all";

  const supabase = await createClient();
  const { data } = await supabase.from("parts").select("*").order("name");
  const all = (data ?? []) as Part[];
  const active = all.filter((p) => !p.archived);

  const flagged = active.filter((p) => p.stock <= p.low_stock_at);
  const stockValue = active.reduce((sum, p) => sum + p.stock * p.cost_cents, 0);

  let list = show === "archived" ? all.filter((p) => p.archived) : active;
  if (show === "low") list = list.filter((p) => p.stock <= p.low_stock_at);
  if (show === "out") list = list.filter((p) => p.stock === 0);
  if (q) list = list.filter((p) => [p.name, p.sku, p.supplier].some((v) => v?.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader title="Parts">
        <Link href="/parts/new" className={btnPrimary}>Add part</Link>
      </PageHeader>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-sm text-mute">Parts tracked</p><p className="font-display text-3xl font-bold">{active.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">Low or out</p><p className={`font-display text-3xl font-bold ${flagged.length ? "text-solder" : ""}`}>{flagged.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-mute">Stock value at cost</p><p className="font-display text-3xl font-bold">{usd(stockValue)}</p></Card>
      </div>

      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_11rem_auto]">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, SKU, or supplier" aria-label="Search parts" className={field} />
        <select name="show" defaultValue={show} aria-label="Filter parts" className={field}>
          <option value="all">All parts</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="archived">Archived</option>
        </select>
        <button className={btnGhost}>Apply</button>
      </form>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-mute">
          {all.length === 0 ? "No parts yet. Add your first part to start tracking stock." : "No parts match."}
        </p>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {list.map((p) => {
              const out = p.stock === 0;
              const low = !out && p.stock <= p.low_stock_at;
              return (
                <li key={p.id}>
                  <Link href={`/parts/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-panel2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-mute">
                        {[p.sku, p.supplier].filter(Boolean).join(", ") || "No SKU or supplier"}
                      </span>
                    </span>
                    <span className="font-mono text-sm text-mute">{usd(p.cost_cents)} cost</span>
                    <span className="font-mono text-sm">{usd(p.price_cents)}</span>
                    <span
                      className={`min-w-24 rounded-md border px-2 py-1 text-center text-xs font-medium ${
                        out ? "border-danger/50 bg-danger/10 text-danger" : low ? "border-solder/50 bg-solder/10 text-solder" : "border-line text-mute"
                      }`}
                    >
                      {out ? "Out of stock" : low ? `Low: ${p.stock}` : `${p.stock} in stock`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
