import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { cache } from "react";
import { getStorefront } from "@/lib/storefront";
import { categoryLabel } from "@/lib/storefront";
import { StorefrontClient } from "@/components/storefront/storefront-client";
import { recordEvent, newSessionId } from "@/lib/analytics";
import { isReservedSlug } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

// The storefront is fetched once per request and shared between
// generateMetadata and the page body. Without this, the same query runs
// twice and the two results can drift apart between the two calls.
const getCachedStorefront = cache(getStorefront);

/** The cookie that identifies a returning visitor. */
const SESSION_COOKIE = "pl_session";

function readSessionCookie(raw: string | null): string | null {
  if (!raw) return null;
  const prefix = `${SESSION_COOKIE}=`;
  const part = raw
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!part) return null;
  const value = part.slice(prefix.length);
  return value ? decodeURIComponent(value) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await getCachedStorefront(slug);
    const title = `${store.business.name} — ${categoryLabel(store.business.category)} | PRICELIST`;
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

export const dynamic = "force-dynamic";

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;
  // Reserved slugs that belong to static routes. A business that was created
  // before this check existed is redirected onto the real route.
  if (isReservedSlug(slug)) {
    redirect(`/${slug}`);
  }

  let store;
  try {
    store = await getCachedStorefront(slug);
  } catch {
    notFound();
  }

  // A store view is recorded once per real visit. The session id is read
  // from a cookie so returning visitors are not counted as new ones, which
  // is what the "unique visitors" dashboard metric is supposed to measure.
  // The write happens after the response is produced, so a database failure
  // cannot alter the page the customer sees.
  const cookieHeader = (await headers()).get("cookie");
  const sessionId = readSessionCookie(cookieHeader) ?? newSessionId();
  after(() =>
    recordEvent(store.business.id, "STORE_VIEW", {
      sessionId,
      metadata: { path: `/${slug}` },
    }),
  );

  return <StorefrontClient initialData={store} sessionId={sessionId} />;
}
