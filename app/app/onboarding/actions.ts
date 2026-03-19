"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createGym(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const timezone = String(formData.get("timezone") || "UTC");

  if (!name || !slug) {
    throw new Error("Gym name and slug are required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data: gym, error: gymError } = await db
    .from("gyms")
    .insert({
      name,
      slug,
      timezone,
      owner_user_id: user.id,
    })
    .select("id")
    .single();

  if (gymError) {
    throw new Error(gymError.message);
  }

  await db.from("gym_memberships").insert({
    gym_id: gym.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  await db
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        active_gym_id: gym.id,
      },
      { onConflict: "id" },
    );

  redirect("/admin");
}
