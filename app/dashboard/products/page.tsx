"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Package,
  MoreHorizontal,
  Star,
  StarOff,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpDown,
  X,
  CreditCard,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/money";
import type { Category } from "@prisma/client";

interface ProductWithCategory {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  images: string | null;
  type: "PRODUCT" | "SERVICE";
  sku: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string | null;
  category: { name: string } | null;
}

type SortKey = "newest" | "name" | "priceHigh" | "priceLow";

export default function ProductsPage() {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<ProductWithCategory[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("FREE");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [limitDialog, setLimitDialog] = useState<{
    open: boolean;
    upgradeTo: string;
    price: number;
    message: string;
  }>({ open: false, upgradeTo: "", price: 0, message: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.products);
    setLimit(data.limit ?? null);
    setPlan(data.plan ?? "FREE");
    const catRes = await fetch("/api/categories");
    const catData = await catRes.json();
    setCategories(catData.categories ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "ALL") {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }
    if (availabilityFilter === "AVAILABLE") list = list.filter((p) => p.isAvailable);
    if (availabilityFilter === "UNAVAILABLE") list = list.filter((p) => !p.isAvailable);
    switch (sort) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "priceHigh":
        list.sort((a, b) => b.price - a.price);
        break;
      case "priceLow":
        list.sort((a, b) => a.price - b.price);
        break;
      default:
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [products, search, categoryFilter, availabilityFilter, sort]);

  async function toggleField(id: string, field: "isAvailable" | "isFeatured", value: boolean) {
    setProducts((all) =>
      all?.map((p) => (p.id === id ? { ...p, [field]: value } : p)) ?? null,
    );
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value, name: products?.find((p) => p.id === id)?.name, priceKobo: products?.find((p) => p.id === id)?.price, type: "PRODUCT", isAvailable: field === "isAvailable" ? value : products?.find((p) => p.id === id)?.isAvailable, isFeatured: field === "isFeatured" ? value : products?.find((p) => p.id === id)?.isFeatured }),
    });
    if (!res.ok) {
      await load();
      toast.error("Could not update", "Please try again.");
    }
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/products/${id}/duplicate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && data.code === "PLAN_LIMIT") {
      setLimitDialog({
        open: true,
        upgradeTo: data.upgradeTo,
        price: data.upgradePrice,
        message: data.error,
      });
      return;
    }
    if (!res.ok) {
      toast.error("Could not duplicate", "Please try again.");
      return;
    }
    toast.success("Product duplicated");
    await load();
  }

  async function remove(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      toast.error("Could not delete", "Please try again.");
      return;
    }
    toast.success("Product deleted");
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    await load();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const res = await fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", productIds: [...selected] }),
    });
    if (!res.ok) {
      toast.error("Could not delete products", "Please try again.");
      return;
    }
    toast.success(`${selected.size} product${selected.size === 1 ? "" : "s"} deleted`);
    setSelected(new Set());
    await load();
  }

  async function bulkSet(field: "isAvailable" | "isFeatured", value: boolean) {
    const res = await fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: field === "isAvailable" ? "availability" : "featured",
        productIds: [...selected],
        value,
      }),
    });
    if (!res.ok) {
      toast.error("Could not update", "Please try again.");
      return;
    }
    await load();
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const usedCount = products?.length ?? 0;

  return (
    <DashboardLayout userName={null}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-navy-900">
            Products
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Manage your catalog, prices and availability.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/products/new")}>
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      {/* Usage + limit */}
      <div className="mb-6 rounded-2xl border border-navy-100 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {usedCount} of {limit ?? "∞"} products used
              </p>
              <p className="text-xs text-ink-muted">
                {plan === "FREE" ? "Free plan" : `${plan} plan`}
              </p>
            </div>
          </div>
          {limit !== null && (
            <div className="w-full sm:w-56">
              <div className="h-1.5 overflow-hidden rounded-full bg-navy-100">
                <div
                  className={`h-full rounded-full ${
                    usedCount >= limit ? "bg-gold" : "bg-navy-800"
                  }`}
                  style={{ width: `${Math.min(100, (usedCount / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {limit !== null && usedCount >= limit && (
            <Button variant="gold" size="sm" onClick={() => router.push("/dashboard/billing")}>
              <CreditCard className="h-3.5 w-3.5" />
              Upgrade plan
            </Button>
          )}
        </div>
        {limit !== null && usedCount >= limit && (
          <p className="mt-3 rounded-xl bg-gold-faint/60 px-3 py-2 text-[13px] text-gold-deep">
            You've reached your {limit}-product limit on the {plan} plan. Upgrade for more products,
            sale prices and analytics.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_160px_160px_160px]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            className="pl-10"
            placeholder="Search products, SKUs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="UNCATEGORIZED">Uncategorized</option>
        </Select>
        <Select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} aria-label="Filter by availability">
          <option value="ALL">All availability</option>
          <option value="AVAILABLE">Available</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </Select>
        <div className="relative">
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort products" className="appearance-none">
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="priceHigh">Price: high to low</option>
            <option value="priceLow">Price: low to high</option>
          </Select>
          <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-navy-800 bg-navy-900 px-4 py-3 text-white animate-slide-down">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button variant="light" size="sm" onClick={() => void bulkSet("isAvailable", true)}>
            Mark available
          </Button>
          <Button variant="light" size="sm" onClick={() => void bulkSet("isAvailable", false)}>
            Mark unavailable
          </Button>
          <Button variant="light" size="sm" onClick={() => void bulkSet("isFeatured", true)}>
            Feature
          </Button>
          <Button variant="danger" size="sm" onClick={() => void bulkDelete()}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded-lg p-1.5 text-navy-300 hover:text-white"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Product grid */}
      {products === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square animate-pulse rounded-2xl bg-navy-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-navy-100" />
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-navy-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title={products.length === 0 ? "Your storefront is waiting for its first product" : "No products match"}
          description={
            products.length === 0
              ? "Add your first product and start sharing your price list."
              : "Try a different search or filter."
          }
          actionLabel={products.length === 0 ? "Add Product" : undefined}
          onAction={products.length === 0 ? () => router.push("/dashboard/products/new") : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`group relative rounded-2xl border bg-white shadow-soft transition-all duration-200 hover:shadow-lift ${
                selected.has(p.id) ? "border-navy-700 ring-2 ring-navy-700/20" : "border-navy-100"
              }`}
            >
              <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-navy-50">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-navy-200" />
                  </div>
                )}
                <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                  {p.isFeatured && (
                    <Badge tone="gold" className="shadow-sm">Featured</Badge>
                  )}
                  {p.salePrice && p.salePrice > 0 && p.salePrice < p.price && (
                    <Badge tone="danger" className="shadow-sm">Sale</Badge>
                  )}
                </div>
                <label className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/95 shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-navy-900"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                </label>
              </div>
              <div className="p-3.5">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {p.category?.name ?? "Uncategorized"}
                  {p.sku ? ` · ${p.sku}` : ""}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-navy-900">
                    {formatNaira(p.price)}
                  </span>
                  {p.salePrice && p.salePrice > 0 && p.salePrice < p.price && (
                    <span className="text-xs text-ink-muted line-through">
                      {formatNaira(p.price)}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <button
                    onClick={() => void toggleField(p.id, "isAvailable", !p.isAvailable)}
                    className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
                      p.isAvailable
                        ? "bg-[#E5F4EE] text-success hover:bg-[#D6EDE3]"
                        : "bg-[#F9E9E9] text-danger hover:bg-[#F4DCDC]"
                    }`}
                    title={p.isAvailable ? "Available — tap to hide" : "Unavailable — tap to show"}
                  >
                    {p.isAvailable ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {p.isAvailable ? "Live" : "Hidden"}
                  </button>
                  <button
                    onClick={() => void toggleField(p.id, "isFeatured", !p.isFeatured)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      p.isFeatured
                        ? "bg-gold-faint text-gold-deep"
                        : "bg-navy-50 text-ink-muted hover:bg-navy-100"
                    }`}
                    title={p.isFeatured ? "Unfeature" : "Feature"}
                    aria-label={p.isFeatured ? `Unfeature ${p.name}` : `Feature ${p.name}`}
                  >
                    {p.isFeatured ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
                  </button>
                  <ProductMenu
                    onEdit={() => router.push(`/dashboard/products/${p.id}/edit`)}
                    onDuplicate={() => void duplicate(p.id)}
                    onDelete={() => void remove(p.id)}
                    deleting={deleting === p.id}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade dialog */}
      <Dialog
        open={limitDialog.open}
        onClose={() => setLimitDialog((d) => ({ ...d, open: false }))}
        title="You've reached your plan limit"
      >
        <div className="px-6 py-6">
          <p className="text-sm text-ink-secondary">{limitDialog.message}</p>
          <div className="mt-4 rounded-2xl bg-navy-50 p-4">
            <p className="text-[13px] font-medium text-ink">
              {limitDialog.upgradeTo === "PRO" ? "Pro" : "Starter"} gives you more:
            </p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-ink-secondary">
              <li className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-gold-deep" />
                {limitDialog.upgradeTo === "PRO" ? "Unlimited products" : "Up to 50 products"}
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-gold-deep" />
                Product search & featured products
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-gold-deep" />
                Analytics & order history
              </li>
            </ul>
          </div>
          <Button
            variant="gold"
            className="mt-5 w-full"
            size="lg"
            onClick={() => {
              setLimitDialog((d) => ({ ...d, open: false }));
              router.push("/dashboard/billing");
            }}
          >
            Upgrade to {limitDialog.upgradeTo === "PRO" ? "Pro" : "Starter"} — {formatNaira(limitDialog.price)}/mo
          </Button>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}

function ProductMenu({
  onEdit,
  onDuplicate,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-ink-muted transition-colors hover:bg-navy-100"
        aria-label="Product actions"
      >
        {deleting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy-300 border-t-navy-800" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-lift animate-scale-in">
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-navy-50"
            >
              <Package className="h-3.5 w-3.5 text-ink-muted" />
              Edit product
            </button>
            <button
              onClick={() => { setOpen(false); onDuplicate(); }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-navy-50"
            >
              <Copy className="h-3.5 w-3.5 text-ink-muted" />
              Duplicate
            </button>
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-danger transition-colors hover:bg-[#F9E9E9]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
