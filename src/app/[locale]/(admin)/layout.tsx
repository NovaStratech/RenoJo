import { requireAdmin } from "@/lib/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSidebar from "./_components/sidebar";
import { signOutAction } from "./actions";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireAdmin(locale);
  const t = await getTranslations("admin");

  const items = [
    { href: "/admin", label: t("dashboard") },
    { href: "/admin/projets", label: t("projects") },
    { href: "/admin/catalogue", label: t("catalog") },
    { href: "/admin/parametres", label: t("settings") },
  ];

  const signOut = signOutAction.bind(null, locale);

  return (
    <div className="flex flex-1">
      <AdminSidebar items={items} brand="RenoJo · Admin" />
      <div className="flex-1 flex flex-col">
        <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card">
          <div className="text-sm text-muted-foreground">{user.email}</div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent"
            >
              {t("logout")}
            </button>
          </form>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
