import { setRequestLocale } from "next-intl/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/db/schema";
import { getCompanyTaxRates } from "@/lib/quotes/queries";
import QuoteEditor from "../quote-editor";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const isFr = locale === "fr";

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

  const labels = isFr
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
        notes: "Notes (visibles dans le devis)",
        terms: "Conditions",
        validUntil: "Valide jusqu'au",
        saveDraft: "Enregistrer le brouillon",
        updateDraft: "Mettre à jour",
        cancel: "Annuler",
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
        notes: "Notes (visible on quote)",
        terms: "Terms",
        validUntil: "Valid until",
        saveDraft: "Save draft",
        updateDraft: "Update",
        cancel: "Cancel",
      };

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto w-full space-y-4">
      <h1 className="text-2xl font-bold">
        {isFr ? "Nouveau devis" : "New quote"}
      </h1>
      <QuoteEditor
        locale={locale}
        projectId={id}
        catalog={items.map((c) => ({
          ...c,
          unitPrice: String(c.unitPrice),
          defaultQuantity: String(c.defaultQuantity),
        }))}
        rates={rates}
        currency="CAD"
        labels={labels}
        backHref={`/${locale}/admin/projets/${id}`}
      />
    </div>
  );
}
