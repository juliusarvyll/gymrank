import type { User } from "@supabase/supabase-js";
import { getActiveGymForUser, getUserMembershipRole } from "@/lib/app/queries";
import {
  resolveSurfacePostAuthRedirect,
  type AuthRedirectDeps,
} from "@/lib/app/auth-redirect-core";

const defaultDeps: AuthRedirectDeps = {
  getActiveGymForUser,
  getUserMembershipRole,
};

export async function resolveMemberPostAuthRedirect(
  user: User,
  deps?: AuthRedirectDeps,
) {
  return resolveSurfacePostAuthRedirect(user, "member", deps ?? defaultDeps);
}

export async function resolveAdminPostAuthRedirect(
  user: User,
  deps?: AuthRedirectDeps,
) {
  return resolveSurfacePostAuthRedirect(user, "admin", deps ?? defaultDeps);
}
