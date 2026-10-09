import { createClient } from "@/lib/supabase/server";
import { NewTicketForm } from "@/components/new-ticket-form";
import { PageHeader } from "@/components/ui";
import type { Customer } from "@/lib/types";

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").order("name");
  return (
    <div className="max-w-3xl">
      <PageHeader title="New ticket" />
      <NewTicketForm customers={(data ?? []) as Customer[]} defaultCustomerId={customer} />
    </div>
  );
}
