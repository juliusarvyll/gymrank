import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertGymMemberOwnership,
  assertGymPlanOwnership,
  buildInvoiceNumber,
} from "../lib/app/membership-admin.ts";

type MaybeSingleResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

function createSupabaseMock(handlers: Record<string, (filters: Record<string, string>) => MaybeSingleResult<{ id?: string; user_id?: string }>>) {
  return {
    from(table: string) {
      const filters: Record<string, string> = {};

      return {
        select() {
          return this;
        },
        eq(column: string, value: string) {
          filters[column] = value;
          return this;
        },
        maybeSingle() {
          return handlers[table](filters);
        },
      };
    },
  } as unknown as SupabaseClient;
}

test("buildInvoiceNumber returns the expected prefix", () => {
  const invoiceNumber = buildInvoiceNumber();

  assert.match(invoiceNumber, /^INV-\d{4}-[A-F0-9]{8}$/);
});

test("buildInvoiceNumber is unique across repeated calls", () => {
  const generated = new Set(Array.from({ length: 50 }, () => buildInvoiceNumber()));
  assert.equal(generated.size, 50);
});

test("assertGymPlanOwnership accepts plans belonging to the active gym", async () => {
  const supabase = createSupabaseMock({
    membership_plans: async (filters) => ({
      data: filters.id === "plan_1" && filters.gym_id === "gym_1" ? { id: "plan_1" } : null,
      error: null,
    }),
  });

  await assert.doesNotReject(() => assertGymPlanOwnership(supabase, "gym_1", "plan_1"));
});

test("assertGymPlanOwnership rejects plans from another gym", async () => {
  const supabase = createSupabaseMock({
    membership_plans: async () => ({
      data: null,
      error: null,
    }),
  });

  await assert.rejects(
    () => assertGymPlanOwnership(supabase, "gym_1", "plan_other"),
    /Selected plan does not belong to this gym/,
  );
});

test("assertGymMemberOwnership accepts members from the active gym", async () => {
  const supabase = createSupabaseMock({
    gym_memberships: async (filters) => ({
      data: filters.gym_id === "gym_1" && filters.user_id === "user_1" ? { user_id: "user_1" } : null,
      error: null,
    }),
  });

  await assert.doesNotReject(() => assertGymMemberOwnership(supabase, "gym_1", "user_1"));
});

test("assertGymMemberOwnership rejects users outside the active gym", async () => {
  const supabase = createSupabaseMock({
    gym_memberships: async () => ({
      data: null,
      error: null,
    }),
  });

  await assert.rejects(
    () => assertGymMemberOwnership(supabase, "gym_1", "user_2"),
    /Selected member does not belong to this gym/,
  );
});
