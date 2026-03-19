import { Suspense } from "react";
import { CalendarClock, CircleDollarSign, FileText, Mail, Wallet } from "lucide-react";
import { getAdminMembershipSnapshot, getProfilesByIds } from "@/lib/app/admin-queries";
import { requireAdminWorkspace } from "@/lib/app/server";
import {
  createMemberInvoice,
  emailMemberInvoice,
  updateMemberInvoiceStatus,
} from "@/app/app/billing/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatCurrency(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function statusTone(status: string) {
  if (status === "paid") return "secondary" as const;
  if (status === "overdue") return "destructive" as const;
  return "outline" as const;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading billing...</div>}>
      <BillingContent />
    </Suspense>
  );
}

async function BillingContent() {
  const { gym } = await requireAdminWorkspace();
  const { plans, memberships, invoices, memberIds, planMap, billingTotals } =
    await getAdminMembershipSnapshot(gym.id);
  const profiles = await getProfilesByIds(memberIds);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const activeMembers = memberships.filter(
    (membership) => membership.status === "active" && membership.role === "member",
  );

  const dueSoon = invoices
    .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-[linear-gradient(135deg,#052e16_0%,#065f46_55%,#10b981_100%)] p-6 text-white shadow-[0_24px_60px_rgba(6,78,59,0.22)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_34%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-100/90">
              Billing Desk
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Cash invoicing for front-desk collections
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/82">
              Issue member dues, email invoice notices, and keep a clean ledger without adding card payments.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/80">Outstanding</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(billingTotals.outstanding)}</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/80">Cash Collected</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(billingTotals.cashCollected)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Draft queue",
            value: formatCurrency(billingTotals.drafts),
            detail: "Invoices ready to send",
            icon: FileText,
          },
          {
            label: "Emailed",
            value: `${billingTotals.emailed}`,
            detail: "Sent to members",
            icon: Mail,
          },
          {
            label: "Overdue",
            value: `${billingTotals.overdue}`,
            detail: "Needs follow-up",
            icon: CalendarClock,
          },
          {
            label: "Active plans",
            value: `${plans.filter((plan) => plan.active).length}`,
            detail: "Pricing options live",
            icon: Wallet,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="rounded-[1.5rem] border border-emerald-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-800">
                    {metric.label}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-emerald-950">{metric.value}</div>
                  <div className="mt-1 text-sm text-emerald-900/65">{metric.detail}</div>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[1.75rem] border border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">Create invoice</h2>
              <p className="text-sm text-emerald-900/65">
                Issue dues manually and email the member a cash invoice.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>

          <form action={createMemberInvoice} className="mt-5 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user_id">Member</Label>
                <select
                  id="user_id"
                  name="user_id"
                  className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/55 px-3 py-3 text-sm text-emerald-950"
                >
                  {activeMembers.map((membership) => {
                    const profile = profileMap.get(membership.user_id);
                    const plan = membership.plan_id ? planMap.get(membership.plan_id) : null;
                    return (
                      <option key={membership.user_id} value={membership.user_id}>
                        {(profile?.full_name || profile?.email || membership.user_id) +
                          (plan ? ` · ${plan.name}` : "")}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_id">Membership plan</Label>
                <select
                  id="plan_id"
                  name="plan_id"
                  defaultValue=""
                  className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/55 px-3 py-3 text-sm text-emerald-950"
                >
                  <option value="">No linked plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {formatCurrency(plan.price_cents)} / {plan.billing_interval}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="April membership dues"
                className="rounded-2xl border-emerald-100 bg-emerald-50/55"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount_cents">Amount (cents)</Label>
                <Input
                  id="amount_cents"
                  name="amount_cents"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="4500"
                  className="rounded-2xl border-emerald-100 bg-emerald-50/55"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  className="rounded-2xl border-emerald-100 bg-emerald-50/55"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Pay in cash at the front desk"
                className="rounded-2xl border-emerald-100 bg-emerald-50/55"
              />
            </div>

            <Button type="submit" className="mt-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700">
              Create draft invoice
            </Button>
          </form>
        </Card>

        <Card className="rounded-[1.75rem] border border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">Due soon</h2>
              <p className="text-sm text-emerald-900/65">Prioritize follow-up on invoices already sent.</p>
            </div>
            <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-800">
              {dueSoon.length} in focus
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {dueSoon.map((invoice) => {
              const profile = profileMap.get(invoice.user_id);
              return (
                <div
                  key={invoice.id}
                  className="rounded-[1.4rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.88),rgba(255,255,255,0.95))] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-emerald-950">
                        {profile?.full_name || profile?.email || invoice.user_id}
                      </div>
                      <div className="text-xs text-emerald-900/65">
                        {invoice.invoice_number} · due {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={statusTone(invoice.status)} className="rounded-full capitalize">
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-emerald-950">
                        {formatCurrency(invoice.amount_cents, invoice.currency)}
                      </div>
                      <div className="text-xs text-emerald-900/65">{invoice.description}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={emailMemberInvoice}>
                        <input type="hidden" name="invoice_id" value={invoice.id} />
                        <Button type="submit" size="sm" variant="outline" className="rounded-full">
                          {invoice.emailed_at ? "Resend" : "Email"}
                        </Button>
                      </form>
                      <form action={updateMemberInvoiceStatus}>
                        <input type="hidden" name="invoice_id" value={invoice.id} />
                        <input type="hidden" name="status" value="paid" />
                        <Button type="submit" size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700">
                          Mark paid
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}

            {!dueSoon.length ? (
              <div className="rounded-[1.4rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-sm text-emerald-900/65">
                No sent invoices are due soon. Once you email drafts, they will surface here for follow-up.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border border-emerald-100 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-emerald-950">Invoice ledger</h2>
            <p className="text-sm text-emerald-900/65">
              Recent billing activity across the gym. Email delivery and cash collection stay in one place.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full border-emerald-200 text-emerald-800">
            {invoices.length} invoices
          </Badge>
        </div>

        <div className="mt-5 hidden overflow-hidden rounded-[1.4rem] border border-emerald-100 lg:block">
          <div className="grid grid-cols-[1.35fr_1fr_0.95fr_0.8fr_0.9fr_1.15fr] gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
            <div>Member</div>
            <div>Invoice</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Due</div>
            <div>Actions</div>
          </div>
          <div className="divide-y divide-emerald-100" style={{ contentVisibility: "auto" }}>
            {invoices.map((invoice) => {
              const profile = profileMap.get(invoice.user_id);
              return (
                <div
                  key={invoice.id}
                  className="grid grid-cols-[1.35fr_1fr_0.95fr_0.8fr_0.9fr_1.15fr] gap-3 px-4 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-emerald-950">
                      {profile?.full_name || profile?.email || invoice.user_id}
                    </div>
                    <div className="truncate text-xs text-emerald-900/65">{profile?.email}</div>
                  </div>
                  <div>
                    <div className="font-medium text-emerald-950">{invoice.invoice_number}</div>
                    <div className="truncate text-xs text-emerald-900/65">{invoice.description}</div>
                  </div>
                  <div className="font-medium text-emerald-950">
                    {formatCurrency(invoice.amount_cents, invoice.currency)}
                  </div>
                  <div>
                    <Badge variant={statusTone(invoice.status)} className="rounded-full capitalize">
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="text-emerald-900/72">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={emailMemberInvoice}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <Button type="submit" size="sm" variant="outline" className="rounded-full">
                        {invoice.emailed_at ? "Resend" : "Email"}
                      </Button>
                    </form>
                    <form action={updateMemberInvoiceStatus} className="flex items-center gap-2">
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <select
                        name="status"
                        defaultValue={invoice.status}
                        className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs text-emerald-950"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="void">Void</option>
                      </select>
                      <Button type="submit" size="sm" className="rounded-full">
                        Save
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          {invoices.map((invoice) => {
            const profile = profileMap.get(invoice.user_id);
            return (
              <div key={invoice.id} className="rounded-[1.4rem] border border-emerald-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-emerald-950">
                      {profile?.full_name || profile?.email || invoice.user_id}
                    </div>
                    <div className="text-xs text-emerald-900/65">{invoice.invoice_number}</div>
                  </div>
                  <Badge variant={statusTone(invoice.status)} className="rounded-full capitalize">
                    {invoice.status}
                  </Badge>
                </div>
                <div className="mt-3 text-sm text-emerald-900/72">{invoice.description}</div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-emerald-900/65">Amount</span>
                  <span className="font-semibold text-emerald-950">
                    {formatCurrency(invoice.amount_cents, invoice.currency)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-emerald-900/65">Due</span>
                  <span className="text-emerald-950">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  <form action={emailMemberInvoice}>
                    <input type="hidden" name="invoice_id" value={invoice.id} />
                    <Button type="submit" size="sm" variant="outline" className="w-full rounded-full">
                      {invoice.emailed_at ? "Resend invoice email" : "Send invoice email"}
                    </Button>
                  </form>
                  <form action={updateMemberInvoiceStatus} className="grid gap-2">
                    <input type="hidden" name="invoice_id" value={invoice.id} />
                    <select
                      name="status"
                      defaultValue={invoice.status}
                      className="w-full rounded-full border border-emerald-100 bg-white px-3 py-2 text-sm text-emerald-950"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="void">Void</option>
                    </select>
                    <Button type="submit" size="sm" className="w-full rounded-full">
                      Update invoice
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>

        {!invoices.length ? (
          <div className="mt-5 rounded-[1.4rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-sm text-emerald-900/65">
            No invoices yet. Create your first draft above and email it from the ledger when it is ready.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
