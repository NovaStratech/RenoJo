import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  listProjectsForAdmin,
  type ProjectStatusValue,
} from "@/lib/admin/projects";
import { projectStatus } from "@/lib/db/schema";
import { formatDate, statusColors, statusLabel } from "@/lib/format";
import ProjectsFilterBar from "../../_components/projects-filter-bar";

export const dynamic = "force-dynamic";

const STATUSES = projectStatus.enumValues;

function parseStatus(v: string | undefined): ProjectStatusValue | "all" {
  if (!v || v === "all") return "all";
  return (STATUSES as readonly string[]).includes(v)
    ? (v as ProjectStatusValue)
    : "all";
}

export default async function AdminProjectsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    q?: string;
    type?: string;
    urgency?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const search = (sp.q ?? "").toString();
  const type = (sp.type ?? "").toString();
  const urgency = (sp.urgency ?? "").toString();
  const from = (sp.from ?? "").toString();
  const to = (sp.to ?? "").toString();
  const sort = (sp.sort ?? "created_desc").toString();

  const rows = await listProjectsForAdmin({
    status,
    search,
    projectType: type,
    urgency,
    dateFrom: from,
    dateTo: to,
    sort: sort as never,
    limit: 200,
  });

  const projectTypeOptions =
    locale === "fr"
      ? [
          { value: "kitchen", label: "Cuisine" },
          { value: "bathroom", label: "Salle de bain" },
          { value: "painting", label: "Peinture" },
          { value: "flooring", label: "Plancher" },
          { value: "basement", label: "Sous-sol" },
          { value: "exterior", label: "Extérieur" },
          { value: "other", label: "Autre" },
        ]
      : [
          { value: "kitchen", label: "Kitchen" },
          { value: "bathroom", label: "Bathroom" },
          { value: "painting", label: "Painting" },
          { value: "flooring", label: "Flooring" },
          { value: "basement", label: "Basement" },
          { value: "exterior", label: "Exterior" },
          { value: "other", label: "Other" },
        ];

  const urgencyOptions =
    locale === "fr"
      ? [
          { value: "asap", label: "Dès que possible" },
          { value: "weeks", label: "Quelques semaines" },
          { value: "months", label: "Quelques mois" },
          { value: "flexible", label: "Flexible" },
        ]
      : [
          { value: "asap", label: "ASAP" },
          { value: "weeks", label: "Within weeks" },
          { value: "months", label: "Within months" },
          { value: "flexible", label: "Flexible" },
        ];

  const sortOptions =
    locale === "fr"
      ? [
          { value: "created_desc", label: "Plus récents" },
          { value: "created_asc", label: "Plus anciens" },
          { value: "updated_desc", label: "Mis à jour récemment" },
          { value: "title_asc", label: "Titre (A→Z)" },
        ]
      : [
          { value: "created_desc", label: "Newest" },
          { value: "created_asc", label: "Oldest" },
          { value: "updated_desc", label: "Recently updated" },
          { value: "title_asc", label: "Title (A→Z)" },
        ];

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto w-full space-y-6">
      <h1 className="text-3xl font-bold">
        {locale === "fr" ? "Projets" : "Projects"}
      </h1>

      <ProjectsFilterBar
        locale={locale}
        currentStatus={status}
        currentSearch={search}
        currentType={type}
        currentUrgency={urgency}
        currentDateFrom={from}
        currentDateTo={to}
        currentSort={sort}
        statuses={STATUSES}
        projectTypes={projectTypeOptions}
        urgencies={urgencyOptions}
        sorts={sortOptions}
        labels={{
          all: locale === "fr" ? "Tous les statuts" : "All statuses",
          allTypes: locale === "fr" ? "Tous les types" : "All types",
          allUrgencies: locale === "fr" ? "Toutes urgences" : "All urgencies",
          search:
            locale === "fr"
              ? "Rechercher (titre, client, courriel, ville)…"
              : "Search (title, client, email, city)…",
          from: locale === "fr" ? "Du" : "From",
          to: locale === "fr" ? "Au" : "To",
          sort: locale === "fr" ? "Trier" : "Sort",
          reset: locale === "fr" ? "Réinitialiser" : "Reset",
        }}
      />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {locale === "fr" ? "Aucun résultat." : "No results."}
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
              {rows.map((p) => (
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
    </div>
  );
}
