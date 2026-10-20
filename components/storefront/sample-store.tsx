"use client";

// A working sample of a PRICELIST storefront, built from the real storefront
// components and the real theme tokens. It is labelled as a sample wherever
// it appears so it is never mistaken for a live store.

import { useMemo, useState } from "react";
import { Search, ShoppingBag, MessageCircle } from "lucide-react";
import { ProductCard, type StoreProduct } from "./product-card";
import { getTheme } from "@/lib/themes";
import { formatNaira } from "@/lib/money";
import {
  imagesJpg,
  shoppingWebp,
  shopping2Webp,
  shopping1Webp,
} from "@/lib/sample-images";

const SAMPLE_PRODUCTS: StoreProduct[] = [
  {
    id: "sample-1",
    name: "Air Max Sneakers",
    slug: "air-max-sneakers",
    description: "White and navy. Genuine leather, sizes 36–46.",
    priceKobo: 4_500_000,
    salePriceKobo: 3_850_000,
    imageUrl: shoppingWebp,
    type: "PRODUCT",
    isFeatured: true,
    categoryId: "sneakers",
  },
  {
    id: "sample-2",
    name: "Classic White Sneakers",
    slug: "classic-white-sneakers",
    description: "Minimal white sneakers with a durable rubber sole.",
    priceKobo: 2_850_000,
    salePriceKobo: null,
    imageUrl: shopping2Webp,
    type: "PRODUCT",
    isFeatured: true,
    categoryId: "sneakers",
  },
  {
    id: "sample-3",
    name: "Premium Slides",
    slug: "premium-slides",
    description: "Soft-bed slides in black, sizes 38–45.",
    priceKobo: 1_800_000,
    salePriceKobo: 1_400_000,
    imageUrl: shopping1Webp,
    type: "PRODUCT",
    isFeatured: false,
    categoryId: "sneakers",
  },
  {
    id: "sample-4",
    name: "Streetwear Hoodie",
    slug: "streetwear-hoodie",
    description: "Heavyweight 450gsm, relaxed fit. Charcoal or olive.",
    priceKobo: 3_200_000,
    salePriceKobo: null,
    imageUrl: imagesJpg,
    type: "PRODUCT",
    isFeatured: true,
    categoryId: "streetwear",
  },
];

export function StorefrontSample({ className }: { className?: string }) {
  const theme = getTheme("classic");
  const t = theme.tokens;
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { count, total } = useMemo(() => {
    let items = 0;
    let sum = 0;
    for (const p of SAMPLE_PRODUCTS) {
      const qty = quantities[p.id] ?? 0;
      if (qty === 0) continue;
      items += qty;
      sum += (p.salePriceKobo ?? p.priceKobo) * qty;
    }
    return { count: items, total: sum };
  }, [quantities]);

  return (
    <div
      className={`overflow-hidden rounded-xl border ${className ?? ""}`}
      style={{ borderColor: t.border, background: t.bg }}
    >
      {/* Store header */}
      <div
        className="flex items-center gap-3 border-b px-4 py-3.5"
        style={{ borderColor: t.border }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-heading text-body font-bold"
          style={{ background: t.primary, color: t.onPrimary }}
          aria-hidden="true"
        >
          CK
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-title font-bold" style={{ color: t.text }}>
            Chuks Kicks
          </p>
          <p className="truncate text-micro" style={{ color: t.textSecondary }}>
            Sneakers &amp; Streetwear · Lagos
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-micro font-medium"
          style={{ color: "#167A55" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#167A55" }} />
          Open
        </span>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-caption"
          style={{ background: t.surfaceAlt, color: t.textSecondary }}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Search sneakers, boots…
        </div>
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {SAMPLE_PRODUCTS.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            store={{ theme }}
            onAdd={() =>
              setQuantities((q) => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))
            }
            onView={() => undefined}
          />
        ))}
      </div>

      {/* Order bar */}
      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-3"
        style={{ borderColor: t.border, background: t.surface }}
      >
        <span className="text-caption" style={{ color: t.textSecondary }}>
          {count === 0 ? (
            "No items yet"
          ) : (
            <>
              {count} item{count === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold" style={{ color: t.text }}>
                {formatNaira(total)}
              </span>
            </>
          )}
        </span>
        <span
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium"
          style={{ background: "#075E54", color: "#fff" }}
        >
          {count > 0 ? (
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Order on WhatsApp
        </span>
      </div>
    </div>
  );
}
