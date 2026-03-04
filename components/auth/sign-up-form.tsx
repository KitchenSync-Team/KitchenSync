"use client";

import { cn } from "@/lib/supabase/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const passwordRequirements = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "One special character",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const metRequirements = passwordRequirements.filter((rule) => rule.test(password));
  const strengthPercent = (metRequirements.length / passwordRequirements.length) * 100;
  const allRequirementsMet = metRequirements.length === passwordRequirements.length;
  const showPasswordRequirements = isPasswordFocused;
  const showMatchCheck = repeatPassword.length > 0;
  const passwordsMatch = showMatchCheck && password === repeatPassword;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please provide both a first and last name");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!allRequirementsMet) {
      setError("Please meet all password requirements.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-emerald-900/10 shadow-sm">
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-2xl tracking-tight">
            Join Kitchen<span className="text-emerald-600 dark:text-emerald-400">Sync</span>
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Let&apos;s get your kitchen created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="Jordan"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    type="text"
                    placeholder="Martinez"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  <div
                    aria-hidden={!showPasswordRequirements}
                    className={cn(
                      "pointer-events-none absolute left-0 right-0 top-full z-30 mt-2 origin-top transition-all duration-200 ease-out",
                      showPasswordRequirements
                        ? "translate-y-0 scale-y-100 opacity-100"
                        : "-translate-y-1 scale-y-95 opacity-0"
                    )}
                  >
                    <div className="space-y-3 rounded-md border border-emerald-900/10 bg-background/95 p-3 shadow-lg backdrop-blur-sm">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${strengthPercent}%` }}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        {passwordRequirements.map((rule) => {
                          const isMet = rule.test(password);
                          return (
                            <p
                              key={rule.id}
                              className={`inline-flex items-center gap-2 text-xs ${
                                isMet ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {isMet ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Circle className="h-3.5 w-3.5" />
                              )}
                              {rule.label}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repeatPassword}
                  onChange={(e) => {
                    setRepeatPassword(e.target.value);
                    if (error) setError(null);
                  }}
                />
                {showMatchCheck ? (
                  <p
                    className={`inline-flex items-center gap-2 text-xs ${
                      passwordsMatch ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {passwordsMatch ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                    Passwords match
                  </p>
                ) : null}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating your account…" : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
