"use client";

import { useEffect, useRef, useState } from "react";
import { addTicketPhotos } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { shrink, extFor } from "@/lib/image";
import { field, btnGhost, btnPrimary } from "./ui";

type Item = { file: File; url: string; caption: string };

export function PhotoUploader({ ticketId }: { ticketId: string }) {
  const [kind, setKind] = useState<"intake" | "before" | "after">("after");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = useRef(items);
  latest.current = items;
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  async function upload() {
    setError(null);
    const supabase = createClient();
    const done: { path: string; caption: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      setBusy(`Uploading photo ${i + 1} of ${items.length}`);
      const blob = await shrink(items[i].file);
      const path = `tickets/${ticketId}/${crypto.randomUUID()}.${extFor(blob, items[i].file)}`;
      const { error: upErr } = await supabase.storage.from("ticket-photos").upload(path, blob, { contentType: blob.type || undefined });
      if (upErr) {
        setError(`Photo ${i + 1} failed to upload: ${upErr.message}`);
        break;
      }
      done.push({ path, caption: items[i].caption });
    }
    if (done.length) {
      setBusy("Saving");
      await addTicketPhotos(ticketId, kind, done);
      const uploaded = done.length;
      setItems((prev) => {
        prev.slice(0, uploaded).forEach((i) => URL.revokeObjectURL(i.url));
        return prev.slice(uploaded);
      });
    }
    setBusy(null);
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Photo type" className={`${field} w-auto`}>
          <option value="before">Before repair</option>
          <option value="after">After repair</option>
          <option value="intake">Intake (as received)</option>
        </select>
        <label className={`${btnGhost} cursor-pointer`}>
          Choose photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []).map((file) => ({ file, url: URL.createObjectURL(file), caption: "" }));
              setItems((prev) => [...prev, ...picked]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it, i) => (
            <li key={it.url} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={`Selected photo ${i + 1}`} className="size-20 shrink-0 rounded-md border border-line object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                  value={it.caption}
                  onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                  placeholder="Caption (optional)"
                  aria-label={`Caption for photo ${i + 1}`}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(it.url);
                    setItems((prev) => prev.filter((_, j) => j !== i));
                  }}
                  className="self-start text-xs text-mute hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {items.length > 0 && (
        <button type="button" onClick={upload} disabled={busy !== null} className={btnPrimary}>
          {busy ?? `Upload ${items.length} photo${items.length > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
