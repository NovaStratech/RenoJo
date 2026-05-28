/**
 * Email templates as pure functions. Locale-aware. Plain text + simple HTML.
 * Returned strings are HTML-safe (we control the inputs).
 */

import { publicEnv } from "@/lib/env";

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;color:#1a1a1a">
<h2 style="margin:0 0 16px 0">${escape(title)}</h2>
${body}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px"/>
<p style="font-size:12px;color:#777">RenoJo · Estimations de rénovation</p>
</body></html>`;
}

/** Email sent to the client when they submit a new request. */
export function clientRequestReceived(opts: {
  locale: "fr" | "en";
  clientName: string;
  projectTitle: string;
  accessUrl: string;
}) {
  const { locale, clientName, projectTitle, accessUrl } = opts;
  if (locale === "en") {
    const subject = `We received your request — ${projectTitle}`;
    const text = `Hi ${clientName},

We received your renovation estimate request "${projectTitle}".
We will review it shortly and get back to you with questions or a quote.

You can follow up, add photos or send a message any time using this link:
${accessUrl}

Thanks,
RenoJo`;
    const html = layout(
      "We received your request",
      `<p>Hi ${escape(clientName)},</p>
<p>We received your renovation estimate request <strong>${escape(projectTitle)}</strong>. We will review it shortly and get back to you with questions or a quote.</p>
<p>You can follow up at any time:</p>
<p><a href="${accessUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View my project</a></p>
<p style="font-size:12px;color:#777">Or copy this link: ${escape(accessUrl)}</p>`,
    );
    return { subject, text, html };
  }
  const subject = `Nous avons reçu votre demande — ${projectTitle}`;
  const text = `Bonjour ${clientName},

Nous avons bien reçu votre demande d'estimation "${projectTitle}".
Nous l'examinons et reviendrons rapidement vers vous avec des questions ou un devis.

Vous pouvez suivre votre projet, ajouter des photos ou nous écrire à tout moment via ce lien :
${accessUrl}

Merci,
RenoJo`;
  const html = layout(
    "Nous avons reçu votre demande",
    `<p>Bonjour ${escape(clientName)},</p>
<p>Nous avons bien reçu votre demande d'estimation <strong>${escape(projectTitle)}</strong>. Nous l'examinons et reviendrons rapidement vers vous avec des questions ou un devis.</p>
<p>Vous pouvez suivre votre projet à tout moment :</p>
<p><a href="${accessUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Voir mon projet</a></p>
<p style="font-size:12px;color:#777">Ou copiez ce lien : ${escape(accessUrl)}</p>`,
  );
  return { subject, text, html };
}

/** Internal notification to the admin when a new request lands. */
export function adminNewProjectNotification(opts: {
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  adminUrl: string;
}) {
  const { clientName, clientEmail, projectTitle, adminUrl } = opts;
  const subject = `[RenoJo] Nouvelle demande — ${projectTitle}`;
  const text = `Nouvelle demande d'estimation :

Client : ${clientName} <${clientEmail}>
Projet : ${projectTitle}

Voir dans l'admin : ${adminUrl}`;
  const html = layout(
    "Nouvelle demande d'estimation",
    `<p><strong>${escape(clientName)}</strong> &lt;${escape(clientEmail)}&gt;</p>
<p>Projet : <strong>${escape(projectTitle)}</strong></p>
<p><a href="${adminUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Ouvrir le projet</a></p>`,
  );
  return { subject, text, html };
}

/** Generic outbound message reply from admin to client. */
export function adminReplyEmail(opts: {
  locale: "fr" | "en";
  clientName: string;
  projectTitle: string;
  bodyText: string;
  accessUrl: string;
}) {
  const { locale, clientName, projectTitle, bodyText, accessUrl } = opts;
  const subject =
    locale === "en" ? `Re: ${projectTitle}` : `Re : ${projectTitle}`;
  const text = `${bodyText}

—
${locale === "en" ? "Reply to this email or visit:" : "Répondez à ce courriel ou visitez :"} ${accessUrl}`;
  const html = layout(
    projectTitle,
    `<p>${escape(locale === "en" ? `Hi ${clientName},` : `Bonjour ${clientName},`)}</p>
<div style="white-space:pre-wrap">${escape(bodyText)}</div>
<p style="margin-top:24px"><a href="${accessUrl}">${escape(locale === "en" ? "Open project" : "Voir le projet")}</a></p>`,
  );
  return { subject, text, html };
}

export function appOrigin() {
  return publicEnv.APP_URL.replace(/\/$/, "");
}
