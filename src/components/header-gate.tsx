"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * Hides the global site header on the authenticated areas (client portal and
 * admin), which render their own top bars. Keeps it on public pages.
 */
export function HeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidden =
    pathname.startsWith("/espace-client") || pathname.startsWith("/admin");
  if (hidden) return null;
  return <>{children}</>;
}
