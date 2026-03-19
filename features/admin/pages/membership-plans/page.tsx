import { Suspense } from "react";
import Link from "next/link";
import { ReceiptText, Users, WalletCards } from "lucide-react";
import {
  createMembershipPlan,
  deleteMembershipPlan,
  updateMembershipPlan,
} from "@/app/app/membership-plans/actions";
import { getAdminMembershipSnapshot } from "@/lib/app/admin-queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminWorkspace } from "@/lib/app/server";

function formatCurrency(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export default function MembershipPlansPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading membership plans...</div>}>
      <MembershipPlansContent />
    </Suspense>
  );
}

async function MembershipPlansContent() {
  const { gym } = await requireAdminWorkspace();
  const { plans, memberCountByPlan, invoiceAmountByPlan } = await getAdminMembershipSnapshot(gym.id);

  const totalActivePlans = plans.filter((plan) => plan.active).length;
  const totalAssignedMembers = Array.from(memberCountByPlan.values()).reduce((sum, count) => sum + count, 0);
  const totalPlannedRevenue = Array.from(invoiceAmountByPlan.values()).reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.9rem] border border-emerald-200 bg-[linear-gradient(135deg,#052e16_0%,#065f46_60%,#34d399_100%)] p-6 text-white shadow-[0_24px_60px_rgba(6,78,59,0.22)] sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_32%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
              Membership Plans
            </Badge>
            <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Structure your memberships like a real pricing desk.
            </h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50/85 sm:text-base">
              Define plans once, assign them across members, and let billing and invoices inherit the same source of truth.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Active plans", value: `${totalActivePlans}`, icon: WalletCards },
              { label: "Assigned members", value: `${totalAssignedMembers}`, icon: Users },
              { label: "Invoice volume", value: formatCurrency(totalPlannedRevenue), icon: ReceiptText },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/85">
                    <Icon className="h-4 w-4" />
                    {metric.label}
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{metric.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[1.75rem] border border-emerald-100 p-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
              Create plan
            </div>
            <h2 className="mt-2 text-xl font-semibold text-emerald-950">Launch a new membership tier</h2>
          </div>

          <form action={createMembershipPlan} className="mt-5 grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Plan name</Label>
              <Input id="name" name="name" placeholder="Unlimited" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Full open gym access and all classes"
                className="rounded-2xl"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billing_interval">Billing interval</Label>
                <select
                  id="billing_interval"
                  name="billing_interval"
                  defaultValue="monthly"
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_cents">Price (cents)</Label>
                <Input id="price_cents" name="price_cents" type="number" min="0" step="1" className="rounded-2xl" />
              </div>
            </div>
            <Button type="submit" className="mt-2 rounded-full">
              Create plan
            </Button>
          </form>

          <div className="mt-5 rounded-[1.3rem] border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900/70">
            Plan assignment happens from <Link href="/admin/members" className="font-medium text-emerald-950 underline">Members</Link>, and invoice creation happens from <Link href="/admin/billing" className="font-medium text-emerald-950 underline">Billing</Link>.
          </div>
        </Card>

        <div className="grid gap-4" style={{ contentVisibility: "auto" }}>
          {plans.map((plan) => {
            const assignedMembers = memberCountByPlan.get(plan.id) ?? 0;
            const invoiceVolume = invoiceAmountByPlan.get(plan.id) ?? 0;

            return (
              <Card key={plan.id} className="rounded-[1.75rem] border border-emerald-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-emerald-950">{plan.name}</h2>
                      <Badge variant={plan.active ? "secondary" : "outline"}>
                        {plan.active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-emerald-900/65">
                      {plan.description || "No description yet."}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-emerald-900/72">
                      <div className="rounded-full bg-emerald-50 px-3 py-1">
                        {formatCurrency(plan.price_cents)} / {plan.billing_interval}
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1">
                        {assignedMembers} active members
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1">
                        {formatCurrency(invoiceVolume)} invoice volume
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.3rem] border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900/72 lg:w-64">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
                      Plan ops
                    </div>
                    <div className="mt-2">
                      Created {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <form action={updateMembershipPlan} className="grid gap-3">
                    <input type="hidden" name="plan_id" value={plan.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="name" defaultValue={plan.name} className="rounded-2xl" />
                    <Input
                      name="description"
                      defaultValue={plan.description ?? ""}
                      className="rounded-2xl"
                    />
                    <select
                      name="billing_interval"
                      defaultValue={plan.billing_interval}
                      className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <Input
                      name="price_cents"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={plan.price_cents}
                      className="rounded-2xl"
                    />
                  </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm text-emerald-900/70">
                        <input type="hidden" name="active" value="false" />
                        <input
                          type="checkbox"
                          name="active"
                          value="true"
                          defaultChecked={plan.active}
                          className="h-4 w-4"
                        />
                        Keep this plan available for assignment
                      </label>
                      <Button type="submit" size="sm" className="rounded-full">
                        Save changes
                      </Button>
                    </div>
                  </form>
                  <form action={deleteMembershipPlan}>
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <Button type="submit" size="sm" variant="outline" className="rounded-full">
                      {plan.active ? "Archive" : "Delete"}
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}

          {!plans.length ? (
            <Card className="rounded-[1.75rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-sm text-emerald-900/70">
              No plans yet. Create your first membership plan to start assigning members and generating invoices consistently.
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
