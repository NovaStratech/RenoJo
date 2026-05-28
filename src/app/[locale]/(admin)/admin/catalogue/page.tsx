import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import CatalogManager from "./catalog-manager";

export const dynamic = "force-dynamic";

export default async function CataloguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await db
    .select()
    .from(catalogItems)
    .orderBy(asc(catalogItems.name));

  const labelsFr = {
    add: "Nouvel article",
    edit: "Modifier",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    confirmDelete: "Supprimer cet article ?",
    name: "Nom",
    description: "Description",
    category: "Catégorie",
    qty: "Qté",
    unit: "Unité",
    price: "Prix unitaire",
    taxable: "Taxable",
    active: "Actif",
  };
  const labelsEn = {
    add: "New item",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Delete this item?",
    name: "Name",
    description: "Description",
    category: "Category",
    qty: "Qty",
    unit: "Unit",
    price: "Unit price",
    taxable: "Taxable",
    active: "Active",
  };
  const labels = locale === "en" ? labelsEn : labelsFr;

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto w-full space-y-6">
      <h1 className="text-3xl font-bold">
        {locale === "fr" ? "Catalogue" : "Catalog"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {locale === "fr"
          ? "Articles réutilisables pour les lignes de devis."
          : "Reusable items for quote line presets."}
      </p>
      <CatalogManager locale={locale} items={items} labels={labels} />
    </div>
  );
}
