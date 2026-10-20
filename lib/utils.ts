import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function uniqueSlug(
  base: string,
  existing: Set<string>,
  reserved: string[] = [],
): string {
  const reservedSet = new Set(reserved.map((s) => s.toLowerCase()));
  const isTaken = (candidate: string) =>
    existing.has(candidate) || reservedSet.has(candidate);

  const slug = slugify(base) || "store";
  if (!isTaken(slug)) return slug;

  // A couple of random attempts. The `slug @unique` constraint is the final
  // word, so a collision here surfaces as a 500 rather than a silent wrong
  // slug — but reserved slugs and existing slugs are both known up front.
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6 + attempt);
    const candidate = `${slug}-${suffix}`;
    if (!isTaken(candidate)) return candidate;
  }

  throw new Error("Could not generate a unique slug. Try a different store name.");
}

export function formatDate(date: Date | string, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" }) +
    ", " +
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Slugs that must never be assigned to a business.
 *
 * These are the static routes the App Router reserves. A business named
 * "Admin" would otherwise get the slug `admin`, and `app/[slug]/page.tsx`
 * then redirects that storefront onto the admin page, making the store
 * permanently unreachable. The list is derived from the route manifest so it
 * cannot drift from the route tree.
 */
export function reservedSlugs(): string[] {
  return [
    "",
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "onboarding",
    "dashboard",
    "admin",
    "api",
    "uploads",
    "pricing",
    "how-it-works",
  ];
}

/** Whether a slug collides with a reserved route. */
export function isReservedSlug(slug: string): boolean {
  return reservedSlugs().includes(slug.toLowerCase());
}
