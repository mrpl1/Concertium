import Link from "next/link";
import { prisma } from "@/lib/db";
import { RegisterForm } from "./RegisterForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const userCount = await prisma.user.count();
  const isBootstrap = userCount === 0;

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
            {isBootstrap ? "Create the first account" : "Create an account"}
          </h1>
          {isBootstrap ? (
            <p className="mt-1 text-sm text-gray-500">
              This first account will be the team admin.
            </p>
          ) : null}
        </div>

        <div className="card p-6">
          {isBootstrap ? (
            <RegisterForm />
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Registration is closed. Ask an admin to create an account for
                you from the Team page.
              </p>
              <Link href="/login" className="btn-secondary mt-4 w-full">
                Back to sign in
              </Link>
            </div>
          )}
        </div>

        {isBootstrap ? (
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
