"use client";

// Public storefront — the customer-facing experience.
// Themed entirely through CSS variables from the theme config.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StorefrontData } from "@/lib/storefront";
import { CartProvider, useCart } from "./cart-context";
import { StorefrontHeader } from "./storefront-header";
import { ProductCard, type StoreProduct } from "./product-card";
import { CartDrawer, CheckoutModal } from "./cart-drawer";
import {
  CategoryChip,
  SocialLink,
  StickyOrderBar,
  SearchOverlay,
  ShareDialog,
  QrDialog,
  ProductViewModal,
} from "./overlays";
import { recordEvent } from "@/lib/analytics";
import { generateQrDataUrl } from "@/lib/qr";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";

export function StorefrontClient({
  initialData,
}: {
  initialData: StorefrontData;
}) {
  return (
    <CartProviderWithProducts store={initialData}>
      <StorefrontInner store={initialData} />
    </CartProviderWithProducts>
  );
}

function CartProviderWithProducts({
  store,
  children,
}: {
  store: StorefrontData;
  children: React.ReactNode;
}) {
  const products = useMemo(
    () =>
      store.products.map((p) => ({
        productId: p.id,
        name: p.name,
        priceKobo: p.priceKobo,
        salePriceKobo: p.salePriceKobo,
        quantity: 0,
        imageUrl: p.imageUrl,
      })),
    [store.products],
  );
  return (
    <CartProvider products={products} storageKey={`cart-${store.business.slug}`}>
      {children}
    </CartProvider>
  );
}

