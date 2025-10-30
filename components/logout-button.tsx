"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type LogoutButtonProps = ButtonProps;

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
