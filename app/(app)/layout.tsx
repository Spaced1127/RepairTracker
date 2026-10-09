import Link from "next/link";
import { NavLinks } from "@/components/nav";
import { btnPrimary } from "@/components/ui";
import { signOut } from "@/app/actions";
import { SHOP_NAME } from "@/lib/util";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bench/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="font-display text-xl font-bold tracking-wide">{SHOP_NAME}</Link>
          <nav className="hidden gap-1 md:flex"><NavLinks /></nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/tickets/new" className={btnPrimary}>New ticket</Link>
            <form action={signOut}>
              <button className="hidden min-h-11 rounded-md px-3 text-sm text-mute hover:text-ink md:block">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-12">{children}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-bench/95 backdrop-blur md:hidden">
        <NavLinks mobile />
      </nav>
    </>
  );
}
