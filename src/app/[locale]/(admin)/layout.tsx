import { requireAdmin } from "@/lib/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSidebar from "./_components/sidebar";
import { signOutAction } from "./actions";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="flex flex-1 min-h-[calc(100vh-3.5rem)] bg-muted/30">
      <AdminSidebar items={items} brand="RenoJo Admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border/60 px-6 h-12 flex items-center justify-between bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("dashboard")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            <ThemeToggle />
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent transition"
              >
                {t("logout")}
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
