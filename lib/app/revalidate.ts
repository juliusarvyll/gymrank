import { revalidatePath } from "next/cache";

const MEMBER_SURFACE_PATHS = [
  "/",
  "/check-in",
  "/check-in/qr",
  "/challenges",
  "/community",
  "/notifications",
  "/profile",
  "/rewards",
];

const ADMIN_SURFACE_PATHS = [
  "/admin",
  "/admin/checkins",
  "/admin/checkins/qr",
  "/admin/challenges",
  "/admin/community",
  "/admin/notifications",
  "/admin/profile",
  "/admin/rewards",
  "/admin/members",
  "/admin/membership-plans",
  "/admin/analytics",
  "/admin/billing",
  "/admin/classes",
  "/admin/gyms",
  "/admin/inter-gym",
  "/admin/leaderboards",
  "/admin/networks",
];

function revalidateUnique(paths: string[]) {
  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}

export function revalidateMemberSurface(...extraPaths: string[]) {
  revalidateUnique([...MEMBER_SURFACE_PATHS, ...extraPaths]);
}

export function revalidateAdminSurface(...extraPaths: string[]) {
  revalidateUnique([...ADMIN_SURFACE_PATHS, ...extraPaths]);
}
