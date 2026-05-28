"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companySettings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";

const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  legalName: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  addressLine: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  province: z.string().trim().max(60).optional().nullable(),
  gstNumber: z.string().trim().max(30).optional().nullable(),
  qstNumber: z.string().trim().max(30).optional().nullable(),
  gstRate: z.coerce.number().min(0).max(1),
  qstRate: z.coerce.number().min(0).max(1),
  defaultTerms: z.string().trim().max(4000).optional().nullable(),
});

export async function updateCompanySettings(locale: string, formData: FormData) {
  await requireAdmin(locale);
  const raw = Object.fromEntries(formData.entries());
  const data = settingsSchema.parse(raw);

  await db
    .update(companySettings)
    .set({
      businessName: data.businessName,
      legalName: data.legalName || null,
      email: data.email || null,
      phone: data.phone || null,
      addressLine: data.addressLine || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      province: data.province || null,
      gstNumber: data.gstNumber || null,
      qstNumber: data.qstNumber || null,
      gstRate: String(data.gstRate),
      qstRate: String(data.qstRate),
      defaultTerms: data.defaultTerms || null,
      updatedAt: new Date(),
    })
    .where(eq(companySettings.id, 1));

  revalidatePath(`/${locale}/admin/parametres`);
}
