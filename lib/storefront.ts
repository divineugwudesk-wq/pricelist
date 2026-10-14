// Storefront read model — public, unauthenticated data assembly.
import { prisma } from "@/lib/db";
import { getTheme } from "@/lib/themes";
import { NotFoundError } from "@/lib/server-auth";

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceKobo: number;
  salePriceKobo: number | null;
  imageUrl: string | null;
  type: "PRODUCT" | "SERVICE";
  isAvailable: boolean;
  isFeatured: boolean;
  categoryId: string | null;
}

export interface StorefrontCategory {
  id: string;
  name: string;
}

export interface StorefrontData {
  business: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    logoUrl: string | null;
    whatsappNumber: string | null;
    phone: string | null;
    address: string | null;
    timezone: string;
    theme: string;
    accentColor: string | null;
    showBranding: boolean;
    heroImageUrl: string | null;
    instagram: string | null;
    tiktok: string | null;
    facebook: string | null;
    x: string | null;
    website: string | null;
  };
  hours: { day: number; isOpen: boolean; opensAt: string; closesAt: string }[];
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
  theme: ReturnType<typeof getTheme>;
  storeUrl: string;
  isOpen: boolean;
  openLabel: string;
}

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

export async function getStorefront(slug: string): Promise<StorefrontData> {
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      hours: { orderBy: { day: "asc" } },
      categories: { orderBy: { sortOrder: "asc" } },
      products: {
        where: { isAvailable: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!business || business.suspended) {
    throw new NotFoundError("Storefront not found.");
  }

  const status = computeOpenStatus(business.hours, business.timezone);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      description: business.description,
      category: categoryLabel(business.category),
      logoUrl: business.logoUrl,
      whatsappNumber: business.whatsappNumber,
      phone: business.phone,
      address: business.address,
      timezone: business.timezone,
      theme: business.theme,
      accentColor: business.accentColor,
      showBranding: business.showBranding,
      heroImageUrl: business.heroImageUrl,
      instagram: business.instagram,
      tiktok: business.tiktok,
      facebook: business.facebook,
      x: business.x,
      website: business.website,
    },
    hours: business.hours,
    categories: business.categories.map((c) => ({ id: c.id, name: c.name })),
    products: business.products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceKobo: p.price,
      salePriceKobo: p.salePrice,
      imageUrl: p.imageUrl,
      type: p.type as "PRODUCT" | "SERVICE",
      isAvailable: p.isAvailable,
      isFeatured: p.isFeatured,
      categoryId: p.categoryId,
    })),
    theme: getTheme(business.theme),
    storeUrl: `${appUrl}/${slug}`,
    isOpen: status.isOpen,
    openLabel: status.label,
  };
}
