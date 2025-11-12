import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function Page() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Choose a new password</h2>
        <p className="text-sm text-muted-foreground">
          Set a fresh password to keep your KitchenSync kitchen secure.
        </p>
      </div>
      <UpdatePasswordForm />
    </>
  );
}
