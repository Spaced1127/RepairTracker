import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, field, btnGhost, btnPrimary } from "@/components/ui";
import type { Customer } from "@/lib/types";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").order("name");
  const needle = q.trim().toLowerCase();
  const customers = ((data ?? []) as Customer[]).filter(
    (c) => !needle || [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(needle))
  );

  return (
    <>
      <PageHeader title="Customers">
        <Link href="/customers/new" className={btnPrimary}>Add customer</Link>
      </PageHeader>
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, phone, or email" aria-label="Search customers" className={field} />
        <button className={btnGhost}>Search</button>
      </form>
      {customers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-mute">No customers found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="transition-colors hover:border-mute">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <p className="text-sm text-mute">{c.phone || "No phone"}</p>
                <p className="truncate text-sm text-mute">{c.email || "No email"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
