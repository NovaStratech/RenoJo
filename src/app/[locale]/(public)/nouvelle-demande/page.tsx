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
            photos: t("fields.photos"),
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
          errors: {
            required: locale === "en" ? "Required" : "Requis",
            submit: locale === "en" ? "Could not submit" : "Échec de l'envoi",
          },
        }}
      />
    </main>
  );
}
