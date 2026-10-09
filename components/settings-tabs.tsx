import Link from "next/link";
import { cn } from "@/lib/util";

export function SettingsTabs({ active }: { active: "statuses" | "notifications" }) {
  const tabs = [
    { key: "statuses", href: "/settings/statuses", label: "Statuses" },
    { key: "notifications", href: "/settings/notifications", label: "Notifications" },
  ] as const;
  return (
    <div className="-mt-2 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn("-mb-px min-h-11 border-b-2 px-4 py-2.5 text-sm font-medium", t.key === active ? "border-solder text-solder" : "border-transparent text-mute hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
