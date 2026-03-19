import { Suspense } from "react";
import { redirect } from "next/navigation";
import { resolveMemberPostAuthRedirect } from "@/lib/app/auth-redirect";
import { requireUser } from "@/lib/app/server";

export default function MemberAuthRedirectPage() {
  return (
    <Suspense fallback={null}>
      <ResolvedMemberAuthRedirectPage />
    </Suspense>
  );
}

async function ResolvedMemberAuthRedirectPage() {
  const { user } = await requireUser("/login");
  const destination = await resolveMemberPostAuthRedirect(user);

  redirect(destination);
  return null;
}