function StorefrontInner({ store }: { store: StorefrontData }) {
  const t = store.theme.tokens;
  const cart = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [viewProduct, setViewProduct] = useState<StoreProduct | null>(null);
  const [copied, setCopied] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const products: StoreProduct[] = store.products;
  const storeUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${store.business.slug}`;

  // Load QR lazily when the QR dialog opens.
  useEffect(() => {
    if (qrOpen && !qrData) {
      void generateQrDataUrl(storeUrl, 480).then(setQrData);
    }
  }, [qrOpen, qrData, storeUrl]);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryFilter !== "ALL") {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }
    if (featuredOnly) {
      list = list.filter((p) => p.isFeatured);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, categoryFilter, featuredOnly, query]);

  const grouped = useMemo(() => {
    if (categoryFilter !== "ALL" || query.trim() || featuredOnly) return null;
    const withCat = new Map<string, StoreProduct[]>();
    const without: StoreProduct[] = [];
    for (const p of products) {
      if (!p.categoryId) {
        without.push(p);
        continue;
      }
      const arr = withCat.get(p.categoryId) ?? [];
      arr.push(p);
      withCat.set(p.categoryId, arr);
    }
    return { withCat, without };
  }, [products, categoryFilter, query, featuredOnly]);

  const handleProductView = useCallback(
    (product: StoreProduct) => {
      setViewProduct(product);
      void recordEvent(store.business.id, "PRODUCT_VIEW", {
        productId: product.id,
        sessionId: getSessionId(),
      });
    },
    [store.business.id],
  );

  const handleOrderPlaced = useCallback((url: string) => {
    setWhatsappUrl(url);
    setOrderPlaced(true);
    window.open(url, "_blank", "noreferrer");
    window.setTimeout(() => setOrderPlaced(false), 6000);
  }, []);

  const vars = {
    "--pl-bg": t.bg,
    "--pl-surface": t.surface,
    "--pl-surface-alt": t.surfaceAlt,
    "--pl-border": t.border,
    "--pl-text": t.text,
    "--pl-text-secondary": t.textSecondary,
    "--pl-muted": t.muted,
    "--pl-primary": t.primary,
    "--pl-primary-hover": t.primaryHover,
    "--pl-on-primary": t.onPrimary,
    "--pl-accent": store.business.accentColor || t.accent,
    "--pl-on-accent": t.onAccent,
  } as React.CSSProperties;

  const fontClass =
    store.theme.fonts.heading === "serif" ? "font-serif" : "font-heading";

  return (
    <div className="min-h-screen" style={{ ...vars, background: t.bg, color: t.text }}>
      <StorefrontHeader
        store={store}
        onSearch={() => setSearchOpen(true)}
        onCart={() => setCartOpen(true)}
        onShare={() => setShareOpen(true)}
        cartCount={cart.count}
      />

      {/* Hero / business intro */}
      <section className="relative">
        {store.business.heroImageUrl && (
          <div className="relative h-44 overflow-hidden sm:h-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store.business.heroImageUrl}
              alt={`${store.business.name} banner`}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-7 sm:px-6">
          <h2 className={`text-[26px] font-bold leading-tight sm:text-[32px] ${fontClass}`}>
            {store.business.name}
          </h2>
          {store.business.description && (
            <p
              className="mt-2 max-w-2xl text-[15px] leading-relaxed"
              style={{ color: t.textSecondary }}
            >
              {store.business.description}
            </p>
          )}
          <div
            className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]"
            style={{ color: t.textSecondary }}
          >
            <span
              className="flex items-center gap-1.5 font-medium"
              style={{ color: store.isOpen ? "#16845B" : "#C94B4B" }}
            >
              <span
                className={`h-2 w-2 rounded-full ${store.isOpen ? "animate-pulse" : ""}`}
                style={{ background: store.isOpen ? "#16845B" : "#C94B4B" }}
              />
              {store.openLabel}
            </span>
            {store.business.address && <span>{store.business.address}</span>}
            {store.business.phone && <span>{store.business.phone}</span>}
          </div>

          <div className="mt-4 flex items-center gap-2">
            {store.business.instagram && (
              <SocialLink href={store.business.instagram} label="Instagram" icon={<InstagramIcon />} />
            )}
            {store.business.facebook && (
              <SocialLink href={store.business.facebook} label="Facebook" icon={<FacebookIcon />} />
            )}
            {store.business.tiktok && (
              <SocialLink href={store.business.tiktok} label="TikTok" icon={<TikTokIcon />} />
            )}
            {store.business.website && (
              <SocialLink href={store.business.website} label="Website" icon={<WebsiteIcon />} />
            )}
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <nav
        className="sticky top-[64px] z-20 border-b backdrop-blur"
        style={{
          background: `color-mix(in srgb, ${t.bg} 90%, transparent)`,
          borderColor: t.border,
        }}
        aria-label="Product categories"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          <CategoryChip
            label="All"
            active={categoryFilter === "ALL" && !query.trim()}
            onClick={() => {
              setCategoryFilter("ALL");
              setQuery("");
              setFeaturedOnly(false);
            }}
          />
          {store.categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              active={categoryFilter === c.id}
              onClick={() => {
                setCategoryFilter(c.id);
                setQuery("");
                setFeaturedOnly(false);
              }}
            />
          ))}
          {products.some((p) => p.isFeatured) && (
            <CategoryChip
              label="Featured"
              active={featuredOnly}
              onClick={() => {
                setFeaturedOnly(!featuredOnly);
                setCategoryFilter("ALL");
                setQuery("");
              }}
            />
          )}
          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium"
            style={{ background: t.surfaceAlt, color: t.textSecondary }}
            aria-label="Search products"
          >
            <SearchIcon />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </nav>

      {/* Products */}
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className={`text-lg font-semibold ${fontClass}`}>
              {query.trim() ? "No matches found" : "Nothing here yet"}
            </p>
            <p className="mt-1.5 text-sm" style={{ color: t.textSecondary }}>
              {query.trim()
                ? `We couldn't find anything for "${query}". Try another search.`
                : "This business hasn't added products yet."}
            </p>
          </div>
        ) : grouped ? (
          <div className="space-y-10">
            {[...grouped.withCat.entries()].map(([categoryId, items]) => {
              const category = store.categories.find((c) => c.id === categoryId);
              return (
                <section key={categoryId}>
                  <h3 className={`mb-4 text-xl font-bold ${fontClass}`} style={{ color: t.text }}>
                    {category?.name ?? "Products"}
                  </h3>
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        store={store}
                        onAdd={() => cart.add(p.id)}
                        onView={() => handleProductView(p)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            {grouped.without.length > 0 && (
              <section>
                <h3 className={`mb-4 text-xl font-bold ${fontClass}`} style={{ color: t.text }}>
                  Products
                </h3>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
                  {grouped.without.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      store={store}
                      onAdd={() => cart.add(p.id)}
                      onView={() => handleProductView(p)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                store={store}
                onAdd={() => cart.add(p.id)}
                onView={() => handleProductView(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: t.border, background: t.surface }}>
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-[13px] font-semibold" style={{ color: t.text }}>
            {store.business.name}
          </p>
          <p className="mt-1 text-xs" style={{ color: t.muted }}>
            {store.business.category}
            {store.business.address ? ` · ${store.business.address}` : ""}
          </p>
          {store.business.whatsappNumber && (
            <a
              href={buildWhatsAppShareUrl(storeUrl, store.business.name)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03]"
              style={{ background: "#075E54" }}
            >
              <ChatIcon />
              Chat with {store.business.name}
            </a>
          )}
          {store.business.showBranding && (
            <p className="mt-6 text-xs" style={{ color: t.muted }}>
              Powered by{" "}
              <a
                href="/"
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: t.primary }}
              >
                PRICELIST
              </a>{" "}
              — one link, all your prices
            </p>
          )}
        </div>
      </footer>

      {/* Sticky mobile order bar */}
      <StickyOrderBar store={store} onOpenCart={() => setCartOpen(true)} />

      {/* Overlays */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        store={store}
        products={products}
        onOrderPlaced={handleOrderPlaced}
      />
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        query={query}
        setQuery={setQuery}
        results={filtered}
        onView={handleProductView}
        store={store}
        onAdd={(id) => cart.add(id)}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        storeUrl={storeUrl}
        businessName={store.business.name}
        copied={copied}
        setCopied={setCopied}
        onOpenQr={() => {
          setShareOpen(false);
          setQrOpen(true);
        }}
      />
      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} qrData={qrData} storeUrl={storeUrl} />
      <ProductViewModal
        product={viewProduct}
        store={store}
        onClose={() => setViewProduct(null)}
        onAdd={() => undefined}
      />

      {/* Order placed confirmation */}
      {orderPlaced && whatsappUrl && (
        <div
          className="fixed inset-x-4 top-4 z-[80] mx-auto max-w-md rounded-2xl p-4 shadow-lift animate-slide-down"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
          role="status"
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#E5F4EE", color: "#16845B" }}
            >
              <CheckIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: t.text }}>
                Order ready
              </p>
              <p className="mt-0.5 text-[13px]" style={{ color: t.textSecondary }}>
                WhatsApp should have opened with your order. If not,{" "}
                <a href={whatsappUrl} className="font-semibold underline" style={{ color: t.primary }}>
                  open WhatsApp
                </a>
                .
              </p>
            </div>
            <button
              onClick={() => setOrderPlaced(false)}
              className="rounded-lg p-1"
              style={{ color: t.muted }}
              aria-label="Dismiss"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("pl_session");
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem("pl_session", id);
  }
  return id;
}

/* Small icon wrappers to keep imports tidy. */
import {
  Search,
  X,
  Check,
  Instagram,
  Facebook,
  Music2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

function SearchIcon() {
  return <Search className="h-4 w-4" />;
}
function CloseIcon() {
  return <X className="h-4 w-4" />;
}
function CheckIcon() {
  return <Check className="h-5 w-5" />;
}
function InstagramIcon() {
  return <Instagram className="h-4 w-4" />;
}
function FacebookIcon() {
  return <Facebook className="h-4 w-4" />;
}
function TikTokIcon() {
  return <Music2 className="h-4 w-4" />;
}
function WebsiteIcon() {
  return <ExternalLink className="h-4 w-4" />;
}
function ChatIcon() {
  return <MessageCircle className="h-4 w-4" />;
}
