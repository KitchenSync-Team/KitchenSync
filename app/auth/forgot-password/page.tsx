import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function Page() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Need a reset?</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll send a secure link to update your KitchenSync password.
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
