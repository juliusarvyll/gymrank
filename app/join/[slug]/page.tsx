import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type JoinGymPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JoinGymPage({ params }: JoinGymPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-svh max-w-xl items-center px-6">
          <Card className="w-full p-6 space-y-2">
            <h1 className="text-xl font-semibold">Loading gym access</h1>
            <p className="text-sm text-muted-foreground">
              Preparing the QR sign-in flow.
            </p>
          </Card>
        </div>
      }
    >
      <ResolvedJoinGymPage params={params} />
    </Suspense>
  );
}

async function ResolvedJoinGymPage({ params }: JoinGymPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: gym } = await supabase
    .from("gyms")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!gym) {
    return (
      <div className="mx-auto flex min-h-svh max-w-xl items-center px-6">
        <Card className="w-full p-6 space-y-2">
          <h1 className="text-xl font-semibold">Gym not found</h1>
          <p className="text-sm text-muted-foreground">
            The QR code points to a gym that does not exist or is no longer available.
          </p>
        </Card>
      </div>
    );
  }

  const resolvedGym = gym;
  const joinPath = `/join/${resolvedGym.slug}`;

  async function requestGymAccess() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?next=${encodeURIComponent(joinPath)}`);
    }

    const admin = createAdminClient();
    const db = admin ?? supabase;

    const { data: existingMembership } = await db
      .from("gym_memberships")
      .select("status")
      .eq("gym_id", resolvedGym.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMembership) {
      const { error } = await db.from("gym_memberships").insert({
        gym_id: resolvedGym.id,
        user_id: user.id,
        role: "member",
        status: "inactive",
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    await db
      .from("profiles")
      .update({ active_gym_id: resolvedGym.id })
      .eq("id", user.id);

    redirect("/");
  }

  if (!user) {
    const next = joinPath;
    return (
      <div className="mx-auto flex min-h-svh max-w-xl items-center px-6">
        <Card className="w-full p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Join {gym.name}</h1>
            <p className="text-sm text-muted-foreground">
              Scan complete. Sign in to continue, or create a gym-goer account first.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent(next)}`}>
                Login
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/sign-up?next=${encodeURIComponent(next)}&accountType=member`}
              >
                Sign up as gym-goer
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("status")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.status === "active") {
    await supabase.from("profiles").update({ active_gym_id: gym.id }).eq("id", user.id);
    redirect("/");
  }

  if (membership?.status === "inactive" || membership?.status === "suspended") {
    return (
      <div className="mx-auto flex min-h-svh max-w-xl items-center px-6">
        <Card className="w-full p-6 space-y-3">
          <h1 className="text-xl font-semibold">Access requested</h1>
          <p className="text-sm text-muted-foreground">
            Your account is linked to {gym.name}, but a gym owner still needs to
            activate your membership and assign your plan.
          </p>
          <div className="text-xs text-muted-foreground">Signed in as {user.email}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-xl items-center px-6">
      <Card className="w-full p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Join {gym.name}</h1>
          <p className="text-sm text-muted-foreground">
            Request member access. A gym owner will activate your account and set
            your membership plan after you join.
          </p>
        </div>
        <form action={requestGymAccess}>
          <Button type="submit">Request access</Button>
        </form>
      </Card>
    </div>
  );
}
