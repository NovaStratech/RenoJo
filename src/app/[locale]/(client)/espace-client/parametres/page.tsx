import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireClient } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import NotificationForm from "./notification-form";

export const dynamic = "force-dynamic";

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { client } = await requireClient(locale);
  const fr = locale === "fr";

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <Link
          href="/espace-client"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {fr ? "Mes projets" : "My projects"}
        </Link>
        <h1 className="text-3xl font-bold mt-2">
          {fr ? "Paramètres" : "Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {fr
            ? "Choisissez les courriels que vous souhaitez recevoir."
            : "Choose which emails you'd like to receive."}
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {fr ? "Notifications par courriel" : "Email notifications"}
        </h2>
        <NotificationForm
          locale={locale}
          defaults={{
            notifyOnMessage: client.notifyOnMessage,
            notifyOnQuote: client.notifyOnQuote,
          }}
          labels={{
            message: fr ? "Nouveau message" : "New message",
            messageHint: fr
              ? "Recevoir un courriel quand vous recevez un nouveau message sur la plateforme."
              : "Get an email when you receive a new message on the platform.",
            quote: fr ? "Activité sur un devis" : "Quote activity",
            quoteHint: fr
              ? "Recevoir un courriel quand un devis est envoyé ou mis à jour."
              : "Get an email when a quote is sent or updated.",
            save: fr ? "Enregistrer" : "Save",
            saving: fr ? "Enregistrement…" : "Saving…",
            saved: fr ? "Enregistré" : "Saved",
          }}
        />
      </Card>
    </div>
  );
}
