"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = ComponentPropsWithoutRef<typeof Button>;

export function LogoutButton({
  variant = "outline",
  size = "sm",
  className,
  children,
  ...props
}: LogoutButtonProps) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      onClick={logout}
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {children ?? "Log out"}
    </Button>
  );
}
