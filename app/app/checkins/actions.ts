"use server";

export async function createCheckin(formData: FormData) {
  void formData;
  throw new Error("Manual check-ins are disabled. Use the QR check-in flow.");
}
