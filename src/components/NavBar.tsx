import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { SearchBox } from "@/components/SearchBox";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SessionUser } from "@/lib/auth";

const baseLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/timeline", label: "Timeline" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reports", label: "Reports" },
];

export function NavBar({ user }: { user: SessionUser }) {
  const links =
    user.role === "admin"
      ? [
          ...baseLinks,
          { href: "/automations", label: "Automations" },
          { href: "/team", label: "Team" },
          { href: "/settings", label: "Settings" },
        ]
      : baseLinks;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-white text-sm">
              C
            </span>
            <span className="text-gray-900">Concertium</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox />
          <ThemeToggle />
          <span className="hidden text-sm text-gray-500 sm:inline">
            {user.name}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary !py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 sm:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
