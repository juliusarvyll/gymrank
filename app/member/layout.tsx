import { Suspense } from "react";
import { MemberShell } from "@/components/member/member-shell";
import { requireUser } from "@/lib/app/server";
import { getActiveGymForUser, getUserMembershipRole } from "@/lib/app/queries";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <MemberShell>
          <div className="rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            Loading member experience...
          </div>
        </MemberShell>
      }
    >
      <ResolvedMemberLayout>{children}</ResolvedMemberLayout>
    </Suspense>
  );
}

async function ResolvedMemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();

  const gym = await getActiveGymForUser(user.id);
  const role = gym ? await getUserMembershipRole(user.id, gym.id) : null;

  return (
    <MemberShell gymName={gym?.name} gymSlug={gym?.slug} role={role?.role}>
      {children}
    </MemberShell>
  );
}
