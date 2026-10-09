import { createClient } from "@/lib/supabase/server";
import { addStatus, updateStatus, moveStatusUp, moveStatusDown, deleteStatus, signOut } from "@/app/actions";
import { Card, PageHeader, field, btnPrimary, btnGhost, btnDanger } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import type { Status } from "@/lib/types";

export default async function StatusesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("statuses").select("*").order("position");
  const statuses = (data ?? []) as Status[];

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" />
      <SettingsTabs active="statuses" />
      <p className="text-mute">
        These are the stages every ticket moves through, in order. New tickets start at the first stage. Mark a stage as Repair finished to count tickets that reach it as completed on the dashboard. Stages that close the ticket also hide it from the default open list.
      </p>
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="space-y-3">
        {statuses.map((s, i) => (
          <form key={s.id} action={updateStatus}>
            <Card className="flex flex-wrap items-center gap-3 p-4">
              <input type="hidden" name="id" value={s.id} />
              <input type="color" name="color" defaultValue={s.color} aria-label={`Color for ${s.name}`} className="size-11 shrink-0 cursor-pointer rounded-md border border-line bg-bench p-1" />
              <input name="name" required defaultValue={s.name} aria-label="Status name" className={`${field} min-w-40 flex-1`} />
              <div className="flex flex-col">
                <label className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" name="is_done" defaultChecked={s.is_done} className="size-4 accent-[#f5b83d]" />
                  Repair finished
                </label>
                <label className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" name="is_closed" defaultChecked={s.is_closed} className="size-4 accent-[#f5b83d]" />
                  Closes the ticket
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnPrimary}>Save</button>
                <button formAction={moveStatusUp} disabled={i === 0} className={btnGhost} aria-label={`Move ${s.name} earlier`}>Move up</button>
                <button formAction={moveStatusDown} disabled={i === statuses.length - 1} className={btnGhost} aria-label={`Move ${s.name} later`}>Move down</button>
                <button formAction={deleteStatus} className={btnDanger}>Delete</button>
              </div>
            </Card>
          </form>
        ))}
      </div>

      <form action={addStatus}>
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <input type="color" name="color" defaultValue="#8d95aa" aria-label="Color for the new status" className="size-11 shrink-0 cursor-pointer rounded-md border border-line bg-bench p-1" />
          <input name="name" required placeholder="New status name" aria-label="New status name" className={`${field} min-w-40 flex-1`} />
          <div className="flex flex-col">
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="is_done" className="size-4 accent-[#f5b83d]" />
              Repair finished
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="is_closed" className="size-4 accent-[#f5b83d]" />
              Closes the ticket
            </label>
          </div>
          <button className={btnPrimary}>Add status</button>
        </Card>
      </form>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-mute">Sign out of this device.</p>
        </div>
        <form action={signOut}><button className={btnGhost}>Sign out</button></form>
      </Card>
    </div>
  );
}
