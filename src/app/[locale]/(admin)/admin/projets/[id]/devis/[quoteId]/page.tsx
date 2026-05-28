import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  catalogItems,
  quoteLines,
  quotes,
} from "@/lib/db/schema";
import { getCompanyTaxRates } from "@/lib/quotes/queries";
import { formatCurrency, formatDateTime } from "@/lib/format";
import QuoteEditor from "../quote-editor";
import QuoteActions from "./quote-actions";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; quoteId: string }>;
}) {
  const { locale, id: projectId, quoteId } = await params;
  setRequestLocale(locale);
  const isFr = locale === "fr";

  const [qRow] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!qRow || qRow.projectId !== projectId) notFound();

  const lines = await db
    .select()
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(asc(quoteLines.sortOrder));

  const [items, rates] = await Promise.all([
    db
      .select({
        id: catalogItems.id,
        name: catalogItems.name,
        unit: catalogItems.unit,
        unitPrice: catalogItems.unitPrice,
        defaultQuantity: catalogItems.defaultQuantity,
        taxable: catalogItems.taxable,
      })
      .from(catalogItems)
      .orderBy(asc(catalogItems.name)),
    getCompanyTaxRates(),
  ]);

  const isDraft = qRow.status === "draft";

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <a
            href={`/${locale}/admin/projets/${projectId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {isFr ? "Projet" : "Project"}
          </a>
          <h1 className="text-2xl font-bold mt-1">
            {isFr ? "Devis" : "Quote"} {qRow.number}
          </h1>
          <div className="text-xs text-muted-foreground mt-1">
            {isFr ? "Statut" : "Status"}: {qRow.status} ·{" "}
            {isFr ? "Total" : "Total"}: {formatCurrency(qRow.total, locale, qRow.currency)}
          </div>
        </div>
        <QuoteActions
          locale={locale}
          projectId={projectId}
          quoteId={quoteId}
          status={qRow.status}
          labels={{
            send: isFr ? "Envoyer au client" : "Send to client",
            sending: isFr ? "Envoi…" : "Sending…",
            sent: isFr
              ? `Envoyé${qRow.sentAt ? " " + formatDateTime(qRow.sentAt, locale) : ""}`
              : `Sent${qRow.sentAt ? " " + formatDateTime(qRow.sentAt, locale) : ""}`,
            convert: isFr ? "Convertir en facture" : "Convert to invoice",
            delete: isFr ? "Supprimer" : "Delete",
            confirmDelete: isFr ? "Supprimer ce devis ?" : "Delete this quote?",
          }}
        />
      </div>

      {qRow.status === "accepted" && qRow.signatureName && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          {isFr ? "Accepté par" : "Accepted by"} <strong>{qRow.signatureName}</strong>
          {qRow.acceptedAt && (
            <> {isFr ? "le" : "on"} {formatDateTime(qRow.acceptedAt, locale)}</>
          )}
          {qRow.signatureIp && (
            <span className="text-muted-foreground"> · IP {qRow.signatureIp}</span>
          )}
        </div>
      )}

      {isDraft ? (
        <QuoteEditor
          locale={locale}
          projectId={projectId}
          quoteId={quoteId}
          initialLines={lines.map((l) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unit: l.unit,
            unitPrice: Number(l.unitPrice),
            taxable: l.taxable,
          }))}
          initialNotes={qRow.notes ?? ""}
          initialTerms={qRow.terms ?? ""}
          initialValidUntil={
            qRow.validUntil
              ? new Date(qRow.validUntil).toISOString().slice(0, 10)
              : ""
          }
          catalog={items.map((c) => ({
            ...c,
            unitPrice: String(c.unitPrice),
            defaultQuantity: String(c.defaultQuantity),
          }))}
          rates={rates}
          currency={qRow.currency}
          labels={
            isFr
              ? {
                  catalogPick: "+ Depuis le catalogue…",
                  addLine: "Nouvelle ligne",
                  description: "Description",
                  qty: "Qté",
                  unit: "Unité",
                  price: "Prix unitaire",
                  taxable: "Tax.",
                  remove: "Retirer",
                  subtotal: "Sous-total",
                  gst: "TPS",
                  qst: "TVQ",
                  total: "Total",
                  notes: "Notes",
                  terms: "Conditions",
                  validUntil: "Valide jusqu'au",
                  saveDraft: "Enregistrer",
                  updateDraft: "Mettre à jour",
                  cancel: "Retour",
                }
              : {
                  catalogPick: "+ From catalog…",
                  addLine: "New line",
                  description: "Description",
                  qty: "Qty",
                  unit: "Unit",
                  price: "Unit price",
                  taxable: "Tax.",
                  remove: "Remove",
                  subtotal: "Subtotal",
                  gst: "GST",
                  qst: "QST",
                  total: "Total",
                  notes: "Notes",
                  terms: "Terms",
                  validUntil: "Valid until",
                  saveDraft: "Save",
                  updateDraft: "Update",
                  cancel: "Back",
                }
          }
          backHref={`/${locale}/admin/projets/${projectId}`}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{isFr ? "Description" : "Description"}</th>
                <th className="px-3 py-2 text-right">{isFr ? "Qté" : "Qty"}</th>
                <th className="px-3 py-2">{isFr ? "Unité" : "Unit"}</th>
                <th className="px-3 py-2 text-right">{isFr ? "Prix" : "Price"}</th>
                <th className="px-3 py-2 text-right">{isFr ? "Total" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-pre-wrap">{l.description}</td>
                  <td className="px-3 py-2 text-right">{l.quantity}</td>
                  <td className="px-3 py-2">{l.unit}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(l.unitPrice, locale, qRow.currency)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(l.lineTotal, locale, qRow.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">
                  {isFr ? "Sous-total" : "Subtotal"}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(qRow.subtotal, locale, qRow.currency)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">
                  TPS
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(qRow.gst, locale, qRow.currency)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">
                  TVQ
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(qRow.qst, locale, qRow.currency)}
                </td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className="px-3 py-2 text-right">
                  Total
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(qRow.total, locale, qRow.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
