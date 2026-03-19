import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm
          loginHref="/admin/login"
          redirectTo="/admin/update-password"
        />
      </div>
    </div>
  );
}
