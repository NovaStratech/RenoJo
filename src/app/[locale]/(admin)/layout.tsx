import { requireAdmin } from "@/lib/auth/session";
import { setRequestLocale } from "next-intl/server";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">RenoJo · Admin</div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
