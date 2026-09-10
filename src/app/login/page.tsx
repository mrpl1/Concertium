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
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-gray-50 dark:from-gray-950 to-gray-100 dark:to-gray-900">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-xl font-bold text-white shadow-lg shadow-brand-600/30">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Project management for your team
          </p>
        </div>

        <div className="card rounded-md border-0 bg-white/90 dark:bg-gray-900/90 p-8 shadow-xl shadow-black/5 backdrop-blur-sm">
          {userCount === 0 ? (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                No accounts exist yet. Create the first one to get started — it
                will be the admin.
              </p>
              <Link href="/register" className="btn-hero mt-4 w-full">
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
