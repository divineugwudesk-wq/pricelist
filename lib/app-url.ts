// The public base URL of the application.
//
// Every absolute link the product generates — password reset emails, the
// onboarding share link, the WhatsApp share link — has to point at the host
// the user is actually on. Reading it from one place keeps them consistent
// and stops a missing variable from producing a localhost link in production.

const LOCAL_FALLBACK = "http://localhost:3000";

function firstNonEmpty(...values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed.replace(/\/+$/, "");
  }
  return null;
}

/**
 * The configured application origin.
 *
 * `NEXT_PUBLIC_APP_URL` is the canonical variable; `APP_URL` and
 * `NEXTAUTH_URL` are accepted as fallbacks because the Worker already sets
 * them. When nothing is configured the local development origin is used, and
 * `isAppUrlConfigured()` reports that so callers can warn.
 */
export function appUrl(): string {
  return (
    firstNonEmpty(
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.APP_URL,
      process.env.NEXTAUTH_URL,
    ) ?? LOCAL_FALLBACK
  );
}

/** Whether a real deployment origin is configured. */
export function isAppUrlConfigured(): boolean {
  return (
    firstNonEmpty(
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.APP_URL,
      process.env.NEXTAUTH_URL,
    ) !== null
  );
}

/**
 * Build an absolute URL on the application origin.
 *
 * `path` is a path on this site, so it must start with a slash. Only
 * same-origin paths are accepted — an absolute URL supplied by a client is
 * ignored, which stops a caller from turning the base URL into a redirect to
 * somewhere else.
 */
export function absoluteUrl(path: string): string {
  const base = appUrl();
  if (!path.startsWith("/")) return base;
  if (path.startsWith("//")) return base;
  return `${base}${path}`;
}

/**
 * Validate a client-supplied redirect target.
 *
 * Only a path on this site is accepted, so a crafted `?next=` value cannot
 * turn a sign-in link into an open redirect.
 */
export function safeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate) return "/dashboard";
  if (!candidate.startsWith("/")) return "/dashboard";
  if (candidate.startsWith("//")) return "/dashboard";
  if (candidate.includes("\\")) return "/dashboard";
  return candidate;
}
