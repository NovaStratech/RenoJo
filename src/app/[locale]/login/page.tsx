import { getTranslations, setRequestLocale } from "next-intl/server";
import LoginForm from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.login");

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <LoginForm
          labels={{
            email: t("email"),
            password: t("password"),
            submit: t("submit"),
            magicLink: t("magicLink"),
            error: t("error"),
          }}
        />
      </div>
    </main>
  );
}
