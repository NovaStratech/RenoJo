import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAdminProjectDetail } from "@/lib/admin/projects";
import { projectStatus } from "@/lib/db/schema";
import { BUCKETS, createSignedUrl } from "@/lib/storage";
import { formatDateTime, statusColors, statusLabel } from "@/lib/format";
import StatusSelect from "./status-select";

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await getAdminProjectDetail(id);
  if (!data) notFound();

  const { project, client, photos, messages, quotes } = data;

  const photoUrls = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      url: await createSignedUrl(BUCKETS.projectPhotos, p.storagePath, 3600),
    })),
  );

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/projets"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {locale === "fr" ? "Projets" : "Projects"}
          </Link>
          <h1 className="text-3xl font-bold mt-1">{project.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full border ${
                statusColors[project.status] ?? ""
              }`}
            >
              {statusLabel(project.status, locale)}
            </span>
            <span className="text-xs text-muted-foreground">
              {locale === "fr" ? "Reçu le" : "Received"}{" "}
              {formatDateTime(project.createdAt, locale)}
            </span>
          </div>
        </div>
        <StatusSelect
          locale={locale}
          projectId={project.id}
          currentStatus={project.status}
          statuses={projectStatus.enumValues}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold">
            {locale === "fr" ? "Client" : "Client"}
          </h2>
          {client ? (
            <div className="text-sm space-y-1">
              <div className="font-medium">{client.fullName}</div>
              <div>
                <a
                  href={`mailto:${client.email}`}
                  className="text-primary hover:underline"
                >
                  {client.email}
                </a>
              </div>
              {client.phone && (
                <div className="text-muted-foreground">{client.phone}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold">
            {locale === "fr" ? "Adresse" : "Address"}
          </h2>
          <div className="text-sm space-y-0.5">
            {project.addressLine && <div>{project.addressLine}</div>}
            <div>
              {[project.city, project.province, project.postalCode]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold">
            {locale === "fr" ? "Détails" : "Details"}
          </h2>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">
                {locale === "fr" ? "Type" : "Type"}:
              </span>{" "}
              {project.projectType ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">
                {locale === "fr" ? "Urgence" : "Urgency"}:
              </span>{" "}
              {project.urgency ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">
                {locale === "fr" ? "Budget" : "Budget"}:
              </span>{" "}
              {project.budgetHint ?? "—"}
            </div>
          </div>
        </section>
      </div>

      {project.description && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold">
            {locale === "fr" ? "Description" : "Description"}
          </h2>
          <p className="text-sm whitespace-pre-wrap">{project.description}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {locale === "fr" ? "Photos" : "Photos"} ({photoUrls.length})
        </h2>
        {photoUrls.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {locale === "fr" ? "Aucune photo." : "No photos."}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photoUrls.map((p) =>
              p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <img
                    src={p.url}
                    alt={p.caption ?? ""}
                    className="w-full h-full object-cover"
                  />
                </a>
              ) : (
                <div
                  key={p.id}
                  className="aspect-square rounded-lg border border-border bg-muted"
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {locale === "fr" ? "Messages" : "Messages"} ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {locale === "fr"
              ? "Aucun message pour le moment."
              : "No messages yet."}
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {m.direction === "inbound"
                      ? locale === "fr"
                        ? "Entrant"
                        : "Inbound"
                      : locale === "fr"
                        ? "Sortant"
                        : "Outbound"}{" "}
                    · {m.fromEmail ?? "—"}
                  </span>
                  <span>{formatDateTime(m.createdAt, locale)}</span>
                </div>
                {m.subject && (
                  <div className="text-sm font-medium mt-1">{m.subject}</div>
                )}
                {m.bodyText && (
                  <p className="text-sm mt-1 whitespace-pre-wrap text-foreground/90">
                    {m.bodyText}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {locale === "fr" ? "Devis" : "Quotes"} ({quotes.length})
          </h2>
          <button
            disabled
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground cursor-not-allowed"
            title={locale === "fr" ? "Bientôt (Phase 5)" : "Coming soon"}
          >
            + {locale === "fr" ? "Nouveau devis" : "New quote"}
          </button>
        </div>
        {quotes.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {locale === "fr" ? "Aucun devis." : "No quotes."}
          </div>
        ) : (
          <ul className="space-y-2">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{q.number}</div>
                  <div className="text-xs text-muted-foreground">
                    {q.status}
                  </div>
                </div>
                <div className="text-sm">{q.total} {q.currency}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
