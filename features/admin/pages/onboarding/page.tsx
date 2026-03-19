import { requireUser } from "@/lib/app/server";
import { createGym } from "@/app/app/onboarding/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const { user, supabase } = await requireUser();
  const accountType =
    user.user_metadata?.account_type === "owner" ? "owner" : "member";
  const { data: pendingMemberships } =
    accountType === "member"
      ? await supabase
          .from("gym_memberships")
          .select("status,plan_id,gyms(name,slug),membership_plans(name,billing_interval)")
          .eq("user_id", user.id)
      : { data: [] };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {accountType === "owner" ? "Create your gym" : "Finish your setup"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {accountType === "owner"
            ? "Start by setting up your gym profile. You can add branches, staff, and members next."
            : "Your account is ready. A gym owner still needs to add you to their gym and assign your membership plan."}
        </p>
      </div>

      {accountType === "owner" ? (
        <Card className="p-6">
          <form action={createGym} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Gym name</Label>
              <Input id="name" name="name" placeholder="Iron Haven Fitness" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Gym slug</Label>
              <Input id="slug" name="slug" placeholder="iron-haven" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" placeholder="Asia/Manila" />
            </div>
            <Button type="submit">Create gym</Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 space-y-3">
          <h2 className="text-sm font-semibold">Waiting for gym access</h2>
          <p className="text-sm text-muted-foreground">
            Share the email you used to sign up with your gym owner. They can add
            you as a member and assign your membership plan from the Members page.
          </p>
          {pendingMemberships?.length ? (
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              {pendingMemberships.map((membership, index) => {
                const linkedGym = Array.isArray(membership.gyms)
                  ? membership.gyms[0]
                  : membership.gyms;
                const linkedPlan = Array.isArray(membership.membership_plans)
                  ? membership.membership_plans[0]
                  : membership.membership_plans;

                return (
                  <div key={`${linkedGym?.slug ?? "gym"}-${index}`} className="text-sm">
                    <div className="font-medium">
                      {linkedGym?.name ?? "Gym membership"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: {membership.status} • Plan:{" "}
                      {linkedPlan
                        ? `${linkedPlan.name} (${linkedPlan.billing_interval})`
                        : "Not set"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="text-xs text-muted-foreground">
            Signed in as {user.email}
          </div>
        </Card>
      )}
    </div>
  );
}
