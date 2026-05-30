import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireClient } from "@/lib/auth/session";
import { getClientProjectDetail } from "@/lib/client/projects";
import { BUCKETS, createSignedUrl } from "@/lib/storage";
import { formatDateTime, statusColors, statusLabel } from "@/lib/format";
import { Card } from "@/components/ui/card";
import ClientReplyForm from "./reply-form";

export const dynamic = "force-dynamic";

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(n);
}

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { client } = await requireClient(locale);

  const data = await getClientProjectDetail(id, client.id);
  if (!data) notFound();

  const { project, photos, messages, quotes } = data;

  const photoUrls = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      url: await createSignedUrl(BUCKETS.projectPhotos, p.storagePath, 3600),
    })),
  );

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <Link
          href="/espace-client"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {locale === "fr" ? "Mes projets" : "My projects"}
        </Link>
        <div className="mt-1 flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <span
            className={`inline-block px-2 py-0.5 text-xs rounded-full border ${
              statusColors[project.status] ?? ""
            }`}
          >
            {statusLabel(project.status, locale)}
          </span>
        </div>
      </div>

      {project.description && (
        <Card className="p-5 space-y-2">
          <h2 className="font-semibold">
            {locale === "fr" ? "Description" : "Description"}
          </h2>
          <p className="text-sm whitespace-pre-wrap">{project.description}</p>
        </Card>
      )}

      {/* Quotes */}
      {quotes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {locale === "fr" ? "Devis" : "Quotes"}
          </h2>
          {quotes.map((q) => (
            <Card key={q.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-medium">{q.number}</div>
                <span
                  className={`inline-block px-2 py-0.5 text-xs rounded-full border ${
                    statusColors[`quote_${q.status}`] ?? "border-border"
                  }`}
                >
                  {q.status}
                </span>
              </div>
              {q.lines.length > 0 && (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {q.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-1.5 pr-2">{l.description}</td>
                        <td className="py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {l.quantity} × {money(Number(l.unitPrice), locale)}
                        </td>
                        <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                          {money(Number(l.lineTotal), locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="flex justify-end">
                <div className="text-sm space-y-0.5 text-right">
                  <div className="text-muted-foreground">
                    {locale === "fr" ? "Sous-total" : "Subtotal"}:{" "}
                    {money(Number(q.subtotal), locale)}
                  </div>
                  <div className="text-muted-foreground">
                    TPS: {money(Number(q.gst), locale)} · TVQ:{" "}
                    {money(Number(q.qst), locale)}
                  </div>
                  <div className="font-semibold text-base">
                    {locale === "fr" ? "Total" : "Total"}:{" "}
                    {money(Number(q.total), locale)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* Photos */}
      {photoUrls.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {locale === "fr" ? "Photos" : "Photos"} ({photoUrls.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photoUrls.map((p) =>
              p.url ? (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
        </section>
      )}

      {/* Messages */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {locale === "fr" ? "Messages" : "Messages"}
        </h2>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Aucun message pour le moment."
                : "No messages yet."}
            </p>
          ) : (
            messages.map((m) => {
              const fromAdmin = m.senderType === "admin";
              return (
                <div
                  key={m.id}
                  className={`flex ${fromAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      fromAdmin
                        ? "bg-muted text-foreground rounded-tl-sm"
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                      {fromAdmin
                        ? locale === "fr"
                          ? "RenoJo"
                          : "RenoJo"
                        : locale === "fr"
                          ? "Vous"
                          : "You"}{" "}
                      · {formatDateTime(m.createdAt, locale)}
                    </div>
                    <div className="whitespace-pre-wrap">{m.bodyText}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Card className="p-4">
          <ClientReplyForm
            locale={locale}
            projectId={project.id}
            labels={{
              placeholder:
                locale === "fr"
                  ? "Écrivez votre message…"
                  : "Write your message…",
              send: locale === "fr" ? "Envoyer" : "Send",
              sending: locale === "fr" ? "Envoi…" : "Sending…",
              error:
                locale === "fr"
                  ? "Échec de l'envoi. Réessayez."
                  : "Failed to send. Try again.",
            }}
          />
        </Card>
      </section>
    </div>
  );
}
