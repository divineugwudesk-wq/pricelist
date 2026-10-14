// Zod validation schemas — shared between client and server.
import { z } from "zod";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const businessCategoryOptions = [
  { value: "FASHION", label: "Fashion" },
  { value: "BEAUTY", label: "Beauty" },
  { value: "FOOD", label: "Food" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "SERVICES", label: "Services" },
  { value: "RETAIL", label: "Retail" },
  { value: "HEALTH_WELLNESS", label: "Health & Wellness" },
  { value: "HOME_FURNITURE", label: "Home & Furniture" },
  { value: "AUTOMOTIVE", label: "Automotive" },
  { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
  { value: "OTHER", label: "Other" },
] as const;

const phoneRe = /^[+]?[\d\s()-]{7,18}$/;
const urlRe = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/i;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required").max(80),
    email: z.string().min(1, "Email is required").email("Enter a valid email").max(200),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({ email: z.string().min(1).email("Enter a valid email") })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
  })
  .strict();

export const businessSchema = z
  .object({
    name: z.string().min(2, "Business name is required").max(120),
    category: z.enum([
      "FASHION", "BEAUTY", "FOOD", "ELECTRONICS", "RESTAURANT", "SERVICES",
      "RETAIL", "HEALTH_WELLNESS", "HOME_FURNITURE", "AUTOMOTIVE",
      "PROFESSIONAL_SERVICES", "OTHER",
    ]),
    description: z.string().max(600).optional().nullable(),
    whatsappNumber: z.string().max(20).optional().nullable().refine(
      (v) => !v || phoneRe.test(v),
      "Enter a valid phone number",
    ),
    phone: z.string().max(20).optional().nullable().refine(
      (v) => !v || phoneRe.test(v),
      "Enter a valid phone number",
    ),
    address: z.string().max(200).optional().nullable(),
    instagram: z.string().max(200).optional().nullable().refine((v) => !v || urlRe.test(v), "Enter a valid URL"),
    tiktok: z.string().max(200).optional().nullable().refine((v) => !v || urlRe.test(v), "Enter a valid URL"),
    facebook: z.string().max(200).optional().nullable().refine((v) => !v || urlRe.test(v), "Enter a valid URL"),
    x: z.string().max(200).optional().nullable().refine((v) => !v || urlRe.test(v), "Enter a valid URL"),
    website: z.string().max(200).optional().nullable().refine((v) => !v || urlRe.test(v), "Enter a valid URL"),
  })
  .strict();

export const businessHoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
});

export const productSchemaBase = z
  .object({
    name: z.string().min(2, "Product name is required").max(140),
    description: z.string().max(2000).optional().nullable(),
    priceKobo: z.number().int().min(1, "Price is required").max(100_000_000_000),
    salePriceKobo: z.number().int().min(0).max(100_000_000_000).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    sku: z.string().max(60).optional().nullable(),
    type: z.enum(["PRODUCT", "SERVICE"]),
    isAvailable: z.boolean(),
    isFeatured: z.boolean(),
    imageUrl: z.string().url("Provide a valid image URL").optional().nullable().or(z.literal("")),
    images: z.array(z.string().url()).max(8).optional(),
  })
  .strict();

export const productSchema = productSchemaBase.refine(
  (data) => !data.salePriceKobo || data.salePriceKobo < data.priceKobo,
  { message: "Sale price must be lower than the regular price", path: ["salePriceKobo"] },
);

export const productUpdateSchema = productSchemaBase.partial();

export const categorySchema = z
  .object({
    name: z.string().min(2, "Category name is required").max(60),
    sortOrder: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().min(1).max(999),
        }),
      )
      .min(1, "Your cart is empty")
      .max(200),
    customerName: z.string().max(80).optional().nullable(),
    customerPhone: z.string().max(20).optional().nullable(),
    customerNote: z.string().max(500).optional().nullable(),
    sessionId: z.string().optional().nullable(),
  })
  .strict();

export const orderStatusSchema = z
  .object({ status: z.enum(["NEW", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"]) })
  .strict();

export const uploadSchema = z.object({
  filename: z.string().max(120),
  contentType: z.string(),
  data: z.string(), // base64
});

export const aiDescribeSchema = z
  .object({
    name: z.string().min(2).max(140),
    category: z.string().max(80).optional(),
    businessName: z.string().max(120).optional(),
    tone: z.enum(["professional", "friendly", "luxury"]).optional(),
  })
  .strict();

export const logoGenerateSchema = z
  .object({
    businessName: z.string().min(2).max(60),
    category: z.string().max(80).optional(),
    style: z.enum(["minimal", "luxury", "modern", "bold", "elegant", "professional"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid hex color"),
  })
  .strict();

export const storeCustomizeSchema = z
  .object({
    theme: z.string().max(40).optional(),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
    showBranding: z.boolean().optional(),
    heroImageUrl: z.string().url().optional().nullable().or(z.literal("")),
    description: z.string().max(600).optional().nullable(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
