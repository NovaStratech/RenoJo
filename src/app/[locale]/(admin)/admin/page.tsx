import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  listProjectsForAdmin,
  getDashboardKpis,
  type ProjectStatusValue,
} from "@/lib/admin/projects";
import { formatDate, statusColors, statusLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_ORDER: ProjectStatusValue[] = [
  "new",
  "in_review",
  "quoted",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "lost",
];

const BAR_COLORS: Record<ProjectStatusValue, string> = {
  new: "bg-blue-500",
  in_review: "bg-amber-500",
  quoted: "bg-purple-500",
  accepted: "bg-emerald-500",
  in_progress: "bg-indigo-500",
  completed: "bg-slate-500",
  cancelled: "bg-zinc-500",
  lost: "bg-red-500",
};

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

  const activePipeline =
    (kpis.byStatus.new ?? 0) +
    (kpis.byStatus.in_review ?? 0) +
    (kpis.byStatus.quoted ?? 0) +
    (kpis.byStatus.accepted ?? 0) +
    (kpis.byStatus.in_progress ?? 0);

  const quoted = kpis.byStatus.quoted ?? 0;
  const accepted = kpis.byStatus.accepted ?? 0;
  const winRate =
    quoted + accepted === 0
      ? "—"
      : `${Math.round((accepted / (quoted + accepted)) * 100)} %`;

  const headlineCards = [
    {
      key: "total",
      label: locale === "fr" ? "Projets total" : "Total projects",
      value: String(kpis.total),
    },
    {
      key: "active",
      label: locale === "fr" ? "Pipeline actif" : "Active pipeline",
      value: String(activePipeline),
    },
    {
      key: "won",
      label: locale === "fr" ? "Taux d'acceptation" : "Win rate",
      value: winRate,
    },
  ];

  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => kpis.byStatus[s] ?? 0));

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "fr"
              ? "Vue d'ensemble de tes projets et de leur progression."
              : "Overview of your projects and their progression."}
          </p>
        </div>
        <Link
          href="/admin/projets"
          className="text-sm text-primary hover:underline font-medium"
        >
          {t("projects")} →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {headlineCards.map((c) => (
          <Card key={c.key}>
            <CardContent className="py-5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {c.label}
              </div>
              <div className="text-3xl font-bold mt-1 text-foreground">
                {c.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "fr" ? "Répartition par statut" : "Status distribution"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STATUS_ORDER.map((s) => {
            const v = kpis.byStatus[s] ?? 0;
            const pct = (v / maxStatus) * 100;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs">{statusLabel(s, locale)}</div>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${BAR_COLORS[s]} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs font-mono text-muted-foreground">
                  {v}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {locale === "fr" ? "Derniers projets" : "Recent projects"}
        </h2>
        <Card className="overflow-hidden p-0">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {locale === "fr" ? "Aucun projet pour le moment." : "No projects yet."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">
                    {locale === "fr" ? "Projet" : "Project"}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {locale === "fr" ? "Client" : "Client"}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {locale === "fr" ? "Statut" : "Status"}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {locale === "fr" ? "Reçu le" : "Received"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/projets/${p.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {p.title}
                      </Link>
                      {p.city && (
                        <div className="text-xs text-muted-foreground">{p.city}</div>
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
        </Card>
      </section>
    </div>
  );
}
