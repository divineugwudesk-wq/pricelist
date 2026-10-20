"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Upload,
  Check,
  ArrowLeft,
  Star,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { parseNairaToKobo, formatNaira } from "@/lib/money";

interface Category {
  id: string;
  name: string;
}

interface ExistingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  categoryId: string | null;
  sku: string | null;
  type: "PRODUCT" | "SERVICE";
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  images: string[];
}

export default function ProductFormPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(params.id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [limitError, setLimitError] = useState<{
    message: string;
    upgradeTo: string;
    price: number;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    categoryId: "",
    sku: "",
    type: "PRODUCT" as "PRODUCT" | "SERVICE",
    isAvailable: true,
    isFeatured: false,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [describing, setDescribing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const catRes = await fetch("/api/categories");
    const catData = await catRes.json();
    setCategories(catData.categories ?? []);
    if (isEdit && params.id) {
      const res = await fetch(`/api/products/${params.id}`);
      if (res.status === 404) {
        router.replace("/dashboard/products");
        return;
      }
      const data = await res.json();
      const p: ExistingProduct = data.product;
      setForm({
        name: p.name,
        description: p.description ?? "",
        price: (p.price / 100).toString(),
        salePrice: p.salePrice ? (p.salePrice / 100).toString() : "",
        categoryId: p.categoryId ?? "",
        sku: p.sku ?? "",
        type: p.type,
        isAvailable: p.isAvailable,
        isFeatured: p.isFeatured,
      });
      setImageUrl(p.imageUrl);
      setImagePreview(p.imageUrl);
    }
    setLoading(false);
  }, [isEdit, params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFile(file: File) {
    const MAX = 5 * 1024 * 1024;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type", "Use PNG, JPG, WEBP or GIF.");
      return;
    }
    if (file.size > MAX) {
      toast.error("Image too large", "Maximum size is 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFile(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, data: dataUrl.split(",")[1] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Upload failed", data.error ?? "Please try another image.");
        return;
      }
      setImageUrl(data.url);
      setImagePreview(data.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function generateDescription() {
    if (!form.name.trim()) {
      toast.error("Add a product name first", "The description needs a product name.");
      return;
    }
    setDescribing(true);
    try {
      const res = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: categories.find((c) => c.id === form.categoryId)?.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.description) {
        setForm((f) => ({ ...f, description: data.description }));
        toast.success("Description ready", data.source === "ai" ? undefined : "Offline mode");
      } else {
        toast.error("Could not generate", "Please write a description manually.");
      }
    } catch {
      toast.error("Could not generate", "Please write a description manually.");
    } finally {
      setDescribing(false);
    }
  }

  async function save(goBack: boolean) {
    setSaving(true);
    setErrors({});
    setLimitError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        priceKobo: parseNairaToKobo(form.price),
        salePriceKobo: form.salePrice ? parseNairaToKobo(form.salePrice) : null,
        categoryId: form.categoryId || null,
        sku: form.sku || null,
        type: form.type,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        imageUrl: imageUrl ?? "",
      };
      const res = await fetch(
        isEdit ? `/api/products/${params.id}` : "/api/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data.code === "PLAN_LIMIT") {
          setLimitError({
            message: data.error,
            upgradeTo: data.upgradeTo,
            price: data.upgradePrice,
          });
          return;
        }
        if (data.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data.error ?? "Could not save", "Please check the form.");
        return;
      }
      toast.success(isEdit ? "Product updated" : "Product added", "It's live on your storefront.");
      if (goBack) router.push("/dashboard/products");
      else router.push("/dashboard/products");
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout userName={null}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-neutral-100" />
          <div className="h-64 rounded-xl bg-neutral-100" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userName={null}>
      <button
        onClick={() => router.push("/dashboard/products")}
        className="mb-5 flex items-center gap-1.5 text-caption font-medium text-ink-secondary transition-colors hover:text-navy-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </button>

      <div className="mb-7">
        <h1 className="font-heading text-headline font-semibold text-ink">
          {isEdit ? "Edit product" : "Add a product"}
        </h1>
        <p className="mt-1 text-caption text-ink-muted">
          {isEdit
            ? "Update the details, photo and price."
            : "Name it, price it, add a photo. It goes live on your storefront straight away."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Image */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-caption font-medium text-ink-secondary">Product image</p>
            <button
              onClick={() => fileRef.current?.click()}
              className={`mt-3 flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                imagePreview
                  ? "border-transparent"
                  : "border-neutral-300 hover:border-navy-400 hover:bg-neutral-50/50"
              }`}
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Product" className="h-full w-full object-cover" />
              ) : uploading ? (
                <>
                  <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-neutral-300 border-t-navy-800" />
                  <span className="text-body text-ink-muted">Uploading…</span>
                </>
              ) : (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50 text-navy-600">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <span className="text-body font-medium text-ink">Upload image</span>
                  <span className="text-caption text-ink-muted">PNG, JPG or WEBP · max 5 MB</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
            {imageUrl && (
              <button
                onClick={() => { setImageUrl(null); setImagePreview(null); }}
                className="mt-2 flex items-center gap-1.5 text-caption font-medium text-danger"
              >
                <X className="h-3.5 w-3.5" />
                Remove image
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Product name" htmlFor="pf-name" error={errors.name}>
                <Input
                  id="pf-name"
                  placeholder="e.g. Air Max Sneakers"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Category" htmlFor="pf-category">
                <Select
                  id="pf-category"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Type" htmlFor="pf-type">
                <Select
                  id="pf-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "PRODUCT" | "SERVICE" })}
                >
                  <option value="PRODUCT">Product</option>
                  <option value="SERVICE">Service</option>
                </Select>
              </Field>
              <Field label={`Price (₦)${form.type === "SERVICE" ? "" : ""}`} htmlFor="pf-price" error={errors.price}>
                <Input
                  id="pf-price"
                  inputMode="decimal"
                  placeholder="e.g. 25,000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Sale price (₦, optional)" htmlFor="pf-sale" error={errors.salePriceKobo}>
                <Input
                  id="pf-sale"
                  inputMode="decimal"
                  placeholder="Lower than price"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                />
              </Field>
            </div>
            {form.salePrice && parseNairaToKobo(form.salePrice) > 0 && (
              parseNairaToKobo(form.salePrice) >= parseNairaToKobo(form.price) ? (
                <p className="-mt-2 rounded-xl bg-danger-soft px-3 py-2 text-caption text-danger">
                  Sale price must be lower than the regular price.
                </p>
              ) : (
                <p className="-mt-2 rounded-xl bg-success-soft px-3 py-2 text-caption text-success">
                  Customers see <span className="font-semibold">{formatNaira(parseNairaToKobo(form.salePrice))}</span> instead of {formatNaira(parseNairaToKobo(form.price))}.
                </p>
              )
            )}

            <Field
              label="Description"
              htmlFor="pf-description"
              hint="Shown on your storefront card. One or two lines is enough."
            >
              <Textarea
                id="pf-description"
                placeholder="Describe this product in a sentence or two"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void generateDescription()}
              loading={describing}
            >
              {form.description ? "Rewrite description" : "Draft a description"}
            </Button>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="SKU (optional)" htmlFor="pf-sku">
                <Input
                  id="pf-sku"
                  placeholder="e.g. SNEAK-AIR-001"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </Field>
              <div className="flex flex-col justify-end gap-4 pb-1 sm:flex-row sm:items-center">
                <label className="flex flex-1 items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                  <span className="flex items-center gap-2 text-body text-ink">
                    <Check className="h-4 w-4 text-success" />
                    Available
                  </span>
                  <Switch
                    checked={form.isAvailable}
                    onChange={(checked) => setForm({ ...form, isAvailable: checked })}
                    label="Available"
                  />
                </label>
                <label className="flex flex-1 items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                  <span className="flex items-center gap-2 text-body text-ink">
                    <Star className="h-4 w-4 text-gold-deep" />
                    Featured
                  </span>
                  <Switch
                    checked={form.isFeatured}
                    onChange={(checked) => setForm({ ...form, isFeatured: checked })}
                    label="Featured"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
            <Button variant="ghost" onClick={() => router.push("/dashboard/products")}>
              Cancel
            </Button>
            <Button onClick={() => void save(false)} loading={saving} size="lg">
              {isEdit ? "Save changes" : "Add product"}
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Plan limit dialog */}
      {limitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-7 shadow-lift animate-scale-in">
            <h3 className="font-heading text-lg font-semibold text-ink">
              You&rsquo;ve reached your plan limit
            </h3>
            <p className="mt-2 text-body text-ink-secondary">{limitError.message}</p>
            <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-body text-ink-secondary">
              {limitError.upgradeTo === "PRO"
                ? "Pro gives you unlimited products and services, all seven store themes and your own accent colour."
                : "Starter gives you up to 50 products and services, and 25 categories."}
            </div>
            <Button
              variant="primary"
              className="mt-5 w-full"
              size="lg"
              onClick={() => router.push("/dashboard/billing")}
            >
              Upgrade to {limitError.upgradeTo === "PRO" ? "Pro" : "Starter"} — {formatNaira(limitError.price)}/mo
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => setLimitError(null)}
            >
              Keep editing
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

void Upload;
