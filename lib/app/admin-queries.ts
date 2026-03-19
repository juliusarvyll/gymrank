import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AdminMembershipPlan = {
  id: string;
  name: string;
  description: string | null;
  billing_interval: string;
  price_cents: number;
  active: boolean;
  created_at: string;
};

export type AdminGymMembership = {
  user_id: string;
  role: string;
  status: string;
  plan_id: string | null;
  joined_at: string;
};

export type AdminMemberInvoice = {
  id: string;
  user_id: string;
  plan_id: string | null;
  invoice_number: string;
  description: string;
  amount_cents: number;
  currency: string;
  due_date: string;
  status: string;
  emailed_at: string | null;
  paid_at: string | null;
  notes?: string | null;
  created_at: string;
};

export type AdminProfileSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

export type AdminMemberStat = {
  user_id: string;
  total_xp: number | null;
  total_checkins: number | null;
  current_streak: number | null;
};

export const getAdminMembershipSnapshot = cache(async function getAdminMembershipSnapshot(
  gymId: string,
) {
  const supabase = await createClient();

  const [{ data: plans }, { data: memberships }, { data: invoices }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select("id,name,description,billing_interval,price_cents,active,created_at")
      .eq("gym_id", gymId)
      .order("active", { ascending: false })
      .order("price_cents", { ascending: true }),
    supabase
      .from("gym_memberships")
      .select("user_id,role,status,plan_id,joined_at")
      .eq("gym_id", gymId)
      .order("joined_at", { ascending: false }),
    supabase
      .from("member_invoices")
      .select(
        "id,user_id,plan_id,invoice_number,description,amount_cents,currency,due_date,status,emailed_at,paid_at,notes,created_at",
      )
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false }),
  ]);

  const safePlans = (plans ?? []) as AdminMembershipPlan[];
  const safeMemberships = (memberships ?? []) as AdminGymMembership[];
  const safeInvoices = (invoices ?? []) as AdminMemberInvoice[];

  const memberIds = Array.from(new Set(safeMemberships.map((membership) => membership.user_id)));

  const planMap = new Map(safePlans.map((plan) => [plan.id, plan]));
  const memberCountByPlan = new Map<string, number>();
  const invoiceAmountByPlan = new Map<string, number>();
  const invoicesByUser = new Map<string, AdminMemberInvoice[]>();

  for (const membership of safeMemberships) {
    if (!membership.plan_id || membership.role !== "member" || membership.status !== "active") continue;
    memberCountByPlan.set(membership.plan_id, (memberCountByPlan.get(membership.plan_id) ?? 0) + 1);
  }

  for (const invoice of safeInvoices) {
    const existing = invoicesByUser.get(invoice.user_id) ?? [];
    existing.push(invoice);
    invoicesByUser.set(invoice.user_id, existing);

    if (!invoice.plan_id || invoice.status === "void") continue;
    invoiceAmountByPlan.set(invoice.plan_id, (invoiceAmountByPlan.get(invoice.plan_id) ?? 0) + invoice.amount_cents);
  }

  const billingTotals = safeInvoices.reduce(
    (acc, invoice) => {
      if (invoice.status === "paid") {
        acc.cashCollected += invoice.amount_cents;
      } else if (invoice.status === "sent" || invoice.status === "overdue") {
        acc.outstanding += invoice.amount_cents;
      } else if (invoice.status === "draft") {
        acc.drafts += invoice.amount_cents;
      }

      if (invoice.emailed_at) {
        acc.emailed += 1;
      }

      if (invoice.status === "overdue") {
        acc.overdue += 1;
      }

      return acc;
    },
    { cashCollected: 0, outstanding: 0, drafts: 0, emailed: 0, overdue: 0 },
  );

  return {
    plans: safePlans,
    memberships: safeMemberships,
    invoices: safeInvoices,
    memberIds,
    planMap,
    memberCountByPlan,
    invoiceAmountByPlan,
    invoicesByUser,
    billingTotals,
  };
});

export async function getProfilesByIds(userIds: string[]) {
  if (!userIds.length) {
    return [] as AdminProfileSummary[];
  }

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id,full_name,email,avatar_url").in("id", userIds);
  return (data ?? []) as AdminProfileSummary[];
}

export async function getMemberStatsByIds(gymId: string, userIds: string[]) {
  if (!userIds.length) {
    return [] as AdminMemberStat[];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("member_stats")
    .select("user_id,total_xp,total_checkins,current_streak")
    .eq("gym_id", gymId)
    .in("user_id", userIds);

  return (data ?? []) as AdminMemberStat[];
}
