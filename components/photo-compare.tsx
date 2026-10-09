"use client";

import { useState } from "react";
import { field } from "./ui";

export type PhotoItem = { id: string; url: string; caption: string | null; kind: "intake" | "before" | "after"; time: string };

const kindLabel = { intake: "Intake", before: "Before", after: "After" } as const;

export function PhotoCompare({ befores, afters }: { befores: PhotoItem[]; afters: PhotoItem[] }) {
  const [beforeId, setBeforeId] = useState(befores[0].id);
  const [afterId, setAfterId] = useState(afters[afters.length - 1].id);
  const [mode, setMode] = useState<"split" | "slider">("split");
  const [pos, setPos] = useState(50);

  const before = befores.find((p) => p.id === beforeId) ?? befores[0];
  const after = afters.find((p) => p.id === afterId) ?? afters[0];
  const label = (p: PhotoItem, i: number) => `${kindLabel[p.kind]} ${i + 1}${p.caption ? `: ${p.caption}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={beforeId} onChange={(e) => setBeforeId(e.target.value)} aria-label="Before photo" className={`${field} w-auto max-w-full`}>
          {befores.map((p, i) => <option key={p.id} value={p.id}>{label(p, i)}</option>)}
        </select>
        <select value={afterId} onChange={(e) => setAfterId(e.target.value)} aria-label="After photo" className={`${field} w-auto max-w-full`}>
          {afters.map((p, i) => <option key={p.id} value={p.id}>{label(p, i)}</option>)}
        </select>
        <div className="ml-auto inline-flex rounded-md border border-line p-1">
          {(["split", "slider"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-9 rounded px-3 text-sm font-medium ${mode === m ? "bg-solder text-bench" : "text-mute hover:text-ink"}`}
            >
              {m === "split" ? "Side by side" : "Slider"}
            </button>
          ))}
        </div>
      </div>

      {mode === "split" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[before, after].map((p) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? `${kindLabel[p.kind]} photo`} className="aspect-[4/3] w-full rounded-xl border border-line bg-bench object-contain" />
              <figcaption className="mt-1.5 text-sm">
                <span className="font-semibold">{p === before ? "Before" : "After"}</span>
                {p.caption && <span className="text-mute">: {p.caption}</span>}
                <span className="block font-mono text-xs text-mute">{p.time}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-xl border border-line bg-bench">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={after.url} alt="After" className="absolute inset-0 size-full object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before.url} alt="Before" className="absolute inset-0 size-full object-contain" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
          <span className="absolute left-2 top-2 rounded bg-bench/80 px-2 py-0.5 text-xs font-semibold">Before</span>
          <span className="absolute right-2 top-2 rounded bg-bench/80 px-2 py-0.5 text-xs font-semibold">After</span>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-solder" style={{ left: `${pos}%` }} />
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label="Drag to compare before and after"
            className="absolute inset-0 size-full cursor-ew-resize opacity-0"
          />
        </div>
      )}
    </div>
  );
}
