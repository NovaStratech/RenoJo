import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("common.appName")}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("landing.heroSubtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/nouvelle-demande"
            className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            {t("landing.ctaRequest")}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-border font-medium hover:bg-accent transition"
          >
            {t("landing.ctaAdmin")}
          </Link>
        </div>
      </div>
    </main>
  );
}
