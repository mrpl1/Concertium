import Link from "next/link";
import { prisma } from "@/lib/db";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  // If there are no users yet, steer first-run users to create an account.
  const userCount = await prisma.user.count();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
            C
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Sign in to Concertium
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Project management for your team
          </p>
        </div>

        <div className="card p-6">
          {userCount === 0 ? (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                No accounts exist yet. Create the first one to get started — it
                will be the admin.
              </p>
              <Link href="/register" className="btn-primary mt-4 w-full">
                Create the first account
              </Link>
            </div>
          ) : (
            <LoginForm next={searchParams.next ?? "/"} />
          )}
        </div>
      </div>
    </div>
  );
}
