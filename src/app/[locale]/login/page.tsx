import { getTranslations, setRequestLocale } from "next-intl/server";
import LoginForm from "./login-form";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.login");

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur shadow-xl shadow-black/5 p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
              R
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <LoginForm
            labels={{
              email: t("email"),
              password: t("password"),
              submit: t("submit"),
              error: t("error"),
            }}
          />
        </div>
      </div>
    </main>
  );
}
