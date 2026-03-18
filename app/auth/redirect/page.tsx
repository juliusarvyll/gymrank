import { Suspense } from "react";
import { redirect } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/app/auth-redirect";
import { requireUser } from "@/lib/app/server";

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-background" />}>
      <ResolvedAuthRedirectPage />
    </Suspense>
  );
}

async function ResolvedAuthRedirectPage() {
  const { user } = await requireUser();
  const destination = await resolvePostAuthRedirect(user);

  redirect(destination);

  return null;
}
