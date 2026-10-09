import { cn } from "@/lib/util";

export const field =
  "w-full rounded-md border border-line bg-bench px-3 py-2.5 text-ink placeholder:text-mute/70 focus-visible:border-solder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solder/50";

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50";
export const btnPrimary = cn(btnBase, "bg-solder text-bench hover:bg-[#ffc94f]");
export const btnGhost = cn(btnBase, "border border-line bg-panel text-ink hover:border-mute");
export const btnDanger = cn(btnBase, "border border-danger/40 text-danger hover:bg-danger/10");

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-2xl border border-line bg-panel/90 p-5", className)}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 py-1.5">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 shrink-0 accent-[#f5b83d]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-mute">{hint}</span>}
      </span>
    </label>
  );
}
