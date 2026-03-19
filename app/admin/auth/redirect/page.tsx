import { Suspense } from "react";
import { redirect } from "next/navigation";
import { resolveAdminPostAuthRedirect } from "@/lib/app/auth-redirect";
import { requireUser } from "@/lib/app/server";

export default function AdminAuthRedirectPage() {
  return (
    <Suspense fallback={null}>
      <ResolvedAdminAuthRedirectPage />
    </Suspense>
  );
}

async function ResolvedAdminAuthRedirectPage() {
  const { user } = await requireUser("/admin/login");
  const destination = await resolveAdminPostAuthRedirect(user);

  redirect(destination);
  return null;
}
