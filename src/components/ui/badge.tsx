import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "primary" | "success" | "warning" | "destructive" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-secondary text-secondary-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-[color:var(--success)]/10 text-[color:var(--success)] border-[color:var(--success)]/20",
  warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning-foreground)] border-[color:var(--warning)]/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  muted: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
