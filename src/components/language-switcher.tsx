"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const other = locale === "fr" ? "en" : "fr";
  const label = locale === "fr" ? "EN" : "FR";

  function switchLocale() {
    startTransition(() => {
      router.replace(pathname, { locale: other });
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      aria-label={`Switch to ${other.toUpperCase()}`}
      className="text-xs font-semibold tracking-wider px-2.5 py-1 rounded-md border border-border hover:bg-accent transition disabled:opacity-50"
    >
      {label}
    </button>
  );
}
