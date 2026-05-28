import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { companySettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateCompanySettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParametresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rows = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);
  const s = rows[0];

  const isFr = locale === "fr";
  const L = (fr: string, en: string) => (isFr ? fr : en);

  const action = updateCompanySettings.bind(null, locale);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto w-full space-y-6">
      <h1 className="text-3xl font-bold">
        {L("Paramètres", "Settings")}
      </h1>

      <form action={action} className="space-y-6">
        <Section title={L("Entreprise", "Business")}>
          <Field
            name="businessName"
            label={L("Nom commercial", "Business name")}
            defaultValue={s?.businessName ?? "RenoJo"}
            required
          />
          <Field
            name="legalName"
            label={L("Raison sociale", "Legal name")}
            defaultValue={s?.legalName ?? ""}
          />
          <Field
            name="email"
            label={L("Courriel", "Email")}
            defaultValue={s?.email ?? ""}
            type="email"
          />
          <Field
            name="phone"
            label={L("Téléphone", "Phone")}
            defaultValue={s?.phone ?? ""}
          />
        </Section>

        <Section title={L("Adresse", "Address")}>
          <Field
            name="addressLine"
            label={L("Adresse", "Street address")}
            defaultValue={s?.addressLine ?? ""}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field
              name="city"
              label={L("Ville", "City")}
              defaultValue={s?.city ?? ""}
            />
            <Field
              name="province"
              label={L("Province", "Province")}
              defaultValue={s?.province ?? "QC"}
            />
            <Field
              name="postalCode"
              label={L("Code postal", "Postal code")}
              defaultValue={s?.postalCode ?? ""}
            />
          </div>
        </Section>

        <Section title={L("Taxes (Québec)", "Taxes (Quebec)")}>
          <div className="grid grid-cols-2 gap-3">
            <Field
              name="gstNumber"
              label={L("Numéro TPS", "GST number")}
              defaultValue={s?.gstNumber ?? ""}
            />
            <Field
              name="qstNumber"
              label={L("Numéro TVQ", "QST number")}
              defaultValue={s?.qstNumber ?? ""}
            />
            <Field
              name="gstRate"
              label={L("Taux TPS (ex: 0.05)", "GST rate (e.g. 0.05)")}
              defaultValue={s?.gstRate ?? "0.0500"}
              type="number"
              step="0.0001"
            />
            <Field
              name="qstRate"
              label={L("Taux TVQ (ex: 0.09975)", "QST rate (e.g. 0.09975)")}
              defaultValue={s?.qstRate ?? "0.09975"}
              type="number"
              step="0.0001"
            />
          </div>
        </Section>

        <Section title={L("Conditions par défaut", "Default terms")}>
          <label className="block space-y-1">
            <span className="sr-only">{L("Conditions", "Terms")}</span>
            <textarea
              name="defaultTerms"
              defaultValue={s?.defaultTerms ?? ""}
              rows={5}
              placeholder={L(
                "Conditions affichées par défaut sur les devis…",
                "Default terms shown on quotes…",
              )}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </label>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            {L("Enregistrer", "Save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  step,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
      />
    </label>
  );
}
