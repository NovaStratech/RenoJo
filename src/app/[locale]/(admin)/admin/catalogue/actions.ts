"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  defaultQuantity: z.coerce.number().min(0).default(1),
  unit: z.string().trim().min(1).max(30).default("unit"),
  unitPrice: z.coerce.number().min(0).default(0),
  taxable: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true),
});

function parseFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  // checkboxes
  raw.taxable = formData.get("taxable") ? "true" : "false";
  raw.active = formData.get("active") ? "true" : "false";
  return itemSchema.parse(raw);
}

export async function createCatalogItem(locale: string, formData: FormData) {
  await requireAdmin(locale);
  const data = parseFormData(formData);
  await db.insert(catalogItems).values({
    name: data.name,
    description: data.description ?? null,
    category: data.category ?? null,
    defaultQuantity: String(data.defaultQuantity),
    unit: data.unit,
    unitPrice: String(data.unitPrice),
    taxable: data.taxable,
    active: data.active,
  });
  revalidatePath(`/${locale}/admin/catalogue`);
}

export async function updateCatalogItem(
  locale: string,
  id: string,
  formData: FormData,
) {
  await requireAdmin(locale);
  const data = parseFormData(formData);
  await db
    .update(catalogItems)
    .set({
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      defaultQuantity: String(data.defaultQuantity),
      unit: data.unit,
      unitPrice: String(data.unitPrice),
      taxable: data.taxable,
      active: data.active,
      updatedAt: new Date(),
    })
    .where(eq(catalogItems.id, id));
  revalidatePath(`/${locale}/admin/catalogue`);
}

export async function toggleCatalogItemActive(
  locale: string,
  id: string,
  active: boolean,
) {
  await requireAdmin(locale);
  await db
    .update(catalogItems)
    .set({ active, updatedAt: new Date() })
    .where(eq(catalogItems.id, id));
  revalidatePath(`/${locale}/admin/catalogue`);
}

export async function deleteCatalogItem(locale: string, id: string) {
  await requireAdmin(locale);
  await db.delete(catalogItems).where(and(eq(catalogItems.id, id)));
  revalidatePath(`/${locale}/admin/catalogue`);
}
