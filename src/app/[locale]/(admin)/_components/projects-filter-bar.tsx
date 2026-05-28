"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { ProjectStatusValue } from "@/lib/admin/projects";
import { statusLabel } from "@/lib/format";

type Props = {
  locale: string;
  currentStatus: ProjectStatusValue | "all";
  currentSearch: string;
  statuses: readonly ProjectStatusValue[];
  labels: { all: string; search: string; status: string };
};

export default function ProjectsFilterBar({
  locale,
  currentStatus,
  currentSearch,
  statuses,
  labels,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function update(next: { status?: string; search?: string }) {
    const params = new URLSearchParams();
    const status = next.status ?? currentStatus;
    const search = next.search ?? currentSearch;
    if (status && status !== "all") params.set("status", status);
    if (search) params.set("q", search);
    const qs = params.toString();
    startTransition(() => {
      router.replace((qs ? `${pathname}?${qs}` : pathname) as never);
    });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <input
        type="search"
        defaultValue={currentSearch}
        placeholder={labels.search}
        onChange={(e) => update({ search: e.target.value })}
        className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
      />
      <select
        value={currentStatus}
        onChange={(e) => update({ status: e.target.value })}
        className="px-3 py-2 rounded-md border border-input bg-background text-sm"
      >
        <option value="all">{labels.all}</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s, locale)}
          </option>
        ))}
      </select>
      {isPending && (
        <span className="text-xs text-muted-foreground self-center">…</span>
      )}
    </div>
  );
}
