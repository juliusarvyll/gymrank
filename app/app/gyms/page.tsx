import { Suspense } from "react";
import { requireActiveGym } from "@/lib/app/server";
import { addBranch, setActiveGym, updateGymProfile } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function GymsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading gym settings...</div>}>
      <GymsContent />
    </Suspense>
  );
}

async function GymsContent() {
  const { supabase, gym, user } = await requireActiveGym();

  const [{ data: gyms }, { data: branches }] = await Promise.all([
    supabase
      .from("gym_memberships")
      .select("gym_id,gyms(id,name,slug,timezone)")
      .eq("user_id", user.id),
    supabase
      .from("gym_branches")
      .select("id,name,address")
      .eq("gym_id", gym.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gym settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage gym profile, branches, and active workspace.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Active gym</h2>
        <div className="space-y-2">
          {gyms?.map((membership) => {
            const g = Array.isArray(membership.gyms)
              ? membership.gyms[0]
              : membership.gyms;
            if (!g) return null;
            const isActive = g.id === gym.id;
            return (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-md border border-border/60 p-3"
              >
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">@{g.slug}</div>
                </div>
                {isActive ? (
                  <Badge>Active</Badge>
                ) : (
                  <form action={setActiveGym}>
                    <input type="hidden" name="gym_id" value={g.id} />
                    <Button size="sm" type="submit">
                      Switch
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Gym profile</h2>
        <form action={updateGymProfile} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Gym name</Label>
            <Input id="name" name="name" defaultValue={gym.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" name="timezone" defaultValue={gym.timezone} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Update profile</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Branches</h2>
        <form action={addBranch} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch_name">Branch name</Label>
            <Input id="branch_name" name="name" placeholder="Main branch" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch_address">Address</Label>
            <Input
              id="branch_address"
              name="address"
              placeholder="123 Main Street"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add branch</Button>
          </div>
        </form>
        <div className="space-y-2 text-sm text-muted-foreground">
          {branches?.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center justify-between border-b border-border/60 pb-2"
            >
              <div>
                <div className="text-foreground">{branch.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(branch.address as { text?: string })?.text}
                </div>
              </div>
            </div>
          ))}
          {!branches?.length ? <div>No branches yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}
