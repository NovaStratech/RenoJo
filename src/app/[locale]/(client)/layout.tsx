import { requireClient } from "@/lib/auth/session";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "../(admin)/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { client } = await requireClient(locale);

  const signOut = signOutAction.bind(null, locale);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-muted/20">
      <header className="border-b border-border/60 px-6 h-14 flex items-center justify-between bg-card/70 backdrop-blur">
        <Link href="/espace-client" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            R
          </span>
          <span className="font-semibold">
            {locale === "fr" ? "Espace client" : "Client portal"}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {client.fullName}
          </span>
          <ThemeToggle />
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent transition"
            >
              {locale === "fr" ? "Déconnexion" : "Log out"}
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
