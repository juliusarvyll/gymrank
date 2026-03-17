import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymForUser, getUserMembershipRole } from "@/lib/app/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const gym = await getActiveGymForUser(user.id);
  const role = gym ? await getUserMembershipRole(user.id, gym.id) : null;

  return (
    <AppShell gymName={gym?.name} gymSlug={gym?.slug} role={role?.role}>
      {children}
    </AppShell>
  );
}
