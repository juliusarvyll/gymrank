import test from "node:test";
import assert from "node:assert/strict";
import type { User } from "@supabase/supabase-js";
import { resolveSurfacePostAuthRedirect } from "../lib/app/auth-redirect-core.ts";
import {
  getLogoutDestination,
  getPostAuthDestination,
  sanitizeAuthNextPath,
} from "../lib/app/auth-routing.ts";

function createUser(overrides?: Partial<User>): User {
  return {
    id: "user_1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-03-19T00:00:00.000Z",
    ...overrides,
  } as User;
}

test("sanitizeAuthNextPath keeps safe in-app targets", () => {
  assert.equal(sanitizeAuthNextPath("/check-in", "/login"), "/check-in");
});

test("sanitizeAuthNextPath rejects missing or external-looking targets", () => {
  assert.equal(sanitizeAuthNextPath(undefined, "/login"), "/login");
  assert.equal(sanitizeAuthNextPath("https://evil.example", "/login"), "/login");
  assert.equal(sanitizeAuthNextPath("//evil.example", "/login"), "/login");
});

test("getLogoutDestination routes admin paths to admin login", () => {
  assert.equal(getLogoutDestination("/admin/profile"), "/admin/login");
  assert.equal(getLogoutDestination("/profile"), "/login");
});

test("getPostAuthDestination sends staff and owners to admin", () => {
  assert.equal(
    getPostAuthDestination({
      surface: "member",
      hasGym: true,
      membershipRole: "owner",
      accountType: "owner",
    }),
    "/admin",
  );
  assert.equal(
    getPostAuthDestination({
      surface: "admin",
      hasGym: true,
      membershipRole: "staff",
      accountType: "owner",
    }),
    "/admin",
  );
});

test("getPostAuthDestination sends members to the member surface", () => {
  assert.equal(
    getPostAuthDestination({
      surface: "member",
      hasGym: true,
      membershipRole: "member",
      accountType: "member",
    }),
    "/",
  );
});

test("getPostAuthDestination sends owners without a gym to onboarding", () => {
  assert.equal(
    getPostAuthDestination({
      surface: "admin",
      hasGym: false,
      membershipRole: null,
      accountType: "owner",
    }),
    "/admin/onboarding",
  );
});

test("resolveSurfacePostAuthRedirect uses member membership and gym context", async () => {
  const user = createUser({ user_metadata: { account_type: "member" } });
  const destination = await resolveSurfacePostAuthRedirect(user, "member", {
    getActiveGymForUser: async () => ({ id: "gym_1", name: "Gym", slug: "gym", timezone: "UTC" }),
    getUserMembershipRole: async () => ({ role: "member", status: "active" }),
  });

  assert.equal(destination, "/");
});

test("resolveSurfacePostAuthRedirect sends owners without a gym to onboarding", async () => {
  const user = createUser({ user_metadata: { account_type: "owner" } });
  const destination = await resolveSurfacePostAuthRedirect(user, "admin", {
    getActiveGymForUser: async () => null,
    getUserMembershipRole: async () => null,
  });

  assert.equal(destination, "/admin/onboarding");
});

test("resolveSurfacePostAuthRedirect still protects admin surface from member accounts", async () => {
  const user = createUser({ user_metadata: { account_type: "member" } });
  const destination = await resolveSurfacePostAuthRedirect(user, "admin", {
    getActiveGymForUser: async () => ({ id: "gym_1", name: "Gym", slug: "gym", timezone: "UTC" }),
    getUserMembershipRole: async () => ({ role: "member", status: "active" }),
  });

  assert.equal(destination, "/");
});
