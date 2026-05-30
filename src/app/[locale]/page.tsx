import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { locale } = await params;
  const { submitted } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center space-y-8">
        {submitted && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            {locale === "en"
              ? "Your request has been received. We'll get back to you shortly by email."
              : "Votre demande a été reçue. Nous vous reviendrons rapidement par courriel."}
          </div>
        )}
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
            {t("landing.ctaClientPortal")}
          </Link>
        </div>
      </div>
    </main>
  );
}
