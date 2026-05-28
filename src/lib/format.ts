export function formatDate(d: Date | string, locale: string = "fr"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(d: Date | string, locale: string = "fr"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(
  amount: number | string,
  locale: string = "fr",
  currency = "CAD",
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency,
  }).format(n);
}

export const projectStatusLabels: Record<string, { fr: string; en: string }> = {
  new: { fr: "Nouveau", en: "New" },
  in_review: { fr: "En analyse", en: "In review" },
  quoted: { fr: "Devis envoyé", en: "Quoted" },
  accepted: { fr: "Accepté", en: "Accepted" },
  in_progress: { fr: "En cours", en: "In progress" },
  completed: { fr: "Terminé", en: "Completed" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
  lost: { fr: "Perdu", en: "Lost" },
};

export function statusLabel(status: string, locale: string = "fr"): string {
  const entry = projectStatusLabels[status];
  if (!entry) return status;
  return entry[locale === "en" ? "en" : "fr"];
}

export const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  in_review: "bg-amber-100 text-amber-800 border-amber-200",
  quoted: "bg-purple-100 text-purple-800 border-purple-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-slate-100 text-slate-800 border-slate-200",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-200",
  lost: "bg-red-100 text-red-800 border-red-200",
};
