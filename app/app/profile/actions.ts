"use server";

import { requireAdminPermission } from "@/lib/app/server";
import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();

  const { supabase, user } = await requireAdminPermission();

  await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);

  revalidateAdminSurface("/admin/profile", "/admin/members");
  revalidateMemberSurface("/", "/profile");
}
