import { Suspense } from "react";
import { requireUser } from "@/lib/app/server";
import { getActiveNetworkForUser } from "@/lib/app/queries";
import {
  addGymToNetwork,
  addNetworkMember,
  createNetwork,
  setActiveNetwork,
} from "@/app/app/networks/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NetworksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading networks...</div>}>
      <NetworksContent />
    </Suspense>
  );
}

async function NetworksContent() {
  const { supabase, user } = await requireUser();
  const activeNetwork = await getActiveNetworkForUser(user.id);

  const [{ data: memberships }, { data: gyms }] = await Promise.all([
    supabase
      .from("network_memberships")
      .select("network_id,role,status,gym_networks(id,name,slug)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }),
    supabase
      .from("gym_memberships")
      .select("gym_id,gyms(id,name,slug)")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const networks = memberships?.map((m) => {
    const net = Array.isArray(m.gym_networks) ? m.gym_networks[0] : m.gym_networks;
    return { membership: m, network: net };
  }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Networks</h1>
        <p className="text-sm text-muted-foreground">
          Manage multi-gym networks and cross-gym access.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Create network</h2>
        <form action={createNetwork} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Network name</Label>
            <Input id="name" name="name" placeholder="Metro Fitness Group" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Network slug</Label>
            <Input id="slug" name="slug" placeholder="metro-fitness" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Create network</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Your networks</h2>
        <div className="space-y-3">
          {networks.map(({ membership, network }) => {
            if (!network) return null;
            const isActive = activeNetwork?.id === network.id;
            return (
              <div
                key={network.id}
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium">{network.name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{network.slug}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary">{membership.role}</Badge>
                  {isActive ? (
                    <Badge>Active</Badge>
                  ) : (
                    <form action={setActiveNetwork}>
                      <input type="hidden" name="network_id" value={network.id} />
                      <Button size="sm" type="submit">
                        Switch
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          {!networks.length ? (
            <div className="text-sm text-muted-foreground">
              No networks yet.
            </div>
          ) : null}
        </div>
      </Card>

      {activeNetwork ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Add gym to network</h2>
            <form action={addGymToNetwork} className="space-y-3">
              <input type="hidden" name="network_id" value={activeNetwork.id} />
              <div className="space-y-2">
                <Label htmlFor="gym_id">Gym</Label>
                <select
                  id="gym_id"
                  name="gym_id"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {gyms?.map((membership) => {
                    const gym = Array.isArray(membership.gyms)
                      ? membership.gyms[0]
                      : membership.gyms;
                    if (!gym) return null;
                    return (
                      <option key={gym.id} value={gym.id}>
                        {gym.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <Button type="submit">Add gym</Button>
            </form>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold">Invite network member</h2>
            <form action={addNetworkMember} className="grid gap-3">
              <input type="hidden" name="network_id" value={activeNetwork.id} />
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <Button type="submit">Add member</Button>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
