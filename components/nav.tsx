"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/util";

type NavItem = { href: string; label: string; exact?: boolean; match?: string };
const links: NavItem[] = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/tickets", label: "Tickets" },
  { href: "/customers", label: "Customers" },
  { href: "/parts", label: "Parts" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings/statuses", label: "Settings", match: "/settings" },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.match ?? l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              mobile
                ? "flex min-h-14 flex-1 items-center justify-center text-xs font-medium"
                : "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-solder" : "text-mute hover:text-ink",
              !mobile && active && "bg-panel2"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
