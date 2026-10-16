import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getStorefront } from "@/lib/storefront";
import { categoryLabel } from "@/lib/storefront";
import { StorefrontClient } from "@/components/storefront/storefront-client";
import { recordEvent, newSessionId } from "@/lib/analytics";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await getStorefront(slug);
    const title = `${store.business.name} â€” ${categoryLabel(store.business.category)} | PRICELIST`;
    return {
      title,
      description:
        store.business.description ??
        `Browse ${store.business.name}'s products and prices. Order directly via WhatsApp.`,
      openGraph: {
        title,
        description:
          store.business.description ??
          `Browse ${store.business.name}'s products and prices. Order directly via WhatsApp.`,
        type: "website",
        images: store.business.logoUrl ? [store.business.logoUrl] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: store.business.description ?? undefined,
      },
      alternates: {
        canonical: `${process.env.APP_URL ?? "http://localhost:3000"}/${slug}`,
      },
    };
  } catch {
    return { title: "Store not found | PRICELIST" };
  }
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;
  // Reserved slugs that belong to static routes.
  const reserved = [
    "login", "register", "forgot-password", "reset-password", "onboarding",
    "dashboard", "admin", "api", "uploads", "pricing", "how-it-works",
  ];
  if (reserved.includes(slug.toLowerCase())) {
    redirect(`/${slug}`);
  }

  let store;
  try {
    store = await getStorefront(slug);
  } catch {
    notFound();
  }

  // Record a store view server-side (accurate even without JS).
  await recordEvent(store.business.id, "STORE_VIEW", {
    sessionId: newSessionId(),
    metadata: { path: `/${slug}` },
  });

  return <StorefrontClient initialData={store} />;
}
