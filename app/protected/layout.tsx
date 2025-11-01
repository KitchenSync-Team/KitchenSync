import type { ReactNode } from "react";

import "@/app/protected/theme.css";

export default function ProtectedRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
