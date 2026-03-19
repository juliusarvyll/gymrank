import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveGymForUser,
  getAuthedUser,
  getUserMembershipRole,
} from "@/lib/app/queries";

export const GYM_STAFF_ROLES = new Set(["owner", "staff"]);

export async function requireUser(loginPath = "/login") {
  const supabase = await createClient();
  const user = await getAuthedUser();
  if (!user) redirect(loginPath);
  return { supabase, user };
}

export async function requireActiveGym() {
  const { supabase, user } = await requireUser();
  const gym = await getActiveGymForUser(user.id);
  if (!gym) {
    if (user.user_metadata?.account_type === "owner") {
      redirect("/admin/onboarding");
    }

    redirect("/");
  }
  return { supabase, user, gym };
}

export async function requireOwnerOrStaffGym() {
  const { supabase, user } = await requireUser("/admin/login");
  const gym = await getActiveGymForUser(user.id);

  if (!gym) {
    if (user.user_metadata?.account_type === "owner") {
      return { supabase, user, gym: null, role: null };
    }

    redirect("/");
  }

  const role = await getUserMembershipRole(user.id, gym.id);
  if (role?.role !== "owner" && role?.role !== "staff") {
    redirect("/");
  }

  return { supabase, user, gym, role };
}

export async function requireMemberGym(loginPath = "/login") {
  const { supabase, user } = await requireUser(loginPath);
  const gym = await getActiveGymForUser(user.id);

  if (!gym) {
    redirect(loginPath);
  }

  const role = await getUserMembershipRole(user.id, gym.id);
  if (role?.role === "owner" || role?.role === "staff") {
    redirect("/admin");
  }

  return { supabase, user, gym, role };
}

export async function requireGymStaffAccess() {
  const context = await requireOwnerOrStaffGym();

  if (!context.gym || !context.role) {
    throw new Error("Finish gym onboarding before using the admin workspace.");
  }

  if (!GYM_STAFF_ROLES.has(context.role.role)) {
    throw new Error("Admin access required.");
  }

  return context;
}

export async function requireGymOwnerAccess() {
  const context = await requireGymStaffAccess();

  if (context.role.role !== "owner") {
    throw new Error("Owner access required.");
  }

  return context;
}

export async function requireAdminPermission() {
  const { supabase, user, gym, role } = await requireOwnerOrStaffGym();

  if (!gym || !role) {
    throw new Error("Admin access requires an active gym.");
  }

  return { supabase, user, gym, role };
}

export async function requireAdminWorkspace() {
  const { supabase, user, gym, role } = await requireOwnerOrStaffGym();

  if (!gym || !role) {
    redirect("/admin/onboarding");
  }

  return { supabase, user, gym, role };
}
