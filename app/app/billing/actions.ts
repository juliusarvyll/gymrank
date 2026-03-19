"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceEmail } from "@/lib/billing/email";
import { assertGymMemberOwnership, assertGymPlanOwnership, buildInvoiceNumber } from "@/lib/app/membership-admin";
import { requireAdminPermission } from "@/lib/app/server";
import { revalidateAdminSurface } from "@/lib/app/revalidate";

export async function createMemberInvoice(formData: FormData) {
  const userId = String(formData.get("user_id") || "").trim();
  const planId = String(formData.get("plan_id") || "").trim() || null;
  const description = String(formData.get("description") || "").trim();
  const amountCents = Number(formData.get("amount_cents") || 0);
  const dueDate = String(formData.get("due_date") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!userId || !description || !dueDate) {
    throw new Error("Member, description, and due date are required.");
  }

  const { supabase, gym, user } = await requireAdminPermission();

  await Promise.all([
    assertGymMemberOwnership(supabase, gym.id, userId),
    assertGymPlanOwnership(supabase, gym.id, planId),
  ]);

  const { error } = await supabase.from("member_invoices").insert({
    gym_id: gym.id,
    user_id: userId,
    plan_id: planId,
    invoice_number: buildInvoiceNumber(),
    description,
    amount_cents: Number.isFinite(amountCents) ? Math.max(0, Math.round(amountCents)) : 0,
    due_date: dueDate,
    notes: notes || null,
    issued_by: user.id,
    status: "draft",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/members", "/admin/billing", "/admin/membership-plans");
}

export async function emailMemberInvoice(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id") || "").trim();

  if (!invoiceId) {
    throw new Error("Invoice id is required.");
  }

  const { supabase, gym } = await requireAdminPermission();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to email invoices.");
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("member_invoices")
    .select("id,user_id,invoice_number,description,amount_cents,due_date,notes,status")
    .eq("id", invoiceId)
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (invoiceError) {
    throw new Error(invoiceError.message);
  }

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email,full_name")
    .eq("id", invoice.user_id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.email) {
    throw new Error("Member email is required before sending an invoice.");
  }

  await sendInvoiceEmail({
    to: profile.email,
    memberName: profile.full_name || profile.email,
    gymName: gym.name,
    invoiceNumber: invoice.invoice_number,
    description: invoice.description,
    amountCents: invoice.amount_cents,
    dueDate: invoice.due_date,
    notes: invoice.notes,
  });

  const { error: updateError } = await supabase
    .from("member_invoices")
    .update({
      status: invoice.status === "paid" ? "paid" : "sent",
      emailed_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .eq("gym_id", gym.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateAdminSurface("/admin/members", "/admin/billing");
}

export async function updateMemberInvoiceStatus(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id") || "").trim();
  const status = String(formData.get("status") || "draft").trim();

  if (!invoiceId) {
    throw new Error("Invoice id is required.");
  }

  const { supabase, gym } = await requireAdminPermission();
  const payload: {
    status: string;
    paid_at?: string | null;
  } = { status };

  if (status === "paid") {
    payload.paid_at = new Date().toISOString();
  } else if (status === "draft" || status === "sent" || status === "overdue" || status === "void") {
    payload.paid_at = null;
  }

  const { error } = await supabase
    .from("member_invoices")
    .update(payload)
    .eq("id", invoiceId)
    .eq("gym_id", gym.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/members", "/admin/billing");
}
