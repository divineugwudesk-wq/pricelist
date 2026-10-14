import { cn } from "@/lib/utils";

/** PRICELIST wordmark — navy letterspaced caps with a gold tick. */
export function Logo({
  className,
  light,
  size = "md",
}: {
  className?: string;
  light?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-[15px] gap-[3px]",
    md: "text-lg gap-1",
    lg: "text-2xl gap-1.5",
  };
  const dotSizes = { sm: "h-1.5 w-1.5", md: "h-2 w-2", lg: "h-2.5 w-2.5" };
  return (
    <span
      className={cn(
        "inline-flex items-center font-heading font-semibold tracking-[0.18em]",
        light ? "text-white" : "text-navy-900",
        sizes[size],
        className,
      )}
    >
      PRICE
      <span className={cn("rounded-[2px] bg-gold", dotSizes[size])} />
      LIST
    </span>
  );
}
