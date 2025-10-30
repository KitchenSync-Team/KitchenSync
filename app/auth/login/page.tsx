import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to access your KitchenSync kitchen.
        </p>
      </div>
      <LoginForm />
    </>
  );
}
