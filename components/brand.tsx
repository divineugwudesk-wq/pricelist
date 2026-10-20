import { cn } from "@/lib/utils";

/**
 * PRICELIST wordmark — letterspaced caps with a gold square as the mark.
 * The mark is the only place gold appears in the chrome.
 */
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
    sm: "text-[15px] gap-[3px] tracking-[0.16em]",
    md: "text-lg gap-1 tracking-[0.16em]",
    lg: "text-2xl gap-1.5 tracking-[0.14em]",
  };
  const markSizes = { sm: "h-[5px] w-[5px]", md: "h-1.5 w-1.5", lg: "h-2 w-2" };
  return (
    <span
      className={cn(
        "inline-flex items-center font-heading font-semibold",
        light ? "text-white" : "text-navy-900",
        sizes[size],
        className,
      )}
    >
      PRICE
      <span className={cn("rounded-[1px] bg-gold", markSizes[size])} aria-hidden="true" />
      LIST
    </span>
  );
}
