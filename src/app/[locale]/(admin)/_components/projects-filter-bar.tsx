"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { ProjectStatusValue } from "@/lib/admin/projects";
import { statusLabel } from "@/lib/format";

type Option = { value: string; label: string };

type Props = {
  locale: string;
  currentStatus: ProjectStatusValue | "all";
  currentSearch: string;
  currentType: string;
  currentUrgency: string;
  currentDateFrom: string;
  currentDateTo: string;
  currentSort: string;
  statuses: readonly ProjectStatusValue[];
  projectTypes: Option[];
  urgencies: Option[];
  sorts: Option[];
  labels: {
    all: string;
    allTypes: string;
    allUrgencies: string;
    search: string;
    from: string;
    to: string;
    sort: string;
    reset: string;
  };
};

export default function ProjectsFilterBar({
  locale,
  currentStatus,
  currentSearch,
  currentType,
  currentUrgency,
  currentDateFrom,
  currentDateTo,
  currentSort,
  statuses,
  projectTypes,
  urgencies,
  sorts,
  labels,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function update(
    next: Partial<{
      status: string;
      search: string;
      type: string;
      urgency: string;
      from: string;
      to: string;
      sort: string;
    }>,
  ) {
    const status = next.status ?? currentStatus;
    const search = next.search ?? currentSearch;
    const type = next.type ?? currentType;
    const urgency = next.urgency ?? currentUrgency;
    const from = next.from ?? currentDateFrom;
    const to = next.to ?? currentDateTo;
    const sort = next.sort ?? currentSort;

    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (search) params.set("q", search);
    if (type) params.set("type", type);
    if (urgency) params.set("urgency", urgency);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (sort && sort !== "created_desc") params.set("sort", sort);

    const qs = params.toString();
    startTransition(() => {
      router.replace((qs ? `${pathname}?${qs}` : pathname) as never);
    });
  }

  function reset() {
    startTransition(() => {
      router.replace(pathname as never);
    });
  }

  const selectCls =
    "px-3 py-2 rounded-md border border-input bg-background text-sm";

  return (
    <div className="space-y-3">
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
          className={selectCls}
        >
          <option value="all">{labels.all}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, locale)}
            </option>
          ))}
        </select>
        <select
          value={currentSort}
          onChange={(e) => update({ sort: e.target.value })}
          className={selectCls}
          aria-label={labels.sort}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
        <select
          value={currentType}
          onChange={(e) => update({ type: e.target.value })}
          className={selectCls}
        >
          <option value="">{labels.allTypes}</option>
          {projectTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={currentUrgency}
          onChange={(e) => update({ urgency: e.target.value })}
          className={selectCls}
        >
          <option value="">{labels.allUrgencies}</option>
          {urgencies.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {labels.from}
          <input
            type="date"
            value={currentDateFrom}
            onChange={(e) => update({ from: e.target.value })}
            className={selectCls}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {labels.to}
          <input
            type="date"
            value={currentDateTo}
            onChange={(e) => update({ to: e.target.value })}
            className={selectCls}
          />
        </label>
        <button
          type="button"
          onClick={reset}
          className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent"
        >
          {labels.reset}
        </button>
        {isPending && (
          <span className="text-xs text-muted-foreground self-center">…</span>
        )}
      </div>
    </div>
  );
}
