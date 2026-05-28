import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getProjectFullByToken } from "@/lib/projects";
import { createSignedUrl, BUCKETS } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ClientProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; token: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale, token } = await params;
  const { welcome } = await searchParams;
  setRequestLocale(locale);

  const data = await getProjectFullByToken(token);
  if (!data) notFound();
  const { project, client, photos, messages } = data;

  // Sign photo URLs (1h)
  const signedPhotos = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      url: await createSignedUrl(BUCKETS.projectPhotos, p.storagePath, 3600),
    })),
  );

  const dict =
    locale === "en"
      ? {
          welcome: "Your request was received!",
          welcomeBody: "We just sent you a confirmation email. We'll reach out shortly.",
          projectHeading: "Your project",
          status: "Status",
          photos: "Photos",
          messages: "Messages",
          empty: "No messages yet.",
          contactInfo: "Contact",
        }
      : {
          welcome: "Votre demande a été reçue !",
          welcomeBody:
            "Nous venons de vous envoyer un courriel de confirmation. Nous reviendrons rapidement vers vous.",
          projectHeading: "Votre projet",
          status: "Statut",
          photos: "Photos",
          messages: "Messages",
          empty: "Aucun message pour l'instant.",
          contactInfo: "Coordonnées",
        };

  const statusLabel = formatStatus(project.status, locale);

  return (
    <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full space-y-8">
      {welcome === "1" && (
        <div className="border border-green-200 bg-green-50 text-green-900 rounded-md p-4">
          <p className="font-semibold">{dict.welcome}</p>
          <p className="text-sm">{dict.welcomeBody}</p>
        </div>
      )}

      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {dict.projectHeading}
        </p>
        <h1 className="text-2xl font-bold mt-1">{project.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dict.status} : <span className="font-medium">{statusLabel}</span>
        </p>
      </header>

      {client && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">{dict.contactInfo}</h2>
          <p>{client.fullName}</p>
          <p className="text-muted-foreground">{client.email}</p>
          {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
        </section>
      )}

      {project.description && (
        <section>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.description}</p>
        </section>
      )}

      {signedPhotos.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">{dict.photos}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {signedPhotos.map((p) => (
              <li key={p.id} className="aspect-square overflow-hidden rounded-md border border-border">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">{dict.messages}</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-md border border-border p-3 text-sm ${
                  m.direction === "inbound" ? "bg-muted/40" : ""
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {m.senderType === "admin" ? "RenoJo" : client?.fullName ?? "Client"} ·{" "}
                  {new Date(m.createdAt).toLocaleString(locale)}
                </div>
                <div className="whitespace-pre-wrap">{m.bodyText ?? ""}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function formatStatus(s: string, locale: "fr" | "en") {
  const fr: Record<string, string> = {
    new: "Nouvelle demande",
    in_review: "En cours d'examen",
    quoted: "Devis envoyé",
    accepted: "Devis accepté",
    in_progress: "En cours",
    completed: "Terminé",
    cancelled: "Annulé",
    lost: "Perdu",
  };
  const en: Record<string, string> = {
    new: "New",
    in_review: "Under review",
    quoted: "Quote sent",
    accepted: "Quote accepted",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    lost: "Lost",
  };
  return (locale === "en" ? en : fr)[s] ?? s;
}
