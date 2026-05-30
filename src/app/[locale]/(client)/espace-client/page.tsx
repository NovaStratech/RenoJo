import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireClient } from "@/lib/auth/session";
import { listProjectsForClient } from "@/lib/client/projects";
import { formatDate, statusColors, statusLabel } from "@/lib/format";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { client } = await requireClient(locale);
  const projects = await listProjectsForClient(client.id);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">
            {locale === "fr" ? "Mes projets" : "My projects"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "fr"
              ? "Suivez l'avancement de vos demandes et échangez avec nous."
              : "Track your requests and message us."}
          </p>
        </div>
        <Link
          href="/nouvelle-demande"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          {locale === "fr" ? "Nouvelle demande" : "New request"}
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          {locale === "fr"
            ? "Vous n'avez aucun projet pour le moment."
            : "You have no projects yet."}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/espace-client/projet/${p.id}`}>
              <Card className="p-5 h-full hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-foreground">{p.title}</h2>
                  <span
                    className={`shrink-0 inline-block px-2 py-0.5 text-xs rounded-full border ${
                      statusColors[p.status] ?? ""
                    }`}
                  >
                    {statusLabel(p.status, locale)}
                  </span>
                </div>
                {p.city && (
                  <p className="text-sm text-muted-foreground mt-1">{p.city}</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  {locale === "fr" ? "Créé le" : "Created"}{" "}
                  {formatDate(p.createdAt, locale)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
