import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function NouvelleDemandePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("request");

  return (
    <main className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-muted-foreground mb-8">
        {/* Phase 2 will implement the multi-step form here. */}
        Formulaire à venir (Phase 2).
      </p>
    </main>
  );
}
