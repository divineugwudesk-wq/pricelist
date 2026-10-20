// Storefront read model — public, unauthenticated data assembly.
import { prisma } from "@/lib/db";
import { getTheme } from "@/lib/themes";
import { NotFoundError } from "@/lib/server-auth";
import { categoryLabel, computeOpenStatus } from "@/lib/storefront-utils";

export { categoryLabel, computeOpenStatus } from "@/lib/storefront-utils";

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
