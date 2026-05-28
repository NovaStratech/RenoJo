import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  listProjectsForAdmin,
  getDashboardKpis,
  type ProjectStatusValue,
} from "@/lib/admin/projects";
import { formatDate, statusColors, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const [kpis, recent] = await Promise.all([
    getDashboardKpis(),
    listProjectsForAdmin({ limit: 10 }),
  ]);

  const kpiCards: { key: ProjectStatusValue | "total"; value: number }[] = [
    { key: "total", value: kpis.total },
    { key: "new", value: kpis.byStatus.new ?? 0 },
    { key: "in_review", value: kpis.byStatus.in_review ?? 0 },
    { key: "quoted", value: kpis.byStatus.quoted ?? 0 },
    { key: "accepted", value: kpis.byStatus.accepted ?? 0 },
    { key: "in_progress", value: kpis.byStatus.in_progress ?? 0 },
  ];

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("dashboard")}</h1>
        <Link
          href="/admin/projets"
          className="text-sm text-primary hover:underline"
        >
          {t("projects")} →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((c) => (
          <div
            key={c.key}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {c.key === "total"
                ? locale === "fr"
                  ? "Total"
                  : "Total"
                : statusLabel(c.key, locale)}
            </div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {locale === "fr" ? "Derniers projets" : "Recent projects"}
        </h2>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {locale === "fr"
                ? "Aucun projet pour le moment."
                : "No projects yet."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">
                    {locale === "fr" ? "Projet" : "Project"}
                  </th>
                  <th className="px-4 py-2 font-medium">
                    {locale === "fr" ? "Client" : "Client"}
                  </th>
                  <th className="px-4 py-2 font-medium">
                    {locale === "fr" ? "Statut" : "Status"}
                  </th>
                  <th className="px-4 py-2 font-medium">
                    {locale === "fr" ? "Reçu le" : "Received"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/projets/${p.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {p.title}
                      </Link>
                      {p.city && (
                        <div className="text-xs text-muted-foreground">
                          {p.city}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{p.clientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.clientEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full border ${
                          statusColors[p.status] ?? ""
                        }`}
                      >
                        {statusLabel(p.status, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
