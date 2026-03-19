"use server";

export async function createMemberCheckin(formData: FormData) {
  void formData;
  throw new Error("Manual check-ins are disabled. Use your QR pass.");
}
