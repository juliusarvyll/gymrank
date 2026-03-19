import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MemberShell } from "@/components/member/member-shell";
import { requireUser } from "@/lib/app/server";
import { getActiveGymForUser, getUserMembershipRole } from "@/lib/app/queries";

export default function MemberProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <MemberShell>
          <div className="rounded-[32px] border border-emerald-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading member experience...
          </div>
        </MemberShell>
      }
    >
      <ResolvedMemberProductLayout>{children}</ResolvedMemberProductLayout>
    </Suspense>
  );
}

async function ResolvedMemberProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser("/login");

  const gym = await getActiveGymForUser(user.id);
  const role = gym ? await getUserMembershipRole(user.id, gym.id) : null;

  if (role?.role === "owner" || role?.role === "staff") {
    redirect("/admin");
  }

  if (!gym && user.user_metadata?.account_type === "owner") {
    redirect("/admin/onboarding");
  }

  return (
    <MemberShell gymName={gym?.name} gymSlug={gym?.slug} role={role?.role}>
      {children}
    </MemberShell>
  );
}
