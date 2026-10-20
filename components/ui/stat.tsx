import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single measured value. Deliberately flat — no hover lift, no icon tile.
 * Used where a number matters, not to fill a grid.
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-4", className)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />}
        <p className="text-caption text-ink-muted">{label}</p>
      </div>
      <p className="mt-1.5 font-heading text-headline font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-caption text-ink-muted">{sub}</p>}
    </div>
  );
}
