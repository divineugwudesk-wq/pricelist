"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  Wand2,
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Rocket,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { businessCategoryOptions } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ["Business", "Branding", "Products", "Launch"];

interface BusinessForm {
  name: string;
  category: string;
  description: string;
  whatsappNumber: string;
  phone: string;
  address: string;
}

interface LogoChoice {
  mode: "none" | "upload" | "generate";
  url: string | null;
  dataUrl: string | null;
  generating: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(0);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessForm>({
    name: "",
    category: "OTHER",
    description: "",
    whatsappNumber: "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Branding
  const [logo, setLogo] = useState<LogoChoice>({ mode: "none", url: null, dataUrl: null, generating: false });
  const [logoForm, setLogoForm] = useState({ style: "modern" as string, color: "#071A33" });
  const [logoConcepts, setLogoConcepts] = useState<string[]>([]);
  const [theme, setTheme] = useState("classic");

  // Products
  const [products, setProducts] = useState<
    { name: string; price: string; description: string; available: boolean }[]
  >([{ name: "", price: "", description: "", available: true }]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canContinue =
    step === 0
      ? business.name.trim().length >= 2
      : true;

  async function saveBusiness() {
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          router.push("/dashboard");
          return;
        }
        setErrors(data.fieldErrors ?? {});
        toast.error(data.error ?? "Could not save", data.message);
        return;
      }
      setBusinessId(data.business.id);
      setStoreSlug(data.business.slug);
      setStep(1);
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveBranding() {
    if (!businessId) return;
    setSaving(true);
    try {
      let logoUrl: string | null = logo.url;
      if (logo.mode === "generate" && logo.dataUrl && !logo.url) {
        logoUrl = await uploadDataUrl(logo.dataUrl, "logo.svg");
      }
      if (logoUrl) {
        await fetch(`/api/businesses/${businessId}/logo`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl }),
        });
      }
      await fetch(`/api/businesses/${businessId}/customize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      setStep(2);
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function finishProducts(skip: boolean) {
    if (!businessId) return;
    setSaving(true);
    try {
      if (!skip) {
        let created = 0;
        for (const p of products) {
          if (!p.name.trim()) continue;
          const priceKobo = Math.round(parseFloat(p.price.replace(/[^\d.]/g, "") || "0") * 100);
          if (!priceKeboValid(p.price)) continue;
          const res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name,
              description: p.description || null,
              priceKobo,
              type: "PRODUCT",
              isAvailable: p.available,
              isFeatured: created === 0,
            }),
          });
          if (res.ok) created += 1;
        }
        if (created === 0 && products.some((p) => p.name.trim())) {
          toast.error("Check prices", "Enter a valid price for each product.");
          return;
        }
      }
      setStep(3);
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function generateLogos() {
    if (!business.name.trim()) {
      toast.error("Add your business name first", "Step 1 needs your business name.");
      return;
    }
    setLogo((l) => ({ ...l, generating: true }));
    try {
      const res = await fetch("/api/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: business.name,
          category: business.category,
          style: logoForm.style,
          color: logoForm.color,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.dataUrl) {
        setLogoConcepts([data.dataUrl]);
        setLogo((l) => ({ ...l, mode: "generate", dataUrl: data.dataUrl, url: null }));
      } else {
        toast.error("Could not generate logos", "Please try again.");
      }
    } catch {
      toast.error("Could not generate logos", "Please try again.");
    } finally {
      setLogo((l) => ({ ...l, generating: false }));
    }
  }

  async function handleLogoFile(file: File) {
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
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setLogo((l) => ({ ...l, mode: "upload", dataUrl, url: null }));
      try {
        const url = await uploadDataUrl(dataUrl, file.name);
        setLogo((l) => ({ ...l, url }));
      } catch {
        toast.error("Upload failed", "Please try another image.");
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo size="md" />
          <Link href="/dashboard" className="text-sm font-medium text-ink-secondary hover:text-navy-900">
            Skip for now
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  i < step
                    ? "bg-success text-white"
                    : i === step
                      ? "bg-navy-900 text-white"
                      : "bg-navy-100 text-ink-muted"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : `0${i + 1}`}
              </div>
              <span
                className={`hidden text-[13px] font-medium sm:block ${
                  i === step ? "text-ink" : "text-ink-muted"
                }`}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-px flex-1 ${i < step ? "bg-success" : "bg-navy-100"}`} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <section className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-navy-900">
              Tell us about your business
            </h1>
            <p className="mt-2 text-ink-secondary">
              This creates your public storefront at{" "}
              <span className="font-medium text-navy-800">pricelist.ng/your-business</span>
            </p>
            <div className="mt-8 grid gap-5 rounded-3xl border border-navy-100 bg-white p-6 shadow-soft sm:p-8 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Business name" htmlFor="biz-name" error={errors.name}>
                  <Input
                    id="biz-name"
                    placeholder="e.g. Chuks Kicks"
                    value={business.name}
                    onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Business category" htmlFor="biz-category">
                  <Select
                    id="biz-category"
                    value={business.category}
                    onChange={(e) => setBusiness({ ...business, category: e.target.value })}
                  >
                    {businessCategoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Short description"
                  htmlFor="biz-description"
                  hint="One or two sentences. Shown on your storefront."
                >
                  <Textarea
                    id="biz-description"
                    placeholder="e.g. Authentic sneakers and streetwear, delivered across Lagos."
                    value={business.description}
                    onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                  />
                </Field>
              </div>
              <div>
                <Field
                  label="WhatsApp number"
                  htmlFor="biz-whatsapp"
                  hint="Orders are sent here. Include country code if outside Nigeria."
                  error={errors.whatsappNumber}
                >
                  <Input
                    id="biz-whatsapp"
                    placeholder="0801 234 5678"
                    value={business.whatsappNumber}
                    onChange={(e) => setBusiness({ ...business, whatsappNumber: e.target.value })}
                  />
                </Field>
              </div>
              <div>
                <Field label="Phone number (optional)" htmlFor="biz-phone">
                  <Input
                    id="biz-phone"
                    placeholder="0801 234 5678"
                    value={business.phone}
                    onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Address / location (optional)" htmlFor="biz-address">
                  <Input
                    id="biz-address"
                    placeholder="e.g. 12 Broad Street, Lagos"
                    value={business.address}
                    onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-navy-900">
              Make it yours
            </h1>
            <p className="mt-2 text-ink-secondary">
              Upload your logo or let us create one. You can change everything later.
            </p>

            <div className="mt-8 rounded-3xl border border-navy-100 bg-white p-6 shadow-soft sm:p-8">
              <p className="text-[13px] font-medium text-ink-secondary">Logo</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 transition-colors ${
                    logo.mode === "upload"
                      ? "border-gold bg-gold-faint/40"
                      : "border-navy-200 hover:border-navy-400 hover:bg-navy-50/50"
                  }`}
                >
                  {logo.mode === "upload" && logo.dataUrl ? (
                    <img src={logo.dataUrl} alt="Logo preview" className="max-h-24 max-w-40 object-contain" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-navy-500" />
                      <span className="text-sm font-medium text-ink">Upload Logo</span>
                      <span className="text-xs text-ink-muted">PNG, JPG or WEBP · max 5 MB</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoFile(file);
                    e.target.value = "";
                  }}
                />

                <div
                  className={`rounded-2xl border-2 p-5 transition-colors ${
                    logo.mode === "generate"
                      ? "border-gold bg-gold-faint/40"
                      : "border-navy-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-gold-deep" />
                    <span className="text-sm font-medium text-ink">Create My Logo</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Style" htmlFor="logo-style">
                      <Select
                        id="logo-style"
                        value={logoForm.style}
                        onChange={(e) => setLogoForm({ ...logoForm, style: e.target.value })}
                      >
                        {["minimal", "luxury", "modern", "bold", "elegant", "professional"].map((s) => (
                          <option key={s} value={s}>
                            {s[0].toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Color" htmlFor="logo-color">
                      <div className="relative">
                        <input
                          id="logo-color"
                          type="color"
                          value={logoForm.color}
                          onChange={(e) => setLogoForm({ ...logoForm, color: e.target.value })}
                          className="h-11 w-full cursor-pointer rounded-xl border border-navy-200 bg-white px-1"
                          aria-label="Logo color"
                        />
                      </div>
                    </Field>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    loading={logo.generating}
                    onClick={() => void generateLogos()}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate concepts
                  </Button>
                </div>
              </div>

              {logoConcepts.length > 0 && (
                <div className="mt-5">
                  <p className="text-[13px] font-medium text-ink-secondary">Your logo concept</p>
                  <div className="mt-3 flex items-center gap-4">
                    <img
                      src={logoConcepts[0]}
                      alt="Generated logo concept"
                      className="h-24 w-24 rounded-2xl border border-navy-100 shadow-soft"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void generateLogos()}
                      >
                        Regenerate
                      </Button>
                      {logo.dataUrl && logo.dataUrl !== logoConcepts[0] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLogoConcepts([logo.dataUrl!]);
                          }}
                        >
                          Use uploaded
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <p className="text-[13px] font-medium text-ink-secondary">Theme</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  The Free plan includes Classic Navy. Pro unlocks Luxury, Midnight, Fashion and more.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[{ id: "classic", name: "Classic Navy", swatch: ["#FFFFFF", "#071A33"] }].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`rounded-2xl border-2 p-3 text-left transition-colors ${
                        theme === t.id ? "border-navy-800" : "border-navy-100 hover:border-navy-300"
                      }`}
                    >
                      <div className="flex h-10 overflow-hidden rounded-lg">
                        <span className="flex-1" style={{ background: t.swatch[0] }} />
                        <span className="flex-1" style={{ background: t.swatch[1] }} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-ink">{t.name}</p>
                    </button>
                  ))}
                  {[
                    { id: "luxury", name: "Luxury", swatch: ["#04111F", "#C9A45C"], pro: true },
                    { id: "dark", name: "Midnight", swatch: ["#04111F", "#2D5F91"], pro: true },
                    { id: "fashion", name: "Fashion", swatch: ["#FAF8F4", "#0B2342"], pro: true },
                  ].map((t) => (
                    <div
                      key={t.id}
                      className="relative rounded-2xl border border-navy-100 p-3 opacity-70"
                      title="Pro feature"
                    >
                      <div className="flex h-10 overflow-hidden rounded-lg">
                        <span className="flex-1" style={{ background: t.swatch[0] }} />
                        <span className="flex-1" style={{ background: t.swatch[1] }} />
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-ink">
                        {t.name}
                        <span className="rounded bg-gold-faint px-1.5 py-0.5 text-[9px] font-semibold text-gold-deep">
                          PRO
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="animate-fade-in">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-navy-900">
              Add your first products
            </h1>
            <p className="mt-2 text-ink-secondary">
              The Free plan includes 5 products. Add at least one — or skip and add them later.
            </p>
            <div className="mt-8 space-y-4">
              {products.map((p, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-navy-100 bg-white p-5 shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-ink-muted">
                      Product {i + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[13px] text-ink-secondary">
                        <Switch
                          small
                          checked={p.available}
                          onChange={(checked) =>
                            setProducts((all) =>
                              all.map((x, xi) => (xi === i ? { ...x, available: checked } : x)),
                            )
                          }
                          label="Available"
                        />
                        Available
                      </label>
                      {products.length > 1 && (
                        <button
                          onClick={() => setProducts((all) => all.filter((_, xi) => xi !== i))}
                          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-[#F9E9E9] hover:text-danger"
                          aria-label="Remove product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Product name" htmlFor={`p-name-${i}`}>
                      <Input
                        id={`p-name-${i}`}
                        placeholder="e.g. Air Max Sneakers"
                        value={p.name}
                        onChange={(e) =>
                          setProducts((all) =>
                            all.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Price (₦)" htmlFor={`p-price-${i}`}>
                      <Input
                        id={`p-price-${i}`}
                        inputMode="decimal"
                        placeholder="e.g. 45,000"
                        value={p.price}
                        onChange={(e) =>
                          setProducts((all) =>
                            all.map((x, xi) => (xi === i ? { ...x, price: e.target.value } : x)),
                          )
                        }
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Short description (optional)" htmlFor={`p-desc-${i}`}>
                        <Textarea
                          id={`p-desc-${i}`}
                          rows={2}
                          placeholder="One or two sentences about this product"
                          value={p.description}
                          onChange={(e) =>
                            setProducts((all) =>
                              all.map((x, xi) => (xi === i ? { ...x, description: e.target.value } : x)),
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {products.length < 5 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  setProducts((all) => [...all, { name: "", price: "", description: "", available: true }])
                }
              >
                <Plus className="h-4 w-4" />
                Add another product
              </Button>
            )}
            <p className="mt-4 text-[13px] text-ink-muted">
              {products.filter((p) => p.name.trim()).length} of 5 products used
            </p>
          </section>
        )}

        {step === 3 && (
          <section className="animate-fade-in text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-navy-900 text-gold">
              <Rocket className="h-7 w-7" />
            </div>
            <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              Your store is ready
            </h1>
            <p className="mx-auto mt-3 max-w-md text-ink-secondary">
              Share your link anywhere — WhatsApp, Instagram, flyers, business
              cards — and start receiving orders.
            </p>
            <div className="mx-auto mt-8 max-w-md rounded-3xl border border-navy-100 bg-white p-6 shadow-soft">
              <p className="text-[13px] font-medium text-ink-muted">Your storefront</p>
              <p className="mt-1 break-all font-heading text-xl font-bold text-navy-900">
                {process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "localhost:3000"}/{storeSlug ?? "your-store"}
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={() => {
                    if (storeSlug) window.open(`/${storeSlug}`, "_blank");
                  }}
                  disabled={!storeSlug}
                >
                  View My Store
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
            <p className="mt-5 text-xs text-ink-muted">
              Tip: share your link in your WhatsApp status and bio to get your
              first orders today.
            </p>
          </section>
        )}

        {/* Footer nav */}
        {step < 3 && (
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? router.back() : setStep((step - 1) as Step))}
              disabled={saving}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            {step === 0 && (
              <Button onClick={() => void saveBusiness()} loading={saving} disabled={!canContinue} size="lg">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => void saveBranding()} loading={saving} size="lg">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void finishProducts(true)} loading={saving}>
                  Skip for now
                </Button>
                <Button onClick={() => void finishProducts(false)} loading={saving} size="lg">
                  Save & Launch
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function priceKeboValid(price: string): boolean {
  const n = parseFloat(price.replace(/[^\d.]/g, ""));
  return !Number.isNaN(n) && n > 0;
}

async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
  const [meta, data] = dataUrl.split(",");
  const contentType = meta.includes("image/svg") ? "image/png" : (meta.match(/:(.*?);/)?.[1] ?? "image/png");
  // Convert to base64 (data URLs are already base64 for FileReader output).
  const base64 = data ?? dataUrl;
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, data: base64 }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.url) {
    throw new Error(result.error ?? "Upload failed");
  }
  return result.url;
}
