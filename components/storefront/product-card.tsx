"use client";

// Product card — the customer-facing unit of the catalogue.
import Image from "next/image";
import { Plus, Check, Tag } from "lucide-react";
import { formatNaira } from "@/lib/money";
import type { Theme } from "@/lib/themes";
import { useState } from "react";

/** Two-letter monogram used when a product has no photo yet. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "•";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

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
  /** Only the theme is needed to render a card. */
  store: { theme: Theme };
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
      className="group flex flex-col overflow-hidden rounded-xl border"
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
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-full items-center justify-center font-heading text-xl font-semibold tracking-wide"
            style={{ color: t.muted }}
            aria-hidden="true"
          >
            {product.type === "SERVICE" ? (
              <Tag className="h-7 w-7" />
            ) : (
              initialsOf(product.name)
            )}
          </span>
        )}
        {hasSale && (
          <span
            className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-micro font-semibold"
            style={{ background: "#B23B3B", color: "#fff" }}
          >
            Sale
          </span>
        )}
        {product.isFeatured && !hasSale && (
          <span
            className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-micro font-semibold"
            style={{ background: t.accent, color: t.onAccent }}
          >
            Featured
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-3.5">
        <button onClick={onView} className="text-left">
          <h3
            className={`line-clamp-2 break-words text-title font-semibold leading-snug ${
              editorial ? "font-serif" : "font-heading"
            }`}
            style={{ color: t.text }}
          >
            {product.name}
          </h3>
        </button>
        {product.description && (
          <p
            className="mt-1 line-clamp-2 break-words text-caption leading-relaxed"
            style={{ color: t.textSecondary }}
          >
            {product.description}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span
              className="font-heading text-lead font-semibold"
              style={{ color: hasSale ? "#B23B3B" : t.text }}
            >
              {formatNaira(hasSale ? product.salePriceKobo! : product.priceKobo)}
            </span>
            {hasSale && (
              <span className="text-caption line-through" style={{ color: t.muted }}>
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors"
            style={{
              background: added ? "#167A55" : t.primary,
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
