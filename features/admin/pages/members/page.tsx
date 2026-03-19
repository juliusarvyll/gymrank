import { Suspense } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  getAdminMembershipSnapshot,
  getMemberStatsByIds,
  getProfilesByIds,
} from "@/lib/app/admin-queries";
import { requireAdminWorkspace } from "@/lib/app/server";
import {
  addMember,
  updateMemberAccess,
} from "@/app/app/members/actions";
import {
  createMemberInvoice,
  emailMemberInvoice,
  updateMemberInvoiceStatus,
} from "@/app/app/billing/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

function formatCurrency(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading members...</div>}>
      <MembersContent />
    </Suspense>
  );
}

async function MembersContent() {
  const { gym, role } = await requireAdminWorkspace();
  const joinUrl = `${baseUrl}/join/${gym.slug}`;
  const joinQrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, width: 220 });

  const { memberships, plans, invoicesByUser, planMap, memberIds } = await getAdminMembershipSnapshot(gym.id);
  const [profiles, stats] = await Promise.all([
    getProfilesByIds(memberIds),
    getMemberStatsByIds(gym.id, memberIds),
  ]);

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const statsMap = new Map(stats.map((stat) => [stat.user_id, stat]));

  const canManage = role.role === "owner" || role.role === "staff";
  const isOwner = role.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Manage access, assign membership plans, and track gym-goer status.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold">Add member</h2>
          {canManage ? (
            <form action={addMember} className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Member email</Label>
                <Input id="email" name="email" type="email" placeholder="member@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={!isOwner}
                >
                  <option value="member">Member</option>
                  {isOwner ? <option value="staff">Staff</option> : null}
                  {isOwner ? <option value="owner">Owner</option> : null}
                </select>
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="plan_id">Membership plan</Label>
                <select
                  id="plan_id"
                  name="plan_id"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={!isOwner}
                  defaultValue=""
                >
                  <option value="">No plan assigned</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                      {plan.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <Button type="submit">Add member</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              You need staff access to add members.
            </p>
          )}
        </Card>

        {isOwner ? (
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Membership plans</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plans now have a dedicated management surface. Keep member access work here and pricing work there.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/admin/membership-plans">Open plans</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.slice(0, 4).map((plan) => (
                <div key={plan.id} className="rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{plan.name}</div>
                    <Badge variant={plan.active ? "secondary" : "outline"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(plan.price_cents)} / {plan.billing_interval}
                  </div>
                </div>
              ))}
              {!plans.length ? (
                <div className="text-sm text-muted-foreground">
                  No plans yet. Create one from the dedicated plans page.
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      {isOwner ? (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold">Gym-goer sign-up QR</h2>
          <p className="text-sm text-muted-foreground">
            Let gym-goers scan this QR to log in or create an account, then request access to {gym.name}.
          </p>
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={joinQrDataUrl}
              alt={`Join ${gym.name} QR`}
              className="h-56 w-56 rounded-md border border-border/60"
            />
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{gym.name}</div>
              <div className="break-all">{joinUrl}</div>
              <div>New gym-goers will be asked to sign up first if they do not have an account yet.</div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Member list</h2>
        <div className="space-y-3">
          {memberships.map((member) => {
            const profile = profileMap.get(member.user_id);
            const stat = statsMap.get(member.user_id);
            const plan = member.plan_id ? planMap.get(member.plan_id) : null;

            return (
              <div
                key={member.user_id}
                className="flex flex-col gap-3 rounded-md border border-border/60 p-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium">
                      {profile?.full_name || profile?.email || member.user_id}
                    </div>
                    <div className="text-xs text-muted-foreground">{profile?.email}</div>
                    <div className="text-xs text-muted-foreground">
                      XP {stat?.total_xp ?? 0} · Check-ins {stat?.total_checkins ?? 0} · Streak{" "}
                      {stat?.current_streak ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Plan:{" "}
                      {plan
                        ? `${plan.name} (${formatCurrency(plan.price_cents)}/${plan.billing_interval})`
                        : "Not set"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{member.role}</Badge>
                    <Badge variant="outline">{member.status}</Badge>
                    {plan ? (
                      <Badge variant={plan.active ? "secondary" : "outline"}>{plan.name}</Badge>
                    ) : null}
                  </div>
                </div>

                {canManage ? (
                  <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                    <form
                      action={updateMemberAccess}
                      className="grid gap-2 md:grid-cols-[auto_auto_1fr_auto]"
                    >
                      <input type="hidden" name="user_id" value={member.user_id} />
                      {isOwner ? (
                        <select
                          name="role"
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          defaultValue={member.role}
                        >
                          <option value="member">Member</option>
                          <option value="staff">Staff</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <input type="hidden" name="role" value={member.role} />
                      )}
                      <select
                        name="status"
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        defaultValue={member.status}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      {isOwner ? (
                        <select
                          name="plan_id"
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          defaultValue={member.plan_id ?? ""}
                        >
                          <option value="">No plan assigned</option>
                          {plans.map((planOption) => (
                            <option key={planOption.id} value={planOption.id}>
                              {planOption.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input type="hidden" name="plan_id" value={member.plan_id ?? ""} />
                      )}
                      <Button type="submit" size="sm">
                        Update
                      </Button>
                    </form>

                    <div className="space-y-3 rounded-md border border-border/60 p-3">
                      <div className="font-medium">Cash invoice</div>
                      <form action={createMemberInvoice} className="grid gap-2 md:grid-cols-2">
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <input type="hidden" name="plan_id" value={member.plan_id ?? ""} />
                        <Input name="description" placeholder="March membership dues" />
                        <Input name="amount_cents" type="number" min="0" step="1" placeholder="4500" />
                        <Input name="due_date" type="date" />
                        <Input name="notes" placeholder="Pay at front desk in cash" />
                        <div className="md:col-span-2">
                          <Button type="submit" size="sm">
                            Create invoice
                          </Button>
                        </div>
                      </form>

                      <div className="space-y-2">
                        {(invoicesByUser.get(member.user_id) ?? []).slice(0, 3).map((invoice) => (
                          <div
                            key={invoice.id}
                            className="space-y-2 rounded-md border border-border/50 p-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm text-foreground">{invoice.invoice_number}</div>
                                <div className="text-xs text-muted-foreground">
                                  {invoice.description} · ${(invoice.amount_cents / 100).toFixed(2)} · due{" "}
                                  {new Date(invoice.due_date).toLocaleDateString()}
                                </div>
                              </div>
                              <Badge variant={invoice.status === "paid" ? "secondary" : "outline"}>
                                {invoice.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <form action={emailMemberInvoice}>
                                <input type="hidden" name="invoice_id" value={invoice.id} />
                                <Button size="sm" type="submit" variant="outline">
                                  {invoice.emailed_at ? "Resend email" : "Send email"}
                                </Button>
                              </form>
                              <form
                                action={updateMemberInvoiceStatus}
                                className="flex items-center gap-2"
                              >
                                <input type="hidden" name="invoice_id" value={invoice.id} />
                                <select
                                  name="status"
                                  defaultValue={invoice.status}
                                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="sent">Sent</option>
                                  <option value="paid">Paid</option>
                                  <option value="overdue">Overdue</option>
                                  <option value="void">Void</option>
                                </select>
                                <Button size="sm" type="submit">
                                  Save
                                </Button>
                              </form>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.emailed_at
                                ? `Emailed ${new Date(invoice.emailed_at).toLocaleString()}`
                                : "Not emailed yet"}
                              {invoice.paid_at
                                ? ` · Cash received ${new Date(invoice.paid_at).toLocaleDateString()}`
                                : ""}
                            </div>
                          </div>
                        ))}
                        {!(invoicesByUser.get(member.user_id) ?? []).length ? (
                          <div className="text-xs text-muted-foreground">
                            No invoices yet for this member.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!memberships.length ? (
            <div className="text-sm text-muted-foreground">No members yet.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
