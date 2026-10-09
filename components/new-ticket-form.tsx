"use client";

import { useEffect, useMemo, useState } from "react";
import { createTicket } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { shrink, extFor } from "@/lib/image";
import { Card, Check, Field, field, btnPrimary, btnGhost } from "./ui";
import { ConsoleSelect } from "./console-select";
import type { Customer } from "@/lib/types";

export function NewTicketForm({ customers, defaultCustomerId }: { customers: Customer[]; defaultCustomerId?: string }) {
  const [mode, setMode] = useState<"existing" | "new">(customers.length ? "existing" : "new");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  async function submit(fd: FormData) {
    setError(null);
    const paths: string[] = [];

    if (files.length) {
      const supabase = createClient();
      const folder = `intake/${crypto.randomUUID()}`;
      for (let i = 0; i < files.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${files.length}`);
        const blob = await shrink(files[i]);
        const ext = extFor(blob, files[i]);
        const path = `${folder}/${i + 1}.${ext}`;
        const { error: upErr } = await supabase.storage.from("ticket-photos").upload(path, blob, { contentType: blob.type || undefined });
        if (upErr) {
          setBusy(null);
          setError(`Photo ${i + 1} failed to upload: ${upErr.message}. The ticket was not created, so you can try again.`);
          return;
        }
        paths.push(path);
      }
    }

    setBusy(files.length ? "Creating ticket" : null);
    fd.set("photo_paths", JSON.stringify(paths));
    await createTicket(fd);
  }

  return (
    <form action={submit} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Customer</h2>
        <div className="inline-flex rounded-md border border-line p-1">
          {(["existing", "new"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={m === "existing" && customers.length === 0}
              className={`min-h-10 rounded px-4 text-sm font-medium ${mode === m ? "bg-solder text-bench" : "text-mute hover:text-ink"}`}
            >
              {m === "existing" ? "Existing customer" : "New customer"}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <Field label="Customer">
            <select name="customer_id" required defaultValue={defaultCustomerId ?? ""} className={field}>
              <option value="" disabled>Choose a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input name="name" required className={field} autoComplete="off" /></Field>
            <Field label="Phone"><input name="phone" type="tel" className={field} /></Field>
            <Field label="Email"><input name="email" type="email" className={field} /></Field>
            <Field label="Customer notes"><input name="customer_notes" className={field} /></Field>
            <div className="sm:col-span-2 rounded-lg border border-line px-4 py-2">
              <Check name="notify_email" label="Send status emails" defaultChecked />
              <Check name="sms_opt_in" label="Customer agreed to text messages" hint="Only if they asked for texts or said yes" />
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Device</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConsoleSelect />
          <Field label="Serial number"><input name="serial_number" className={`${field} font-mono`} autoComplete="off" /></Field>
        </div>
        <Field label="Accessories received" hint="Controllers, cables, discs, case">
          <input name="accessories" className={field} />
        </Field>
        <Field label="Condition notes" hint="Scratches, cracks, missing screws, liquid damage">
          <textarea name="condition_notes" rows={3} className={field} />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Intake photos (optional)</span>
          <p className="mb-2 text-xs text-mute">
            Photograph any existing damage before you start. Each photo is saved with the time it was uploaded.
          </p>
          <label className={`${btnGhost} cursor-pointer`}>
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setFiles((prev) => [...prev, ...picked]);
                e.target.value = "";
              }}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previews[i]} alt={`Selected photo ${i + 1}`} className="aspect-square w-full rounded-md border border-line object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-bench/90 text-sm text-ink hover:bg-danger"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Repair request</h2>
        <Field label="Reported issue">
          <textarea name="issue" required rows={4} className={field} />
        </Field>
        <div className="max-w-xs">
          <Field label="Estimate (USD)">
            <input name="estimate" type="number" step="0.01" min="0" inputMode="decimal" className={field} />
          </Field>
        </div>
      </Card>

      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <button className={btnPrimary} disabled={busy !== null}>{busy ?? "Create ticket"}</button>
    </form>
  );
}
