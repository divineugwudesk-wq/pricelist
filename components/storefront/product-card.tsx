"use client";

// Product card — clean, premium, conversion-focused.
import Image from "next/image";
import { Plus, Check } from "lucide-react";
import { formatNaira } from "@/lib/money";
import type { StorefrontData } from "@/lib/storefront";
import { useState } from "react";

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceKobo: number;
  salePriceKobo: number | null;
  imageUrl: string | null;
  type: "PRODUCT" | "SERVICE";
  isFeatured: boolean;
  categoryId: string | null;
}

export function ProductCard({
  product,
  store,
  onAdd,
  onView,
}: {
  product: StoreProduct;
  store: StorefrontData;
  onAdd: () => void;
  onView: () => void;
}) {
  const [added, setAdded] = useState(false);
  const t = store.theme.tokens;
  const editorial = store.theme.layout === "editorial";
  const hasSale =
    product.salePriceKobo !== null &&
    product.salePriceKobo > 0 &&
    product.salePriceKobo < product.priceKobo;

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
      style={{
        borderColor: t.border,
        background: t.surface,
        boxShadow: `0 1px 2px ${t.shadow}`,
      }}
    >
      <button
        onClick={onView}
        className="relative block aspect-square w-full overflow-hidden text-left"
        style={{ background: t.surfaceAlt }}
        aria-label={`View ${product.name}`}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-full items-center justify-center font-heading text-3xl"
            style={{ color: t.muted }}
          >
            {product.type === "SERVICE" ? "✦" : "◆"}
          </span>
        )}
        {hasSale && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: "#C94B4B", color: "#fff" }}
          >
            Sale
          </span>
        )}
        {product.isFeatured && !hasSale && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: t.accent, color: t.onAccent }}
          >
            Featured
          </span>
        )}
        <span
          className="absolute right-2.5 top-2.5 rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ background: `${t.primary}1A`, color: t.primary }}
        >
          {product.type === "SERVICE" ? "Service" : "Product"}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button onClick={onView} className="text-left">
          <h3
            className={`text-[15px] font-semibold leading-snug ${
              editorial ? "font-serif" : "font-heading"
            }`}
            style={{ color: t.text }}
          >
            {product.name}
          </h3>
        </button>
        {product.description && (
          <p
            className="mt-1 line-clamp-2 text-[13px] leading-relaxed"
            style={{ color: t.textSecondary }}
          >
            {product.description}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span
              className="font-heading text-[17px] font-bold"
              style={{ color: hasSale ? "#C94B4B" : t.text }}
            >
              {formatNaira(hasSale ? product.salePriceKobo! : product.priceKobo)}
            </span>
            {hasSale && (
              <span
                className="text-xs line-through"
                style={{ color: t.muted }}
              >
                {formatNaira(product.priceKobo)}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              onAdd();
              setAdded(true);
              window.setTimeout(() => setAdded(false), 1200);
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95`}
            style={{
              background: added ? "#16845B" : t.primary,
              color: t.onPrimary,
            }}
            aria-label={`Add ${product.name} to order`}
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
