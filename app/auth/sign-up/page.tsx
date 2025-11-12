import { SignUpForm } from "@/components/auth/sign-up-form";

export default function Page() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Start a new KitchenSync kitchen or join teammates.
        </p>
      </div>
      <SignUpForm />
    </>
  );
}
