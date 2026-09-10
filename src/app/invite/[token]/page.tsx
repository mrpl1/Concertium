import Link from "next/link";
import { prisma } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AcceptInviteForm } from "./AcceptInviteForm";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });

  const invalidReason = !invite
    ? "This invite link is not valid."
    : invite.acceptedAt
      ? "This invite has already been used."
      : invite.expiresAt && invite.expiresAt.getTime() < Date.now()
        ? "This invite link has expired."
        : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-md bg-brand-600 text-lg font-semibold text-white">
            C
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {invalidReason ? "Invite unavailable" : "Join the workspace"}
          </h1>
          {!invalidReason && invite ? (
            <p className="mt-1 text-sm text-gray-500">
              You&apos;ve been invited to{" "}
              <span className="font-medium text-gray-700">
                {invite.workspace.name}
              </span>
              .
            </p>
          ) : null}
        </div>

        <div className="card p-6">
          {invalidReason || !invite ? (
            <div className="text-center">
              <p className="text-sm text-gray-600">{invalidReason}</p>
              <Link href="/login" className="btn-secondary mt-4 w-full">
                Back to sign in
              </Link>
            </div>
          ) : (
            <AcceptInviteForm token={token} email={invite.email} />
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
