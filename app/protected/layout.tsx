import type { ReactNode } from "react";

export default function ProtectedRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
