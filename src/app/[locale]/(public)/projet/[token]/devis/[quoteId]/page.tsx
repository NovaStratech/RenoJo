import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clients,
  companySettings,
  projects,
  quoteLines,
  quotes,
} from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { BUCKETS, createSignedUrl } from "@/lib/storage";
import { formatCurrency, formatDateTime } from "@/lib/format";
import ClientQuoteActions from "./client-quote-actions";

export const dynamic = "force-dynamic";

export default async function ClientQuotePage({
  params,
}: {
  params: Promise<{ locale: string; token: string; quoteId: string }>;
}) {
  const { locale, token, quoteId } = await params;
  setRequestLocale(locale);

  const tokenHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.accessTokenHash, tokenHash))
    .limit(1);
  if (!project) notFound();

  const [qRow] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.projectId, project.id)))
    .limit(1);
  if (!qRow) notFound();

  // Mark as viewed once
  if (qRow.status === "sent" && !qRow.viewedAt) {
    await db
      .update(quotes)
      .set({ status: "viewed", viewedAt: new Date() })
      .where(eq(quotes.id, qRow.id));
  }

  const [lines, clientRow, companyRow] = await Promise.all([
    db
      .select()
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, qRow.id))
      .orderBy(asc(quoteLines.sortOrder)),
    db.select().from(clients).where(eq(clients.id, project.clientId)).limit(1),
    db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1),
  ]);
  const client = clientRow[0];
  const company = companyRow[0];

  const pdfUrl = qRow.pdfStoragePath
    ? await createSignedUrl(BUCKETS.quotePdfs, qRow.pdfStoragePath, 3600)
    : null;

  const isFr = locale === "fr";
  const L = (fr: string, en: string) => (isFr ? fr : en);
  const isFinalized =
    qRow.status === "accepted" || qRow.status === "declined";

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 py-8 space-y-6 w-full">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">
          {company?.businessName ?? "RenoJo"}
        </div>
        <h1 className="text-2xl font-bold">
          {L("Devis", "Quote")} {qRow.number}
        </h1>
        <div className="text-sm text-muted-foreground">
          {client?.fullName} · {project.title}
        </div>
      </header>

      {qRow.status === "accepted" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          ✓ {L("Devis accepté", "Quote accepted")}
          {qRow.acceptedAt && (
            <> · {formatDateTime(qRow.acceptedAt, locale)}</>
          )}
          {qRow.signatureName && (
            <> {L("par", "by")} <strong>{qRow.signatureName}</strong></>
          )}
        </div>
      )}
      {qRow.status === "declined" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          {L("Devis refusé", "Quote declined")}
        </div>
      )}

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{L("Description", "Description")}</th>
              <th className="px-3 py-2 text-right">{L("Qté", "Qty")}</th>
              <th className="px-3 py-2 text-right">{L("Prix", "Price")}</th>
              <th className="px-3 py-2 text-right">{L("Total", "Total")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="px-3 py-2 whitespace-pre-wrap">
                  {l.description}
                  {!l.taxable && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({L("non taxable", "non-taxable")})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.quantity} {l.unit}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(l.unitPrice, locale, qRow.currency)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(l.lineTotal, locale, qRow.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 text-sm">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">
                {L("Sous-total", "Subtotal")}
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(qRow.subtotal, locale, qRow.currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">
                TPS
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(qRow.gst, locale, qRow.currency)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">
                TVQ
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(qRow.qst, locale, qRow.currency)}
              </td>
            </tr>
            <tr className="font-bold">
              <td colSpan={3} className="px-3 py-2 text-right">
                Total
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(qRow.total, locale, qRow.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {qRow.notes && (
        <section>
          <h2 className="font-semibold mb-1">{L("Notes", "Notes")}</h2>
          <p className="text-sm whitespace-pre-wrap text-foreground/90">
            {qRow.notes}
          </p>
        </section>
      )}
      {qRow.terms && (
        <section>
          <h2 className="font-semibold mb-1">
            {L("Conditions", "Terms")}
          </h2>
          <p className="text-sm whitespace-pre-wrap text-foreground/90">
            {qRow.terms}
          </p>
        </section>
      )}

      {pdfUrl && (
        <div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {L("Télécharger le PDF", "Download PDF")} ↗
          </a>
        </div>
      )}

      {!isFinalized && (
        <ClientQuoteActions
          locale={locale}
          token={token}
          quoteId={qRow.id}
          quoteNumber={qRow.number}
          labels={{
            title: L("Accepter le devis", "Accept this quote"),
            namePlaceholder: L("Votre nom complet", "Your full name"),
            signaturePrompt: L(
              "Signez ci-dessous (souris ou doigt) :",
              "Sign below (mouse or finger):",
            ),
            clearSig: L("Effacer", "Clear"),
            accept: L("Accepter", "Accept"),
            accepted: L(
              "Merci, votre acceptation a bien été enregistrée.",
              "Thanks, your acceptance has been recorded.",
            ),
            decline: L("Refuser", "Decline"),
            confirmDecline: L(
              "Refuser ce devis ?",
              "Decline this quote?",
            ),
            error: L("Une erreur est survenue.", "Something went wrong."),
          }}
        />
      )}
    </main>
  );
}
