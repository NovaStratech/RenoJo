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
  new: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  in_review: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  quoted: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300",
  accepted: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  in_progress: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
  completed: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
  cancelled: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30 dark:text-zinc-300",
  lost: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300",
};
