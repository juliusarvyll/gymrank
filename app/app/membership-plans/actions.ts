"use server";

import { requireGymOwnerAccess } from "@/lib/app/server";
import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";

export async function createMembershipPlan(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const billingInterval = String(formData.get("billing_interval") || "monthly").trim();
  const priceCents = Number(formData.get("price_cents") || 0);

  if (!name) {
    throw new Error("Plan name is required.");
  }

  const { supabase, gym, user } = await requireGymOwnerAccess();

  const { error } = await supabase.from("membership_plans").insert({
    gym_id: gym.id,
    name,
    description: description || null,
    billing_interval: billingInterval,
    price_cents: Number.isFinite(priceCents) ? Math.max(0, Math.round(priceCents)) : 0,
    created_by: user.id,
    active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/members", "/admin/billing", "/admin/membership-plans");
}

export async function updateMembershipPlan(formData: FormData) {
  const planId = String(formData.get("plan_id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const billingInterval = String(formData.get("billing_interval") || "monthly").trim();
  const priceCents = Number(formData.get("price_cents") || 0);
  const active = String(formData.get("active") || "true") === "true";

  if (!planId || !name) {
    throw new Error("Plan id and name are required.");
  }

  const { supabase, gym } = await requireGymOwnerAccess();

  const { error } = await supabase
    .from("membership_plans")
    .update({
      name,
      description: description || null,
      billing_interval: billingInterval,
      price_cents: Number.isFinite(priceCents) ? Math.max(0, Math.round(priceCents)) : 0,
      active,
    })
    .eq("id", planId)
    .eq("gym_id", gym.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/members", "/admin/billing", "/admin/membership-plans");
}

export async function deleteMembershipPlan(formData: FormData) {
  const planId = String(formData.get("plan_id") || "").trim();

  if (!planId) {
    throw new Error("Plan id is required.");
  }

  const { supabase, gym } = await requireGymOwnerAccess();

  const [{ count: assignmentCount }, { count: invoiceCount }] = await Promise.all([
    supabase
      .from("gym_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("plan_id", planId),
    supabase
      .from("member_invoices")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("plan_id", planId),
  ]);

  if ((assignmentCount ?? 0) > 0 || (invoiceCount ?? 0) > 0) {
    const { error: archiveError } = await supabase
      .from("membership_plans")
      .update({ active: false })
      .eq("id", planId)
      .eq("gym_id", gym.id);

    if (archiveError) {
      throw new Error(archiveError.message);
    }
  } else {
    const { error: deleteError } = await supabase
      .from("membership_plans")
      .delete()
      .eq("id", planId)
      .eq("gym_id", gym.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  revalidateAdminSurface("/admin/members", "/admin/billing", "/admin/membership-plans");
  revalidateMemberSurface("/", "/profile");
}
