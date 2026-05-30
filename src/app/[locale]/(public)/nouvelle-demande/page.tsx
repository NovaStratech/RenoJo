import { setRequestLocale, getTranslations } from "next-intl/server";
import RequestForm from "./request-form";
import type { Locale } from "@/i18n/routing";

export default async function NouvelleDemandePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("request");
  const tCommon = await getTranslations("common");

  const projectTypes =
    locale === "en"
      ? [
          { value: "kitchen", label: "Kitchen" },
          { value: "bathroom", label: "Bathroom" },
          { value: "painting", label: "Painting" },
          { value: "flooring", label: "Flooring" },
          { value: "basement", label: "Basement" },
          { value: "exterior", label: "Exterior" },
          { value: "other", label: "Other" },
        ]
      : [
          { value: "kitchen", label: "Cuisine" },
          { value: "bathroom", label: "Salle de bain" },
          { value: "painting", label: "Peinture" },
          { value: "flooring", label: "Plancher" },
          { value: "basement", label: "Sous-sol" },
          { value: "exterior", label: "Extérieur" },
          { value: "other", label: "Autre" },
        ];

  const urgencies =
    locale === "en"
      ? [
          { value: "asap", label: "ASAP" },
          { value: "weeks", label: "Within weeks" },
          { value: "months", label: "Within months" },
          { value: "flexible", label: "Flexible" },
        ]
      : [
          { value: "asap", label: "Dès que possible" },
          { value: "weeks", label: "Quelques semaines" },
          { value: "months", label: "Quelques mois" },
          { value: "flexible", label: "Flexible" },
        ];

  const budgets =
    locale === "en"
      ? [
          { value: "under_5k", label: "Under $5k" },
          { value: "5k_15k", label: "$5k – $15k" },
          { value: "15k_30k", label: "$15k – $30k" },
          { value: "30k_plus", label: "$30k+" },
        ]
      : [
          { value: "under_5k", label: "Moins de 5 000 $" },
          { value: "5k_15k", label: "5 000 – 15 000 $" },
          { value: "15k_30k", label: "15 000 – 30 000 $" },
          { value: "30k_plus", label: "30 000 $ et +" },
        ];

  const propertyTypes =
    locale === "en"
      ? [
          { value: "house", label: "House" },
          { value: "condo", label: "Condo / Apartment" },
          { value: "commercial", label: "Commercial" },
        ]
      : [
          { value: "house", label: "Maison" },
          { value: "condo", label: "Condo / Appartement" },
          { value: "commercial", label: "Commercial" },
        ];

  const occupancyStatuses =
    locale === "en"
      ? [
          { value: "owner", label: "Owner" },
          { value: "tenant", label: "Tenant" },
        ]
      : [
          { value: "owner", label: "Propriétaire" },
          { value: "tenant", label: "Locataire" },
        ];

  const preferredContacts =
    locale === "en"
      ? [
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" },
          { value: "sms", label: "Text (SMS)" },
        ]
      : [
          { value: "email", label: "Courriel" },
          { value: "phone", label: "Téléphone" },
          { value: "sms", label: "Texto (SMS)" },
        ];

  return (
    <main className="flex-1 px-6 py-12 max-w-xl mx-auto w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">{t("title")}</h1>
      <RequestForm
        locale={locale}
        labels={{
          title: t("title"),
          steps: {
            contact: t("stepContact"),
            address: t("stepAddress"),
            project: t("stepProject"),
            description: t("stepDescription"),
            review: t("stepReview"),
          },
          fields: {
            fullName: t("fields.fullName"),
            email: t("fields.email"),
            phone: t("fields.phone"),
            addressLine: t("fields.addressLine"),
            city: t("fields.city"),
            postalCode: t("fields.postalCode"),
            projectType: t("fields.projectType"),
            description: t("fields.description"),
            descriptionHint: t("fields.descriptionHint"),
            photos: t("fields.photos"),
            urgency: t("fields.urgency"),
            budget: t("fields.budget"),
            propertyType: t("fields.propertyType"),
            occupancyStatus: t("fields.occupancyStatus"),
            preferredContact: t("fields.preferredContact"),
            desiredStartDate: t("fields.desiredStartDate"),
            approxArea: t("fields.approxArea"),
            approxAreaHint: t("fields.approxAreaHint"),
            optional: t("fields.optional"),
            accountTitle: t("fields.accountTitle"),
            accountHint: t("fields.accountHint"),
            password: t("fields.password"),
            passwordConfirm: t("fields.passwordConfirm"),
          },
          buttons: {
            back: tCommon("back"),
            next: tCommon("next"),
            submit: tCommon("submit"),
            submitting: tCommon("loading"),
            addPhotos: t("fields.photos"),
            removePhoto: locale === "en" ? "Remove" : "Retirer",
          },
          projectTypes,
          urgencies,
          budgets,
          propertyTypes,
          occupancyStatuses,
          preferredContacts,
          errors: {
            required: locale === "en" ? "Required" : "Requis",
            submit: locale === "en" ? "Could not submit" : "Échec de l'envoi",
          },
        }}
      />
    </main>
  );
}
