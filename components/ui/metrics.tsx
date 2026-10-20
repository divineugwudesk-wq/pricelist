import { cn } from "@/lib/utils";

/**
 * A row of related numbers inside one bordered surface.
 *
 * Numbers that belong together are shown together — a grid of separate
 * cards gives every figure the same weight it does not deserve.
 */
export function Metrics({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; sub?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-x divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white shadow-soft sm:grid-cols-4 sm:divide-y-0",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <p className="text-caption text-ink-muted">{item.label}</p>
          <p className="mt-1 font-heading text-headline font-semibold leading-none text-ink">
            {item.value}
          </p>
          {item.sub ? <p className="mt-1.5 text-xs text-ink-muted">{item.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}
