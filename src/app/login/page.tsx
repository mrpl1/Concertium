import Link from "next/link";
import { prisma } from "@/lib/db";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // If there are no users yet, steer first-run users to create an account.
  const userCount = await prisma.user.count();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-white to-[var(--vibemaxx-secondary)]">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[var(--vibemaxx-primary)] to-[var(--vibemaxx-accent)] text-xl font-bold text-white shadow-lg shadow-[var(--vibemaxx-primary)]/40">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ffffff]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[#ffffff]">
            Project management for your team
          </p>
        </div>

        <div className="card rounded-[6px] border-0 bg-white/90 p-8 shadow-xl shadow-black/5 backdrop-blur-sm">
          {userCount === 0 ? (
            <div className="text-center">
              <p className="text-sm text-[#ffffff]">
                No accounts exist yet. Create the first one to get started — it
                will be the admin.
              </p>
              <Link href="/register" className="btn-primary mt-4 w-full rounded-full bg-gradient-to-r from-[var(--vibemaxx-primary)] to-[var(--vibemaxx-accent)] py-2.5 px-6 font-semibold text-white shadow-lg shadow-[var(--vibemaxx-primary)]/30 transition-all duration-300 hover:scale-105 hover:shadow-[var(--vibemaxx-primary)]/50">
                Create the first account
              </Link>
            </div>
          ) : (
            <LoginForm next={(await searchParams).next ?? "/"} />
          )}
        </div>
      </div>
    </div>
  );
}
