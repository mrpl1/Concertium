import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { AdminMenu } from "@/components/AdminMenu";
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

const adminLinks = [
  { href: "/automations", label: "Automations" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

export function NavBar({
  user,
  workspaceName,
}: {
  user: SessionUser;
  workspaceName?: string;
}) {
  const brand = workspaceName?.trim() || "Projects";
  const initial = brand.charAt(0).toUpperCase();
  const isAdmin = user.role === "admin";
  // The narrow row scrolls, so it can afford to list the admin sections flat.
  const allLinks = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        {/* min-w-0 lets the nav shrink instead of forcing the row wider than the page. */}
        <div className="flex min-w-0 items-center gap-4 xl:gap-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold"
            title={brand}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-600 text-white text-sm">
              {initial}
            </span>
            {/* The wordmark is a user-supplied workspace name: cap it and
                ellipsise rather than letting it wrap the header to two lines. */}
            <span className="max-w-[10rem] truncate text-gray-900">{brand}</span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 xl:flex">
            {/* Only the plain links scroll. The admin menu stays outside this
                box: `overflow-x` also clips on the y axis, which would hide the
                dropdown panel. */}
            <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">
              {baseLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            {isAdmin ? <AdminMenu items={adminLinks} /> : null}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SearchBox />
          <ThemeToggle />
          <span className="hidden max-w-[9rem] truncate text-sm text-gray-500 xl:block">
            {user.name}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary whitespace-nowrap !py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {/* Below xl the inline nav cannot fit alongside the brand and the
          account controls, so the links move to their own scrollable row. */}
      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 xl:hidden">
        {allLinks.map((l) => (
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
