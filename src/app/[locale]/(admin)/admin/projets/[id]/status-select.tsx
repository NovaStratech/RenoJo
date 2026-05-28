"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "../actions";
import { statusLabel } from "@/lib/format";

export default function StatusSelect({
  locale,
  projectId,
  currentStatus,
  statuses,
}: {
  locale: string;
  projectId: string;
  currentStatus: string;
  statuses: readonly string[];
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentStatus}
        disabled={isPending}
        onChange={(e) => {
          const value = e.target.value;
          startTransition(async () => {
            await updateProjectStatus(locale, projectId, value);
          });
        }}
        className="px-2 py-1 text-sm rounded-md border border-input bg-background"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s, locale)}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-muted-foreground">…</span>}
    </div>
  );
}
