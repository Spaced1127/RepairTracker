import { createAdminClient } from "./supabase/admin";
import { LATEST_MIGRATION } from "./version";

/** true = anyone can create an account (unsafe), false = closed, null = could not tell. */
export async function signupsOpen(): Promise<boolean | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { disable_signup?: boolean };
    return typeof json.disable_signup === "boolean" ? !json.disable_signup : null;
  } catch {
    return null;
  }
}

/** Name of the newest applied migration, or null when it can't be read. */
export async function appliedSchema(): Promise<{ latest: string | null; upToDate: boolean | null }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { latest: null, upToDate: null };
  try {
    const { data, error } = await createAdminClient().from("schema_migrations").select("name").order("name", { ascending: false }).limit(1);
    if (error || !data?.length) return { latest: null, upToDate: null };
    return { latest: data[0].name, upToDate: data[0].name >= LATEST_MIGRATION };
  } catch {
    return { latest: null, upToDate: null };
  }
}
