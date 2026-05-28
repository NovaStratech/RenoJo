import { getTranslations } from "next-intl/server";

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin");
  return (
    <main className="px-6 py-10 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
      <p className="text-muted-foreground mt-2">À venir : liste des projets, KPIs, filtres.</p>
    </main>
  );
}
