"use server";

import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";
import { requireMemberGym } from "@/lib/app/server";

export async function updateMemberProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();

  const { supabase, user } = await requireMemberGym();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateMemberSurface("/", "/profile");
  revalidateAdminSurface("/admin/profile", "/admin/members");
}
