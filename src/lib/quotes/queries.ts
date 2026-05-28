import { desc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { companySettings, invoices, quotes } from "@/lib/db/schema";

export async function getCompanyTaxRates(): Promise<{
  gstRate: number;
  qstRate: number;
}> {
  const rows = await db
    .select({ gstRate: companySettings.gstRate, qstRate: companySettings.qstRate })
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);
  const s = rows[0];
  return {
    gstRate: s ? Number(s.gstRate) : 0.05,
    qstRate: s ? Number(s.qstRate) : 0.09975,
  };
}

export async function nextQuoteNumber(
  year = new Date().getUTCFullYear(),
): Promise<string> {
  const prefix = `RJ-${year}-`;
  const rows = await db
    .select({ number: quotes.number })
    .from(quotes)
    .where(like(quotes.number, `${prefix}%`))
    .orderBy(desc(quotes.number))
    .limit(1);
  let next = 1;
  if (rows[0]) {
    const tail = rows[0].number.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(
  year = new Date().getUTCFullYear(),
): Promise<string> {
  const prefix = `RJF-${year}-`;
  const rows = await db
    .select({ number: invoices.number })
    .from(invoices)
    .where(like(invoices.number, `${prefix}%`))
    .orderBy(desc(invoices.number))
    .limit(1);
  let next = 1;
  if (rows[0]) {
    const tail = rows[0].number.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}
