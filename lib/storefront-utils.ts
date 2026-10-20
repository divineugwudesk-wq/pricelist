// Storefront helpers that are safe to use in the browser.
// The data-access half of the storefront lives in `lib/storefront.ts`.

const CATEGORY_LABELS: Record<string, string> = {
  FASHION: "Fashion",
  BEAUTY: "Beauty",
  FOOD: "Food",
  ELECTRONICS: "Electronics",
  RESTAURANT: "Restaurant",
  SERVICES: "Services",
  RETAIL: "Retail",
  HEALTH_WELLNESS: "Health & Wellness",
  HOME_FURNITURE: "Home & Furniture",
  AUTOMOTIVE: "Automotive",
  PROFESSIONAL_SERVICES: "Professional Services",
  OTHER: "Other",
};

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

/** Compute open/closed state using the business timezone (default Africa/Lagos). */
export function computeOpenStatus(
  hours: { day: number; isOpen: boolean; opensAt: string; closesAt: string }[],
  timezone: string,
): { isOpen: boolean; label: string } {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Africa/Lagos",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "Mon").slice(0, 3);
    const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
    const mondayFirst = dayIndex === 0 ? 6 : dayIndex - 1; // 0 = Monday
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const nowMinutes = (hour % 24) * 60 + minute;

    const today = hours.find((h) => h.day === mondayFirst);
    if (!today || !today.isOpen) return { isOpen: false, label: "Closed" };

    const [oh, om] = today.opensAt.split(":").map(Number);
    const [ch, cm] = today.closesAt.split(":").map(Number);
    const openM = oh * 60 + om;
    const closeM = ch * 60 + cm;
    const isOpen = nowMinutes >= openM && nowMinutes < closeM;
    return {
      isOpen,
      label: isOpen
        ? `Open · closes ${today.closesAt}`
        : `Closed · opens ${today.opensAt}`,
    };
  } catch {
    return { isOpen: true, label: "Open" };
  }
}
